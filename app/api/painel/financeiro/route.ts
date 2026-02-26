import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, eachMonthOfInterval, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

const prisma = db;

// Força renderização dinâmica (necessário para usar auth() no Vercel)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 1. Descobre a empresa e o papel do usuário (Robust Check)
        let companyId = null;
        let ownerId = "";

        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
            ownerId = ownerCompany.ownerId;
        } else {
            const member = await prisma.teamMember.findUnique({
                where: { clerkUserId: userId },
                include: { company: true }
            });
            if (member) {
                companyId = member.companyId;
                ownerId = member.company.ownerId;

                // Verifica permissão granular de financeiro para profissionais
                if (!member.permissions || !(member.permissions as any).financeiro) {
                    return NextResponse.json({ error: `Sem permissão granular (financeiro: false) para o ID: ${userId}` }, { status: 403 });
                }
            } else {
                // FALLBACK: Tenta como Profissional (Professional) - Mesma lógica do checkout
                const professional = await prisma.professional.findFirst({
                    where: { userId: userId },
                    include: { company: true }
                });
                if (professional) {
                    companyId = professional.companyId;
                    ownerId = professional.company.ownerId;
                }
            }
        }

        if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        // 2. VERIFICA O PLANO (Sempre pelo dono da empresa)
        const SUPER_ADMIN = "user_39S9qNrKwwgObMZffifdZyNKUKm";

        if (userId !== SUPER_ADMIN) {
            const sub = await prisma.subscription.findUnique({ where: { userId: ownerId } });
            if (!sub || sub.plan === "INDIVIDUAL") {
                return NextResponse.json({ error: "O Módulo Financeiro está disponível apenas para planos PREMIUM e MASTER." }, { status: 403 });
            }
        }

        // PEGA A DATA DA URL OU USA A ATUAL
        const { searchParams } = new URL(request.url);
        const mesParam = searchParams.get('month');
        const anoParam = searchParams.get('year');

        const TIMEZONE = 'America/Sao_Paulo';

        const hoje = toZonedTime(new Date(), TIMEZONE);
        const validMes = Number(mesParam) || (hoje.getMonth() + 1);
        const validAno = Number(anoParam) || hoje.getFullYear();

        const dataReferencia = (mesParam && anoParam)
            ? new Date(validAno, validMes - 1, 1)
            : hoje;

        const inicioMes = startOfMonth(dataReferencia);
        const fimMes = endOfMonth(dataReferencia);

        // Para comparação (Mês Anterior ao selecionado)
        const inicioMesAnterior = startOfMonth(subMonths(dataReferencia, 1));
        const fimMesAnterior = endOfMonth(subMonths(dataReferencia, 1));

        // --- CÁLCULO DO GRÁFICO (ÚLTIMOS 6 MESES A PARTIR DA DATA SELECIONADA) ---
        const seisMesesAtras = startOfMonth(subMonths(dataReferencia, 5));
        const fimMesAtual = endOfMonth(dataReferencia);

        // Busca tudo de uma vez para os últimos 6 meses (GRÁFICO)
        const [todasReceitasGrafico, todasDespesasGrafico] = await Promise.all([
            prisma.invoice.findMany({
                where: {
                    companyId: companyId,
                    status: 'PAGO',
                    paidAt: { gte: seisMesesAtras, lte: fimMesAtual }
                },
                select: { value: true, paidAt: true }
            }),
            prisma.expense.findMany({
                where: {
                    companyId: companyId,
                    dueDate: { gte: seisMesesAtras, lte: fimMesAtual }
                },
                select: { value: true, dueDate: true }
            })
        ]);

        const mesesGrafico = eachMonthOfInterval({
            start: seisMesesAtras,
            end: dataReferencia
        });

        // Processa os dados do GRÁFICO
        const fluxoCaixa = mesesGrafico.map((data) => {
            const inicio = startOfMonth(data);
            const fim = endOfMonth(data);

            const receitaMes = todasReceitasGrafico
                .filter(r => r.paidAt && r.paidAt >= inicio && r.paidAt <= fim)
                .reduce((acc, curr) => acc + Number(curr.value), 0);

            const despesaMes = todasDespesasGrafico
                .filter((d: any) => d.dueDate && d.dueDate >= inicio && d.dueDate <= fim)
                .reduce((acc, curr: any) => acc + Number(curr.value), 0);

            return {
                mes: format(data, 'MMM', { locale: ptBR }).toUpperCase(),
                receita: receitaMes,
                despesa: despesaMes
            };
        });
        // -------------------------------------------------------

        // 8. BOLETOS A VENCER (Lógica Corrigida: Se for o mês atual, mostra tudo do futuro. Se for outro mês, filtra pelo mês.)
        const isCurrentMonth = (!mesParam && !anoParam) || (Number(mesParam) === hoje.getMonth() + 1 && Number(anoParam) === hoje.getFullYear());
        const startFilter = startOfDay(hoje) > inicioMes ? startOfDay(hoje) : inicioMes;
        const endFilter = isCurrentMonth ? undefined : fimMes;

        const [receitasMes, despesasMes, receitasMesAnterior, rankingServicosRaw, rankingProfissionaisRaw, allExpenses, boletosVencidos, boletosAbertos, estoqueLotesAdicionados] = await Promise.all([
            // 1. Receitas do Mês SELECIONADO (PAGO)
            prisma.invoice.findMany({
                where: { companyId: companyId, status: "PAGO", paidAt: { gte: inicioMes, lte: fimMes } },
                include: { client: true },
                orderBy: { paidAt: 'desc' }
            }),
            // 2. Despesas do Mês SELECIONADO
            prisma.expense.findMany({
                where: { companyId: companyId, dueDate: { gte: inicioMes, lte: fimMes } },
                include: { supplier: true },
                orderBy: { dueDate: 'desc' }
            }),
            // 3. Receitas Mês Anterior ao SELECIONADO
            prisma.invoice.findMany({
                where: { companyId: companyId, status: "PAGO", paidAt: { gte: inicioMesAnterior, lte: fimMesAnterior } }
            }),
            // 4. Ranking Serviços (Top 5) - Mês Selecionado
            prisma.booking.groupBy({
                by: ['serviceId'],
                where: { companyId: companyId, status: 'CONCLUIDO', date: { gte: inicioMes, lte: fimMes } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            }),
            // 5. Ranking Profissionais (Top 5) - Mês Selecionado
            prisma.booking.groupBy({
                by: ['professionalId'],
                where: { companyId: companyId, status: 'CONCLUIDO', date: { gte: inicioMes, lte: fimMes } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            }),
            // 6. Despesas LISTGEM - DO MÊS SELECIONADO (Removendo limite 20 pra ver todas do mês)
            prisma.expense.findMany({
                where: { companyId: companyId, dueDate: { gte: inicioMes, lte: fimMes } },
                include: { supplier: true },
                orderBy: { dueDate: 'desc' }
            }),
            // 7. BOLETOS VENCIDOS (Global, pois vencido é vencido independente do mês que eu olho? Ou filtro? Geralmente Vencido mostra tudo que tá pendente pra trás)
            prisma.invoice.findMany({
                where: {
                    companyId: companyId,
                    status: "PENDENTE",
                    dueDate: { lt: startOfDay(hoje) } // Vencido em relação a HOJE sempre
                },
                include: { client: true },
                orderBy: { dueDate: 'asc' }
            }),
            // 8. BOLETOS A VENCER (Próximos)
            prisma.invoice.findMany({
                where: {
                    companyId: companyId,
                    status: "PENDENTE",
                    dueDate: endFilter ? { gte: startFilter, lte: endFilter } : { gte: startFilter }
                },
                include: { client: true },
                orderBy: { dueDate: 'asc' },
                take: 50
            }),
            // 9. Custos de Lotes Adicionados no Mês (Para Contabilizar como Despesa no DRE)
            prisma.stockLog.findMany({
                where: {
                    product: { companyId: companyId },
                    type: 'ENTRADA',
                    createdAt: { gte: inicioMes, lte: fimMes }
                }
            })
        ]);

        // Cálculos de Totais
        const totalReceita = receitasMes.reduce((acc, i: any) => acc + Number(i.netValue || i.value || 0), 0);
        const totalDespesaConvencional = despesasMes.reduce((acc, i: any) => acc + Number(i.value || 0), 0);
        const totalCustoEstoque = estoqueLotesAdicionados.reduce((acc, log: any) => acc + Number(log.totalCost || 0), 0);
        const totalDespesa = totalDespesaConvencional + totalCustoEstoque;

        const totalReceitaAnterior = receitasMesAnterior.reduce((acc, i: any) => acc + Number(i.netValue || i.value || 0), 0);

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

        // Retorno Final (Garante alias 'date' para compatibilidade com frontend legado)
        const responseData = {
            resumo: {
                bruto: totalReceita,
                despesas: totalDespesa,
                liquido: totalReceita - totalDespesa,
                crescimento: Math.round(crescimento),
                comissoes: 0
            },
            fluxoCaixa,
            rankingServicos,
            rankingProfissionais,
            allExpenses: (allExpenses as any[]).map(e => ({
                ...e,
                date: e.dueDate || e.date || new Date()
            })).concat(
                (estoqueLotesAdicionados as any[])
                    .filter(log => Number(log.totalCost || 0) > 0)
                    .map(log => ({
                        id: `estoque-${log.id}`,
                        description: `Compra de Lote (Estoque)`,
                        value: Number(log.totalCost),
                        category: "PRODUTOS",
                        date: log.createdAt,
                        supplier: null
                    }))
            ),
            allInvoices: receitasMes,
            boletosVencidos,
            boletosAbertos
        };

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error("ERRO_FINANCEIRO_GET:", error);
        return NextResponse.json({
            error: "Erro ao carregar dados financeiros",
            message: error.message
        }, { status: 500 });
    }
}