import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const prisma = db;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: "Slug faltando" }, { status: 400 });
    }

    // Busca a empresa pelo link (slug)
    const empresa = await prisma.company.findUnique({
      where: { slug: slug },
      include: {
        services: true,
        professionals: {
          include: {
            services: true // Inclui os serviços vinculados para o filtro na tela de agendamento funcionar
          }
        },
        products: {
          where: { showInVitrine: true },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            unitValue: true,
            imageUrl: true,
            quantity: true,
            showStock: true,
            deliveryDeadline: true,
            shippingCost: true,
            variations: true,
          }
        }
      }
    });

    if (!empresa) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // Busca a assinatura do dono
    const subscription = await prisma.subscription.findUnique({
      where: { userId: empresa.ownerId }
    });

    const hasMercadoPagoModule = subscription?.hasMercadoPagoModule || empresa.ownerId === "user_39S9qNrKwwgObMZffifdZyNKUKm";

    // O objeto 'empresa' aqui já inclui instagramUrl e facebookUrl automaticamente
    return NextResponse.json({
      ...empresa,
      // Nunca retornar o Access Token e Public Key privadas para o front-end público!
      mercadopagoAccessToken: undefined,
      mercadopagoPublicKey: empresa.mercadopagoPublicKey || null, // A chave pública pode ser enviada se necessário para o Brick, mas cuidado.
      hasMercadoPagoModule
    });

  } catch (error) {
    console.error("ERRO_GET_EMPRESA_PUBLICA:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}