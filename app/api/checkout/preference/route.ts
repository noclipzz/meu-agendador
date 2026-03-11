import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MercadoPagoConfig, Preference } from "mercadopago";

export async function POST(req: Request) {
  try {
    const { productId, companyId, slug } = await req.json();

    if (!productId || !companyId) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // 1. Busca a empresa para pegar o Access Token do Mercado Pago
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: {
        products: {
            where: { id: productId }
        }
      }
    });

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    if (!company.mercadopagoAccessToken) {
      return NextResponse.json({ error: "Esta empresa ainda não configurou pagamentos online." }, { status: 400 });
    }

    const product = company.products[0];
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    // 2. Configura o Mercado Pago com o token da empresa
    const client = new MercadoPagoConfig({
      accessToken: company.mercadopagoAccessToken,
    });

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: product.id,
            title: product.name,
            quantity: 1,
            unit_price: Number(product.price || 0),
            currency_id: "BRL",
            picture_url: product.imageUrl || undefined,
            description: product.description || undefined,
          },
        ],
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meu-agendador.com'}/${slug}?payment=success`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meu-agendador.com'}/${slug}?payment=failure`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meu-agendador.com'}/${slug}?payment=pending`,
        },
        auto_return: "approved",
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meu-agendador.com'}/api/webhooks/mercadopago`,
        metadata: {
            productId: product.id,
            companyId: company.id,
            slug: slug
        }
      },
    });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("ERRO_MP_PREFERENCE:", error);
    return NextResponse.json({ error: "Erro ao gerar link de pagamento" }, { status: 500 });
  }
}
