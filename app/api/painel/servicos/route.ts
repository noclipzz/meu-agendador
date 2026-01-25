import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

// LISTAR
export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json([], { status: 401 });
  const company = await prisma.company.findFirst({ where: { ownerId: userId }, include: { services: true } });
  return NextResponse.json(company?.services || []);
}

// ADICIONAR
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({}, { status: 401 });
    const body = await req.json();
    const company = await prisma.company.findFirst({ where: { ownerId: userId } });
    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const service = await prisma.service.create({
        data: { name: body.name, price: Number(body.price), duration: parseInt(body.duration), companyId: company.id }
    });
    return NextResponse.json(service);
  } catch (error) { return NextResponse.json({ error: "Erro" }, { status: 500 }); }
}

// EDITAR (NOVO!)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const updated = await prisma.service.update({
        where: { id: body.id },
        data: { name: body.name, price: Number(body.price), duration: parseInt(body.duration) }
    });
    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 }); }
}

// DELETAR
export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { userId } = auth();
        
        // Verifica se o serviço pertence a uma empresa do usuário logado (Segurança)
        const service = await prisma.service.findUnique({
            where: { id: body.id },
            include: { company: true }
        });

        if (service && service.company.ownerId === userId) {
            await prisma.service.delete({ where: { id: body.id } });
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }
    } catch(e) { return NextResponse.json({error: "Erro ao deletar"}, {status: 500}) }
}