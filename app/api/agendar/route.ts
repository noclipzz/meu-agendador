import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceId, companyId, date, name, phone } = body;

    // Salva no banco de dados
    const booking = await prisma.booking.create({
      data: {
        date: new Date(date), // Converte o texto para formato de data
        customerName: name,
        customerPhone: phone,
        serviceId: serviceId,
        companyId: companyId,
      },
    });

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error("Erro ao salvar agendamento:", error);
    return NextResponse.json({ error: "Erro ao agendar" }, { status: 500 });
  }
}