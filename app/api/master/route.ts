import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

const prisma = db;

// Força renderização dinâmica
export const dynamic = 'force-dynamic';

const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_ID || "user_39S9qNrKwwgObMZffifdZyNKUKm";

// DASHBOARD - GET: Retorna estatísticas completas
export async function GET() {
  try {
    const { userId } = await auth();

    if (userId !== SUPER_ADMIN_ID) {
      return NextResponse.json({ error: `Acesso Negado. ID atual: ${userId}` }, { status: 403 });
    }

    // Busca dados em paralelo para performance
    const [empresas, assinaturas, todosClientes, todosAgendamentos] = await Promise.all([
      // 1. Todas as empresas com contadores
      prisma.company.findMany({
        include: {
          _count: {
            select: {
              bookings: true,
              clients: true,
              professionals: true,
              services: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // 2. Todas as assinaturas
      prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' }
      }),

      // 3. Total de clientes no sistema
      prisma.client.count(),

      // 4. Total de agendamentos
      prisma.booking.count()
    ]);

    // Preços dos planos
    const precos: any = {
      "INDIVIDUAL": 35,
      "PREMIUM": 65,
      "MASTER": 99,
      "GRATIS": 0,
      "MANUAL": 0
    };

    // Combina dados de empresa + assinatura
    const dadosCompletos = empresas.map((emp: any) => {
      const assinatura = assinaturas.find(s => s.userId === emp.ownerId);
      const plano = assinatura?.plan || "SEM PLANO";
      const preco = precos[plano] || 0;

      return {
        id: emp.id,
        name: emp.name,
        slug: emp.slug,
        ownerId: emp.ownerId,
        createdAt: emp.createdAt,
        plano,
        status: assinatura?.status || "INACTIVE",
        expiresAt: assinatura?.expiresAt || null,
        valor: preco,
        stripeCustomerId: assinatura?.stripeCustomerId || null,
        stripeSubscriptionId: assinatura?.stripeSubscriptionId || null,
        // Contadores
        totalAgendamentos: emp._count.bookings,
        totalClientes: emp._count.clients,
        totalProfissionais: emp._count.professionals,
        totalServicos: emp._count.services,
      };
    });

    // MÉTRICAS AGREGADAS
    const totalEmpresas = dadosCompletos.length;
    const empresasAtivas = dadosCompletos.filter(e => e.status === 'ACTIVE').length;
    const empresasInativas = totalEmpresas - empresasAtivas;

    // MRR (Monthly Recurring Revenue)
    const mrr = dadosCompletos
      .filter(e => e.status === 'ACTIVE')
      .reduce((acc, e) => acc + e.valor, 0);

    // Ticket Médio
    const ticketMedio = empresasAtivas > 0 ? mrr / empresasAtivas : 0;

    // Distribuição por Plano
    const distribuicaoPorPlano = dadosCompletos.reduce((acc: any, emp) => {
      const plano = emp.plano;
      if (!acc[plano]) acc[plano] = { count: 0, mrr: 0 };
      acc[plano].count++;
      if (emp.status === 'ACTIVE') acc[plano].mrr += emp.valor;
      return acc;
    }, {});

    // Últimos 6 meses de crescimento (DADOS REAIS baseados nas datas de criação)
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const crescimentoMensal = [];
    for (let i = 5; i >= 0; i--) {
      const data = new Date();
      data.setMonth(data.getMonth() - i);
      const mes = data.getMonth();
      const ano = data.getFullYear();

      // Filtra empresas ativas naquele mês (criadas até o final do mês E com assinatura ativa)
      const empresasNoMes = dadosCompletos.filter(e => {
        const criacao = new Date(e.createdAt);
        const fimDoMes = new Date(ano, mes + 1, 0, 23, 59, 59);
        return criacao <= fimDoMes && e.status === 'ACTIVE';
      });

      const receitaNoMes = empresasNoMes.reduce((acc, e) => acc + e.valor, 0);

      crescimentoMensal.push({
        mes: mesesNomes[mes],
        valor: receitaNoMes,
        clientes: empresasNoMes.length
      });
    }

    // Assinaturas vencendo nos próximos 7 dias
    const hoje = new Date();
    const seteDiasDepois = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
    const assinaturasVencendo = dadosCompletos.filter(e =>
      e.expiresAt &&
      new Date(e.expiresAt) >= hoje &&
      new Date(e.expiresAt) <= seteDiasDepois
    );

    return NextResponse.json({
      // Dados brutos
      empresas: dadosCompletos,

      // Métricas gerais
      metricas: {
        totalEmpresas,
        empresasAtivas,
        empresasInativas,
        mrr,
        arr: mrr * 12,
        ticketMedio,
        totalClientes: todosClientes,
        totalAgendamentos: todosAgendamentos,
        taxaAtivacao: totalEmpresas > 0 ? ((empresasAtivas / totalEmpresas) * 100).toFixed(1) : 0,
      },

      // Por plano
      distribuicaoPorPlano,

      // Crescimento
      crescimentoMensal,

      // Alertas
      assinaturasVencendo,

      // Últimos cadastros
      ultimosCadastros: dadosCompletos.slice(0, 5),
    });

  } catch (error) {
    console.error("Erro na API Master:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETAR EMPRESA - DELETE
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();

    if (userId !== SUPER_ADMIN_ID) {
      return NextResponse.json({ error: "Proibido" }, { status: 403 });
    }

    const { companyId } = await req.json();

    // Deleta em cascata
    await prisma.$transaction([
      prisma.booking.deleteMany({ where: { companyId } }),
      prisma.service.deleteMany({ where: { companyId } }),
      prisma.professional.deleteMany({ where: { companyId } }),
      prisma.client.deleteMany({ where: { companyId } }),
      prisma.teamMember.deleteMany({ where: { companyId } }),
      prisma.company.delete({ where: { id: companyId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir empresa:", error);
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}