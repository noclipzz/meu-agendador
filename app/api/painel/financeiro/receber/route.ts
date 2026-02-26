import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const prisma = db;

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const company = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (!company) {
            // Se não for dono, tenta como membro da equipe
            const member = await prisma.teamMember.findUnique({
                where: { clerkUserId: userId },
                include: { company: true }
            });
            if (!member || !(member.permissions as any)?.financeiro) {
                return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
            }
        }

        const targetCompanyId = company?.id || (await prisma.teamMember.findUnique({ where: { clerkUserId: userId } }))?.companyId;

        if (!targetCompanyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const { searchParams } = new URL(request.url);
        const start = searchParams.get("start");
        const end = searchParams.get("end");
        const status = searchParams.get("status");
        const search = searchParams.get("search");

        const TIMEZONE = 'America/Sao_Paulo';
        const hoje = toZonedTime(new Date(), TIMEZONE);

        // Define onde buscar
        const where: any = { companyId: targetCompanyId };

        let startDate: Date = startOfMonth(hoje);
        let endDate: Date = endOfMonth(hoje);

        if (start === "ALL") {
            // Sem filtro de data para dueDate
            startDate = new Date(0); // Início dos tempos
            endDate = new Date(2100, 0, 1); // Longe no futuro
        } else if (start && end) {
            startDate = new Date(start);
            endDate = new Date(end);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                where.dueDate = {
                    gte: startDate,
                    lte: endDate
                };
            }
        } else {
            where.dueDate = { gte: startDate, lte: endDate };
        }

        if (status && status !== "TODAS" && status !== "todos") {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { description: { contains: search, mode: "insensitive" } },
                { client: { name: { contains: search, mode: "insensitive" } } }
            ];
        }

        // 1. Busca todas as faturas baseadas nos filtros passados
        const [invoices, summaryInvoices] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: { client: true, bankAccount: true },
                orderBy: { dueDate: "asc" }
            }),
            prisma.invoice.findMany({
                where: { companyId: targetCompanyId }
            })
        ]);

        // 2. Cálculos dos Cards (Baseado em HOJE para vencidos e hoje)
        const startOfToday = startOfDay(hoje);
        const endOfToday = endOfDay(hoje);

        const vencidos = summaryInvoices.filter(i => i.status === "PENDENTE" && i.dueDate < startOfToday);
        const vencemHoje = summaryInvoices.filter(i => i.status === "PENDENTE" && i.dueDate >= startOfToday && i.dueDate <= endOfToday);
        const avencer = summaryInvoices.filter(i => i.status === "PENDENTE" && i.dueDate > endOfToday);

        // Se for ALL, os recebidos são todos que foram pagos. Caso contrário, respeita o período.
        const recebidos = summaryInvoices.filter(i => {
            if (i.status !== "PAGO" || !i.paidAt) return false;
            if (start === "ALL") return true;
            return i.paidAt >= startDate && i.paidAt <= endDate;
        });

        const totalVencidos = vencidos.reduce((acc, i) => acc + Number(i.value), 0);
        const totalHoje = vencemHoje.reduce((acc, i) => acc + Number(i.value), 0);
        const totalAVencer = avencer.reduce((acc, i) => acc + Number(i.value), 0);
        const totalRecebidos = recebidos.reduce((acc, i) => acc + Number(i.value), 0);
        const totalGeral = invoices.reduce((acc, i) => acc + Number(i.value), 0);

        return NextResponse.json({
            invoices,
            summary: {
                overdue: totalVencidos,
                today: totalHoje,
                upcoming: totalAVencer,
                received: totalRecebidos,
                total: totalGeral,
                companyId: targetCompanyId
            }
        });

    } catch (error: any) {
        console.error("ERRO_RECEBER_GET:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
