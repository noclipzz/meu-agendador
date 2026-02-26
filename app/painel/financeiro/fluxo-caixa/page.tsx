"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
    format, startOfMonth, endOfMonth, subMonths, addMonths,
    eachDayOfInterval, startOfDay, isSameDay, isBefore, isAfter
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    BarChart4, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight,
    TrendingUp, TrendingDown, Wallet, Loader2, Calendar,
    ArrowUpRight, ArrowDownRight, Minus, Filter
} from "lucide-react";

export default function FluxoCaixaPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [mesAtual, setMesAtual] = useState(new Date());
    const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");

    useEffect(() => {
        loadData();
    }, [mesAtual]);

    async function loadData() {
        setLoading(true);
        try {
            const month = mesAtual.getMonth() + 1;
            const year = mesAtual.getFullYear();
            const res = await fetch(`/api/painel/financeiro?month=${month}&year=${year}`);
            const json = await res.json();
            if (json.error) {
                toast.error(json.error);
            } else {
                setData(json);
            }
        } catch {
            toast.error("Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    }

    // Calcula o fluxo diário
    const fluxoDiario = useMemo(() => {
        if (!data) return [];

        const inicio = startOfMonth(mesAtual);
        const fim = endOfMonth(mesAtual);
        const dias = eachDayOfInterval({ start: inicio, end: fim });

        return dias.map(dia => {
            const entradas = (data.allInvoices || [])
                .filter((inv: any) => {
                    const paidAt = inv.paidAt ? new Date(inv.paidAt) : null;
                    return paidAt && isSameDay(paidAt, dia);
                })
                .reduce((acc: number, inv: any) => acc + Number(inv.netValue || inv.value || 0), 0);

            const saidas = (data.allExpenses || [])
                .filter((exp: any) => {
                    const dueDate = new Date(exp.dueDate || exp.date);
                    return isSameDay(dueDate, dia);
                })
                .reduce((acc: number, exp: any) => acc + Number(exp.value || 0), 0);

            return {
                data: dia,
                entradas,
                saidas,
                saldo: entradas - saidas
            };
        });
    }, [data, mesAtual]);

    // Acumulado
    const saldoAcumulado = useMemo(() => {
        let acumulado = 0;
        return fluxoDiario.map(d => {
            acumulado += d.saldo;
            return { ...d, acumulado };
        });
    }, [fluxoDiario]);

    // Totais
    const totais = useMemo(() => {
        const totalEntradas = fluxoDiario.reduce((a, d) => a + d.entradas, 0);
        const totalSaidas = fluxoDiario.reduce((a, d) => a + d.saidas, 0);
        return {
            entradas: totalEntradas,
            saidas: totalSaidas,
            saldo: totalEntradas - totalSaidas
        };
    }, [fluxoDiario]);

    // Barra visual do gráfico mensal
    const maxBarValue = useMemo(() => {
        if (!data?.fluxoCaixa) return 1;
        return Math.max(...data.fluxoCaixa.map((m: any) => Math.max(m.receita, m.despesa)), 1);
    }, [data]);

    const formatCurrency = (v: number) =>
        `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const hoje = startOfDay(new Date());

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/painel/financeiro" className="text-gray-400 hover:text-blue-600 transition">
                            <ArrowLeft size={18} />
                        </Link>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início / Financeiro / Fluxo de Caixa</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <BarChart4 size={32} className="text-blue-600" />
                        Fluxo de Caixa
                    </h1>
                    <p className="text-gray-500 font-bold text-sm mt-1">Acompanhe a movimentação diária e mensal.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Navegação de mês */}
                    <div className="flex items-center bg-[#0f172a] rounded-xl overflow-hidden shadow-lg">
                        <button
                            onClick={() => setMesAtual(subMonths(mesAtual, 1))}
                            className="text-white px-3 py-2.5 hover:bg-white/10 transition"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-white font-black px-4 py-2.5 text-sm min-w-[160px] text-center capitalize">
                            {format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        <button
                            onClick={() => setMesAtual(addMonths(mesAtual, 1))}
                            className="text-white px-3 py-2.5 hover:bg-white/10 transition"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Toggle view */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setViewMode("daily")}
                            className={`px-4 py-2.5 text-sm font-black transition ${viewMode === "daily" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-200"}`}
                        >
                            Diário
                        </button>
                        <button
                            onClick={() => setViewMode("monthly")}
                            className={`px-4 py-2.5 text-sm font-black transition ${viewMode === "monthly" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-200"}`}
                        >
                            Mensal
                        </button>
                    </div>
                </div>
            </div>

            {/* Cards Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-l-4 border-emerald-500 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight size={16} className="text-emerald-500" />
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Entradas</p>
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">
                        {loading ? "..." : formatCurrency(totais.entradas)}
                    </h3>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-l-4 border-red-500 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownRight size={16} className="text-red-500" />
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Saídas</p>
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">
                        {loading ? "..." : formatCurrency(totais.saidas)}
                    </h3>
                </div>
                <div className={`p-6 rounded-2xl border-l-4 shadow-sm ${totais.saldo >= 0 ? 'bg-blue-600 border-blue-400' : 'bg-red-600 border-red-400'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet size={16} className="text-white/80" />
                        <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">Saldo do Mês</p>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">
                        {loading ? "..." : formatCurrency(totais.saldo)}
                    </h3>
                </div>
            </div>

            {loading ? (
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border dark:border-gray-800 p-20 text-center">
                    <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
                    <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Carregando fluxo de caixa...</p>
                </div>
            ) : viewMode === "daily" ? (
                /* ============ TABELA DIÁRIA ============ */
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                                <tr>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Entradas</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Saídas</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Saldo do Dia</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acumulado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-800">
                                {saldoAcumulado.map((dia, i) => {
                                    const isHoje = isSameDay(dia.data, hoje);
                                    const isFuturo = isAfter(dia.data, hoje);
                                    const temMovimentacao = dia.entradas > 0 || dia.saidas > 0;

                                    return (
                                        <tr
                                            key={i}
                                            className={`transition ${isHoje
                                                ? 'bg-blue-50/60 dark:bg-blue-900/10'
                                                : isFuturo
                                                    ? 'opacity-50'
                                                    : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                                                }`}
                                        >
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${isHoje
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                                        }`}>
                                                        {format(dia.data, 'dd')}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 capitalize">
                                                            {format(dia.data, 'EEEE', { locale: ptBR })}
                                                        </p>
                                                        {isHoje && <span className="text-[9px] font-black text-blue-600 uppercase">Hoje</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                {dia.entradas > 0 ? (
                                                    <span className="text-sm font-black text-emerald-600">
                                                        + {formatCurrency(dia.entradas)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm font-bold text-gray-300 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                {dia.saidas > 0 ? (
                                                    <span className="text-sm font-black text-red-500">
                                                        - {formatCurrency(dia.saidas)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm font-bold text-gray-300 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                {temMovimentacao ? (
                                                    <span className={`text-sm font-black ${dia.saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {formatCurrency(dia.saldo)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm font-bold text-gray-300 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <span className={`text-sm font-black ${dia.acumulado >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                                    {formatCurrency(dia.acumulado)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Rodapé Totais */}
                                <tr className="bg-gray-900 dark:bg-gray-950">
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total do Mês</span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <span className="text-sm font-black text-emerald-400">+ {formatCurrency(totais.entradas)}</span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <span className="text-sm font-black text-red-400">- {formatCurrency(totais.saidas)}</span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <span className={`text-sm font-black ${totais.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatCurrency(totais.saldo)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <span className="text-sm font-black text-blue-400">
                                            {formatCurrency(saldoAcumulado[saldoAcumulado.length - 1]?.acumulado || 0)}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ============ GRÁFICO MENSAL ============ */
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border dark:border-gray-800 p-8">
                    <h3 className="text-lg font-black dark:text-white mb-2">Comparativo Mensal</h3>
                    <p className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-widest">Últimos 6 meses — Receitas vs Despesas</p>

                    <div className="space-y-5">
                        {(data?.fluxoCaixa || []).map((m: any, i: number) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-gray-500 uppercase w-12">{m.mes}</span>
                                    <div className="flex gap-6 text-xs font-bold">
                                        <span className="text-emerald-600">{formatCurrency(m.receita)}</span>
                                        <span className="text-red-500">{formatCurrency(m.despesa)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {/* Receita bar */}
                                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-lg transition-all duration-500"
                                            style={{ width: `${Math.max((m.receita / maxBarValue) * 100, 0)}%` }}
                                        />
                                    </div>
                                    {/* Despesa bar */}
                                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-lg transition-all duration-500"
                                            style={{ width: `${Math.max((m.despesa / maxBarValue) * 100, 0)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Legenda */}
                    <div className="flex items-center gap-6 mt-8 pt-6 border-t dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
                            <span className="text-xs font-black text-gray-500 uppercase">Receitas</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 to-red-600" />
                            <span className="text-xs font-black text-gray-500 uppercase">Despesas</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
