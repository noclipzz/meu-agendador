"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, isToday, isBefore, startOfDay, endOfDay, startOfWeek, endOfWeek, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    TrendingDown, Plus, Search, Trash2, Pencil, X,
    ArrowLeft, Calendar, Filter, ChevronDown, CheckCircle2,
    AlertCircle, Clock, MoreHorizontal, Download, FileText,
    Truck, Wallet, Hash, Loader2
} from "lucide-react";

export default function ContasPagarPage() {
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [summary, setSummary] = useState({
        overdue: 0,
        today: 0,
        upcoming: 0,
        paid: 0,
        total: 0
    });

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [salvando, setSalvando] = useState(false);

    // Filtros
    const [filters, setFilters] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
        status: "TODAS",
        search: ""
    });

    const [selectedPeriod, setSelectedPeriod] = useState("");

    useEffect(() => {
        const label = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
        setSelectedPeriod(label.charAt(0).toUpperCase() + label.slice(1));
    }, []);

    const [isPeriodSelectorOpen, setIsPeriodSelectorOpen] = useState(false);

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
            case "CUSTOM":
                setIsSearchOpen(true);
                setIsPeriodSelectorOpen(false);
                return;
        }

        const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
        setSelectedPeriod(capitalizedLabel);
        setFilters({ ...filters, start, end });
        setIsPeriodSelectorOpen(false);
    };

    // Formulário
    const [form, setForm] = useState({
        description: "",
        value: "",
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        status: "PENDENTE",
        paymentMethod: "DINHEIRO",
        supplierId: "",
        category: "FIXA",
        paymentAccount: "CAIXA",
        costCenter: "ADMINISTRATIVO",
        nfe: "",
        notes: "",
        installments: 1,
        frequency: "ONCE"
    });

    const [suppliers, setSuppliers] = useState<any[]>([]);

    useEffect(() => {
        loadData();
        loadSuppliers();
    }, [filters.start, filters.end, filters.status]);

    async function loadData() {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                start: filters.start,
                end: filters.end,
                status: filters.status,
                search: filters.search
            }).toString();

            const res = await fetch(`/api/painel/financeiro/despesas?${query}`);
            const data = await res.json();
            if (data.expenses) {
                setExpenses(data.expenses);
                setSummary(data.summary);
            }
        } catch (error) {
            toast.error("Erro ao carregar despesas");
        } finally {
            setLoading(false);
        }
    }

    async function loadSuppliers() {
        try {
            const res = await fetch('/api/painel/fornecedores');
            const data = await res.json();
            if (Array.isArray(data)) setSuppliers(data);
        } catch (error) { }
    }

    async function handleSave() {
        if (!form.description || !form.value) return toast.error("Preencha os campos obrigatórios");
        setSalvando(true);

        try {
            const method = editingExpense ? 'PUT' : 'POST';
            const res = await fetch('/api/painel/financeiro/despesas', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingExpense ? { ...form, id: editingExpense.id } : form)
            });

            if (res.ok) {
                toast.success(editingExpense ? "Despesa atualizada" : "Despesa lançada!");
                setIsModalOpen(false);
                setEditingExpense(null);
                loadData();
            } else {
                toast.error("Erro ao salvar");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        } finally {
            setSalvando(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Deseja excluir esta despesa?")) return;
        try {
            const res = await fetch('/api/painel/financeiro/despesas', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                toast.success("Excluído com sucesso");
                loadData();
            }
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    }

    const getStatusBadge = (exp: any) => {
        if (exp.status === "PAGO") return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-black uppercase">Pago</span>;

        const date = new Date(exp.dueDate);
        if (isBefore(date, startOfMonth(new Date())) || (isBefore(date, new Date()) && !isToday(date))) {
            return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase tracking-tighter">Atrasado</span>;
        }
        if (isToday(date)) return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-black uppercase tracking-tighter">Hoje</span>;

        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-tighter">Pendente</span>;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2 group">
                        <Link href="/painel/financeiro" className="text-gray-400 hover:text-blue-600 transition">
                            <ArrowLeft size={18} />
                        </Link>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início / Contas a pagar / Listar</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <TrendingDown size={32} className="text-red-500" />
                        Contas a pagar
                    </h1>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Filtro de Período Estilo Neon */}
                    <div className="relative">
                        <button
                            onClick={() => setIsPeriodSelectorOpen(!isPeriodSelectorOpen)}
                            className="bg-[#0f172a] text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-[#1e293b] transition shadow-lg min-w-[180px] justify-between text-sm"
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
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 py-1 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                    <button onClick={() => handlePeriodChange('HOJE')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Hoje</button>
                                    <button onClick={() => handlePeriodChange('SEMANA')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Esta semana</button>
                                    <button onClick={() => handlePeriodChange('MES_PASSADO')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Mês passado</button>
                                    <button onClick={() => handlePeriodChange('ESTE_MES')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Este mês</button>
                                    <button onClick={() => handlePeriodChange('PROXIMO_MES')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Próximo mês</button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                    <button onClick={() => handlePeriodChange('TODO')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition uppercase tracking-tighter">Todo o período</button>
                                    <button onClick={() => handlePeriodChange('CUSTOM')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">Escolha o período</button>
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            setEditingExpense(null);
                            setForm({
                                description: "", value: "", dueDate: format(new Date(), 'yyyy-MM-dd'),
                                status: "PENDENTE", paymentMethod: "PIX", supplierId: "",
                                category: "FIXA", paymentAccount: "CAIXA", costCenter: "ADMINISTRATIVO",
                                nfe: "", notes: "", installments: 1, frequency: "ONCE"
                            });
                            setIsModalOpen(true);
                        }}
                        className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black flex items-center gap-2 hover:bg-emerald-600 transition shadow-md active:scale-95 text-sm"
                    >
                        <Plus size={18} /> Adicionar
                    </button>
                    <button className="bg-purple-900/10 text-purple-700 px-5 py-2.5 rounded-xl font-black flex items-center gap-2 hover:bg-purple-900/20 transition text-sm">
                        <Wallet size={18} /> Contas fixas
                    </button>
                    <div className="relative group">
                        <button className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-5 py-2.5 rounded-xl font-black flex items-center gap-2 hover:bg-gray-200 transition text-sm">
                            Mais ações <ChevronDown size={16} />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={`px-5 py-2.5 rounded-xl font-black flex items-center gap-2 transition text-sm ${isSearchOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                    >
                        <Filter size={18} /> Busca avançada
                    </button>
                </div>
            </div>

            {/* Cards Sumário */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border-l-4 border-red-500 shadow-sm">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Vencidos</p>
                    <h3 className="text-xl font-black text-gray-800 dark:text-white">R$ {summary.overdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border-l-4 border-orange-500 shadow-sm">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Vencem hoje</p>
                    <h3 className="text-xl font-black text-gray-800 dark:text-white">R$ {summary.today.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border-l-4 border-slate-500 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">A vencer</p>
                    <h3 className="text-xl font-black text-gray-800 dark:text-white">R$ {summary.upcoming.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border-l-4 border-emerald-500 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Pagos</p>
                    <h3 className="text-xl font-black text-gray-800 dark:text-white">R$ {summary.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-gray-900 p-4 rounded-2xl border-l-4 border-white shadow-sm col-span-2 md:col-span-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                    <h3 className="text-xl font-black text-white">R$ {summary.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
            </div>

            {/* Busca Avançada */}
            {isSearchOpen && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border dark:border-gray-700 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold"
                                placeholder="O que você busca?"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Início</label>
                            <input
                                type="date"
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold shadow-inner"
                                value={filters.start}
                                onChange={(e) => setFilters({ ...filters, start: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fim</label>
                            <input
                                type="date"
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold shadow-inner"
                                value={filters.end}
                                onChange={(e) => setFilters({ ...filters, end: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Situação</label>
                            <select
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold outline-none"
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="TODAS">Todas</option>
                                <option value="PENDENTE">Pendente</option>
                                <option value="PAGO">Pago</option>
                                <option value="CANCELADO">Cancelado</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t dark:border-gray-700">
                        <button
                            onClick={() => {
                                setFilters({
                                    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                                    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
                                    status: "TODAS",
                                    search: ""
                                });
                                setSelectedPeriod(format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }));
                                loadData();
                            }}
                            className="px-6 py-2.5 bg-red-50 text-red-500 rounded-xl font-black text-sm hover:bg-red-100 transition flex items-center gap-2"
                        >
                            <X size={18} /> Limpar
                        </button>
                        <button
                            onClick={loadData}
                            className="px-8 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-sm hover:bg-emerald-600 transition flex items-center gap-2 shadow-lg active:scale-95"
                        >
                            <Search size={18} /> Buscar
                        </button>
                    </div>
                </div>
            )}

            {/* Tabela */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entidade</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagamento</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vencimento</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Situação</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
                                        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Sincronizando Finanças...</p>
                                    </td>
                                </tr>
                            ) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <div className="bg-gray-50 dark:bg-gray-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <TrendingDown className="text-gray-300" size={40} />
                                        </div>
                                        <p className="text-gray-400 font-black">Nenhuma despesa para o período selecionado.</p>
                                    </td>
                                </tr>
                            ) : expenses.map(exp => (
                                <tr key={exp.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition group">
                                    <td className="px-6 py-4">
                                        <p className="font-black text-gray-800 dark:text-white text-sm">{exp.description}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{exp.category || "GERAL"}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Truck size={14} className="text-gray-400" />
                                            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{exp.supplier?.name || "Sem Fornecedor"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Wallet size={14} className="text-gray-400" />
                                            <span className="text-xs font-black text-gray-500 uppercase">{exp.paymentMethod || "Não informado"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                            {format(new Date(exp.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {getStatusBadge(exp)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-sm font-black ${exp.status === 'PAGO' ? 'text-emerald-500' : 'text-gray-800 dark:text-white'}`}>
                                            R$ {Number(exp.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                            <button
                                                onClick={() => {
                                                    setEditingExpense(exp);
                                                    setForm({
                                                        ...exp,
                                                        dueDate: format(new Date(exp.dueDate), 'yyyy-MM-dd'),
                                                        value: Number(exp.value).toString()
                                                    });
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(exp.id)}
                                                className="p-2 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL Lançamento */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <div>
                                <h2 className="text-2xl font-black dark:text-white">{editingExpense ? "Editar Despesa" : "Novo Lançamento"}</h2>
                                <p className="text-sm text-gray-500 font-bold tracking-tight">Registre uma nova obrigação financeira.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Descrição *</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                        placeholder="Ex: Aluguel Fevereiro"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Valor (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                        placeholder="0,00"
                                        value={form.value}
                                        onChange={(e) => setForm({ ...form, value: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Data de Vencimento *</label>
                                    <input
                                        type="date"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                        value={form.dueDate}
                                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Fornecedor</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner h-[58px]"
                                        value={form.supplierId}
                                        onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                                    >
                                        <option value="">Selecione um fornecedor</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Pagamento</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                        value={form.paymentMethod}
                                        onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                                    >
                                        <option value="DINHEIRO">Dinheiro</option>
                                        <option value="PIX">PIX</option>
                                        <option value="BOLETO">Boleto</option>
                                        <option value="CARTAO_DEBITO">Cartão de Débito</option>
                                        <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                                        <option value="TRANSFERENCIA">Transferência</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Situação</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    >
                                        <option value="PENDENTE">Pendente</option>
                                        <option value="PAGO">Pago</option>
                                        <option value="VENCIDO">Vencido</option>
                                        <option value="CANCELADO">Cancelado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">NF-e / Recibo</label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                            placeholder="Nº do documento"
                                            value={form.nfe}
                                            onChange={(e) => setForm({ ...form, nfe: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Frequência</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                        value={form.frequency}
                                        onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                                    >
                                        <option value="ONCE">Única</option>
                                        <option value="MONTHLY">Mensal</option>
                                        <option value="YEARLY">Anual</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Observações</label>
                                <textarea
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner h-24 resize-none"
                                    placeholder="Detalhes adicionais..."
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex gap-4">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-8 py-5 rounded-[1.5rem] font-black text-gray-500 hover:bg-gray-100 transition border dark:border-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={salvando}
                                className="flex-[2] bg-red-500 text-white px-8 py-5 rounded-[1.5rem] font-black text-lg shadow-xl hover:bg-red-600 transition active:scale-95 flex items-center justify-center gap-3 disabled:bg-gray-400"
                            >
                                {salvando ? <Loader2 className="animate-spin" /> : editingExpense ? "Salvar Alterações" : "Confirmar Lançamento"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
