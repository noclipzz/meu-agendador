import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MercadoPagoConfig, Preference } from "mercadopago";

export async function POST(req: Request) {
  try {
    const { items, customerInfo, deliveryMethod, companyId, slug, addressInfo, shippingCost } = await req.json();

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

    // 4. Configura o Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: company.mercadopagoAccessToken,
    });

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: mpItems,
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meu-agendador.com'}/${slug}/vitrine?payment=success&orderId=${order.id}`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meu-agendador.com'}/${slug}/vitrine?payment=failure`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meu-agendador.com'}/${slug}/vitrine?payment=pending`,
        },
        auto_return: "approved",
        external_reference: order.id,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meu-agendador.com'}/api/webhooks/mercadopago`,
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
