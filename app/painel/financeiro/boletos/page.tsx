"use client";

import { useState, useEffect } from "react";
import {
    Barcode, Search, Filter, X, ChevronDown, ChevronRight,
    ArrowLeft, Loader2, QrCode, CreditCard, Banknote,
    CheckCircle, AlertCircle, Clock, Download, ExternalLink,
    TrendingUp, TrendingDown, Layers, MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AddonPaywall } from "@/components/AddonPaywall";

export default function BoletosPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("TODAS");
    const [hasModule, setHasModule] = useState<boolean | null>(null);

    useEffect(() => {
        carregarDados();
    }, []);

    async function carregarDados() {
        setLoading(true);
        try {
            // Buscamos as faturas que possuem algum gatewayId (indicando que foi gerada na Cora)
            const res = await fetch("/api/financeiro/faturas?status=TODAS");
            const json = await res.json();

            if (json && json.invoices) {
                // Filtramos apenas faturas que têm vínculo com boletos/pix Cora
                const apenasBoletos = json.invoices.filter((inv: any) => inv.gatewayId !== null && inv.gatewayId !== undefined);
                setData(apenasBoletos);
            } else {
                setData([]);
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar boletos.");
        } finally {
            // Verifica módulo
            fetch("/api/painel/config")
                .then(res => res.json())
                .then(conf => setHasModule(!!conf.hasBoletoModule))
                .catch(() => setHasModule(false))
                .finally(() => setLoading(false));
        }
    }

    const formatCurrency = (val: number) => {
        return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getStatusStyle = (status: string, dueDate: string) => {
        if (status === "PAGO") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
        if (status === "CANCELADO") return "bg-gray-100 text-gray-500";

        const isVencido = parseISO(dueDate.split('T')[0]) < startOfDay(new Date());
        if (isVencido) return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";

        return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
    };

    const getStatusLabel = (status: string, dueDate: string) => {
        if (status === "PAGO") return "Liquidado";
        if (status === "CANCELADO") return "Cancelado";

        const isVencido = parseISO(dueDate.split('T')[0]) < startOfDay(new Date());
        return isVencido ? "Vencido" : "Aguardando";
    };

    const boletosFiltrados = data?.filter((inv: any) => {
        const matchBusca = inv.description?.toLowerCase().includes(busca.toLowerCase()) ||
            inv.client?.name?.toLowerCase().includes(busca.toLowerCase());

        let matchStatus = true;
        if (filtroStatus !== "TODAS") {
            if (filtroStatus === "PAGO") matchStatus = inv.status === "PAGO";
            else if (filtroStatus === "PENDENTE") matchStatus = inv.status === "PENDENTE";
            else if (filtroStatus === "ATRASADO") {
                matchStatus = inv.status === "PENDENTE" && parseISO(inv.dueDate.split('T')[0]) < startOfDay(new Date());
            }
        }

        return matchBusca && matchStatus;
    }) || [];

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline mr-2" /> Carregando...</div>;

    if (hasModule === false) {
        return (
            <AddonPaywall
                title="Automação Bancária (Cora)"
                description="Gere boletos e cobranças PIX com baixa automática. Quando seu cliente paga, o sistema liquida a fatura sozinho para você."
                icon={<Barcode size={32} />}
                color="orange"
                benefits={[
                    "Emissão de Boletos e PIX em 1 clique",
                    "Baixa automática no sistema (Sem conferência manual)",
                    "Notificação de pagamento em tempo real",
                    "Redução de inadimplência com links de cobrança",
                    "Relatórios detalhados de liquidação"
                ]}
            />
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            {/* CABEÇALHO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border dark:border-gray-700">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/painel/financeiro" className="text-gray-400 hover:text-blue-600 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <span className="bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                            Banking / Cora API
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white tracking-tighter flex items-center gap-3">
                        <Barcode className="text-blue-600 hidden md:block" size={36} />
                        Boletos Bancários
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mt-2">
                        Acompanhe o status dos boletos e PIX gerados via Cora Bank.
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={carregarDados}
                        className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-200 transition shadow-sm active:scale-95 flex-1 md:flex-none justify-center whitespace-nowrap text-sm"
                    >
                        <Clock size={20} /> Atualizar Status
                    </button>
                    <Link
                        href="/painel/financeiro/contas-receber"
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 active:scale-95 flex-1 md:flex-none justify-center whitespace-nowrap text-sm"
                    >
                        Nova Cobrança
                    </Link>
                </div>
            </div>

            {/* FILTROS RÁPIDOS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-[2rem] shadow-sm border dark:border-gray-700 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Gerado</p>
                    <h3 className="text-xl font-black text-gray-800 dark:text-white">{formatCurrency(data?.reduce((acc: any, curr: any) => acc + Number(curr.value), 0))}</h3>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-[2rem] shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Liquidados</p>
                    <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(data?.filter((i: any) => i.status === "PAGO").reduce((acc: any, curr: any) => acc + Number(curr.value), 0))}</h3>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-[2rem] shadow-sm border border-amber-100 dark:border-amber-900/30 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">A vencer</p>
                    <h3 className="text-xl font-black text-amber-700 dark:text-amber-400">{formatCurrency(data?.filter((i: any) => i.status === "PENDENTE" && parseISO(i.dueDate.split('T')[0]) >= startOfDay(new Date())).reduce((acc: any, curr: any) => acc + Number(curr.value), 0))}</h3>
                </div>
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-[2rem] shadow-sm border border-red-100 dark:border-red-900/30 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Vencidos</p>
                    <h3 className="text-xl font-black text-red-700 dark:text-red-400">{formatCurrency(data?.filter((i: any) => i.status === "PENDENTE" && parseISO(i.dueDate.split('T')[0]) < startOfDay(new Date())).reduce((acc: any, curr: any) => acc + Number(curr.value), 0))}</h3>
                </div>
            </div>

            {/* TABELA DE COBRANÇAS */}
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-2xl flex-1 w-full border dark:border-gray-700">
                        <Search size={18} className="text-gray-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Buscar por descrição ou cliente..."
                            className="bg-transparent outline-none text-sm font-bold w-full"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-xl border dark:border-gray-700 outline-none text-sm font-bold text-gray-600 dark:text-gray-300 w-full md:w-auto"
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                    >
                        <option value="TODAS">Todos Status</option>
                        <option value="PAGO">Liquidados</option>
                        <option value="PENDENTE">Pendentes</option>
                        <option value="ATRASADO">Atrasados</option>
                    </select>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Informações</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tomador (Cliente)</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vencimento</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Link</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-2" />
                                        <p className="text-gray-400 font-bold">Carregando cobranças...</p>
                                    </td>
                                </tr>
                            ) : boletosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <Barcode size={40} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-400 font-bold">Nenhum boleto ou PIX localizado.</p>
                                    </td>
                                </tr>
                            ) : (
                                boletosFiltrados.map((inv: any) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition group">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate max-w-[200px]">{inv.description || "Cobrança"}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">ID: {inv.gatewayId?.slice(-8)}</span>
                                                    {inv.pixQrCode ? <QrCode size={10} className="text-emerald-500" /> : <CreditCard size={10} className="text-blue-500" />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700 dark:text-gray-300 text-xs">{inv.client?.name}</span>
                                                <span className="text-[9px] text-gray-400">{inv.client?.phone || "Sem telefone"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700 dark:text-gray-300 text-xs">
                                                    {format(parseISO(inv.dueDate.split('T')[0]), "dd/MM/yyyy")}
                                                </span>
                                                <span className="text-[9px] text-gray-400 font-black">
                                                    {format(parseISO(inv.dueDate.split('T')[0]), "EEEE", { locale: ptBR })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatusStyle(inv.status, inv.dueDate)}`}>
                                                {getStatusLabel(inv.status, inv.dueDate)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right font-black text-gray-900 dark:text-white text-sm">
                                            {formatCurrency(inv.value)}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {inv.bankUrl ? (
                                                <a
                                                    href={inv.bankUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 inline-flex bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                                                    title="Abrir Cobrança"
                                                >
                                                    <ExternalLink size={18} />
                                                </a>
                                            ) : (
                                                <span className="text-gray-300 cursor-not-allowed"><ExternalLink size={18} /></span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* INFO BOX */}
            <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                <div className="relative z-10 max-w-xl">
                    <h3 className="text-2xl font-black tracking-tighter mb-2">Sincronização Ativa</h3>
                    <p className="text-blue-100 font-bold opacity-90 text-sm leading-relaxed">
                        Seu sistema está configurado para receber notificações automáticas do Cora Bank. Assim que um cliente confirmar o pagamento, a fatura correspondente será liquidada automaticamente no Contas a Receber.
                    </p>
                </div>
                <div className="relative z-10 flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md mb-2">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase opacity-60">Baixa Auto</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md mb-2">
                            <CheckCircle size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase opacity-60">Segurança</span>
                    </div>
                </div>
                {/* Background Decor */}
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition duration-700"></div>
            </div>
        </div>
    );
}
