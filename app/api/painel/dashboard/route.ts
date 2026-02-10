import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format } from "date-fns";

const prisma = db;

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const company = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (!company) return new NextResponse("Empresa não encontrada", { status: 404 });

        const hoje = new Date();
        const inicioDia = startOfDay(hoje);
        const fimDia = endOfDay(hoje);
        const inicioMes = startOfMonth(hoje);
        const fimMes = endOfMonth(hoje);

        // Executa todas as consultas em paralelo para ser rápido
        const [agendamentosHoje, boletosVencidos, boletosVencer, produtos, faturasMes] = await Promise.all([
            // 1. Agendamentos de Hoje
            prisma.booking.findMany({
                where: {
                    companyId: company.id,
                    date: { gte: inicioDia, lte: fimDia },
                    status: { not: 'CANCELADO' }
                },
                include: { service: true, professional: true },
                orderBy: { date: 'asc' }
            }),

            // 2. Boletos Vencidos (Status PENDENTE e Data < Hoje)
            prisma.invoice.findMany({
                where: {
                    companyId: company.id,
                    status: 'PENDENTE',
                    dueDate: { lt: inicioDia } // Menor que o início de hoje
                },
                include: { client: true },
                take: 5
            }),

            // 3. Boletos a Vencer (Próximos 7 dias)
            prisma.invoice.findMany({
                where: {
                    companyId: company.id,
                    status: 'PENDENTE',
                    dueDate: { gte: inicioDia }
                },
                include: { client: true },
                orderBy: { dueDate: 'asc' },
                take: 5
            }),

            // 4. Todos os produtos (para filtrar estoque baixo no código)
            prisma.product.findMany({
                where: { companyId: company.id },
                select: { id: true, name: true, quantity: true, minStock: true, unit: true }
            }),

            // 5. Financeiro do Mês (Para o Gráfico)
            prisma.invoice.findMany({
                where: {
                    companyId: company.id,
                    status: 'PAGO',
                    paidAt: { gte: inicioMes, lte: fimMes }
                }
            })
        ]);

        // Filtra estoque baixo via Javascript (Quantity <= MinStock)
        const estoqueBaixo = produtos.filter(p => Number(p.quantity) <= Number(p.minStock));

        // Agrupa financeiro por dia para o gráfico
        const graficoDados = faturasMes.reduce((acc: any[], fatura) => {
            const dia = format(new Date(fatura.paidAt!), "dd/MM");
            const existente = acc.find(i => i.dia === dia);
            if (existente) {
                existente.valor += Number(fatura.value);
            } else {
                acc.push({ dia, valor: Number(fatura.value) });
            }
            return acc;
        }, []).sort((a, b) => a.dia.localeCompare(b.dia));

        return NextResponse.json({
            agendamentosHoje,
            boletosVencidos,
            boletosVencer,
            estoqueBaixo,
            graficoDados,
            resumoFinanceiro: {
                totalMes: faturasMes.reduce((acc, i) => acc + Number(i.value), 0),
                qtdVencidos: boletosVencidos.length
            }
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}