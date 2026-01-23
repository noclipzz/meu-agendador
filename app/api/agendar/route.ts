import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceId, companyId, date, name, phone } = body;

    // 1. A TRAVA DE SEGURANÇA: Verifica se já existe agendamento neste horário e empresa
    const conflito = await prisma.booking.findFirst({
        where: {
            companyId: companyId, // Na mesma empresa
            date: new Date(date)  // No mesmo horário exato
        }
    });

    if (conflito) {
        return NextResponse.json({ error: "Este horário acabou de ser ocupado!" }, { status: 409 });
    }

    // 2. Se passou, salva no banco
    const booking = await prisma.booking.create({
      data: {
        date: new Date(date),
        customerName: name,
        customerPhone: phone,
        serviceId: serviceId,
        companyId: companyId,
      },
    });

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error("Erro ao agendar:", error);
    return NextResponse.json({ error: "Erro ao agendar" }, { status: 500 });
  }
}