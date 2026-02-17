import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

import { addWeeks, addMonths, addYears } from "date-fns";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const body = await req.json();

    // 1. Descobre a empresa (Robust Check)
    let companyId = null;
    const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
    if (ownerCompany) {
      companyId = ownerCompany.id;
    } else {
      const member = await prisma.teamMember.findUnique({ where: { clerkUserId: userId } });
      if (member) {
        companyId = member.companyId;
      } else {
        const professional = await prisma.professional.findFirst({
          where: { userId: userId }
        });
        if (professional) companyId = professional.companyId;
      }
    }

    if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const expensesToCreate = [];
    // Adiciona T12:00:00 para evitar que o fuso horário (ex: -3h) jogue para o dia anterior
    const baseDate = new Date(`${body.date}T12:00:00`);

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
        companyId: companyId
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
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { id, description, value, category, frequency, date } = body;

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        description,
        value: parseFloat(value),
        category,
        frequency,
        date: new Date(`${date}T12:00:00`),
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
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id, deleteSeries } = await req.json();

    if (deleteSeries) {
      // Busca a despesa original para pegar os critérios de grupo
      const original = await prisma.expense.findUnique({ where: { id } });
      if (original) {
        await prisma.expense.deleteMany({
          where: {
            companyId: original.companyId,
            description: original.description,
            value: original.value,
            category: original.category,
            frequency: original.frequency,
            // Opcional: Se quiser apagar só as futuras:
            // date: { gte: original.date } 
            // Mas como o usuário reclamou de "apagar uma por uma", provavelmente quer limpar a série toda.
          }
        });
      }
    } else {
      await prisma.expense.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 }); }
}