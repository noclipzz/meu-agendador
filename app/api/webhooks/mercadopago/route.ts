import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { notifyAdminsOfCompany } from "@/lib/push-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

                  // [NOTIFICAÇÕES]
                  try {
                    const notifSettings = (order.company.notificationSettings as any) || {};

                    await notifyAdminsOfCompany(
                      order.companyId,
                      "💰 Pagamento Confirmado!",
                      `${order.customerName} pagou R$ ${Number(order.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      "/painel/vitrine/pedidos",
                      "payment_received_push"
                    );

                    // E-mail para Empresa (Staff) - DESIGN PREMIUM
                    const sendStaffEmail = notifSettings.payment_received_email !== false;
                    if (sendStaffEmail && order.company.notificationEmail && orderWithItems) {
                      const itemsHtml = orderWithItems.items.map((i: any) => {
                        return `
                          <div style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                            <div style="flex: 1;">
                              <span style="font-weight: 600; color: #1e293b;">${i.quantity}x</span> 
                              <span style="color: #475569;">Item #${i.id.slice(-4).toUpperCase()}</span>
                              ${i.variation ? `<br/><small style="color: #94a3b8; margin-left: 24px;">${i.variation}</small>` : ''}
                            </div>
                            <div style="font-weight: 500; color: #1e293b;">
                              R$ ${(Number(i.price || 0) * Number(i.quantity)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        `;
                      }).join('');

                      await resend.emails.send({
                        from: "NOHUD Vitrine <vendas@nohud.com.br>",
                        to: order.company.notificationEmail,
                        subject: `✅ Pagamento Confirmado: ${order.customerName}`,
                        html: `
                          <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                              <div style="background-color: #10b981; padding: 32px 40px; text-align: center;">
                                <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700;">Pagamento Confirmado!</h1>
                                <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 16px;">O pedido #${order.id.slice(-6).toUpperCase()} foi pago via Mercado Pago.</p>
                              </div>
                              
                              <div style="padding: 40px;">
                                <div style="margin-bottom: 32px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px;">
                                  <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 16px;">Detalhes do Pedido</h2>
                                  <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">CLIENTE</p>
                                    <p style="margin: 0 0 16px 0; color: #1e293b; font-weight: 600; font-size: 16px;">${order.customerName}</p>
                                    
                                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">MÉTODO DE PAGAMENTO</p>
                                    <p style="margin: 0; color: #1e293b; font-size: 16px; text-transform: uppercase;">${pData.payment_method_id || 'Cartão/Pix'}</p>
                                  </div>
                                </div>

                                <div style="margin-bottom: 32px;">
                                  <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 16px;">Resumo dos Itens</h2>
                                  ${itemsHtml}
                                  
                                  <div style="margin-top: 24px; padding: 20px; background-color: #f8fafc; border-radius: 12px; text-align: right;">
                                    <span style="color: #64748b; font-size: 16px; margin-right: 12px;">Valor Recebido</span>
                                    <span style="color: #10b981; font-size: 24px; font-weight: 800;">R$ ${Number(order.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>

                                <div style="text-align: center;">
                                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/painel/vitrine/pedidos" 
                                     style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px;">
                                    Ver Pedido no Painel
                                  </a>
                                </div>
                              </div>
                              
                              <div style="padding: 32px 40px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                  ID do Pedido: <span style="font-family: monospace;">${order.id}</span>
                                </p>
                                <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">
                                  &copy; ${new Date().getFullYear()} NOHUD. Todos os direitos reservados.
                                </p>
                              </div>
                            </div>
                          </div>
                        `
                      });
                    }

                    // [E-MAIL CLIENTE]
                    const sendClientEmail = notifSettings.client_order_email !== false;
                    // Buscamos o email do cliente (pode vir do order ou do booking/client vinculado)
                    // No Order, temos customerEmail? Precisamos checar o schema.
                    // Pelo view_file anterior do schema: Order tem customerEmail?
                    if (sendClientEmail && (order as any).customerEmail) {
                        await resend.emails.send({
                            from: `${order.company.name} <vendas@nohud.com.br>`,
                            to: (order as any).customerEmail,
                            subject: `📦 Seu pedido #${order.id.slice(-6).toUpperCase()} foi confirmado!`,
                            html: `
                                <div style="font-family: sans-serif; padding: 20px;">
                                    <h2>Olá, ${order.customerName}!</h2>
                                    <p>Recebemos seu pagamento e seu pedido já está sendo processado.</p>
                                    <div style="background: #f9fafb; padding: 15px; border-radius: 10px; border: 1px solid #eee;">
                                        <p><strong>Pedido:</strong> #${order.id.slice(-6).toUpperCase()}</p>
                                        <p><strong>Valor Pago:</strong> R$ ${Number(order.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <p>Obrigado pela preferência!</p>
                                </div>
                            `
                        });
                    }

                    // [WHATSAPP CLIENTE]
                    if (notifSettings.client_order_whatsapp !== false && order.company.whatsappStatus === 'CONNECTED' && order.company.evolutionServerUrl && order.customerPhone) {
                      const { sendEvolutionMessage } = await import("@/lib/whatsapp");
                      const message = (order.company.whatsappPaymentSuccessMessage || `✅ *Pagamento Confirmado!*\n\nOlá {nome}, recebemos seu pagamento de *{valor}* referente a *{descricao}*.\n\nObrigado!`)
                        .replace(/\\n/g, '\n')
                        .replace("{nome}", order.customerName || "")
                        .replace("{valor}", `R$ ${Number(order.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
                        .replace("{descricao}", `Pedido #${order.id.slice(-6).toUpperCase()}`);

                      await sendEvolutionMessage(
                        order.company.evolutionServerUrl,
                        order.company.evolutionApiKey!,
                        order.company.whatsappInstanceId!,
                        order.customerPhone,
                        message
                      ).catch(e => console.error("Erro zap pedido vitrine:", e));
                    }
                  } catch (notifErr) {
                    console.error("Erro ao enviar notificações de pagamento:", notifErr);
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
