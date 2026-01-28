import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

// --- LISTAR PROFISSIONAIS DA EMPRESA ---
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json([], { status: 401 });

    const company = await prisma.company.findFirst({ 
      where: { ownerId: userId }
    });

    if (!company) return NextResponse.json([]);

    const profissionais = await prisma.professional.findMany({
      where: { companyId: company.id },
      include: { 
        bookings: {
          where: { status: "CONFIRMADO" }, // Só conta para comissão o que foi confirmado
          include: { service: true }
        }
      }
    });

    return NextResponse.json(profissionais);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar equipe" }, { status: 500 });
  }
}

// --- ADICIONAR PROFISSIONAL (COM TRAVA DE PLANO) ---
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    
    // 1. Busca a empresa e os profissionais atuais
    const company = await prisma.company.findFirst({ 
      where: { ownerId: userId },
      include: { professionals: true }
    });
    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    // 2. Busca a assinatura para verificar o limite do plano
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    const plano = sub?.plan || "INDIVIDUAL";

    // 3. Define os limites por plano
    const limites = { "INDIVIDUAL": 1, "PREMIUM": 5, "MASTER": 15 };
    const limiteMaximo = limites[plano as keyof typeof limites] || 1;

    // 4. Verifica se atingiu o limite
    if (company.professionals.length >= limiteMaximo) {
      return NextResponse.json(
        { error: `Limite atingido! O plano ${plano} permite no máximo ${limiteMaximo} profissionais.` }, 
        { status: 403 }
      );
    }

    // 5. Cria o profissional
    const professional = await prisma.professional.create({
        data: {
            name: body.name,
            phone: body.phone,
            photoUrl: body.photoUrl,
            color: body.color || "#3b82f6",
            userId: body.userId || null, // Opcional: ID do Clerk para login do funcionário
            companyId: company.id
        }
    });

    return NextResponse.json(professional);
  } catch (error) {
    console.error("ERRO_PRO_POST:", error);
    return NextResponse.json({ error: "Erro interno ao criar profissional" }, { status: 500 });
  }
}

// --- ATUALIZAR PROFISSIONAL ---
export async function PUT(req: Request) {
  try {
    const { userId: ownerId } = await auth();
    if (!ownerId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();

    // Atualiza garantindo que o profissional pertence a uma empresa do dono logado
    const updated = await prisma.professional.update({
        where: { id: body.id },
        data: {
            name: body.name,
            phone: body.phone,
            photoUrl: body.photoUrl,
            color: body.color,
            userId: body.userId // Permite vincular/alterar a conta de login
        }
    });

    return NextResponse.json(updated);
  } catch(e) { 
    return NextResponse.json({error: "Erro ao atualizar"}, {status: 500}) 
  }
}

// --- DELETAR ---
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    
    // Deleta o profissional
    await prisma.professional.delete({ 
      where: { id: body.id } 
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}