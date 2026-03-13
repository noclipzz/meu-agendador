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

      // 1. Tentar encontrar o pedido pelo paymentId se já salvamos
      let order = await db.order.findUnique({
        where: { paymentId: String(resourceId) },
        include: { company: true }
      });

      // 2. Se não encontrar, precisamos descobrir de quem é esse pagamento
      // Tentamos o token da empresa mestre ou buscamos nas empresas que têm MP configurado
      const companies = await db.company.findMany({
        where: { mercadopagoAccessToken: { not: null } }
      });

      for (const comp of companies) {
        try {
          const client = new MercadoPagoConfig({ accessToken: comp.mercadopagoAccessToken! });
          const payment = new Payment(client);
          const pData = await payment.get({ id: String(resourceId) });

          if (pData.external_reference) {
            // O formato é companyId__orderId
            const [cId, oId] = pData.external_reference.split("__");
            
            // Caso seja o formato antigo (só orderId), tentamos encontrar o order
            const targetOrderId = oId || cId;

            order = await db.order.findUnique({
              where: { id: targetOrderId },
              include: { company: true }
            });

            if (order) {
              console.log(`✅ [MP Webhook] Pedido Identificado: ${order.id}. Status MP: ${pData.status}`);

              // Se o pagamento foi aprovado
              if (pData.status === "approved" && !(order as any).isPaid) {
                await (db as any).order.update({
                  where: { id: order.id },
                  data: { 
                    status: "PAID",
                    isPaid: true,
                    paymentId: String(pData.id),
                    paymentMethod: pData.payment_method_id
                  }
                });

                // Abatimento Automático de Estoque
                const orderWithItems = await db.order.findUnique({
                  where: { id: order.id },
                  include: { items: true }
                });

                if (orderWithItems) {
                  for (const item of orderWithItems.items) {
                    await db.vitrineProduct.update({
                      where: { id: item.vitrineProductId },
                      data: {
                        quantity: { decrement: item.quantity }
                      }
                    });
                  }
                  console.log(`📦 [ESTOQUE] Estoque abatido para o pedido ${order.id}`);
                }

                const existingInvoice = await db.invoice.findFirst({
                  where: { bookingId: `ORDER_${order.id}` }
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
                      bookingId: `ORDER_${order.id}`,
                      clientId: null
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
          }
        } catch (e) {
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
