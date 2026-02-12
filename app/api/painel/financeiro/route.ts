import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, eachMonthOfInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const prisma = db;

// Força renderização dinâmica (necessário para usar auth() no Vercel)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

        // PEGA A DATA DA URL OU USA A ATUAL
        const { searchParams } = new URL(request.url);
        const mesParam = searchParams.get('month');
        const anoParam = searchParams.get('year');

        const hoje = new Date();
        // Se vier parametros, monta a data de referência. Senão usa hoje.
        const dataReferencia = (mesParam && anoParam)
            ? new Date(Number(anoParam), Number(mesParam) - 1, 1) // Meses no JS são 0-11
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
                    companyId: company.id,
                    status: 'PAGO',
                    paidAt: { gte: seisMesesAtras, lte: fimMesAtual }
                },
                select: { value: true, paidAt: true }
            }),
            prisma.expense.findMany({
                where: {
                    companyId: company.id,
                    date: { gte: seisMesesAtras, lte: fimMesAtual }
                },
                select: { value: true, date: true }
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
                .filter(d => d.date && d.date >= inicio && d.date <= fim)
                .reduce((acc, curr) => acc + Number(curr.value), 0);

            return {
                mes: format(data, 'MMM', { locale: ptBR }).toUpperCase(),
                receita: receitaMes,
                despesa: despesaMes
            };
        });
        // -------------------------------------------------------

        // Consultas Paralelas (Performance) para o restante da página (USANDO DATA SELECIONADA)
        const [receitasMes, despesasMes, receitasMesAnterior, rankingServicosRaw, rankingProfissionaisRaw, allExpenses, boletosVencidos, boletosAbertos] = await Promise.all([
            // 1. Receitas do Mês SELECIONADO (PAGO)
            prisma.invoice.findMany({
                where: { companyId: company.id, status: "PAGO", paidAt: { gte: inicioMes, lte: fimMes } }
            }),
            // 2. Despesas do Mês SELECIONADO
            prisma.expense.findMany({
                where: { companyId: company.id, date: { gte: inicioMes, lte: fimMes } }
            }),
            // 3. Receitas Mês Anterior ao SELECIONADO
            prisma.invoice.findMany({
                where: { companyId: company.id, status: "PAGO", paidAt: { gte: inicioMesAnterior, lte: fimMesAnterior } }
            }),
            // 4. Ranking Serviços (Top 5) - Mês Selecionado
            prisma.booking.groupBy({
                by: ['serviceId'],
                where: { companyId: company.id, status: 'CONCLUIDO', date: { gte: inicioMes, lte: fimMes } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            }),
            // 5. Ranking Profissionais (Top 5) - Mês Selecionado
            prisma.booking.groupBy({
                by: ['professionalId'],
                where: { companyId: company.id, status: 'CONCLUIDO', date: { gte: inicioMes, lte: fimMes } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            }),
            // 6. Despesas LISTGEM - DO MÊS SELECIONADO (Removendo limite 20 pra ver todas do mês)
            prisma.expense.findMany({
                where: { companyId: company.id, date: { gte: inicioMes, lte: fimMes } },
                orderBy: { date: 'desc' }
            }),
            // 7. BOLETOS VENCIDOS (Global, pois vencido é vencido independente do mês que eu olho? Ou filtro? Geralmente Vencido mostra tudo que tá pendente pra trás)
            prisma.invoice.findMany({
                where: {
                    companyId: company.id,
                    status: "PENDENTE",
                    dueDate: { lt: startOfDay(hoje) } // Vencido em relação a HOJE sempre
                },
                include: { client: true },
                orderBy: { dueDate: 'asc' }
            }),
            // 8. BOLETOS A VENCER (Mostrar do mês selecionado ou global? Se estou olhando 'Dezembro', quero ver contas de Dezembro. Mas a lógica original era 'Futuro'. Vou manter lógica original de 'A partir de hoje' se não tiver filtro, mas se tiver filtro, talvez mostrar contas daquele mês?)
            // MANTENDO A LÓGICA ORIGINAL PARA BOLETOS (FINANCEIRO GERAL), MAS SE O USUÁRIO QUER VER "PRÓXIMOS MESES", ELE VAI NAVEGAR NOS MESES.
            // Para "Contas a Receber" no card, faz sentido mostrar as do mês selecionado se for futuro.
            prisma.invoice.findMany({
                where: {
                    companyId: company.id,
                    status: "PENDENTE",
                    // Se a data selecionada for futura, mostra boletos daquele mês. Se for passado/presente, mostra a partir de hoje? 
                    // Vamos simplificar: A receber NAQUELE mês.
                    dueDate: { gte: inicioMes, lte: fimMes }
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
            fluxoCaixa,
            rankingServicos,
            rankingProfissionais,
            allExpenses,
            boletosVencidos, // Sempre geral
            boletosAbertos // Agora filtrado pelo mês
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}