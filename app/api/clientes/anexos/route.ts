import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });
    const body = await req.json();
    const anexo = await prisma.attachment.create({
      data: { name: body.name, url: body.url, type: body.type, clientId: body.clientId }
    });
    return NextResponse.json(anexo);
  } catch (error) { return new NextResponse("Erro", { status: 500 }); }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    const { id } = await req.json();
    await prisma.attachment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) { return new NextResponse("Erro", { status: 500 }); }
}