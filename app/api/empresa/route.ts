import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json(); // <--- AQUI definimos 'body'
    
    console.log("Criando empresa para:", body.ownerId);

    if (!body.ownerId) return NextResponse.json({ error: "Sem ID" }, { status: 400 });

    // 1. TRAVA DE SEGURANÇA
    const jaTem = await prisma.company.count({
        where: { ownerId: body.ownerId }
    });

    if (jaTem > 0) {
        return NextResponse.json({ error: "Limite atingido." }, { status: 400 });
    }
    
    // 2. Cria a empresa
    const company = await prisma.company.create({
      data: {
        name: body.name,
        slug: body.slug,
        ownerId: body.ownerId,
        services: { create: [{ name: "Atendimento Padrão", price: 100, duration: 60 }] }
      }
    });

    // 3. CRIA A ASSINATURA (Aqui estava o erro antes, o 'body' sumia)
    const hoje = new Date();
    const validade = new Date(hoje.setDate(hoje.getDate() + 30));

    await prisma.subscription.create({
        data: {
            userId: body.ownerId, // Agora o 'body' funciona aqui
            plan: "PADRAO",
            expiresAt: validade
        }
    });

    return NextResponse.json(company);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar" }, { status: 500 });
  }
}