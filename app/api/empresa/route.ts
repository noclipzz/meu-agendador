import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Essa parte evita que o Prisma abra 1000 conexões e trave seu PC
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Vamos ver no terminal o que está chegando
    console.log("--- TENTATIVA DE CRIAÇÃO ---");
    console.log("Dados recebidos:", body);

    if (!body.ownerId) {
        console.log("❌ ERRO: O ID do dono (ownerId) veio vazio.");
        return NextResponse.json({ error: "Usuário não identificado" }, { status: 400 });
    }
    
    // 2. Tenta criar
    const company = await prisma.company.create({
      data: {
        name: body.name,
        slug: body.slug,
        ownerId: body.ownerId,
        services: {
            create: [
                { name: "Atendimento Padrão", price: 100, duration: 60 }
            ]
        }
      }
    });

    console.log("✅ Sucesso! Empresa criada:", company.name);
    return NextResponse.json(company);

  } catch (error) {
    // 3. SE DER ERRO, VAI APARECER AQUI
    console.error("❌ ERRO CRÍTICO DO PRISMA:", error);
    return NextResponse.json({ error: "Erro ao criar empresa" }, { status: 500 });
  }
}