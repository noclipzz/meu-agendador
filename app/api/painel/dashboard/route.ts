import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format } from "date-fns";

const prisma = db;

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 1. Busca Empresa e Role (Logica Robusta)
        let companyId = null;
        let userRole = "PROFESSIONAL";
        let permissions: any = null;

        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
            userRole = "ADMIN";
            // Admin tem todas as permissões
            permissions = { dashboard: true, agenda: true, clientes: true, financeiro: true, estoque: true, prontuarios: true, servicos: true, profissionais: true, config: true };
        } else {
            const member = await prisma.teamMember.findUnique({
                where: { clerkUserId: userId },
                include: { company: true }
            });
            if (member) {
                companyId = member.companyId;
                permissions = member.permissions || { agenda: true, clientes: true };
            } else {
                // FALLBACK: Como Profissional
                const professional = await prisma.professional.findFirst({
                    where: { userId: userId },
                    include: { company: true }
                });
                if (professional) {
                    companyId = professional.companyId;
                    permissions = { agenda: true, clientes: true }; // Permissões básicas default
                }
            }
        }

        if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const hoje = new Date();
        const inicioDia = startOfDay(hoje);
        const fimDia = endOfDay(hoje);
        const inicioMes = startOfMonth(hoje);
        const fimMes = endOfMonth(hoje);

        // 2. VERIFICA O PLANO (Busca pelo dono da empresa)
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        const sub = await prisma.subscription.findUnique({ where: { userId: company?.ownerId || "" } });
        const plano = sub?.plan || "INDIVIDUAL";

        // 3. Executa as consultas baseadas em PERMISSÃO + PLANO
        const canSeeFinance = (plano === "PREMIUM" || plano === "MASTER") && permissions?.financeiro;
        const canSeeStock = (plano === "MASTER") && permissions?.estoque;

        const pAgendamentos = prisma.booking.findMany({
            where: {
                companyId: companyId,
                date: { gte: inicioDia, lte: fimDia },
                status: { not: 'CANCELADO' }
            },
            include: { service: true, professional: true },
            orderBy: { date: 'asc' }
        });

        const pBoletosVencidos = canSeeFinance ? prisma.invoice.findMany({
            where: { companyId: companyId, status: 'PENDENTE', dueDate: { lt: inicioDia } },
            include: { client: true },
            take: 5
        }) : Promise.resolve([]);

        const pBoletosVencer = canSeeFinance ? prisma.invoice.findMany({
            where: { companyId: companyId, status: 'PENDENTE', dueDate: { gte: inicioDia } },
            include: { client: true },
            orderBy: { dueDate: 'asc' },
            take: 5
        }) : Promise.resolve([]);

        const pFaturasMes = canSeeFinance ? prisma.invoice.findMany({
            where: { companyId: companyId, status: 'PAGO', paidAt: { gte: inicioMes, lte: fimMes } }
        }) : Promise.resolve([]);

        const pProdutos = canSeeStock ? prisma.product.findMany({
            where: { companyId: companyId },
            select: { id: true, name: true, quantity: true, minStock: true, unit: true }
        }) : Promise.resolve([]);

        const pPosts = prisma.organizationPost.findMany({
            where: { companyId: companyId },
            orderBy: { createdAt: 'desc' },
            take: 3
        });

        const [agendamentosHoje, boletosVencidos, boletosVencer, faturasMes, produtos, posts] = await Promise.all([
            pAgendamentos, pBoletosVencidos, pBoletosVencer, pFaturasMes, pProdutos, pPosts
        ]);

        // Filtra estoque baixo via Javascript (Quantity <= MinStock)
        const estoqueBaixo = produtos.filter(p => Number(p.quantity) <= Number(p.minStock));

        // Agrupa financeiro por dia para o gráfico
        const graficoDados = faturasMes.reduce((acc: any[], fatura) => {
            if (!fatura.paidAt) return acc;
            const dia = format(new Date(fatura.paidAt), "dd/MM");
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
            userRole,
            permissions,
            agendamentosHoje,
            boletosVencidos,
            boletosVencer,
            estoqueBaixo,
            graficoDados,
            posts,
            resumoFinanceiro: {
                totalMes: faturasMes.reduce((acc, i) => acc + Number(i.value), 0),
                qtdVencidos: boletosVencidos.length
            }
        });

    } catch (error) {
        console.error("ERRO_DASHBOARD:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
