import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

// BUSCAR
export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({}, { status: 401 });

  const company = await prisma.company.findFirst({ where: { ownerId: userId } });
  return NextResponse.json(company);
}

// SALVAR
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({}, { status: 401 });

    const body = await req.json();

    const company = await prisma.company.findFirst({ where: { ownerId: userId } });
    if (!company) return NextResponse.json({ error: "Empresa não achada" }, { status: 404 });

    await prisma.company.update({
        where: { id: company.id },
        data: {
            openTime: body.openTime,
            closeTime: body.closeTime,
            interval: body.interval,
            workDays: body.workDays,
            logoUrl: body.logoUrl,
            lunchStart: body.lunchStart,
            lunchEnd: body.lunchEnd,
            monthlyGoal: body.monthlyGoal // <--- ADICIONE ISSO
        }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}