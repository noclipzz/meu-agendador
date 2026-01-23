import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceId, companyId, date, name, phone } = body;

    // 1. LIMPEZA DE TEMPO: Zera segundos e milissegundos
    // Isso garante que 10:00:05 vire 10:00:00
    const dataLimpa = new Date(date);
    dataLimpa.setSeconds(0);
    dataLimpa.setMilliseconds(0);

    // 2. VERIFICAÇÃO RIGOROSA
    const conflito = await prisma.booking.findFirst({
        where: {
            companyId: companyId,
            date: dataLimpa // Busca pela data exata limpa
        }
    });

    if (conflito) {
        return NextResponse.json({ error: "Horário indisponível." }, { status: 409 });
    }

    // 3. SALVA O DADO LIMPO
    const booking = await prisma.booking.create({
      data: {
        date: dataLimpa, // Salva sem segundos
        customerName: name,
        customerPhone: phone,
        serviceId: serviceId,
        companyId: companyId,
      },
    });

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error("Erro no agendamento:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}