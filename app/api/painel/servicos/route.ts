import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

// BUSCAR SERVIÇOS
export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json([], { status: 401 });

  const company = await prisma.company.findFirst({ where: { ownerId: userId }, include: { services: true } });
  return NextResponse.json(company?.services || []);
}

// CRIAR SERVIÇO
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({}, { status: 401 });

  const body = await req.json();
  const company = await prisma.company.findFirst({ where: { ownerId: userId } });

  if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

  const service = await prisma.service.create({
    data: {
        name: body.name,
        price: body.price,
        duration: parseInt(body.duration),
        companyId: company.id
    }
  });

  return NextResponse.json(service);
}

// DELETAR SERVIÇO
export async function DELETE(req: Request) {
    const body = await req.json();
    await prisma.service.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
}