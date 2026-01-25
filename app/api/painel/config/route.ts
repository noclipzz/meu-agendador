import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const config = await prisma.company.findFirst();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    const config = await prisma.company.findFirst();

    const data = {
      openTime: body.openTime,
      closeTime: body.closeTime,
      lunchStart: body.lunchStart,
      lunchEnd: body.lunchEnd,
      logoUrl: body.logoUrl,
      monthlyGoal: Number(body.monthlyGoal) || 0,
      workDays: body.workDays,
      interval: Number(body.interval) || 30,
      whatsappMessage: body.whatsappMessage // Campo crucial
    };

    if (config) {
      const res = await prisma.company.update({ where: { id: config.id }, data });
      return NextResponse.json(res);
    } else {
      const res = await prisma.company.create({ data });
      return NextResponse.json(res);
    }
  } catch (error) {
    console.error(error);
    return new NextResponse("Erro Interno", { status: 500 });
  }
}