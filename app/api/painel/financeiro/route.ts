import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { startOfMonth, endOfMonth, subMonths, format, isSameDay, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const company = await prisma.company.findFirst({ 
        where: { 
            OR: [
                { ownerId: userId },
                { professionals: { some: { userId: userId } } }
            ]
        } 
    });
    
    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const agora = new Date();

    const [bookings, allExpenses] = await Promise.all([
      prisma.booking.findMany({
        where: { companyId: company.id, status: "CONFIRMADO", type: "CLIENTE" },
        include: { service: true, professional: true }
      }),
      prisma.expense.findMany({
        where: { companyId: company.id }
      })
    ]);

    const fluxoCaixa = [];
    for (let i = 5; i >= 0; i--) {
        const dataRef = subMonths(agora, i);
        const inicioMes = startOfMonth(dataRef);
        const fimMes = endOfMonth(dataRef);
        
        const receitaMes = bookings
            .filter(b => new Date(b.date) >= inicioMes && new Date(b.date) <= fimMes)
            .reduce((acc, curr) => acc + Number(curr.service?.price || 0), 0);

        const despesaMes = (allExpenses || []).reduce((total, exp) => {
            const dataExp = startOfDay(new Date(exp.date));
            const valor = Number(exp.value || 0);

            if (isBefore(dataExp, fimMes) || isSameDay(dataExp, inicioMes)) {
                if (exp.frequency === "ONCE" || !exp.frequency) {
                    if (dataExp >= inicioMes && dataExp <= fimMes) return total + valor;
                }
                if (exp.frequency === "MONTHLY") return total + valor;
                if (exp.frequency === "WEEKLY") return total + (valor * 4);
                if (exp.frequency === "YEARLY") {
                    if (dataExp.getMonth() === dataRef.getMonth()) return total + valor;
                }
            }
            return total;
        }, 0);

        fluxoCaixa.push({
            mes: format(dataRef, "MMM", { locale: ptBR }).toUpperCase().replace('.', ''),
            receita: receitaMes,
            despesa: despesaMes,
            lucro: receitaMes - despesaMes
        });
    }

    const faturamentoBruto = fluxoCaixa[5].receita;
    const totalDespesas = fluxoCaixa[5].despesa;
    const mesAtualInicio = startOfMonth(agora);
    
    const comissoesPagar = bookings
        .filter(b => new Date(b.date) >= mesAtualInicio)
        .reduce((acc, b) => {
            const preco = Number(b.service?.price || 0);
            const porc = Number(b.service?.commission || 0);
            return acc + (preco * (porc / 100));
        }, 0);

    const rankingProsMap = new Map();
    bookings.forEach(b => {
        if (!b.professional) return;
        const current = rankingProsMap.get(b.professional.name) || { 
            name: b.professional.name, receita: 0, color: b.professional.color 
        };
        current.receita += Number(b.service?.price || 0);
        rankingProsMap.set(b.professional.name, current);
    });

    const rankingServicosMap = new Map();
    bookings.forEach(b => {
        if (!b.service) return;
        const current = rankingServicosMap.get(b.service.name) || { name: b.service.name, receita: 0, count: 0 };
        current.receita += Number(b.service.price || 0);
        current.count += 1;
        rankingServicosMap.set(b.service.name, current);
    });

    return NextResponse.json({
        resumo: {
            bruto: faturamentoBruto,
            despesas: totalDespesas,
            comissoes: comissoesPagar,
            liquido: faturamentoBruto - totalDespesas - comissoesPagar,
            crescimento: fluxoCaixa[4].receita > 0 ? Math.round(((faturamentoBruto / fluxoCaixa[4].receita) - 1) * 100) : 0,
            taxaOcupacao: 0
        },
        fluxoCaixa,
        rankingProfissionais: Array.from(rankingProsMap.values()).sort((a, b) => b.receita - a.receita),
        rankingServicos: Array.from(rankingServicosMap.values()).sort((a, b) => b.receita - a.receita),
        allExpenses: allExpenses || []
    });

  } catch (error) {
    console.error("ERRO_FINANCEIRO:", error);
    return NextResponse.json({ error: "Erro ao carregar dados" }, { status: 500 });
  }
}