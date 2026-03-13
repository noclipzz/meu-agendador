import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { sendEvolutionMessage } from "@/lib/whatsapp";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const company = await db.company.findFirst({
      where: {
        OR: [
          { ownerId: userId },
          { professionals: { some: { userId: userId } } },
          { teamMembers: { some: { clerkUserId: userId } } }
        ]
      }
    });

    if (!company) {
      console.log(`❌ [PEDIDOS] Empresa não encontrada para o usuário ${userId}`);
      return NextResponse.json({ error: "Empresa não vinculada", userId }, { status: 404 });
    }

    console.log(`✅ [PEDIDOS] Buscando pedidos para a empresa ${company.name} (${company.id})`);

    const orders = await db.order.findMany({
      where: { 
        companyId: company.id
      },
      include: {
        items: {
          include: {
            vitrineProduct: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("ERRO_GET_PEDIDOS:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    const { id, status } = body;

    const company = await db.company.findFirst({
      where: {
        OR: [
          { ownerId: userId },
          { professionals: { some: { userId: userId } } }
        ]
      }
    });

    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const oldOrder = await db.order.findUnique({
      where: { id, companyId: company.id }
    });

    if (!oldOrder) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

    const isMarkingAsPaid = status === "PAID" && !(oldOrder as any).isPaid;

    const updatedOrder = await (db as any).order.update({
      where: { id, companyId: company.id },
      data: { 
        status,
        ...(isMarkingAsPaid ? { isPaid: true } : {})
      },
      include: {
        items: {
          include: {
            vitrineProduct: true
          }
        }
      }
    });

    // Notificação WhatsApp (Apenas se for PREPARING)
    if (status === "PREPARING") {
      try {
        const subscription = await db.subscription.findUnique({
          where: { userId: company.ownerId }
        });
        
        const isMaster = subscription?.plan === "MASTER";
        const isConnected = company.whatsappStatus === 'CONNECTED';

        if (isMaster && isConnected && company.evolutionServerUrl && company.evolutionApiKey && company.whatsappInstanceId && updatedOrder.customerPhone) {
          const itemsList = updatedOrder.items.map((item: any) => {
            let variation = "";
            if (item.variation) {
               // Converte "Chave: Valor, Chave2: Valor2" em lista com quebra de linha
               variation = "\n" + item.variation.split(", ").join("\n");
            }
            return `${item.quantity}x - ${item.vitrineProduct.name}${variation}`;
          }).join("\n\n");

          let messageText = `Olá ${updatedOrder.customerName}! ✨\n\nSeu pedido acaba de entrar em preparo! 📦\n\n*Detalhes do Pedido:* \n${itemsList}\n\n*Valor total: R$ ${Number(updatedOrder.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*`;

          if (updatedOrder.deliveryMethod === "DELIVERY" && updatedOrder.addressInfo) {
            const addr = updatedOrder.addressInfo as any;
            messageText += `\n\n🚚 *Entrega em:* \n${addr.address}, ${addr.number} - ${addr.neighborhood}\n${addr.city} - ${addr.state}`;
          } else {
            messageText += `\n\n🏪 *Retirada no Local*`;
          }

          const updateStatusText = updatedOrder.deliveryMethod === "PICKUP" 
            ? "Avisaremos você assim que estiver tudo pronto!" 
            : "Avisaremos você assim que ele for enviado.";
          
          messageText += `\n\n${updateStatusText}`;

          await sendEvolutionMessage(
            company.evolutionServerUrl,
            company.evolutionApiKey,
            company.whatsappInstanceId,
            updatedOrder.customerPhone,
            messageText
          );
          console.log("✅ [WHATSAPP] Notificação de Preparo enviada para", updatedOrder.customerPhone);
        }
      } catch (e) {
        console.error("❌ [WHATSAPP] Erro ao enviar notificação de preparo:", e);
      }
    }

    // Abatimento de Estoque Manual (Se estiver marcando como PAGO agora)
    if (isMarkingAsPaid) {
      try {
        for (const item of updatedOrder.items) {
          await db.vitrineProduct.update({
            where: { id: item.vitrineProductId },
            data: {
              quantity: { decrement: item.quantity }
            }
          });
        }
        console.log(`📦 [ESTOQUE] Estoque abatido manualmente para o pedido ${id}`);
        
        // Registrar no Financeiro (Se ainda não existir fatura)
        const existingInvoice = await db.invoice.findFirst({
          where: { bookingId: `ORDER_${id}` }
        });

        if (!existingInvoice) {
          await db.invoice.create({
            data: {
              description: `Venda Vitrine (Manual): ${updatedOrder.customerName} (#${id.slice(-6).toUpperCase()})`,
              value: updatedOrder.totalAmount,
              netValue: updatedOrder.totalAmount,
              cardTax: 0,
              method: updatedOrder.paymentMethod || "DINHEIRO",
              status: "PAGO",
              dueDate: new Date(),
              paidAt: new Date(),
              companyId: company.id,
              bookingId: `ORDER_${id}`,
              clientId: null
            }
          });
          console.log(`💰 [FINANCEIRO] Receita registrada manualmente para o pedido ${id}`);
        }
      } catch (e) {
        console.error("❌ [ESTOQUE/FINANCEIRO] Erro no processamento manual:", e);
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("ERRO_PATCH_PEDIDO:", error);
    return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 500 });
  }
}
