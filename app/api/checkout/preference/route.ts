import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { sendPushNotification } from "@/lib/push-server";

export async function POST(req: Request) {
  try {
    const { items, customerInfo, deliveryMethod, companyId, slug, addressInfo, shippingCost, paymentMode } = await req.json();

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
        paymentMethod: paymentMode === "DELIVERY" ? "PAGAMENTO_NA_ENTREGA" : null,
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
    try {
      await sendPushNotification(
        company.ownerId,
        "📦 Novo Pedido na Vitrine",
        `${customerInfo.name} realizou um pedido de R$ ${totalItems.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        "/painel/vitrine/pedidos"
      );
    } catch (e) {
      console.error("Erro ao enviar push:", e);
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
          failure: `${baseUrl}/${slug}/vitrine?payment=failure`,
          pending: `${baseUrl}/${slug}/vitrine?payment=pending`,
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

    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("ERRO_MP_PREFERENCE:", error);
    return NextResponse.json({ error: "Erro ao gerar link de pagamento", debug: String(error) }, { status: 500 });
  }
}
