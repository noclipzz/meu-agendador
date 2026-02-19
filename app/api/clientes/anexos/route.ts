import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });
    const body = await req.json();
    const { name, url, type, size, clientId } = body;

    // LIMITE FIXO DE 10MB POR CLIENTE (Para economizar espaço no plano Hobby)
    const limit = 10 * 1024 * 1024;

    // VERIFICA LIMITE POR CLIENTE
    const totalUsage = await (prisma.attachment as any).aggregate({
      where: { clientId },
      _sum: { size: true }
    });

    const currentUsage = Number(totalUsage._sum?.size || 0);

    if (currentUsage + Number(size || 0) > limit) {
      return NextResponse.json({ error: "Limite de 10MB em arquivos atingido para este cliente." }, { status: 400 });
    }

    const anexo = await (prisma.attachment as any).create({
      data: { name, url, type, size: Number(size || 0), clientId }
    });
    return NextResponse.json(anexo);
  } catch (error) {
    console.error("ERRO_ANEXOS_POST:", error);
    return new NextResponse("Erro", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const { id } = await req.json();
    await prisma.attachment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) { return new NextResponse("Erro", { status: 500 }); }
}