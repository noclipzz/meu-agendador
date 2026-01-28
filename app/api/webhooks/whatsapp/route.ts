import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const body = await req.json();

  // Lógica da Evolution API: captura a mensagem recebida
  const mensagem = body.data?.message?.conversation || body.data?.content;
  const telefoneRemetente = body.data?.key?.remoteJid.replace("@s.whatsapp.net", "");

  if (mensagem === "1" || mensagem?.toLowerCase().includes("confirmo")) {
    // Busca o agendamento pendente mais recente desse telefone
    const ag = await prisma.booking.findFirst({
        where: { customerPhone: { contains: telefoneRemetente.slice(-8) }, status: "PENDENTE" },
        orderBy: { date: 'asc' }
    });

    if (ag) {
        await prisma.booking.update({
            where: { id: ag.id },
            data: { status: "CONFIRMADO" }
        });
    }
  }

  return NextResponse.json({ ok: true });
}