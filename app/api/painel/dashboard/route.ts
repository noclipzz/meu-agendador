import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format } from "date-fns";

const prisma = db;

export const dynamic = "force-dynamic";

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

        // VERIFICA O PLANO
        const sub = await prisma.subscription.findUnique({ where: { userId } });
        const plano = sub?.plan || "INDIVIDUAL";

        // Executa as consultas permitidas pelo plano
        const queries: any = [
            // 1. Agendamentos de Hoje (TODOS OS PLANOS)
            prisma.booking.findMany({
                where: {
                    companyId: company.id,
                    date: { gte: inicioDia, lte: fimDia },
                    status: { not: 'CANCELADO' }
                },
                include: { service: true, professional: true },
                orderBy: { date: 'asc' }
            })
        ];

        // Se for PREMIUM ou MASTER, pode ver financeiro
        if (plano === "PREMIUM" || plano === "MASTER") {
            queries.push(
                prisma.invoice.findMany({
                    where: { companyId: company.id, status: 'PENDENTE', dueDate: { lt: inicioDia } },
                    include: { client: true },
                    take: 5
                }),
                prisma.invoice.findMany({
                    where: { companyId: company.id, status: 'PENDENTE', dueDate: { gte: inicioDia } },
                    include: { client: true },
                    orderBy: { dueDate: 'asc' },
                    take: 5
                }),
                prisma.invoice.findMany({
                    where: { companyId: company.id, status: 'PAGO', paidAt: { gte: inicioMes, lte: fimMes } }
                })
            );
        } else {
            // Placeholders para manter a estrutura do array
            queries.push(Promise.resolve([]), Promise.resolve([]), Promise.resolve([]));
        }

        // Se for MASTER, pode ver estoque
        if (plano === "MASTER") {
            queries.push(
                prisma.product.findMany({
                    where: { companyId: company.id },
                    select: { id: true, name: true, quantity: true, minStock: true, unit: true }
                })
            );
        } else {
            queries.push(Promise.resolve([]));
        }

        const [agendamentosHoje, boletosVencidos, boletosVencer, faturasMes, produtos] = await Promise.all(queries);

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
            plano,
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