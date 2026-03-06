import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { startOfDay, endOfDay, addWeeks, addMonths, addYears, isBefore, isToday } from "date-fns";

const prisma = db;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const frequency = searchParams.get("frequency");
    const search = searchParams.get("search");

    // 1. Descobre a empresa
    let companyId = null;
    const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
    if (ownerCompany) {
      companyId = ownerCompany.id;
    } else {
      const member = await prisma.teamMember.findUnique({ where: { clerkUserId: userId } });
      if (member) {
        companyId = member.companyId;
      } else {
        const professional = await prisma.professional.findFirst({ where: { userId: userId } });
        if (professional) companyId = professional.companyId;
      }
    }

    if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    // 2. Filtros
    const where: any = { companyId };
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        where.dueDate = {
          gte: startDate,
          lte: endDate
        };
      }
    }
    if (status && status !== "TODAS") {
      where.status = status;
    }
    if (category && category !== "TODAS") {
      where.category = category;
    }
    if (frequency && frequency !== "TODAS") {
      where.frequency = frequency;
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } }
      ];
    }

    const expenses = await (prisma.expense as any).findMany({
      where,
      include: { supplier: true, bankAccount: true },
      orderBy: { dueDate: "asc" }
    });

    // 3. Resumo (Estatísticas)
    const today = startOfDay(new Date());

    const summary = {
      overdue: 0,
      today: 0,
      upcoming: 0,
      paid: 0,
      total: 0
    };

    expenses.forEach((exp: any) => {
      const val = Number(exp.value);
      summary.total += val;

      if (exp.status === "PAGO") {
        summary.paid += val;
      } else if (isToday(new Date(exp.dueDate))) {
        summary.today += val;
      } else if (isBefore(new Date(exp.dueDate), today)) {
        summary.overdue += val;
        // Ajusta status para VENCIDO se estiver pendente e com data passada
        if (exp.status === "PENDENTE") exp.status = "VENCIDO";
      } else {
        summary.upcoming += val;
      }
    });

    return NextResponse.json({ expenses, summary });

  } catch (error) {
    console.error("ERRO_GET_DESPESAS:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const user = await currentUser();
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : "Desconhecido";

    const body = await req.json();

    // 1. Descobre a empresa
    let companyId = null;
    const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
    if (ownerCompany) {
      companyId = ownerCompany.id;
    } else {
      const member = await prisma.teamMember.findUnique({ where: { clerkUserId: userId } });
      if (member) {
        companyId = member.companyId;
      } else {
        const professional = await prisma.professional.findFirst({ where: { userId: userId } });
        if (professional) companyId = professional.companyId;
      }
    }

    if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const expensesToCreate = [];
    const expenseDate = body.dueDate || body.date;
    if (!expenseDate) throw new Error("Data de vencimento não informada.");

    // Suporte para datas puras (YYYY-MM-DD) ou ISO
    const datePart = expenseDate.includes('T') ? expenseDate.split('T')[0] : expenseDate;
    const baseDate = new Date(`${datePart}T12:00:00`);

    if (isNaN(baseDate.getTime())) throw new Error("Data de vencimento inválida.");

    let occurrences = 1;
    if (body.frequency === 'WEEKLY') occurrences = 52;
    if (body.frequency === 'MONTHLY') occurrences = body.installments || 12;
    if (body.frequency === 'YEARLY') occurrences = 5;

    for (let i = 0; i < occurrences; i++) {
      let nextDate = new Date(baseDate);
      if (i > 0) {
        if (body.frequency === 'WEEKLY') nextDate = addWeeks(baseDate, i);
        else if (body.frequency === 'MONTHLY') nextDate = addMonths(baseDate, i);
        else if (body.frequency === 'YEARLY') nextDate = addYears(baseDate, i);
      }

      expensesToCreate.push({
        description: occurrences > 1 ? `${body.description} (${i + 1}/${occurrences})` : body.description,
        value: Math.abs(parseFloat(body.value.toString().replace(',', '.'))) || 0,
        category: body.category || "Outros",
        status: body.status || "PENDENTE",
        paymentMethod: body.paymentMethod || "DINHEIRO",
        dueDate: nextDate,
        supplierId: body.supplierId && body.supplierId.length > 5 ? body.supplierId : null,
        paymentAccount: body.paymentAccount,
        bankAccountId: body.bankAccountId || null,
        costCenter: body.costCenter,
        nfe: body.nfe,
        notes: body.notes,
        frequency: body.frequency || "ONCE",
        createdBy: userName,
        updatedBy: userName,
        companyId: companyId
      });
    }

    if (expensesToCreate.length === 0) throw new Error("Nenhum lançamento a criar.");

    await prisma.expense.createMany({ data: expensesToCreate });

    // Abate o saldo das contas bancárias se a despesa já nasceu PAGA
    for (const exp of expensesToCreate) {
      if (exp.status === 'PAGO' && exp.bankAccountId) {
        await prisma.bankAccount.update({
          where: { id: exp.bankAccountId },
          data: { balance: { decrement: exp.value } }
        }).catch(() => { });
      }
    }

    return NextResponse.json({ success: true, count: occurrences });

  } catch (error: any) {
    console.error("ERRO_CRIAR_DESPESA:", error);
    return NextResponse.json({
      error: "Erro ao salvar lançamento",
      message: error.message
    }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const user = await currentUser();
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : "Desconhecido";

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) throw new Error("ID não informado");

    // Sanitização dos dados
    const updateData: any = {
      description: data.description,
      value: data.value ? Math.abs(parseFloat(data.value.toString().replace(',', '.'))) : undefined,
      category: data.category,
      status: data.status,
      paymentMethod: data.paymentMethod,
      dueDate: data.dueDate ? new Date(`${data.dueDate.split('T')[0]}T12:00:00`) : undefined,
      paidAt: data.paidAt ? new Date(`${data.paidAt.split('T')[0]}T12:00:00`) : undefined,
      supplierId: data.supplierId && data.supplierId.length > 5 ? data.supplierId : null,
      paymentAccount: data.paymentAccount,
      bankAccountId: data.bankAccountId || null,
      costCenter: data.costCenter,
      nfe: data.nfe,
      notes: data.notes,
      frequency: data.frequency,
      updatedBy: userName
    };

    const current = await (prisma.expense as any).findUnique({ where: { id } });

    const updated = await (prisma.expense as any).update({
      where: { id },
      data: updateData
    });

    // Controle de saldos bancários
    if (current && updated) {
      // Reverter o estado atual (se a despesa original estava PAGA, devolvemos o dinheiro pra conta que estava atrelada)
      if (current.status === 'PAGO' && current.bankAccountId) {
        await prisma.bankAccount.update({
          where: { id: current.bankAccountId },
          data: { balance: { increment: Number(current.value) } }
        }).catch(() => { });
      }

      // Aplicar o novo estado (se a nova versão da despesa agora está PAGA, tiramos o dinheiro da nova conta)
      if (updated.status === 'PAGO' && updated.bankAccountId) {
        await prisma.bankAccount.update({
          where: { id: updated.bankAccountId },
          data: { balance: { decrement: Number(updated.value) } }
        }).catch(() => { });
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("ERRO_PUT_DESPESA:", error);
    return NextResponse.json({ error: "Erro ao atualizar", message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { id, ids, deleteSeries } = body;

    // Suporte para exclusão em massa
    if (ids && Array.isArray(ids)) {
      const toDelete = await (prisma.expense as any).findMany({ where: { id: { in: ids } } });
      for (const e of toDelete) {
        if (e.status === 'PAGO' && e.bankAccountId) {
          await prisma.bankAccount.update({
            where: { id: e.bankAccountId },
            data: { balance: { increment: Number(e.value) } }
          }).catch(() => { });
        }
      }

      await (prisma.expense as any).deleteMany({
        where: {
          id: { in: ids }
        }
      });
      return NextResponse.json({ success: true, count: ids.length });
    }

    if (deleteSeries) {
      const original = await (prisma.expense as any).findUnique({ where: { id } });
      if (original) {
        const queryParams = {
          companyId: original.companyId,
          description: original.description,
          value: original.value,
          category: original.category,
        };
        const toDelete = await (prisma.expense as any).findMany({ where: queryParams });
        for (const e of toDelete) {
          if (e.status === 'PAGO' && e.bankAccountId) {
            await prisma.bankAccount.update({
              where: { id: e.bankAccountId },
              data: { balance: { increment: Number(e.value) } }
            }).catch(() => { });
          }
        }
        await (prisma.expense as any).deleteMany({
          where: queryParams
        });
      }
    } else {
      const original = await (prisma.expense as any).findUnique({ where: { id } });
      if (original?.status === 'PAGO' && original.bankAccountId) {
        await prisma.bankAccount.update({
          where: { id: original.bankAccountId },
          data: { balance: { increment: Number(original.value) } }
        }).catch(() => { });
      }
      await (prisma.expense as any).delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERRO_DELETE_DESPESA:", error);
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
