import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MercadoPagoConfig, Payment } from "mercadopago";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || url.searchParams.get("data.id");

    const body = await req.json().catch(() => ({}));
    const resourceId = id || body.data?.id || body.resource?.split('/').pop();
    const eventType = body.type || body.action || url.searchParams.get("topic");

    console.log(`[MP Webhook] Evento: ${eventType}, ID: ${resourceId}`);

    if (eventType === "payment" || eventType === "payment.created" || eventType === "payment.updated") {
      if (!resourceId) return NextResponse.json({ error: "No ID" }, { status: 400 });

      // Buscamos o pagamento em uma empresa "mestre" ou tentamos identificar pela external_reference
      // Como não temos um token mestre fixo, precisamos primeiro descobrir de quem é esse pagamento.
      // 1. Tentar buscar no Mercado Pago (Precisamos do Token). 
      // Mas qual token? Vamos buscar o pedido no banco primeiro usando o ID do pagamento se salvamos, 
      // ou via external_reference se o MP enviar no body.
      
      // O MP Geralmente envia apenas o ID. Precisamos consultar a API do MP.
      // Para consultar, precisamos de um Token. Vamos tentar o token de sistema ou buscar na tabela de empresas.
      
      // MELHOR ABORDAGEM: Buscar o Order que tem esse paymentId ou cujo ID é a external_reference.
      // No preference/route.ts nós enviamos external_reference = order.id.
      
      // Precisamos buscar o pagamento no MP para pegar a external_reference.
      // Mas para isso precisamos do Token da empresa. 
      // VAMOS TER QUE BUSCAR UMA EMPRESA QUE TENHA MP CONFIGURADO E TENTAR (ou buscar no Order se já salvamos o paymentId).
      
      const orders = await db.order.findMany({
        where: { 
            OR: [
                { paymentId: String(resourceId) },
                { status: "PENDING" } // Busca ordens pendentes para verificar se o ID bate com a referência externa
            ]
        },
        include: { company: true }
      });

      for (const order of orders) {
        if (!order.company.mercadopagoAccessToken) continue;

        try {
            const client = new MercadoPagoConfig({ accessToken: order.company.mercadopagoAccessToken });
            const payment = new Payment(client);
            const pData = await payment.get({ id: String(resourceId) });

            if (pData.external_reference === order.id || pData.id?.toString() === order.paymentId) {
                console.log(`✅ [MP Webhook] Pedido Identificado: ${order.id}. Status MP: ${pData.status}`);

                // Se o pagamento foi aprovado
                if (pData.status === "approved") {
                    // 1. Atualiza Status do Pedido
                    await db.order.update({
                        where: { id: order.id },
                        data: { 
                            status: "PAID",
                            paymentId: String(pData.id),
                            paymentMethod: pData.payment_method_id
                        }
                    });

                    // 2. Registra no Financeiro (Invoice)
                    const existingInvoice = await db.invoice.findFirst({
                        where: { bookingId: `ORDER_${order.id}` } // Usamos um prefixo para diferenciar de agendamentos
                    });

                    if (!existingInvoice) {
                        const netValue = Number(pData.transaction_details?.net_received_amount || order.totalAmount);
                        const fee = Number(order.totalAmount) - netValue;

                        await db.invoice.create({
                            data: {
                                description: `Venda Vitrine: ${order.customerName} (#${order.id.slice(-6).toUpperCase()})`,
                                value: order.totalAmount,
                                netValue: netValue,
                                cardTax: fee,
                                method: pData.payment_method_id?.toUpperCase() || "CARTAO",
                                status: "PAGO",
                                dueDate: new Date(),
                                paidAt: new Date(),
                                companyId: order.companyId,
                                bookingId: `ORDER_${order.id}`, // Link fake para controle
                                clientId: null // Poderíamos vincular se o cliente existir no DB
                            }
                        });
                        console.log(`💰 [FINANCEIRO] Receita registrada para o pedido ${order.id}`);
                    }
                } else if (pData.status === "cancelled" || pData.status === "rejected") {
                    await db.order.update({
                        where: { id: order.id },
                        data: { status: "CANCELED" }
                    });
                }
                
                break; // Encontrou e processou
            }
        } catch (e) {
            // Se der erro de token inválido, continua para a próxima ordem (tentar outro token de empresa se houver colisão de IDs, improvável)
            continue;
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("ERRO_MP_WEBHOOK:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
