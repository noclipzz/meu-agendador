import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

// LISTAR (GET)
export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json([], { status: 401 });

  const company = await prisma.company.findFirst({ 
    where: { ownerId: userId },
    include: { professionals: true } 
  });
  
  return NextResponse.json(company?.professionals || []);
}

// ADICIONAR (POST)
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({}, { status: 401 });

    const body = await req.json();
    const company = await prisma.company.findFirst({ where: { ownerId: userId } });

    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const professional = await prisma.professional.create({
        data: {
            name: body.name,
            phone: body.phone,
            photoUrl: body.photoUrl,
            companyId: company.id
        }
    });

    return NextResponse.json(professional);
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ATUALIZAR (PUT)
export async function PUT(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({}, { status: 401 });

    const body = await req.json();
    
    const updated = await prisma.professional.update({
        where: { id: body.id },
        data: {
            name: body.name,
            phone: body.phone,
            photoUrl: body.photoUrl
        }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// DELETAR (DELETE)
export async function DELETE(req: Request) {
    const body = await req.json();
    await prisma.professional.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
}