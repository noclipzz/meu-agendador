import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

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

    return NextResponse.json(config);
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
      whatsappMessage: body.whatsappMessage || "Olá {nome}, seu agendamento está confirmado para {dia} às {hora}."
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