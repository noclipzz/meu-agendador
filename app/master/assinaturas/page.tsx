"use client";

import { useState, useEffect } from "react";
import {
    DollarSign,
    TrendingUp,
    Calendar,
    CreditCard,
    Loader2,
    ExternalLink,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";

export default function MasterAssinaturas() {
    const [dados, setDados] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function carregar() {
            try {
                const res = await fetch('/api/master');
                const data = await res.json();
                setDados(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        carregar();
    }, []);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    const { metricas, distribuicaoPorPlano, empresas } = dados;

    // Separa assinaturas ativas
    const assinaturasAtivas = empresas.filter((e: any) => e.status === 'ACTIVE');
    const assinaturasInativas = empresas.filter((e: any) => e.status === 'INACTIVE');

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div>
                <h1 className="text-4xl font-black text-white mb-2">Gestão Financeira</h1>
                <p className="text-gray-400">Visão completa de receitas e assinaturas</p>
            </div>

            {/* MÉTRICAS FINANCEIRAS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-3xl shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <DollarSign className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-green-100 text-xs font-bold">MRR Total</p>
                            <p className="text-green-100 text-xs opacity-60">Monthly Recurring Revenue</p>
                        </div>
                    </div>
                    <h3 className="text-4xl font-black text-white">R$ {metricas.mrr.toFixed(2)}</h3>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-3xl shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <TrendingUp className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-blue-100 text-xs font-bold">ARR Projetado</p>
                            <p className="text-blue-100 text-xs opacity-60">Annual Recurring Revenue</p>
                        </div>
                    </div>
                    <h3 className="text-4xl font-black text-white">R$ {metricas.arr.toFixed(2)}</h3>
                </div>

                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 className="text-green-500" size={24} />
                        <div>
                            <p className="text-gray-400 text-xs font-bold">Assinaturas Ativas</p>
                        </div>
                    </div>
                    <h3 className="text-4xl font-black text-white">{metricas.empresasAtivas}</h3>
                    <p className="text-xs text-gray-500 mt-2">{metricas.taxaAtivacao}% do total</p>
                </div>

                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <CreditCard className="text-purple-500" size={24} />
                        <div>
                            <p className="text-gray-400 text-xs font-bold">Ticket Médio</p>
                        </div>
                    </div>
                    <h3 className="text-4xl font-black text-white">R$ {metricas.ticketMedio.toFixed(2)}</h3>
                    <p className="text-xs text-gray-500 mt-2">Por cliente ativo</p>
                </div>
            </div>

            {/* DISTRIBUIÇÃO POR PLANO - TABELA DETALHADA */}
            <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700">
                <h2 className="text-2xl font-black text-white mb-6">Receita por Plano</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(distribuicaoPorPlano).map(([plano, data]: [string, any]) => {
                        const percentualClientes = (data.count / metricas.totalEmpresas) * 100;
                        const percentualMRR = metricas.mrr > 0 ? (data.mrr / metricas.mrr) * 100 : 0;

                        const cores: any = {
                            INDIVIDUAL: { bg: 'from-blue-600 to-blue-700', text: 'blue' },
                            PREMIUM: { bg: 'from-purple-600 to-purple-700', text: 'purple' },
                            MASTER: { bg: 'from-yellow-600 to-yellow-700', text: 'yellow' },
                        };
                        const cor = cores[plano] || { bg: 'from-gray-600 to-gray-700', text: 'gray' };

                        return (
                            <div key={plano} className={`bg-gradient-to-br ${cor.bg} p-6 rounded-2xl shadow-lg`}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-2xl font-black text-white">{plano}</h3>
                                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold text-white">
                                        {percentualMRR.toFixed(0)}% MRR
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-white/70 mb-1">Clientes</p>
                                        <p className="text-3xl font-black text-white">{data.count}</p>
                                        <p className="text-xs text-white/70">{percentualClientes.toFixed(1)}% do total</p>
                                    </div>

                                    <div className="pt-3 border-t border-white/10">
                                        <p className="text-xs text-white/70 mb-1">Receita Mensal</p>
                                        <p className="text-2xl font-black text-white">R$ {data.mrr.toFixed(2)}</p>
                                    </div>

                                    <div className="pt-3 border-t border-white/10">
                                        <p className="text-xs text-white/70 mb-1">Projeção Anual</p>
                                        <p className="text-xl font-black text-white">R$ {(data.mrr * 12).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* LISTA DE ASSINATURAS ATIVAS */}
            <div className="bg-gray-800 rounded-3xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-2xl font-black text-white">Assinaturas Ativas ({assinaturasAtivas.length})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-900">
                            <tr>
                                <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Cliente</th>
                                <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Plano</th>
                                <th className="text-right p-4 text-xs font-black text-gray-400 uppercase">Valor Mensal</th>
                                <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Próximo Vencimento</th>
                                <th className="text-center p-4 text-xs font-black text-gray-400 uppercase">Stripe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assinaturasAtivas.map((emp: any) => {
                                const diasRestantes = emp.expiresAt
                                    ? Math.ceil((new Date(emp.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                    : null;

                                return (
                                    <tr key={emp.id} className="border-t border-gray-700 hover:bg-gray-900/50">
                                        <td className="p-4">
                                            <p className="font-bold text-white">{emp.name}</p>
                                            <p className="text-xs text-gray-500">{emp.slug}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${emp.plano === 'MASTER' ? 'bg-yellow-600/20 text-yellow-400' :
                                                    emp.plano === 'PREMIUM' ? 'bg-purple-600/20 text-purple-400' :
                                                        'bg-blue-600/20 text-blue-400'
                                                }`}>
                                                {emp.plano}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="font-bold text-green-400">R$ {emp.valor.toFixed(2)}</p>
                                        </td>
                                        <td className="p-4">
                                            {emp.expiresAt ? (
                                                <div>
                                                    <p className="text-white text-sm">
                                                        {new Date(emp.expiresAt).toLocaleDateString('pt-BR')}
                                                    </p>
                                                    <p className={`text-xs ${diasRestantes && diasRestantes < 7
                                                            ? 'text-red-400'
                                                            : 'text-gray-500'
                                                        }`}>
                                                        {diasRestantes !== null && `${diasRestantes} dias`}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {emp.stripeCustomerId ? (
                                                <a
                                                    href={`https://dashboard.stripe.com/customers/${emp.stripeCustomerId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                                                >
                                                    Ver <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <span className="text-gray-600 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ASSINATURAS INATIVAS */}
            {assinaturasInativas.length > 0 && (
                <div className="bg-gray-800 rounded-3xl border border-red-900/50 overflow-hidden">
                    <div className="p-6 border-b border-gray-700 flex items-center gap-3">
                        <AlertTriangle className="text-red-500" />
                        <h2 className="text-2xl font-black text-white">Assinaturas Inativas ({assinaturasInativas.length})</h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {assinaturasInativas.map((emp: any) => (
                                <div key={emp.id} className="bg-red-900/10 border border-red-900/30 p-4 rounded-2xl">
                                    <p className="font-bold text-white mb-1">{emp.name}</p>
                                    <p className="text-xs text-gray-500 mb-2">{emp.slug}</p>
                                    <span className="text-xs bg-red-600/20 text-red-400 px-2 py-1 rounded">
                                        {emp.plano || 'SEM PLANO'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* LINK PARA STRIPE */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-3xl shadow-xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-white mb-2">Gerenciar no Stripe</h3>
                        <p className="text-white/80 text-sm">Acesse o dashboard do Stripe para ver transações detalhadas</p>
                    </div>
                    <a
                        href="https://dashboard.stripe.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-purple-600 px-6 py-3 rounded-2xl font-bold hover:bg-gray-100 transition flex items-center gap-2"
                    >
                        Abrir Stripe <ExternalLink size={16} />
                    </a>
                </div>
            </div>
        </div>
    );
}
