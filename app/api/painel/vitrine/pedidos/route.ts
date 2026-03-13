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
          { professionals: { some: { userId: userId } } }
        ]
      }
    });

    if (!company) return NextResponse.json([], { status: 404 });

    const orders = await db.order.findMany({
      where: { companyId: company.id },
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

    const updatedOrder = await (db as any).order.update({
      where: { id, companyId: company.id },
      data: { status },
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

          messageText += `\n\nAvisaremos você assim que ele for enviado.`;

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

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("ERRO_PATCH_PEDIDO:", error);
    return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 500 });
  }
}
