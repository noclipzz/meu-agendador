"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, isToday, isBefore, startOfDay, endOfDay, startOfWeek, endOfWeek, subMonths, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    TrendingDown, Plus, Search, Trash2, Pencil, X,
    ArrowLeft, Calendar, Filter, ChevronDown, CheckCircle2,
    AlertCircle, Clock, MoreHorizontal, Download, FileText,
    Truck, Wallet, Hash, Loader2, Check, Printer, Copy, Eye,
    MoreVertical
} from "lucide-react";
import { formatarMoeda, desformatarMoeda } from "@/lib/validators";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

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
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [salvando, setSalvando] = useState(false);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);
    const [customDates, setCustomDates] = useState({ start: '', end: '' });

    // Filtros
    const [filters, setFilters] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
        status: "TODAS",
        category: "TODAS",
        frequency: "TODAS",
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
                setIsCustomDateModalOpen(true);
                setIsPeriodSelectorOpen(false);
                return;
        }

        const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
        setSelectedPeriod(capitalizedLabel);
        setFilters({ ...filters, start, end });
        setIsPeriodSelectorOpen(false);
    };

    const handleCustomDateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customDates.start || !customDates.end) return toast.error("Selecione as duas datas");

        const start = customDates.start;
        const end = customDates.end;

        const label = `${format(new Date(start), 'dd/MM/yy')} - ${format(new Date(end), 'dd/MM/yy')}`;
        setSelectedPeriod(label);
        setFilters({ ...filters, start, end });
        setIsCustomDateModalOpen(false);
        setIsSearchOpen(true);
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
        bankAccountId: "",
        nfe: "",
        notes: "",
        installments: 1,
        frequency: "ONCE"
    });

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [contasBancarias, setContasBancarias] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkDuplicating, setIsBulkDuplicating] = useState(false);

    useEffect(() => {
        loadData();
        loadSuppliers();
        carregarContas();
        setSelectedIds([]);
    }, [filters.start, filters.end, filters.status, filters.category, filters.frequency]);

    async function carregarContas() {
        try {
            const res = await fetch("/api/painel/financeiro/contas-bancarias");
            const data = await res.json();
            if (res.ok) setContasBancarias(data);
        } catch (e) { console.error("Erro contas", e); }
    }

    async function loadData() {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                start: filters.start,
                end: filters.end,
                status: filters.status,
                category: filters.category,
                frequency: filters.frequency,
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
            const bodyData = editingExpense ? { ...form, id: editingExpense.id, value: desformatarMoeda(String(form.value)) } : { ...form, value: desformatarMoeda(String(form.value)) };
            const res = await fetch('/api/painel/financeiro/despesas', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
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

    async function handleConfirmPayment(exp: any) {
        try {
            const res = await fetch('/api/painel/financeiro/despesas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: exp.id,
                    status: 'PAGO',
                    paidAt: format(new Date(), 'yyyy-MM-dd')
                })
            });
            if (res.ok) {
                toast.success("Pagamento confirmado!");
                loadData();
                setOpenActionMenuId(null);
            }
        } catch (error) {
            toast.error("Erro ao confirmar pagamento");
        }
    }

    async function handleDuplicatePayment(exp: any) {
        try {
            const { id, createdAt, updatedAt, supplier, ...data } = exp;
            const res = await fetch('/api/painel/financeiro/despesas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    description: `${data.description} (Cópia)`,
                    status: 'PENDENTE',
                    dueDate: format(addMonths(parseISO(data.dueDate.split('T')[0]), 1), 'yyyy-MM-dd')
                    // supplierId no backend pós refactor já resolve se for string vazia ou ID
                })
            });
            if (res.ok) {
                toast.success("Lançamento duplicado (para o próximo mês)");
                loadData();
                setOpenActionMenuId(null);
            }
        } catch (error) {
            toast.error("Erro ao duplicar");
        }
    }

    async function handleBulkDelete() {
        if (selectedIds.length === 0) return;
        if (!confirm(`Deseja excluir ${selectedIds.length} lançamentos selecionados?`)) return;

        setIsBulkDeleting(true);
        try {
            const res = await fetch('/api/painel/financeiro/despesas', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });
            if (res.ok) {
                toast.success(`${selectedIds.length} lançamentos excluídos`);
                setSelectedIds([]);
                loadData();
            }
        } catch (error) {
            toast.error("Erro ao excluir em massa");
        } finally {
            setIsBulkDeleting(false);
        }
    }

    async function handleBulkDuplicate() {
        if (selectedIds.length === 0) return;
        if (!confirm(`Deseja duplicar ${selectedIds.length} lançamentos para o próximo mês?`)) return;

        setIsBulkDuplicating(true);
        try {
            const promises = selectedIds.map(id => {
                const exp = expenses.find(e => e.id === id);
                if (!exp) return Promise.resolve();
                const { id: _, createdAt, updatedAt, supplier, ...data } = exp;
                return fetch('/api/painel/financeiro/despesas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...data,
                        status: 'PENDENTE',
                        dueDate: format(addMonths(parseISO(data.dueDate.split('T')[0]), 1), 'yyyy-MM-dd')
                    })
                });
            });

            await Promise.all(promises);
            toast.success(`${selectedIds.length} lançamentos duplicados`);
            setSelectedIds([]);
            loadData();
        } catch (error) {
            toast.error("Erro ao duplicar em massa");
        } finally {
            setIsBulkDuplicating(false);
        }
    }

    function toggleSelectAll() {
        if (selectedIds.length === expenses.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(expenses.map(exp => exp.id));
        }
    }

    function toggleSelect(id: string) {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }

    function handlePrintReceipt(exp: any) {
        toast.info("Gerando recibo...");
        // Simulação de geração de PDF/Impressão
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`
                <html>
                    <head><title>Recibo - ${exp.description}</title></head>
                    <body style="font-family: sans-serif; padding: 40px; border: 2px solid #EEE; max-width: 600px; margin: auto;">
                        <h1 style="text-align: center; color: #333;">RECIBO DE PAGAMENTO</h1>
                        <hr/>
                        <p><strong>Descrição:</strong> ${exp.description}</p>
                        <p><strong>Valor:</strong> R$ ${Number(exp.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p><strong>Data de Vencimento:</strong> ${format(parseISO(exp.dueDate.split('T')[0]), 'dd/MM/yyyy')}</p>
                        <p><strong>Status:</strong> ${exp.status}</p>
                        <p><strong>Fornecedor:</strong> ${exp.supplier?.name || 'Não informado'}</p>
                        <br/><br/>
                        <div style="border-top: 1px solid #000; width: 200px; margin-top: 40px; padding-top: 10px;">Assinatura</div>
                    </body>
                </html>
            `);
            win.document.close();
            win.print();
        }
    }

    async function handleDelete() {
        if (!expenseToDelete) return;
        try {
            const res = await fetch('/api/painel/financeiro/despesas', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: expenseToDelete.id })
            });
            if (res.ok) {
                toast.success("Excluído com sucesso");
                setIsDeleteModalOpen(false);
                setExpenseToDelete(null);
                loadData();
            }
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    }

    const getStatusBadge = (exp: any) => {
        if (exp.status === "PAGO") return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-black uppercase">Pago</span>;
        if (exp.status === "CANCELADO") return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-black uppercase">Cancelado</span>;

        const today = startOfDay(new Date());
        const dueDate = parseISO(exp.dueDate.split('T')[0]);

        if (isBefore(dueDate, today)) {
            return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase tracking-tighter">Atrasado</span>;
        }
        if (isToday(dueDate)) return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-black uppercase tracking-tighter">Hoje</span>;

        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-tighter">Pendente</span>;
    };

    return (
        <div className="space-y-6 relative">
            {/* Barra de Ações em Massa */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-300 border border-white/10">
                    <div className="flex items-center gap-3 pr-6 border-r border-white/20">
                        <div className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
                            {selectedIds.length}
                        </div>
                        <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Selecionados</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBulkDuplicate}
                            disabled={isBulkDuplicating}
                            className="px-4 py-2 hover:bg-white/10 rounded-xl transition flex items-center gap-2 text-sm font-bold text-emerald-400"
                        >
                            {isBulkDuplicating ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                            Duplicar
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="px-4 py-2 hover:bg-red-500/20 rounded-xl transition flex items-center gap-2 text-sm font-bold text-red-400"
                        >
                            {isBulkDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Excluir
                        </button>
                    </div>

                    <button
                        onClick={() => setSelectedIds([])}
                        className="ml-4 p-2 hover:bg-white/10 rounded-full transition text-gray-400"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
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
                                <div className="absolute left-0 md:right-0 md:left-auto mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 py-1 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left md:origin-top-right">
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
                                bankAccountId: "",
                                nfe: "", notes: "", installments: 1, frequency: "ONCE"
                            });
                            setIsViewOnly(false);
                            setIsModalOpen(true);
                        }}
                        className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black flex items-center gap-2 hover:bg-emerald-600 transition shadow-md active:scale-95 text-sm"
                    >
                        <Plus size={18} /> Adicionar
                    </button>
                    <button
                        onClick={() => {
                            setFilters({ ...filters, frequency: filters.frequency === "MONTHLY" ? "TODAS" : "MONTHLY" });
                            loadData();
                        }}
                        className={`px-5 py-2.5 rounded-xl font-black flex items-center gap-2 transition text-sm ${filters.frequency === 'MONTHLY' ? 'bg-purple-600 text-white' : 'bg-purple-900/10 text-purple-700 hover:bg-purple-900/20'}`}
                    >
                        <Wallet size={18} /> Contas fixas
                    </button>
                    <button
                        onClick={() => toast.info("Exportação em PDF iniciada...")}
                        className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-5 py-2.5 rounded-xl font-black flex items-center gap-2 hover:bg-gray-200 transition text-sm"
                    >
                        <Download size={18} /> Exportar
                    </button>
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
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                            <select
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold outline-none"
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                            >
                                <option value="TODAS">Todas</option>
                                <option value="ALUGUEL">Aluguel</option>
                                <option value="AGUA_LUZ_INTERNET">Água/Luz/Internet</option>
                                <option value="FORNECEDORES">Fornecedores</option>
                                <option value="FOLHA_PAGAMENTO">Folha de Pagamento</option>
                                <option value="IMPOSTOS">Impostos</option>
                                <option value="MARKETING">Marketing</option>
                                <option value="MANUTENCAO">Manutenção</option>
                                <option value="OUTROS">Outros</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Frequência</label>
                            <select
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold outline-none"
                                value={filters.frequency}
                                onChange={(e) => setFilters({ ...filters, frequency: e.target.value })}
                            >
                                <option value="TODAS">Todas</option>
                                <option value="ONCE">Única</option>
                                <option value="MONTHLY">Mensal</option>
                                <option value="YEARLY">Anual</option>
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
                                    category: "TODAS",
                                    frequency: "TODAS",
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
                                <th className="px-6 py-5 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={expenses.length > 0 && selectedIds.length === expenses.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
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
                                <tr key={exp.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition group ${selectedIds.includes(exp.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedIds.includes(exp.id)}
                                            onChange={() => toggleSelect(exp.id)}
                                        />
                                    </td>
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
                                            {exp.bankAccount && (
                                                <span className="text-[9px] font-bold text-blue-500 uppercase block leading-none mt-0.5">({exp.bankAccount.name})</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                            {format(parseISO(exp.dueDate.split('T')[0]), "dd/MM/yyyy", { locale: ptBR })}
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
                                            {/* Botão Visualizar (Azul) */}
                                            <button
                                                onClick={() => {
                                                    setEditingExpense(exp);
                                                    setForm({
                                                        ...exp,
                                                        supplierId: exp.supplierId || "",
                                                        value: exp.value ? formatarMoeda(exp.value.toString()) : "",
                                                        bankAccountId: exp.bankAccountId || "",
                                                        dueDate: exp.dueDate ? format(parseISO(exp.dueDate), 'yyyy-MM-dd') : "",
                                                    });
                                                    setIsViewOnly(true);
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-1.5 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition shadow-sm"
                                                title="Visualizar"
                                            >
                                                <Eye size={14} />
                                            </button>

                                            {/* Botão Editar (Laranja) */}
                                            <button
                                                onClick={() => {
                                                    setEditingExpense(exp);
                                                    setForm({
                                                        ...exp,
                                                        supplierId: exp.supplierId || "",
                                                        dueDate: exp.dueDate.split('T')[0],
                                                        bankAccountId: exp.bankAccountId || "",
                                                        value: exp.value ? formatarMoeda(exp.value.toString()) : "",
                                                    });
                                                    setIsViewOnly(false);
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 transition shadow-sm"
                                                title="Editar"
                                            >
                                                <Pencil size={14} />
                                            </button>

                                            {/* Botão Excluir (Vermelho) */}
                                            <button
                                                onClick={() => {
                                                    setExpenseToDelete(exp);
                                                    setIsDeleteModalOpen(true);
                                                }}
                                                className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition shadow-sm"
                                                title="Excluir"
                                            >
                                                <X size={14} />
                                            </button>

                                            {/* Botão Mais Opções (Verde) */}
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setMenuPosition({
                                                            top: rect.bottom + window.scrollY,
                                                            left: rect.right + window.scrollX - 208 // largura do menu (52 * 4)
                                                        });
                                                        setOpenActionMenuId(openActionMenuId === exp.id ? null : exp.id);
                                                    }}
                                                    className={`p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition shadow-sm ${openActionMenuId === exp.id ? 'ring-2 ring-emerald-300' : ''}`}
                                                    title="Mais ações"
                                                >
                                                    <ChevronDown size={14} className={`transition-transform duration-200 ${openActionMenuId === exp.id ? 'rotate-180' : ''}`} />
                                                </button>

                                                {openActionMenuId === exp.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-[150]" onClick={() => setOpenActionMenuId(null)} />
                                                        <div
                                                            style={{
                                                                position: 'fixed',
                                                                top: `${menuPosition.top + 8}px`,
                                                                left: `${menuPosition.left}px`
                                                            }}
                                                            className="w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 py-1 z-[160] animate-in fade-in zoom-in-95 duration-100 origin-top-right"
                                                        >
                                                            <button
                                                                onClick={() => handleConfirmPayment(exp)}
                                                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition"
                                                            >
                                                                <Check size={16} className="text-emerald-500" /> Confirmar pagamento
                                                            </button>
                                                            <button
                                                                onClick={() => handlePrintReceipt(exp)}
                                                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition"
                                                            >
                                                                <Printer size={16} className="text-blue-500" /> Imprimir recibo
                                                            </button>
                                                            <button
                                                                onClick={() => handleDuplicatePayment(exp)}
                                                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition"
                                                            >
                                                                <Copy size={16} className="text-purple-500" /> Duplicar pagamento
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 md:p-4 overflow-hidden">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[96vh] md:max-h-[90vh] mx-auto border dark:border-gray-800">
                        <div className="p-5 md:p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <div>
                                <h2 className="text-2xl font-black dark:text-white">
                                    {isViewOnly ? "Detalhes da Despesa" : editingExpense ? "Editar Despesa" : "Novo Lançamento"}
                                </h2>
                                <p className="text-sm text-gray-500 font-bold tracking-tight">
                                    {isViewOnly ? "Confira as informações registradas." : "Registre uma nova obrigação financeira."}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-8 space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Descrição *</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                        placeholder="Ex: Aluguel Fevereiro"
                                        disabled={isViewOnly}
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Valor (R$) *</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                        placeholder="R$ 0,00"
                                        disabled={isViewOnly}
                                        value={form.value}
                                        onChange={e => setForm({ ...form, value: formatarMoeda(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Data de Vencimento *</label>
                                    <input
                                        type="date"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                        disabled={isViewOnly}
                                        value={form.dueDate}
                                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Fornecedor</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner h-[58px]"
                                        disabled={isViewOnly}
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
                                        disabled={isViewOnly}
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
                                        disabled={isViewOnly}
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    >
                                        <option value="PENDENTE">Pendente</option>
                                        <option value="PAGO">Pago</option>
                                        <option value="VENCIDO">Vencido</option>
                                        <option value="CANCELADO">Cancelado</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Categoria</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                        disabled={isViewOnly}
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    >
                                        <option value="OUTROS">Outros</option>
                                        <option value="ALUGUEL">Aluguel</option>
                                        <option value="AGUA_LUZ_INTERNET">Água/Luz/Internet</option>
                                        <option value="FORNECEDORES">Fornecedores</option>
                                        <option value="FOLHA_PAGAMENTO">Folha de Pagamento</option>
                                        <option value="IMPOSTOS">Impostos</option>
                                        <option value="MARKETING">Marketing</option>
                                        <option value="MANUTENCAO">Manutenção</option>
                                    </select>
                                </div>
                                {contasBancarias.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Fundo de Caixa/Banco</label>
                                        <select
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                            disabled={isViewOnly}
                                            value={form.bankAccountId || ""}
                                            onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
                                        >
                                            <option value="">Não associar</option>
                                            {contasBancarias.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} (R$ {Number(c.balance).toFixed(2)})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">NF-e / Recibo</label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                            disabled={isViewOnly}
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
                                        disabled={isViewOnly}
                                        value={form.frequency}
                                        onChange={(e) => setForm({ ...form, frequency: e.target.value, installments: e.target.value === 'ONCE' ? 1 : 12 })}
                                    >
                                        <option value="ONCE">Única</option>
                                        <option value="MONTHLY">Mensal</option>
                                        <option value="YEARLY">Anual</option>
                                    </select>
                                </div>
                            </div>

                            {form.frequency !== 'ONCE' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Número de Parcelas / Repetições</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner"
                                        placeholder="Ex: 12"
                                        disabled={isViewOnly}
                                        value={form.installments}
                                        onChange={(e) => setForm({ ...form, installments: parseInt(e.target.value) || 1 })}
                                    />
                                    <p className="text-[10px] text-gray-500 font-bold ml-2 italic text-red-500">Serão gerados {form.installments} lançamentos automaticamente.</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Observações</label>
                                <textarea
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-red-500 font-bold shadow-inner h-24 resize-none"
                                    disabled={isViewOnly}
                                    placeholder="Detalhes adicionais..."
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                />
                            </div>

                            {editingExpense && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed dark:border-gray-700 space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Histórico de Registro</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-bold">Lançado por:</p>
                                            <p className="text-xs font-black text-gray-700 dark:text-gray-300">{editingExpense.createdBy || "Sistema"}</p>
                                            <p className="text-[10px] text-gray-400">{format(new Date(editingExpense.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-bold">Última edição:</p>
                                            <p className="text-xs font-black text-gray-700 dark:text-gray-300">{editingExpense.updatedBy || editingExpense.createdBy || "Sistema"}</p>
                                            <p className="text-[10px] text-gray-400">{format(new Date(editingExpense.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 md:p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex gap-3 md:gap-4">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-4 md:px-8 py-4 md:py-5 rounded-xl md:rounded-[1.5rem] font-black text-gray-500 hover:bg-gray-100 transition border dark:border-gray-700 text-sm"
                            >
                                Cancelar
                            </button>
                            {!isViewOnly && (
                                <button
                                    onClick={handleSave}
                                    disabled={salvando}
                                    className="flex-[2] bg-red-500 text-white px-2 md:px-8 py-4 md:py-5 rounded-xl md:rounded-[1.5rem] font-black text-sm md:text-lg shadow-xl hover:bg-red-600 transition active:scale-95 flex items-center justify-center gap-3 disabled:bg-gray-400"
                                >
                                    {salvando ? <Loader2 className="animate-spin" /> : editingExpense ? "Salvar Alterações" : "Confirmar Lançamento"}
                                </button>
                            )}
                            {isViewOnly && (
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-[2] bg-blue-600 text-white px-2 md:px-8 py-4 md:py-5 rounded-xl md:rounded-[1.5rem] font-black text-sm md:text-lg shadow-xl hover:bg-blue-700 transition active:scale-95 flex items-center justify-center"
                                >
                                    Entendido
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL Exclusão (Personalizado como na imagem) */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-[#1c1c1e] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-white/10 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-white font-bold text-lg mb-2">www.nohud.com.br diz</h3>
                            <p className="text-gray-300 text-sm">Deseja excluir esta despesa?</p>
                        </div>
                        <div className="p-4 bg-white/5 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    handleDelete();
                                }}
                                className="bg-[#2463eb] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition shadow-md active:scale-95 uppercase"
                            >
                                OK
                            </button>
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setExpenseToDelete(null);
                                }}
                                className="bg-transparent text-white border border-white/30 px-6 py-2 rounded-lg font-bold text-sm hover:bg-white/10 transition uppercase"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL PERÍODO CUSTOMIZADO */}
            {isCustomDateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[250] p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] w-full max-w-sm relative shadow-2xl border dark:border-gray-800 scale-in-95">
                        <button onClick={() => setIsCustomDateModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition">
                            <X size={24} />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">
                                Escolher Período
                            </h2>
                            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Defina as datas de início e fim</p>
                        </div>

                        <form onSubmit={handleCustomDateSubmit} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Data Inicial</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-red-500 transition"
                                    value={customDates.start}
                                    onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Data Final</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-red-500 transition"
                                    value={customDates.end}
                                    onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-red-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-red-500/20 hover:bg-red-700 transition flex items-center justify-center gap-2 active:scale-95 mt-6"
                            >
                                <CheckCircle2 size={24} /> Aplicar Período
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
