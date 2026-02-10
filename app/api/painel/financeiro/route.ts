import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, eachMonthOfInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const prisma = db;

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const company = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (!company) return new NextResponse("Empresa não encontrada", { status: 404 });

        // VERIFICA SE O PLANO É INDIVIDUAL (Bloqueia Financeiro)
        const sub = await prisma.subscription.findUnique({ where: { userId } });
        if (!sub || sub.plan === "INDIVIDUAL") {
            return NextResponse.json({ error: "O Módulo Financeiro está disponível apenas para planos PREMIUM e MASTER." }, { status: 403 });
        }

        const hoje = new Date();
        const inicioMes = startOfMonth(hoje);
        const fimMes = endOfMonth(hoje);
        const inicioMesAnterior = startOfMonth(subMonths(hoje, 1));
        const fimMesAnterior = endOfMonth(subMonths(hoje, 1));

        // --- CÁLCULO DO GRÁFICO (ÚLTIMOS 6 MESES) - OTIMIZADO ---
        const seisMesesAtras = startOfMonth(subMonths(hoje, 5));

        // Busca tudo de uma vez para os últimos 6 meses
        const [todasReceitas, todasDespesas] = await Promise.all([
            prisma.invoice.findMany({
                where: {
                    companyId: company.id,
                    status: 'PAGO',
                    paidAt: { gte: seisMesesAtras, lte: fimMes }
                },
                select: { value: true, paidAt: true }
            }),
            prisma.expense.findMany({
                where: {
                    companyId: company.id,
                    date: { gte: seisMesesAtras, lte: fimMes }
                },
                select: { value: true, date: true }
            })
        ]);

        const mesesGrafico = eachMonthOfInterval({
            start: seisMesesAtras,
            end: hoje
        });

        // Processa os dados em memória (JS) para não bater no banco 12 vezes
        const fluxoCaixa = mesesGrafico.map((data) => {
            const inicio = startOfMonth(data);
            const fim = endOfMonth(data);

            const receitaMes = todasReceitas
                .filter(r => r.paidAt && r.paidAt >= inicio && r.paidAt <= fim)
                .reduce((acc, curr) => acc + Number(curr.value), 0);

            const despesaMes = todasDespesas
                .filter(d => d.date && d.date >= inicio && d.date <= fim)
                .reduce((acc, curr) => acc + Number(curr.value), 0);

            return {
                mes: format(data, 'MMM', { locale: ptBR }).toUpperCase(),
                receita: receitaMes,
                despesa: despesaMes
            };
        });
        // -------------------------------------------------------

        // Consultas Paralelas (Performance) para o restante da página
        const [receitasMes, despesasMes, receitasMesAnterior, rankingServicosRaw, rankingProfissionaisRaw, allExpenses, boletosVencidos, boletosAbertos] = await Promise.all([
            // 1. Receitas do Mês Atual (PAGO)
            prisma.invoice.findMany({
                where: { companyId: company.id, status: "PAGO", paidAt: { gte: inicioMes, lte: fimMes } }
            }),
            // 2. Despesas do Mês Atual
            prisma.expense.findMany({
                where: { companyId: company.id, date: { gte: inicioMes, lte: fimMes } }
            }),
            // 3. Receitas Mês Anterior (Para comparar crescimento)
            prisma.invoice.findMany({
                where: { companyId: company.id, status: "PAGO", paidAt: { gte: inicioMesAnterior, lte: fimMesAnterior } }
            }),
            // 4. Ranking Serviços (Top 5)
            prisma.booking.groupBy({
                by: ['serviceId'],
                where: { companyId: company.id, status: 'CONCLUIDO', date: { gte: inicioMes, lte: fimMes } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            }),
            // 5. Ranking Profissionais (Top 5)
            prisma.booking.groupBy({
                by: ['professionalId'],
                where: { companyId: company.id, status: 'CONCLUIDO', date: { gte: inicioMes, lte: fimMes } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            }),
            // 6. Todas as Despesas (Para listagem)
            prisma.expense.findMany({
                where: { companyId: company.id },
                orderBy: { date: 'desc' },
                take: 20
            }),
            // 7. BOLETOS VENCIDOS
            prisma.invoice.findMany({
                where: {
                    companyId: company.id,
                    status: "PENDENTE",
                    dueDate: { lt: startOfDay(hoje) } // Vencimento menor que hoje
                },
                include: { client: true },
                orderBy: { dueDate: 'asc' }
            }),
            // 8. BOLETOS A VENCER/EM ABERTO
            prisma.invoice.findMany({
                where: {
                    companyId: company.id,
                    status: "PENDENTE",
                    dueDate: { gte: startOfDay(hoje) } // Vencimento maior ou igual a hoje
                },
                include: { client: true },
                orderBy: { dueDate: 'asc' }
            })
        ]);

        // Cálculos de Totais
        const totalReceita = receitasMes.reduce((acc, i) => acc + Number(i.value), 0);
        const totalDespesa = despesasMes.reduce((acc, i) => acc + Number(i.value), 0);
        const totalReceitaAnterior = receitasMesAnterior.reduce((acc, i) => acc + Number(i.value), 0);

        // Cálculo Crescimento
        let crescimento = 0;
        if (totalReceitaAnterior > 0) {
            crescimento = ((totalReceita - totalReceitaAnterior) / totalReceitaAnterior) * 100;
        } else if (totalReceita > 0) {
            crescimento = 100;
        }

        // Processamento de Rankings (Busca nomes)
        const rankingServicos = await Promise.all(rankingServicosRaw.map(async (item) => {
            if (!item.serviceId) return null;
            const s = await prisma.service.findUnique({ where: { id: item.serviceId } });
            return s ? { name: s.name, count: item._count.id, receita: Number(s.price) * item._count.id } : null;
        })).then(r => r.filter(Boolean));

        const rankingProfissionais = await Promise.all(rankingProfissionaisRaw.map(async (item) => {
            if (!item.professionalId) return null;
            const p = await prisma.professional.findUnique({ where: { id: item.professionalId } });
            return p ? { name: p.name, count: item._count.id, receita: 0, color: p.color } : null;
        })).then(r => r.filter(Boolean));

        // Retorno Final
        return NextResponse.json({
            resumo: {
                bruto: totalReceita,
                despesas: totalDespesa,
                liquido: totalReceita - totalDespesa,
                crescimento: Math.round(crescimento),
                comissoes: 0
            },
            fluxoCaixa, // Array com os últimos 6 meses preenchidos
            rankingServicos,
            rankingProfissionais,
            allExpenses,
            boletosVencidos,
            boletosAbertos
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}