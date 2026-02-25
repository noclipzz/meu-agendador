"use client";

import { useState, useEffect } from "react";
import { Plus, Search, FileText, Download, Calendar as CalendarIcon, Filter, X, ChevronLeft, ChevronRight, TrendingUp, ArrowDownRight, MoreVertical, Pencil, Trash2, CheckCircle2, Eye, Receipt, CreditCard, Banknote, HelpCircle, Loader2, QrCode, ArrowLeft, MoreHorizontal, ChevronDown, CheckCircle } from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function ContasReceberPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("todos");

    // Filtros avançados
    const [filters, setFilters] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
        status: "TODAS",
        search: ""
    });
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [isPeriodSelectorOpen, setIsPeriodSelectorOpen] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);

    // Estados para Modais e Ações
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"create" | "edit" | "view">("create");
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        const label = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
        setSelectedPeriod(label.charAt(0).toUpperCase() + label.slice(1));
    }, []);

    const handlePeriodChange = (period: string) => {
        const now = new Date();
        let start = "";
        let end = "";
        let label = period;

        switch (period) {
            case "HOJE":
                start = format(startOfDay(now), 'yyyy-MM-dd');
                end = format(endOfDay(now), 'yyyy-MM-dd');
                label = "Hoje";
                break;
            case "SEMANA":
                start = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                end = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                label = "Esta semana";
                break;
            case "MES_PASSADO":
                const lastMonth = subMonths(now, 1);
                start = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
                end = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
                label = format(lastMonth, "MMMM 'de' yyyy", { locale: ptBR });
                break;
            case "ESTE_MES":
                start = format(startOfMonth(now), 'yyyy-MM-dd');
                end = format(endOfMonth(now), 'yyyy-MM-dd');
                label = format(now, "MMMM 'de' yyyy", { locale: ptBR });
                break;
            case "PROXIMO_MES":
                const nextMonth = addMonths(now, 1);
                start = format(startOfMonth(nextMonth), 'yyyy-MM-dd');
                end = format(endOfMonth(nextMonth), 'yyyy-MM-dd');
                label = format(nextMonth, "MMMM 'de' yyyy", { locale: ptBR });
                break;
            case "TODO":
                start = "";
                end = "";
                label = "Todo o período";
                break;
        }

        const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
        setSelectedPeriod(capitalizedLabel);
        setFilters({ ...filters, start, end });
        setIsPeriodSelectorOpen(false);
    };

    async function carregarDados() {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                start: filters.start,
                end: filters.end,
                status: filtrosAvancados(),
                search: busca || filters.search
            }).toString();

            const res = await fetch(`/api/painel/financeiro/receber?${query}`);
            const json = await res.json();
            if (res.ok) {
                setData(json);
            } else {
                toast.error(json.error || "Erro ao carregar dados.");
            }
        } catch (error) {
            toast.error("Erro na conexão com o servidor.");
        } finally {
            setLoading(false);
        }
    }

    function filtrosAvancados() {
        if (filtroStatus === 'PAGO') return 'PAGO';
        if (filtroStatus === 'PENDENTE') return 'PENDENTE';
        return 'TODAS'; // Apenas para passar pro backend, o front ainda faz o de atrasados
    }

    async function carregarClientes() {
        try {
            const res = await fetch("/api/clientes");
            const json = await res.json();
            if (Array.isArray(json)) setClients(json);
        } catch (e) { console.error(e); }
    }

    useEffect(() => {
        carregarDados();
    }, [filters.start, filters.end, filters.status, filtroStatus, busca]);

    useEffect(() => {
        if (isModalOpen && clients.length === 0) carregarClientes();
    }, [isModalOpen]);

    const formatCurrency = (val: number) => {
        return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // --- AÇÕES ---
    async function confirmarRecebimento(id: string) {
        toast.promise(
            fetch("/api/financeiro/faturas", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: "PAGO" })
            }).then(async res => {
                if (!res.ok) throw new Error();
                carregarDados();
            }),
            {
                loading: 'Dando baixa na fatura...',
                success: 'Recebimento confirmado!',
                error: 'Erro ao confirmar recebimento.',
            }
        );
    }

    async function executarExclusaoFatura() {
        if (!invoiceToDelete) return;

        toast.promise(
            fetch(`/api/financeiro/faturas?id=${invoiceToDelete.id}`, { method: "DELETE" }).then(async res => {
                if (!res.ok) throw new Error();
                setIsDeleteModalOpen(false);
                setInvoiceToDelete(null);
                carregarDados();
            }),
            {
                loading: 'Excluindo...',
                success: 'Fatura removida!',
                error: 'Erro ao excluir.',
            }
        );
    }

    const [isEmitindoNfe, setIsEmitindoNfe] = useState(false);

    async function emitirNfe() {
        if (!selectedInvoice) return;

        const discriminacaoInput = window.prompt(
            "✍️ Digite a Discriminação dos Serviços que sairá na Nota Fiscal:",
            selectedInvoice.description || "Serviços Prestados"
        );

        if (discriminacaoInput === null) return; // cancelou

        if (discriminacaoInput.trim() === "") {
            toast.error("A discriminação não pode estar vazia.");
            return;
        }

        setIsEmitindoNfe(true);

        const promise = fetch('/api/painel/financeiro/nfe', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                invoiceId: selectedInvoice.id,
                environment: 'HOMOLOGATION',
                discriminacao: discriminacaoInput
            })
        }).then(async res => {
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.details || data.error);
            }
            return data;
        }).finally(() => {
            setIsEmitindoNfe(false);
            carregarDados();
        });

        toast.promise(promise, {
            loading: 'Enviando XML para a Prefeitura...',
            success: (data) => `Retorno: ${data.message}`,
            error: (err) => `Atenção (Prefeitura): ${err.message}`, // Para o usuário ler oq estourou
        });
    }

    async function salvarFatura(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const payload = Object.fromEntries(formData.entries());

        // Se for edição, usamos o selectedInvoice.companyId
        const companyId = selectedInvoice?.companyId || data?.invoices?.[0]?.companyId;

        try {
            const res = await fetch("/api/financeiro/faturas", {
                method: modalType === "edit" ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...payload,
                    id: selectedInvoice?.id,
                    companyId
                })
            });

            if (res.ok) {
                toast.success(modalType === "edit" ? "Fatura atualizada!" : "Fatura lançada!");
                setIsModalOpen(false);
                carregarDados();
            } else {
                toast.error("Erro ao salvar fatura.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        } finally {
            setFormLoading(false);
        }
    }

    const invoicesFiltradas = data?.invoices?.filter((inv: any) => {
        const matchBusca = inv.description?.toLowerCase().includes(busca.toLowerCase()) ||
            inv.client?.name?.toLowerCase().includes(busca.toLowerCase());

        let matchStatus = true;
        const isVencido = new Date(inv.dueDate) < new Date() && inv.status === "PENDENTE";

        if (filtroStatus === "PAGO") {
            matchStatus = inv.status === "PAGO";
        } else if (filtroStatus === "PENDENTE") {
            matchStatus = inv.status === "PENDENTE" && !isVencido;
        } else if (filtroStatus === "ATRASADO") {
            matchStatus = isVencido;
        }

        return matchBusca && matchStatus;
    }) || [];

    const getStatusStyle = (status: string, dueDate: string) => {
        const isVencido = new Date(dueDate) < new Date() && status === "PENDENTE";
        if (status === "PAGO") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
        if (isVencido) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    };

    const getStatusLabel = (status: string, dueDate: string) => {
        const isVencido = new Date(dueDate) < new Date() && status === "PENDENTE";
        if (status === "PAGO") return "Confirmado";
        if (isVencido) return "Atrasado";
        return "Pendente";
    };

    const getPaymentIcon = (method: string) => {
        switch (method) {
            case 'PIX': return <QrCode size={14} />;
            case 'PIX_CORA': return <QrCode size={14} />;
            case 'BOLETO': return <FileText size={14} />;
            case 'CREDITO':
            case 'DEBITO': return <CreditCard size={14} />;
            case 'DINHEIRO': return <Banknote size={14} />;
            default: return <FileText size={14} />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/painel/financeiro" className="text-gray-400 hover:text-blue-600 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Financeiro / Contas a Receber</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <TrendingUp size={32} className="text-emerald-500" />
                        Contas a Receber
                    </h1>
                    <p className="text-gray-500 font-bold text-sm">Gestão de faturas, boletos e entradas futuras.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setModalType("create"); setSelectedInvoice(null); setIsModalOpen(true); }}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-700 transition shadow-lg active:scale-95"
                    >
                        <Plus size={20} /> Lançar Entrada
                    </button>
                    <button className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 px-4 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition active:scale-95">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>

            {/* CARDS DE RESUMO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: "Vencidos", value: data?.summary?.overdue, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-100 dark:border-red-900/30" },
                    { label: "Vencem hoje", value: data?.summary?.today, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-100 dark:border-amber-900/30" },
                    { label: "A vencer", value: data?.summary?.upcoming, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-800/50", border: "border-gray-100 dark:border-gray-700" },
                    { label: "Recebidos", value: data?.summary?.received, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-100 dark:border-emerald-900/30" },
                    { label: "Total", value: data?.summary?.total, color: "text-blue-600", bg: "bg-blue-600 text-white", border: "border-blue-600", isDark: true },
                ].map((card, i) => (
                    <div key={i} className={`${card.bg} ${card.border} border-2 p-6 rounded-[2rem] flex flex-col justify-center shadow-sm`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${card.isDark ? 'text-blue-100' : 'text-gray-400'}`}>{card.label}</p>
                        <h3 className={`text-2xl font-black tracking-tighter ${card.isDark ? 'text-white' : card.color}`}>
                            {formatCurrency(card.value)}
                        </h3>
                    </div>
                ))}
            </div>

            {/* FILTROS E BUSCA */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-[2rem] shadow-sm border dark:border-gray-700 flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center bg-gray-50 dark:bg-gray-900 px-4 py-3 rounded-2xl flex-1 w-full border dark:border-gray-700 focus-within:ring-2 ring-emerald-500/20 transition">
                    <Search size={18} className="text-gray-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Buscar por descrição ou cliente..."
                        className="bg-transparent outline-none text-sm font-bold w-full"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    {/* Seletor de Período igual ao Contas a Pagar */}
                    <div className="relative w-full sm:w-auto">
                        <button
                            onClick={() => setIsPeriodSelectorOpen(!isPeriodSelectorOpen)}
                            className="w-full bg-[#0f172a] text-white px-4 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#1e293b] transition min-w-[180px] justify-between text-sm shadow-md"
                        >
                            <span className="capitalize">{selectedPeriod}</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isPeriodSelectorOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isPeriodSelectorOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsPeriodSelectorOpen(false)}
                                />
                                <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 py-1 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                                    <button onClick={() => handlePeriodChange('HOJE')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Hoje</button>
                                    <button onClick={() => handlePeriodChange('SEMANA')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Esta semana</button>
                                    <button onClick={() => handlePeriodChange('MES_PASSADO')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Mês passado</button>
                                    <button onClick={() => handlePeriodChange('ESTE_MES')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Este mês</button>
                                    <button onClick={() => handlePeriodChange('PROXIMO_MES')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Próximo mês</button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                    <button onClick={() => handlePeriodChange('TODO')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition uppercase tracking-tighter">Todo o período</button>
                                </div>
                            </>
                        )}
                    </div>

                    <select
                        className="bg-gray-50 dark:bg-gray-900 px-4 py-3 rounded-2xl border dark:border-gray-700 outline-none text-sm font-bold text-gray-600 dark:text-gray-300 w-full sm:w-auto"
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                    >
                        <option value="todos">Todos Status</option>
                        <option value="PAGO">Confirmados</option>
                        <option value="PENDENTE">Pendentes</option>
                        <option value="ATRASADO">Atrasados</option>
                    </select>
                </div>
            </div>

            {/* TABELA */}
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entidade (Cliente)</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagamento</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Situação</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto mb-2" />
                                        <p className="text-gray-400 font-bold">Carregando faturas...</p>
                                    </td>
                                </tr>
                            ) : invoicesFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <TrendingUp size={40} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-400 font-bold">Nenhuma fatura encontrada para este período.</p>
                                    </td>
                                </tr>
                            ) : (
                                invoicesFiltradas.map((inv: any) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition group">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate max-w-[200px]">{inv.description || "Atendimento"}</span>
                                                <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">ID: {inv.id.slice(-8)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-[10px]">
                                                    {inv.client?.name?.charAt(0) || "C"}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 text-xs">{inv.client?.name}</span>
                                                    <span className="text-[9px] text-gray-400">{inv.client?.phone || "Sem telefone"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-bold text-[11px]">
                                                {getPaymentIcon(inv.method)}
                                                <span className="uppercase tracking-tighter">{inv.method || "A definir"}</span>
                                                {(inv.method === 'PIX_CORA' || inv.method === 'BOLETO') && <CheckCircle size={10} className="text-blue-500" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700 dark:text-gray-300 text-xs">
                                                    {format(new Date(inv.dueDate), "dd/MM/yyyy")}
                                                </span>
                                                <span className="text-[9px] text-gray-400 font-black">
                                                    {format(new Date(inv.dueDate), "EEEE", { locale: ptBR })}
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
                                            {inv.nfeStatus && (
                                                <span className={`block text-[9px] uppercase font-black tracking-widest mt-1 ${inv.nfeStatus === 'PROCESSANDO' ? 'text-blue-500' : 'text-orange-500'}`}>
                                                    NFS-e: {inv.nfeStatus}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button
                                                    onClick={() => { setModalType("view"); setSelectedInvoice(inv); setIsModalOpen(true); }}
                                                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg transition"
                                                    title="Ver detalhes"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => { setModalType("edit"); setSelectedInvoice(inv); setIsModalOpen(true); }}
                                                    className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 rounded-lg transition"
                                                    title="Editar"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                {inv.status === "PENDENTE" && (
                                                    <button
                                                        onClick={() => confirmarRecebimento(inv.id)}
                                                        className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 rounded-lg transition"
                                                        title="Confirmar Recebimento"
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { setInvoiceToDelete(inv); setIsDeleteModalOpen(true); }}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL LANÇAMENTO / EDIÇÃO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] w-full max-w-lg relative shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar border dark:border-gray-800">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition"><TrendingUp className="rotate-45" size={24} /></button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">
                                {modalType === "create" ? "Lançar Nova Entrada" : modalType === "edit" ? "Editar Fatura" : "Detalhes da Fatura"}
                            </h2>
                            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Controle Financeiro Nohud</p>
                        </div>

                        <form onSubmit={salvarFatura} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Cliente</label>
                                    <select
                                        key={`client-select-${clients.length}`}
                                        name="clientId"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-emerald-500 transition"
                                        defaultValue={selectedInvoice?.clientId || ""}
                                        required
                                        disabled={modalType === "view"}
                                    >
                                        <option value="">Selecione um cliente...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Descrição do Lançamento</label>
                                    <input
                                        name="description"
                                        type="text"
                                        placeholder="Ex: Contrato de Serviços de TI"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-emerald-500 transition"
                                        defaultValue={selectedInvoice?.description || ""}
                                        required
                                        disabled={modalType === "view"}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Valor (R$)</label>
                                        <input
                                            name="value"
                                            type="number"
                                            step="0.01"
                                            placeholder="0,00"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-emerald-500 transition"
                                            defaultValue={selectedInvoice?.value || ""}
                                            required
                                            disabled={modalType === "view"}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Vencimento</label>
                                        <input
                                            name="dueDate"
                                            type="date"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-emerald-500 transition"
                                            defaultValue={selectedInvoice?.dueDate ? format(new Date(selectedInvoice.dueDate), "yyyy-MM-dd") : ""}
                                            required
                                            disabled={modalType === "view"}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Status</label>
                                        <select
                                            name="status"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-emerald-500 transition"
                                            defaultValue={selectedInvoice?.status || "PENDENTE"}
                                            disabled={modalType === "view"}
                                        >
                                            <option value="PENDENTE">Pendente</option>
                                            <option value="PAGO">Pago / Confirmado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Método</label>
                                        <select
                                            name="method"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-emerald-500 transition"
                                            defaultValue={selectedInvoice?.method || ""}
                                            disabled={modalType === "view"}
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="PIX">PIX (Manual)</option>
                                            <option value="PIX_CORA">PIX (Cora)</option>
                                            <option value="BOLETO">Boleto (Cora)</option>
                                            <option value="DINHEIRO">Dinheiro</option>
                                            <option value="CREDITO">Cartão Crédito</option>
                                            <option value="DEBITO">Cartão Débito</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {modalType !== "view" && (
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition flex items-center justify-center gap-2 active:scale-95 mt-4"
                                >
                                    {formLoading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                                    {modalType === "create" ? "Lançar Recebimento" : "Salvar Alterações"}
                                </button>
                            )}

                            {modalType === "view" && (
                                <div className="flex flex-col gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={emitirNfe}
                                        disabled={isEmitindoNfe}
                                        className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition flex justify-center items-center gap-2 shadow-lg shadow-blue-500/30"
                                    >
                                        {isEmitindoNfe ? <Loader2 className="animate-spin" /> : <FileText size={20} />}
                                        {isEmitindoNfe ? "Conectando..." : "Emitir Nota Fiscal (NFS-e)"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 p-5 rounded-2xl font-black text-lg hover:bg-gray-200 transition"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL Exclusão (Personalizado como na imagem) */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-[#1c1c1e] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-white/10 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-white font-bold text-lg mb-2">www.nohud.com.br diz</h3>
                            <p className="text-gray-300 text-sm">Tem certeza que deseja excluir esta fatura?</p>
                        </div>
                        <div className="p-4 bg-white/5 flex justify-end gap-3">
                            <button
                                onClick={executarExclusaoFatura}
                                className="bg-[#2463eb] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition shadow-md active:scale-95 uppercase"
                            >
                                OK
                            </button>
                            <button
                                onClick={() => { setIsDeleteModalOpen(false); setInvoiceToDelete(null); }}
                                className="bg-transparent text-white border border-white/30 px-6 py-2 rounded-lg font-bold text-sm hover:bg-white/10 transition uppercase"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
