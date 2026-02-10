import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });
    const body = await req.json();
    const company = await prisma.company.findFirst({ where: { ownerId: userId } });
    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const despesa = await prisma.expense.create({
      data: {
        description: body.description,
        value: parseFloat(body.value),
        category: body.category,
        frequency: body.frequency || "ONCE",
        date: new Date(body.date),
        companyId: company.id
      }
    });
    return NextResponse.json(despesa);
  } catch (error) { return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 }); }
}

// NOVO: Função para ATUALIZAR despesa
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    const { id, description, value, category, frequency, date } = body;

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        description,
        value: parseFloat(value),
        category,
        frequency,
        date: new Date(date),
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });
    const { id } = await req.json();
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 }); }
}