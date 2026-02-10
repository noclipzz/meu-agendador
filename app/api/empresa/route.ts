import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const prisma = db;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("--- TENTATIVA DE CRIAÇÃO ---");

    if (!body.ownerId) return NextResponse.json({ error: "Sem ID" }, { status: 400 });

    // 1. TRAVA: Verifica se já tem empresa
    const jaTem = await prisma.company.count({
      where: { ownerId: body.ownerId }
    });

    if (jaTem > 0) {
      return NextResponse.json({ error: "Você já possui uma empresa." }, { status: 400 });
    }

    // 2. VERIFICA O SLUG (LINK)
    const slugEmUso = await prisma.company.findUnique({
      where: { slug: body.slug }
    });

    if (slugEmUso) {
      return NextResponse.json({ error: "Este link já está em uso por outra pessoa." }, { status: 409 });
    }

    // 3. Cria a empresa
    const company = await prisma.company.create({
      data: {
        name: body.name,
        slug: body.slug,
        ownerId: body.ownerId,
        services: { create: [{ name: "Atendimento Padrão", price: 100, duration: 60 }] }
      }
    });

    // 4. CRIA OU ATUALIZA A ASSINATURA (Correção aqui!)
    // Usamos 'upsert' para não quebrar se já existir um registro velho
    const hoje = new Date();
    const validade = new Date(hoje.setDate(hoje.getDate() + 30));

    await prisma.subscription.upsert({
      where: { userId: body.ownerId },
      update: {
        status: "ACTIVE",
        expiresAt: validade
      },
      create: {
        userId: body.ownerId,
        plan: "PADRAO",
        status: "ACTIVE",
        expiresAt: validade
      }
    });

    return NextResponse.json(company);

  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}