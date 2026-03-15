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
    const empresa = await (prisma as any).company.findUnique({
      where: { slug: slug },
      include: {
        services: true,
        professionals: {
          include: {
            services: true 
          }
        },
        vitrineProducts: {
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
        },
        blockedDates: true
      }
    });

    if (!empresa) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // Busca a assinatura do dono
    const subscription = await (prisma as any).subscription.findUnique({
      where: { userId: (empresa as any).ownerId }
    });

    const hasMercadoPagoModule = subscription?.hasMercadoPagoModule || empresa.ownerId === "user_39S9qNrKwwgObMZffifdZyNKUKm";

    const acceptsAsaas = !!empresa.asaasSubaccountId;
    const acceptsOnlinePayment = !!empresa.mercadopagoAccessToken || acceptsAsaas;

    return NextResponse.json({
      ...empresa,
      // Nunca retornar o Access Token e chaves privadas!
      mercadopagoAccessToken: undefined,
      asaasApiKey: undefined,
      asaasSubaccountId: undefined,
      asaasWalletId: undefined,
      asaasBankCode: undefined, // Também opcional esconder se quiser privacidade total
      asaasBankAgency: undefined,
      asaasBankAccount: undefined,
      asaasBankAccountDigit: undefined,
      acceptsAsaas,
      acceptsOnlinePayment,
      mercadopagoPublicKey: empresa.mercadopagoPublicKey || null, 
      hasMercadoPagoModule
    });

  } catch (error) {
    console.error("ERRO_GET_EMPRESA_PUBLICA:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}