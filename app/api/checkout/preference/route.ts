import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { notifyAdminsOfCompany, sendPushNotification } from "@/lib/push-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { items, customerInfo, deliveryMethod, companyId, slug, addressInfo, shippingCost, paymentMode, deliveryPaymentDetails } = await req.json();

    if (!items || items.length === 0 || !companyId || !customerInfo) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // 1. Busca a empresa
    const company = await (db as any).company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    const vitrineSettings = (company.vitrineSettings as any) || {};

    // 2. Calcula total e prepara intens
    let totalItems = 0;
    const mpItems = [];
    
    // Busca os produtos no BD para garantir o preço correto
    const productIds = items.map((i: any) => i.id);
    const dbProducts = await (db as any).vitrineProduct.findMany({
      where: { id: { in: productIds } }
    });

    for (const item of items) {
      const p = dbProducts.find((dbP: any) => dbP.id === item.id);
      if (!p) continue;
      
      const price = Number(p.price || 0);
      const qty = Number(item.quantity || 1);
      totalItems += price * qty;

      const title = item.variationLabel ? `${p.name} (${item.variationLabel})` : p.name;

      mpItems.push({
        id: p.id,
        title: title,
        quantity: qty,
        unit_price: price,
        currency_id: "BRL",
        picture_url: p.imageUrl || undefined,
        description: p.description?.substring(0, 250) || undefined,
      });
    }

    // 2.5 Adiciona Frete se houver
    if (shippingCost > 0) {
      totalItems += Number(shippingCost);
      mpItems.push({
        id: "shipping_cost",
        title: "Custo de Entrega (Frete)",
        quantity: 1,
        unit_price: Number(shippingCost),
        currency_id: "BRL",
        description: "Taxa de entrega para o endereço informado",
      });
    }

    // 3. Cria o Pedido no Banco de Dados (PENDENTE)
    const order = await (db as any).order.create({
      data: {
        companyId: company.id,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email || null,
        customerPhone: customerInfo.phone,
        deliveryMethod: deliveryMethod,
        addressInfo: addressInfo || {},
        totalAmount: totalItems,
        status: "PENDING",
        paymentMethod: paymentMode === "DELIVERY" ? "PAGAMENTO_NA_ENTREGA" : "MERCADO_PAGO",
        paymentDetails: deliveryPaymentDetails || {},
        items: {
          create: items.map((i: any) => {
            const p = dbProducts.find((dbP: any) => dbP.id === i.id);
            return {
              vitrineProductId: i.id,
              quantity: Number(i.quantity || 1),
              price: Number(p?.price || 0),
              variation: i.variationLabel || null
            };
          })
        }
      }
    });

    // 3.5 Notifica o dono (Push)
    // Para pedidos online, notificaremos o dono apenas quando o pagamento for CONFIRMADO
    // Exceto se for pagamento na entrega, aí notificamos agora.
    if (paymentMode === "DELIVERY") {
      try {
        await notifyAdminsOfCompany(
          company.id,
          "📦 Novo Pedido na Vitrine",
          `${customerInfo.name} realizou um pedido de R$ ${totalItems.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          "/painel/vitrine/pedidos"
        );
      } catch (e) {
        console.error("Erro ao enviar push:", e);
      }

      // 3.6 Notifica o dono (Email de Backup) - DESIGN PREMIUM
      if (company.notificationEmail) {
        try {
          const itemsHtml = items.map((i: any) => {
            const p = dbProducts.find((dbP: any) => dbP.id === i.id);
            return `
              <div style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                <div style="flex: 1;">
                  <span style="font-weight: 600; color: #1e293b;">${i.quantity}x</span> 
                  <span style="color: #475569;">${p?.name || 'Produto'}</span>
                  ${i.variationLabel ? `<br/><small style="color: #94a3b8; margin-left: 24px;">${i.variationLabel}</small>` : ''}
                </div>
                <div style="font-weight: 500; color: #1e293b;">
                  R$ ${(Number(p?.price || 0) * Number(i.quantity)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            `;
          }).join('');

          const deliveryText = deliveryMethod === "DELIVERY" 
            ? `🚚 Entrega em: ${addressInfo?.address}, ${addressInfo?.number} - ${addressInfo?.neighborhood}` 
            : "🏬 Retirada no Local";

          await resend.emails.send({
            from: "NOHUD Vitrine <vendas@nohud.com.br>",
            to: company.notificationEmail,
            subject: `📦 Novo Pedido: ${customerInfo.name}`,
            html: `
              <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                  <div style="background-color: #6d28d9; padding: 32px 40px; text-align: center;">
                    <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700;">Novo Pedido Recebido!</h1>
                    <p style="color: #ddd6fe; margin: 8px 0 0 0; font-size: 16px;">Você tem uma nova venda na sua vitrine.</p>
                  </div>
                  
                  <div style="padding: 40px;">
                    <div style="margin-bottom: 32px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px;">
                      <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 16px;">Detalhes do Cliente</h2>
                      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">CLIENTE</p>
                        <p style="margin: 0 0 16px 0; color: #1e293b; font-weight: 600; font-size: 16px;">${customerInfo.name}</p>
                        
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">CONTATO</p>
                        <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">WhatsApp: ${customerInfo.phone}</p>
                        
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">MÉTODO DE ENVIO</p>
                        <p style="margin: 0; color: #1e293b; font-size: 16px;">${deliveryText}</p>
                      </div>
                    </div>

                    <div style="margin-bottom: 32px;">
                      <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 16px;">Resumo dos Itens</h2>
                      ${itemsHtml}
                      <div style="margin-top: 24px; padding: 20px; background-color: #f8fafc; border-radius: 12px; text-align: right;">
                        <span style="color: #64748b; font-size: 16px; margin-right: 12px;">Total do Pedido</span>
                        <span style="color: #6d28d9; font-size: 24px; font-weight: 800;">R$ ${totalItems.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <p style="text-align: right; color: #94a3b8; font-size: 12px; margin-top: 8px;">
                        Pagamento: ${deliveryPaymentDetails?.method === 'money' ? 'Dinheiro' : deliveryPaymentDetails?.method === 'credit' ? 'Cartão de Crédito' : deliveryPaymentDetails?.method === 'debit' ? 'Cartão de Débito' : 'Na Entrega'}
                        ${deliveryPaymentDetails?.needsChange ? `<br/>Troco para: R$ ${deliveryPaymentDetails.changeAmount}` : ''}
                      </p>
                    </div>

                    <div style="text-align: center;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/painel/vitrine/pedidos" 
                         style="display: inline-block; background-color: #6d28d9; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; transition: background-color 0.2s;">
                        Gerenciar Pedido no Painel
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
        } catch (emailErr) {
          console.error("Erro ao enviar email de backup:", emailErr);
        }
      }
    }

    // Se for pagamento na entrega, retorna sucesso direto
    if (paymentMode === "DELIVERY") {
      return NextResponse.json({ success: true, orderId: order.id });
    }

    // 4. Configura o Mercado Pago
    // Verifica módulo MP
    const subscription = await (db as any).subscription.findUnique({
      where: { userId: company.ownerId }
    });

    if (!subscription?.hasMercadoPagoModule && company.ownerId !== "user_39S9qNrKwwgObMZffifdZyNKUKm") {
      return NextResponse.json({ error: "O módulo de pagamentos online não está ativo." }, { status: 403 });
    }

    if (!company.mercadopagoAccessToken) {
      return NextResponse.json({ error: "Esta empresa ainda não configurou pagamentos online." }, { status: 400 });
    }

    const client = new MercadoPagoConfig({
      accessToken: company.mercadopagoAccessToken,
    });

    const preference = new Preference(client);

    // Mapeamento de métodos aceitos
    const excludedMethods: any[] = [];
    const mpMethodsMappings: Record<string, string> = {
        'credit_card': 'credit_card',
        'debit_card': 'debit_card',
        'ticket': 'ticket',
        'pix': 'pix'
    };

    if (vitrineSettings.acceptedMethods && Array.isArray(vitrineSettings.acceptedMethods)) {
        // Se o usuário selecionou alguns, excluímos os outros
        Object.keys(mpMethodsMappings).forEach(m => {
            if (!vitrineSettings.acceptedMethods.includes(m)) {
                excludedMethods.push({ id: mpMethodsMappings[m] });
            }
        });
    }

    const host = req.headers.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const result = await preference.create({
      body: {
        items: mpItems,
        payment_methods: {
            excluded_payment_types: excludedMethods
        },
        payer: {
          email: customerInfo.email,
          name: customerInfo.name,
        },
        back_urls: {
          success: `${baseUrl}/${slug}/vitrine?payment=success&orderId=${order.id}`,
          failure: `${baseUrl}/${slug}/vitrine?payment=failure&orderId=${order.id}`,
          pending: `${baseUrl}/${slug}/vitrine?payment=pending&orderId=${order.id}`,
        },
        auto_return: "approved",
        external_reference: `${company.id}__${order.id}`,
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        metadata: {
            orderId: order.id,
            companyId: company.id,
            slug: slug
        }
      },
    });

    return NextResponse.json({ id: result.id, orderId: order.id });
  } catch (error) {
    console.error("ERRO_MP_PREFERENCE:", error);
    return NextResponse.json({ error: "Erro ao gerar link de pagamento", debug: String(error) }, { status: 500 });
  }
}
