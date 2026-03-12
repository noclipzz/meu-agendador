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

    const updatedOrder = await db.order.update({
      where: { id, companyId: company.id },
      data: { status }
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
          const messageText = `Olá ${updatedOrder.customerName}! ✨\n\nSeu pedido *#${updatedOrder.id.slice(-6).toUpperCase()}* acaba de entrar em preparo! 👩‍🍳🏡\n\nAvisaremos você assim que ele for enviado.`;

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
