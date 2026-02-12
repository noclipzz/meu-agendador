import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

import { addWeeks, addMonths, addYears } from "date-fns";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });
    const body = await req.json();
    const company = await prisma.company.findFirst({ where: { ownerId: userId } });
    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const expensesToCreate = [];
    const baseDate = new Date(body.date); // Garante que é Date

    // Definição de quantas repetições criar
    let occurrences = 1;
    if (body.frequency === 'WEEKLY') occurrences = 52; // 1 ano de semanas
    if (body.frequency === 'MONTHLY') occurrences = 12; // 1 ano de meses
    if (body.frequency === 'YEARLY') occurrences = 5; // 5 anos

    for (let i = 0; i < occurrences; i++) {
      let nextDate = new Date(baseDate);

      // Calcula a próxima data com base na frequência e no índice
      if (i > 0) {
        if (body.frequency === 'WEEKLY') nextDate = addWeeks(baseDate, i);
        else if (body.frequency === 'MONTHLY') nextDate = addMonths(baseDate, i);
        else if (body.frequency === 'YEARLY') nextDate = addYears(baseDate, i);
      }

      expensesToCreate.push({
        description: body.description, // Mantém a mesma descrição
        value: parseFloat(body.value),
        category: body.category,
        frequency: body.frequency || "ONCE",
        date: nextDate,
        companyId: company.id
      });
    }

    // Usa createMany para inserir tudo de uma vez (Performance)
    await prisma.expense.createMany({
      data: expensesToCreate
    });

    return NextResponse.json({ success: true, count: occurrences });

  } catch (error) {
    console.error("ERRO_CRIAR_DESPESA:", error);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
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