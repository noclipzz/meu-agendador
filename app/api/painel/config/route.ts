import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    // BUSCA A EMPRESA VINCULADA AO USUÁRIO LOGADO
    const config = await prisma.company.findFirst({
      where: { ownerId: userId }
    });
    
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar empresa" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    
    // Verifica se ele já tem uma empresa
    const existingConfig = await prisma.company.findFirst({
      where: { ownerId: userId }
    });

    const data = {
      name: body.name,
      ownerId: userId, // Vínculo essencial
      slug: body.name.toLowerCase().replace(/ /g, "-") + "-" + Math.floor(Math.random() * 1000),
      openTime: body.openTime || "09:00",
      closeTime: body.closeTime || "18:00",
      lunchStart: body.lunchStart || "12:00",
      lunchEnd: body.lunchEnd || "13:00",
      logoUrl: body.logoUrl || "",
      monthlyGoal: Number(body.monthlyGoal) || 0,
      whatsappMessage: body.whatsappMessage || "Olá {nome}, seu agendamento está confirmado!"
    };

    if (existingConfig) {
      const updated = await prisma.company.update({
        where: { id: existingConfig.id },
        data,
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.company.create({ data });
      return NextResponse.json(created);
    }
  } catch (error) {
    return new NextResponse("Erro ao salvar", { status: 500 });
  }
}