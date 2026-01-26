import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientId, serviceId, professionalId, companyId, date, name, phone } = body;

    const newBooking = await prisma.booking.create({
      data: {
        date: new Date(date),
        customerName: name,
        customerPhone: phone,
        serviceId: serviceId,
        professionalId: professionalId,
        companyId: companyId,
        // Garante que vincula ao ID do cliente fixo
        clientId: clientId || null 
      }
    });

    return NextResponse.json(newBooking);
  } catch (error) {
    return new NextResponse("Erro", { status: 500 });
  }
}