// src/app/api/agendar/confirmar/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    const { id } = body;

    if (!id) return new NextResponse("ID faltando", { status: 400 });

    // Atualiza o status no banco de dados
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CONFIRMADO" }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("ERRO_CONFIRMAR:", error);
    return new NextResponse("Erro interno", { status: 500 });
  }
}