import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

// Função para transformar "Studio VIP" em "studio-vip" (Link Profissional)
function gerarSlug(text: string) {
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
    
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session.userId;
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    const slugDesejado = gerarSlug(body.name);

    // 1. Validação de Link Único (Slug)
    const empresaComMesmoSlug = await prisma.company.findUnique({
      where: { slug: slugDesejado }
    });

    // Se já existir esse link e não for da empresa do usuário atual, bloqueia
    if (empresaComMesmoSlug && empresaComMesmoSlug.ownerId !== userId) {
      return NextResponse.json(
        { error: "Este nome de empresa já está em uso por outro usuário. Escolha um nome diferente para o seu link." }, 
        { status: 400 }
      );
    }

    // 2. Busca se o usuário já tem uma empresa cadastrada
    const existingConfig = await prisma.company.findFirst({
      where: { ownerId: userId }
    });

    // 3. Monta o objeto com TODAS as suas funções atuais preservadas
    const data = {
      name: body.name,
      slug: slugDesejado,
      notificationEmail: body.notificationEmail,
      instagramUrl: body.instagramUrl, 
      facebookUrl: body.facebookUrl,   
      openTime: body.openTime,
      closeTime: body.closeTime,
      lunchStart: body.lunchStart,
      lunchEnd: body.lunchEnd,
      logoUrl: body.logoUrl,
      monthlyGoal: Number(body.monthlyGoal) || 0,
      workDays: body.workDays,
      interval: Number(body.interval) || 30,
      whatsappMessage: body.whatsappMessage
    };

    if (existingConfig) {
      // Atualiza a empresa existente
      const updated = await prisma.company.update({
        where: { id: existingConfig.id },
        data,
      });
      return NextResponse.json(updated);
    } else {
      // Cria a empresa pela primeira vez
      const created = await prisma.company.create({ 
        data 
      });
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("ERRO_AO_SALVAR_CONFIG:", error);
    return new NextResponse("Erro interno ao salvar configurações", { status: 500 });
  }
}