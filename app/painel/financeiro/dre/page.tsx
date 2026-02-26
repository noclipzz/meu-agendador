"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
    format, startOfMonth, endOfMonth, subMonths, addMonths
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Layers, ArrowLeft, ChevronLeft, ChevronRight, Loader2,
    TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
    Minus, DollarSign, Percent, BarChart3, PieChart
} from "lucide-react";

interface DRELine {
    label: string;
    value: number;
    percent?: number;
    type: "receita" | "despesa" | "resultado" | "header" | "separator";
    indent?: number;
    bold?: boolean;
}

export default function DREPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [mesAtual, setMesAtual] = useState(new Date());

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

    // Cálculos do DRE
    const dre = useMemo(() => {
        if (!data) return null;

        const receitaBruta = data.resumo?.bruto || 0;
        const deducoes = 0; // Não temos impostos de venda ainda
        const receitaLiquida = receitaBruta - deducoes;

        // Agrupa despesas por categoria
        const despesasPorCategoria: Record<string, number> = {};
        (data.allExpenses || []).forEach((exp: any) => {
            const cat = exp.category || "OUTROS";
            despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + Number(exp.value || 0);
        });

        const totalDespesas = data.resumo?.despesas || 0;
        const comissoes = data.resumo?.comissoes || 0;
        const resultadoOperacional = receitaLiquida - totalDespesas - comissoes;
        const margemOperacional = receitaBruta > 0 ? (resultadoOperacional / receitaBruta) * 100 : 0;
        const resultadoLiquido = resultadoOperacional; // Sem IR/CSLL por ora

        // Linhas do DRE
        const linhas: DRELine[] = [
            { label: "RECEITA OPERACIONAL BRUTA", value: receitaBruta, type: "header", bold: true },
            { label: "Receita de Serviços", value: receitaBruta, type: "receita", indent: 1 },
            { label: "", value: 0, type: "separator" },

            { label: "(-) DEDUÇÕES DA RECEITA", value: -deducoes, type: "header", bold: true },
            { label: "Impostos sobre serviços", value: -deducoes, type: "despesa", indent: 1 },
            { label: "", value: 0, type: "separator" },

            { label: "= RECEITA OPERACIONAL LÍQUIDA", value: receitaLiquida, type: "resultado", bold: true },
            { label: "", value: 0, type: "separator" },

            { label: "(-) DESPESAS OPERACIONAIS", value: -totalDespesas, type: "header", bold: true },
        ];

        // Adiciona categorias de despesas
        const categoriasLabels: Record<string, string> = {
            "ALUGUEL": "Aluguel",
            "AGUA_LUZ_INTERNET": "Água/Luz/Internet",
            "FORNECEDORES": "Fornecedores",
            "FOLHA_PAGAMENTO": "Folha de Pagamento",
            "IMPOSTOS": "Impostos e Taxas",
            "MARKETING": "Marketing e Publicidade",
            "MANUTENCAO": "Manutenção",
            "FIXA": "Despesas Fixas",
            "OUTROS": "Outras Despesas",
        };

        Object.entries(despesasPorCategoria)
            .sort(([, a], [, b]) => b - a)
            .forEach(([cat, val]) => {
                linhas.push({
                    label: categoriasLabels[cat] || cat,
                    value: -val,
                    type: "despesa",
                    indent: 1,
                    percent: receitaBruta > 0 ? (val / receitaBruta) * 100 : 0
                });
            });

        if (comissoes > 0) {
            linhas.push({ label: "Comissões", value: -comissoes, type: "despesa", indent: 1 });
        }

        linhas.push(
            { label: "", value: 0, type: "separator" },
            { label: "= RESULTADO OPERACIONAL", value: resultadoOperacional, type: "resultado", bold: true },
            { label: "", value: 0, type: "separator" },
            { label: "= RESULTADO LÍQUIDO DO EXERCÍCIO", value: resultadoLiquido, type: "resultado", bold: true },
        );

        return {
            linhas,
            receitaBruta,
            totalDespesas,
            resultadoLiquido,
            margemOperacional,
            despesasPorCategoria
        };
    }, [data]);

    const formatCurrency = (v: number) => {
        const abs = Math.abs(v);
        const formatted = `R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return v < 0 ? `(${formatted})` : formatted;
    };

    // Top 5 despesas para mini-chart
    const topDespesas = useMemo(() => {
        if (!dre) return [];
        return Object.entries(dre.despesasPorCategoria)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
    }, [dre]);

    const cores = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500'];
    const categoriasLabels: Record<string, string> = {
        "ALUGUEL": "Aluguel",
        "AGUA_LUZ_INTERNET": "Água/Luz/Internet",
        "FORNECEDORES": "Fornecedores",
        "FOLHA_PAGAMENTO": "Folha Pagamento",
        "IMPOSTOS": "Impostos",
        "MARKETING": "Marketing",
        "MANUTENCAO": "Manutenção",
        "FIXA": "Fixas",
        "OUTROS": "Outros",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/painel/financeiro" className="text-gray-400 hover:text-blue-600 transition">
                            <ArrowLeft size={18} />
                        </Link>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início / Financeiro / DRE</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <Layers size={32} className="text-blue-600" />
                        DRE Gerencial
                    </h1>
                    <p className="text-gray-500 font-bold text-sm mt-1">Demonstrativo de Resultados do Exercício.</p>
                </div>

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
            </div>

            {loading ? (
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border dark:border-gray-800 p-20 text-center">
                    <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
                    <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Processando DRE...</p>
                </div>
            ) : dre ? (
                <>
                    {/* Cards KPI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-l-4 border-emerald-500 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp size={14} className="text-emerald-500" />
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Receita Bruta</p>
                            </div>
                            <h3 className="text-xl font-black text-gray-800 dark:text-white">
                                R$ {dre.receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-l-4 border-red-500 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingDown size={14} className="text-red-500" />
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Despesas</p>
                            </div>
                            <h3 className="text-xl font-black text-gray-800 dark:text-white">
                                R$ {dre.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className={`p-5 rounded-2xl border-l-4 shadow-sm ${dre.resultadoLiquido >= 0 ? 'bg-blue-600 border-blue-400' : 'bg-red-600 border-red-400'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign size={14} className="text-white/80" />
                                <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">Resultado</p>
                            </div>
                            <h3 className="text-xl font-black text-white">
                                R$ {dre.resultadoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-l-4 border-purple-500 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <Percent size={14} className="text-purple-500" />
                                <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Margem</p>
                            </div>
                            <h3 className="text-xl font-black text-gray-800 dark:text-white">
                                {dre.margemOperacional.toFixed(1)}%
                            </h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Tabela DRE */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border dark:border-gray-800 overflow-hidden">
                            <div className="p-6 pb-0 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                <h3 className="text-lg font-black dark:text-white flex items-center gap-2 pb-4">
                                    <BarChart3 size={20} className="text-blue-600" />
                                    Demonstrativo Detalhado
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b dark:border-gray-800">
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-40">Valor</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dre.linhas.map((linha, i) => {
                                            if (linha.type === "separator") {
                                                return <tr key={i}><td colSpan={3} className="h-2 bg-gray-50/50 dark:bg-gray-800/20" /></tr>;
                                            }

                                            const isResultado = linha.type === "resultado";
                                            const isHeader = linha.type === "header";

                                            return (
                                                <tr
                                                    key={i}
                                                    className={`transition ${isResultado
                                                        ? 'bg-gray-50 dark:bg-gray-800/50 border-y dark:border-gray-700'
                                                        : isHeader
                                                            ? 'bg-gray-50/30 dark:bg-gray-800/20'
                                                            : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                                                        }`}
                                                >
                                                    <td className={`px-6 py-3 ${linha.indent ? 'pl-12' : ''}`}>
                                                        <span className={`text-sm ${linha.bold ? 'font-black text-gray-800 dark:text-white' : 'font-bold text-gray-600 dark:text-gray-400'}`}>
                                                            {linha.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <span className={`text-sm font-black ${linha.value > 0
                                                            ? 'text-emerald-600'
                                                            : linha.value < 0
                                                                ? 'text-red-500'
                                                                : 'text-gray-400'
                                                            }`}>
                                                            {linha.value !== 0 ? formatCurrency(linha.value) : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        {linha.percent !== undefined && linha.percent > 0 ? (
                                                            <span className="text-xs font-black text-gray-400">
                                                                {linha.percent.toFixed(1)}%
                                                            </span>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Composição de Despesas (Mini Gráfico) */}
                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border dark:border-gray-800 p-6">
                            <h3 className="text-lg font-black dark:text-white flex items-center gap-2 mb-6">
                                <PieChart size={20} className="text-purple-600" />
                                Composição de Despesas
                            </h3>

                            {topDespesas.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-400 font-bold text-sm">Sem despesas neste período.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {topDespesas.map(([cat, val], i) => {
                                        const pct = dre.totalDespesas > 0 ? (val / dre.totalDespesas) * 100 : 0;
                                        return (
                                            <div key={cat} className="space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-gray-600 dark:text-gray-400">
                                                        {categoriasLabels[cat] || cat}
                                                    </span>
                                                    <span className="text-xs font-black text-gray-500">
                                                        {pct.toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${cores[i] || 'bg-gray-500'} transition-all duration-700`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400">
                                                    R$ {Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Total */}
                            <div className="mt-6 pt-4 border-t dark:border-gray-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Total Despesas</span>
                                    <span className="text-sm font-black text-red-500">
                                        R$ {dre.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}
