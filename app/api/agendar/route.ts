import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceId, companyId, date, name, phone, professionalId } = body; // <--- RECEBE ID

    // ... (limpeza de data igual) ...
    const dataLimpa = new Date(date);
    dataLimpa.setSeconds(0); dataLimpa.setMilliseconds(0);

    // VERIFICA SE *ESSE* PROFISSIONAL ESTÁ LIVRE
    const conflito = await prisma.booking.findFirst({
        where: {
            companyId: companyId,
            professionalId: professionalId, // <--- TRAVA SÓ PARA ELE
            date: dataLimpa
        }
    });

    if (conflito) return NextResponse.json({ error: "Horário ocupado." }, { status: 409 });

    const booking = await prisma.booking.create({
      data: {
        date: dataLimpa,
        customerName: name,
        customerPhone: phone,
        serviceId: serviceId,
        companyId: companyId,
        professionalId: professionalId // <--- SALVA COM ELE
      },
    });

    return NextResponse.json({ success: true, booking });
  } catch (error) { return NextResponse.json({ error: "Erro" }, { status: 500 }); }
}