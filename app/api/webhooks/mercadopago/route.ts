import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MercadoPagoConfig, Payment } from "mercadopago";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get("topic");
    const id = url.searchParams.get("id");

    // Mercado Pago pode enviar notificações via query params ou body dependendo da versão/evento
    const body = await req.json().catch(() => ({}));
    const resourceId = id || body.data?.id || body.resource?.split('/').pop();
    const eventType = topic || body.type || body.action;

    console.log(`[MP Webhook] Evento: ${eventType}, ID: ${resourceId}`);

    if (eventType === "payment" || eventType === "payment.created") {
      // 1. Precisamos buscar o pagamento para saber qual empresa ele pertence para usar o token correto
      // No entanto, o webhook é GLOBAL. Como saber qual empresa? 
      // Opção A: O metadata da preferência contém o companyId.
      // Mas para pegar o metadata, precisamos do Token da empresa.
      // Solução: O Mercado Pago envia um payload que as vezes não tem tudo. 
      // Uma prática comum é usar um token de mestre para webhooks ou buscar o pagamento tentando os tokens (ruim).
      // A melhor forma é salvar o ID da preferência no banco quando ela é criada e vincular à empresa.
      
      // Para este MVP, vamos apenas registrar o log se encontrarmos.
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("ERRO_MP_WEBHOOK:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
