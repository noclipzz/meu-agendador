import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

// LISTAR
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json([], { status: 401 });

    const company = await prisma.company.findFirst({ 
      where: { ownerId: userId },
      include: { professionals: true } 
    });
    
    return NextResponse.json(company?.professionals || []);
  } catch (error) {
    console.error("Erro ao listar profissionais:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// ADICIONAR
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({}, { status: 401 });

    const body = await req.json();
    console.log("Tentando criar profissional:", body); // DEBUG

    // 1. Acha a empresa
    const company = await prisma.company.findFirst({ where: { ownerId: userId } });
    
    if (!company) {
        console.log("Empresa não encontrada para o usuário:", userId);
        return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // 2. Cria o profissional
    const professional = await prisma.professional.create({
        data: {
            name: body.name,
            phone: body.phone,
            photoUrl: body.photoUrl,
            companyId: company.id
        }
    });

    console.log("Profissional criado:", professional);
    return NextResponse.json(professional);

  } catch (error) {
    // AQUI VAI APARECER O ERRO REAL
    console.error("❌ ERRO CRÍTICO AO SALVAR PROFISSIONAL:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// EDITAR (PUT)
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const updated = await prisma.professional.update({
            where: { id: body.id },
            data: { name: body.name, phone: body.phone, photoUrl: body.photoUrl }
        });
        return NextResponse.json(updated);
    } catch(e) { return NextResponse.json({error: "Erro"}, {status: 500}) }
}

// DELETAR
export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        await prisma.professional.delete({ where: { id: body.id } });
        return NextResponse.json({ success: true });
    } catch(e) { return NextResponse.json({error: "Erro"}, {status: 500}) }
}