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

    // Busca o plano do DONO da empresa
    const subscription = await prisma.subscription.findUnique({
      where: { userId: config.ownerId }
    });

    return NextResponse.json({ ...config, plan: subscription?.plan || "FREE" });
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

    // 1. Validação do Nome
    if (!body.name) {
      return NextResponse.json({ error: "O nome da empresa é obrigatório." }, { status: 400 });
    }

    // VALIDAÇÕES EXTRAS
    if (body.notificationEmail && !validateEmail(body.notificationEmail)) {
      return NextResponse.json({ error: "E-mail de notificação inválido." }, { status: 400 });
    }
    if (body.cnpj && !validateCNPJ(body.cnpj)) {
      return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
    }

    const slugDesejado = gerarSlug(body.name);

    // 2. Validação de Link Único (Slug)
    const empresaComMesmoSlug = await prisma.company.findUnique({
      where: { slug: slugDesejado }
    });

    if (empresaComMesmoSlug && empresaComMesmoSlug.ownerId !== userId) {
      return NextResponse.json(
        { error: "Este nome de empresa já está em uso. Escolha outro para o seu link." },
        { status: 400 }
      );
    }

    // 3. Busca se o usuário já tem uma empresa cadastrada
    const existingConfig = await prisma.company.findFirst({
      where: { ownerId: userId }
    });

    // 4. Organiza os dados garantindo valores padrão (evita erro de 'undefined')
    const dataToSave = {
      name: body.name,
      slug: slugDesejado,
      notificationEmail: body.notificationEmail || null,
      instagramUrl: body.instagramUrl || "",
      facebookUrl: body.facebookUrl || "",
      openTime: body.openTime || "09:00",
      closeTime: body.closeTime || "18:00",
      lunchStart: body.lunchStart || "12:00",
      lunchEnd: body.lunchEnd || "13:00",
      logoUrl: body.logoUrl || "",
      monthlyGoal: body.monthlyGoal ? Number(body.monthlyGoal) : 5000,
      workDays: body.workDays || "1,2,3,4,5",
      interval: body.interval ? Number(body.interval) : 30,
      whatsappMessage: body.whatsappMessage || "Olá {nome}, recebemos seu agendamento para *{servico}* em {dia} às {hora}.\\n\\nDigite *1* para Confirmar ou *2* para Cancelar.",
      whatsappConfirmMessage: body.whatsappConfirmMessage || "✅ *Agendamento Confirmado!*\\n\\n{nome}, seu horário para *{servico}* está garantido. Até lá!",
      whatsappCancelPromptMessage: body.whatsappCancelPromptMessage || "⚠️ *Confirmação de Cancelamento*\\n\\n{nome}, você deseja realmente *CANCELAR* seu horário de *{servico}*?\\n\\nResponda *SIM* para confirmar o cancelamento definitivo.",
      whatsappCancelSuccessMessage: body.whatsappCancelSuccessMessage || "❌ *Agendamento Cancelado*\\n\\nSeu agendamento foi cancelado com sucesso.",
      whatsappCancelRevertMessage: body.whatsappCancelRevertMessage || "Entendido! Mantivemos seu agendamento como *Pendente*. Caso deseje confirmar, digite *Sim*.",
      // Novos Campos
      cnpj: body.cnpj || null,
      phone: body.phone || null,
      cep: body.cep || null,
      address: body.address || null,
      number: body.number || null,
      complement: body.complement || null,
      neighborhood: body.neighborhood || null,
      city: body.city || null,
      state: body.state || null,
      // Focus NFe
      inscricaoMunicipal: body.inscricaoMunicipal || null,
      regimeTributario: body.regimeTributario ? Number(body.regimeTributario) : 1,
      naturezaOperacao: body.naturezaOperacao ? Number(body.naturezaOperacao) : 1,
      codigoServico: body.codigoServico || null,
      aliquotaServico: body.aliquotaServico ? Number(body.aliquotaServico) : 0,
      certificadoA1Url: body.certificadoA1Url || null,
      certificadoSenha: body.certificadoSenha || null,
      // Taxas
      creditCardTax: body.creditCardTax ? Number(body.creditCardTax) : 0,
      debitCardTax: body.debitCardTax ? Number(body.debitCardTax) : 0
    };

    if (existingConfig) {
      // Atualiza a empresa existente
      const updated = await prisma.company.update({
        where: { id: existingConfig.id },
        data: dataToSave,
      });
      return NextResponse.json(updated);
    } else {
      // --- CORREÇÃO: Criar empresa incluindo o ownerId obrigatório ---
      const created = await prisma.company.create({
        data: {
          ...dataToSave,
          ownerId: userId // VINCULA AO SEU USUÁRIO DO CLERK
        }
      });
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("ERRO_AO_SALVAR_CONFIG:", error);
    return new NextResponse("Erro interno ao salvar configurações", { status: 500 });
  }
}