import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const { userId } = await auth();
    const company = await prisma.company.findFirst({ where: { ownerId: userId } });
    if (!company) return NextResponse.json([]);
    const services = await prisma.service.findMany({ where: { companyId: company.id } });
    return NextResponse.json(services);
  } catch (error) { return NextResponse.json([], { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const company = await prisma.company.findFirst({ where: { ownerId: userId } });
    
    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const service = await prisma.service.create({
        data: {
            name: body.name,
            price: parseFloat(body.price),
            duration: parseInt(body.duration),
            commission: parseInt(body.commission || '0'), // SALVA A COMISSÃO
            companyId: company.id
        }
    });
    return NextResponse.json(service);
  } catch (error) { return NextResponse.json({ error: "Erro interno" }, { status: 500 }); }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const updated = await prisma.service.update({
        where: { id: body.id },
        data: {
            name: body.name,
            price: parseFloat(body.price),
            duration: parseInt(body.duration),
            commission: parseInt(body.commission || '0') // ATUALIZA A COMISSÃO
        }
    });
    return NextResponse.json(updated);
  } catch(e) { return NextResponse.json({error: "Erro"}, {status: 500}) }
}

export async function DELETE(req: Request) {
    const body = await req.json();
    await prisma.service.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
}