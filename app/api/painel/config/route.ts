import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { validateEmail, validateCNPJ } from "@/lib/validators";

const prisma = db;

// Função para transformar "Studio VIP" em "studio-vip" (Link Profissional)
function gerarSlug(text: string) {
  if (!text) return "empresa-" + Math.floor(Math.random() * 1000);
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    // Busca a empresa onde o usuário é o DONO ou onde ele é um PROFISSIONAL vinculado
    const config = await prisma.company.findFirst({
      where: {
        OR: [
          { ownerId: userId },
          { professionals: { some: { userId: userId } } }
        ]
      }
    });

    if (!config) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // --- 🔐 SUPER ADMIN VITALÍCIO ---
    const SUPER_ADMIN = "user_39S9qNrKwwgObMZffifdZyNKUKm";
    if (userId === SUPER_ADMIN) {
      return NextResponse.json({
        ...config,
        plan: "MASTER",
        expiresAt: "2099-12-31T23:59:59.000Z",
        subscriptionStatus: "ACTIVE",
        cancelAtPeriodEnd: false,
        hasNfeModule: true,
        hasBoletoModule: true,
        hasDigitalSignatureModule: true,
        extraUsersCount: 0,
        isOwner: true
      });
    }

    // Busca o plano do DONO da empresa
    const subscription = await prisma.subscription.findUnique({
      where: { userId: config.ownerId }
    }) as any;

    return NextResponse.json({
      ...config,
      plan: subscription?.plan || "FREE",
      expiresAt: subscription?.expiresAt || null,
      subscriptionStatus: subscription?.status || "INACTIVE",
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      hasNfeModule: subscription?.hasNfeModule || false,
      hasBoletoModule: subscription?.hasBoletoModule || false,
      hasDigitalSignatureModule: subscription?.hasDigitalSignatureModule || false,
      extraUsersCount: subscription?.extraUsersCount || 0,
      isOwner: config.ownerId === userId // ✅ Flag de dono
    });
  } catch (error) {
    console.error("ERRO_GET_CONFIG:", error);
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session.userId;
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();

    // 3. Busca se o usuário já tem uma empresa cadastrada
    const existingConfig = await prisma.company.findFirst({
      where: { ownerId: userId }
    });

    if (!existingConfig && !body.name) {
      return NextResponse.json({ error: "O nome da empresa é obrigatório na primeira configuração." }, { status: 400 });
    }

    // VALIDAÇÕES EXTRAS SOMENTE SE ENVIADAS
    if (body.notificationEmail !== undefined && body.notificationEmail !== null && body.notificationEmail !== "" && !validateEmail(body.notificationEmail)) {
      return NextResponse.json({ error: "E-mail de notificação inválido." }, { status: 400 });
    }
    if (body.cnpj !== undefined && body.cnpj !== null && body.cnpj !== "" && !validateCNPJ(body.cnpj)) {
      return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
    }

    const dataToSave: any = {};

    // Processar campos tipo String
    const stringFields = [
      "name", "notificationEmail", "instagramUrl", "facebookUrl",
      "openTime", "closeTime", "lunchStart", "lunchEnd", "logoUrl",
      "signatureUrl", "legalRepresentative", "workDays", "corporateName",
      "cnpj", "phone", "cep", "address", "number", "complement", "neighborhood",
      "city", "state", "inscricaoMunicipal", "codigoServico", "certificadoA1Url",
      "certificadoSenha", "coraClientId", "coraCertUrl", "coraKeyUrl",
      "cnae", "fiscalPadraoDesc" // Novos campos NFS-e
    ];

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        dataToSave[field] = body[field] || null; // Se vazio, vira null
      }
    }

    // Processar campos tipo Number
    const numberFields = [
      "monthlyGoal", "interval", "regimeTributario", "naturezaOperacao",
      "aliquotaServico", "inssTax", "creditCardTax", "debitCardTax",
      "coraFineRate", "coraInterestRate", "coraDiscountRate"
    ];

    for (const field of numberFields) {
      if (body[field] !== undefined) {
        dataToSave[field] = Number(body[field]);
      }
    }

    // Processar campos tipo Boolean
    if (body.issRetidoTomador !== undefined) {
      dataToSave.issRetidoTomador = Boolean(body.issRetidoTomador);
    }

    // Consertando campos nulos que deviam ser string
    if (dataToSave.name === null) delete dataToSave.name; // name nunca pode ser nulo
    if (dataToSave.interval === null || isNaN(dataToSave.interval)) delete dataToSave.interval;

    if (body.name) {
      const slugDesejado = gerarSlug(body.name);
      const empresaComMesmoSlug = await prisma.company.findUnique({
        where: { slug: slugDesejado }
      });
      if (empresaComMesmoSlug && empresaComMesmoSlug.ownerId !== userId) {
        return NextResponse.json({ error: "Este nome de empresa já está em uso. Escolha outro para o seu link." }, { status: 400 });
      }
      dataToSave.slug = slugDesejado;
    }

    if (existingConfig) {
      const updated = await prisma.company.update({
        where: { id: existingConfig.id },
        data: dataToSave,
      });
      return NextResponse.json(updated);
    } else {
      dataToSave.ownerId = userId;
      const created = await prisma.company.create({
        data: dataToSave
      });
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("ERRO_AO_SALVAR_CONFIG:", error);
    return new NextResponse("Erro interno ao salvar configurações", { status: 500 });
  }
}