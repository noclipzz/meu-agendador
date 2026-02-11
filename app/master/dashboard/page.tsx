"use client";

import { useState, useEffect } from "react";
import {
    DollarSign,
    Users,
    TrendingUp,
    TrendingDown,
    Activity,
    AlertCircle,
    Loader2,
    CheckCircle2,
    XCircle,
    Calendar,
    BarChart3
} from "lucide-react";

export default function MasterDashboard() {
    const [dados, setDados] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function carregar() {
            try {
                const res = await fetch('/api/master');
                const data = await res.json();
                setDados(data);
            } catch (error) {
                console.error("Erro ao carregar dashboard:", error);
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

    const { metricas, distribuicaoPorPlano, crescimentoMensal, assinaturasVencendo, ultimosCadastros } = dados;

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div>
                <h1 className="text-4xl font-black text-white mb-2">Dashboard Executivo</h1>
                <p className="text-gray-400">Visão completa do seu império SaaS</p>
            </div>

            {/* MÉTRICAS PRINCIPAIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* MRR */}
                <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <DollarSign size={80} />
                    </div>
                    <p className="text-green-100 font-bold text-sm mb-1">MRR (Receita Mensal)</p>
                    <h3 className="text-4xl font-black text-white">R$ {metricas.mrr.toFixed(2)}</h3>
                    <p className="text-xs text-green-200 mt-2">ARR: R$ {metricas.arr.toFixed(2)}</p>
                </div>

                {/* CLIENTES */}
                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-gray-400 font-bold text-sm">Total de Empresas</p>
                        <Users className="text-blue-500" size={24} />
                    </div>
                    <h3 className="text-4xl font-black text-white">{metricas.totalEmpresas}</h3>
                    <div className="flex gap-4 mt-3 text-xs">
                        <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle2 size={14} /> {metricas.empresasAtivas} Ativas
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                            <XCircle size={14} /> {metricas.empresasInativas} Inativas
                        </span>
                    </div>
                </div>

                {/* TICKET MÉDIO */}
                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-gray-400 font-bold text-sm">Ticket Médio</p>
                        <TrendingUp className="text-purple-500" size={24} />
                    </div>
                    <h3 className="text-4xl font-black text-white">R$ {metricas.ticketMedio.toFixed(2)}</h3>
                    <p className="text-xs text-gray-500 mt-2">Por cliente ativo</p>
                </div>

                {/* TAXA DE ATIVAÇÃO */}
                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-gray-400 font-bold text-sm">Taxa de Ativação</p>
                        <Activity className="text-yellow-500" size={24} />
                    </div>
                    <h3 className="text-4xl font-black text-white">{metricas.taxaAtivacao}%</h3>
                    <p className="text-xs text-gray-500 mt-2">Empresas ativas / Total</p>
                </div>
            </div>

            {/* ESTATÍSTICAS SECUNDÁRIAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                    <p className="text-gray-400 text-sm font-bold mb-2">📅 Total de Agendamentos</p>
                    <p className="text-3xl font-black text-white">{metricas.totalAgendamentos.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                    <p className="text-gray-400 text-sm font-bold mb-2">👥 Clientes Cadastrados</p>
                    <p className="text-3xl font-black text-white">{metricas.totalClientes.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                    <p className="text-gray-400 text-sm font-bold mb-2">💰 Projeção Anual (ARR)</p>
                    <p className="text-3xl font-black text-green-400">R$ {metricas.arr.toFixed(2)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* GRÁFICO DE CRESCIMENTO */}
                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-500" />
                        Evolução de Receita (Últimos 6 Meses)
                    </h3>
                    <div className="space-y-3">
                        {crescimentoMensal.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-4">
                                <span className="text-xs text-gray-400 w-12 font-bold">{item.mes}</span>
                                <div className="flex-1 bg-gray-900 rounded-full h-8 overflow-hidden relative">
                                    <div
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-full flex items-center justify-end pr-3 text-xs font-bold transition-all"
                                        style={{ width: `${(item.valor / (metricas.mrr || 1)) * 100}%` }}
                                    >
                                        {item.valor > 0 && `R$ ${item.valor.toFixed(0)}`}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 w-16 text-right">{item.clientes} emp.</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DISTRIBUIÇÃO POR PLANO */}
                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                    <h3 className="text-lg font-black text-white mb-6">Distribuição por Plano</h3>
                    <div className="space-y-4">
                        {Object.entries(distribuicaoPorPlano).map(([plano, data]: [string, any]) => {
                            const percentual = (data.count / metricas.totalEmpresas) * 100;
                            const cores: any = {
                                INDIVIDUAL: 'from-blue-500 to-blue-600',
                                PREMIUM: 'from-purple-500 to-purple-600',
                                MASTER: 'from-yellow-500 to-yellow-600',
                            };
                            const cor = cores[plano] || 'from-gray-500 to-gray-600';

                            return (
                                <div key={plano} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-white">{plano}</span>
                                        <span className="text-xs text-gray-400">
                                            {data.count} clientes • R$ {data.mrr.toFixed(2)}/mês
                                        </span>
                                    </div>
                                    <div className="bg-gray-900 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`bg-gradient-to-r ${cor} h-full transition-all`}
                                            style={{ width: `${percentual}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">{percentual.toFixed(1)}% do total</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ALERTAS E ÚLTIMOS CADASTROS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ASSINATURAS VENCENDO */}
                <div className="bg-gray-800 p-6 rounded-3xl border border-red-900/50">
                    <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                        <AlertCircle className="text-red-500" />
                        Assinaturas Vencendo (7 dias)
                    </h3>
                    {assinaturasVencendo.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">Nenhuma assinatura vencendo nos próximos dias</p>
                    ) : (
                        <div className="space-y-3">
                            {assinaturasVencendo.slice(0, 5).map((emp: any) => (
                                <div key={emp.id} className="flex justify-between items-center border-b border-gray-700 pb-3">
                                    <div>
                                        <p className="font-bold text-white text-sm">{emp.name}</p>
                                        <p className="text-xs text-gray-500">{emp.plano}</p>
                                    </div>
                                    <span className="text-xs text-red-400">
                                        {new Date(emp.expiresAt).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ÚLTIMOS CADASTROS */}
                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                    <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                        <Calendar className="text-green-500" />
                        Últimos Cadastros
                    </h3>
                    <div className="space-y-3">
                        {ultimosCadastros.map((emp: any) => (
                            <div key={emp.id} className="flex justify-between items-center border-b border-gray-700 pb-3 last:border-0">
                                <div>
                                    <p className="font-bold text-white text-sm">{emp.name}</p>
                                    <p className="text-xs text-gray-500">{emp.slug}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded-full ${emp.status === 'ACTIVE' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                                        }`}>
                                        {emp.plano}
                                    </span>
                                    <p className="text-[10px] text-gray-600 mt-1">
                                        {new Date(emp.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
