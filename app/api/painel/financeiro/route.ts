import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, eachMonthOfInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const company = await prisma.company.findUnique({ where: { ownerId: userId } });
    if (!company) return new NextResponse("Empresa não encontrada", { status: 404 });

    const hoje = new Date();
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);
    const inicioMesAnterior = startOfMonth(subMonths(hoje, 1));
    const fimMesAnterior = endOfMonth(subMonths(hoje, 1));

    // --- CÁLCULO DO GRÁFICO (ÚLTIMOS 6 MESES) ---
    // Gera um array com os últimos 6 meses
    const mesesGrafico = eachMonthOfInterval({
        start: subMonths(hoje, 5),
        end: hoje
    });

    // Calcula as somas de cada mês em paralelo
    const fluxoCaixa = await Promise.all(mesesGrafico.map(async (data) => {
        const inicio = startOfMonth(data);
        const fim = endOfMonth(data);

        // 1. Soma Entradas (Faturas com status PAGO)
        const receitas = await prisma.invoice.aggregate({
            _sum: { value: true },
            where: { 
                companyId: company.id, 
                status: 'PAGO', 
                paidAt: { gte: inicio, lte: fim } 
            }
        });

        // 2. Soma Saídas (Despesas)
        const despesas = await prisma.expense.aggregate({
            _sum: { value: true },
            where: { 
                companyId: company.id, 
                date: { gte: inicio, lte: fim } 
            }
        });

        return {
            mes: format(data, 'MMM', { locale: ptBR }).toUpperCase(),
            receita: Number(receitas._sum.value || 0),
            despesa: Number(despesas._sum.value || 0)
        };
    }));
    // ---------------------------------------------

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
        if(!item.serviceId) return null;
        const s = await prisma.service.findUnique({ where: { id: item.serviceId } });
        return s ? { name: s.name, count: item._count.id, receita: Number(s.price) * item._count.id } : null;
    })).then(r => r.filter(Boolean));

    const rankingProfissionais = await Promise.all(rankingProfissionaisRaw.map(async (item) => {
        if(!item.professionalId) return null;
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