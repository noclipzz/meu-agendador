"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalIcon, Filter, Search, Plus, User, FileText, CheckCircle, Clock, AlertTriangle, FileCheck, Trash2, Box, Info, X, MapPin, Phone, MessageSquare, Download, Hash, ShieldCheck, UploadCloud, TrendingUp, HelpCircle, ArrowDownRight, MoreVertical, Pencil, CheckCircle2, Eye, Receipt, CreditCard, Banknote, Loader2, QrCode, ArrowLeft, MoreHorizontal, ChevronDown, Barcode, ChevronLeft, ChevronRight } from "lucide-react";
import { formatarMoeda, desformatarMoeda } from "@/lib/validators";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, subMonths, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

function ModalPortal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || typeof document === 'undefined') return null;
    const target = document.getElementById('modal-root') || document.body;
    return createPortal(children, target);
}

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
        search: "",
        entityType: "Cliente" // Novo Filtro
    });
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [isPeriodSelectorOpen, setIsPeriodSelectorOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false); // Novo Estado Busca Avançada
    const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);
    const [customDates, setCustomDates] = useState({ start: '', end: '' });

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [pixData, setPixData] = useState<{ qrCode: string, emv: string } | null>(null);
    const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);

    // Estados para Modais e Ações
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"create" | "edit" | "view">("create");
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [formLoading, setFormLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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
                start = "ALL";
                end = "ALL";
                label = "Todo o período";
                break;
        }

        if (period === "CUSTOM") {
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
        if (!customDates.start || !customDates.end) {
            toast.error("Preencha as duas datas.");
            return;
        }

        const startStr = customDates.start;
        const endStr = customDates.end;

        const startParsed = new Date(`${startStr}T12:00:00`);
        const endParsed = new Date(`${endStr}T12:00:00`);

        const label = `${format(startParsed, 'dd/MM/yy')} até ${format(endParsed, 'dd/MM/yy')}`;

        setSelectedPeriod(label);
        setFilters({ ...filters, start: startStr, end: endStr });
        setIsCustomDateModalOpen(false);
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

    const [contasBancarias, setContasBancarias] = useState<any[]>([]);

    async function carregarContas() {
        try {
            const res = await fetch("/api/painel/financeiro/contas-bancarias");
            const data = await res.json();
            if (res.ok) setContasBancarias(data);
        } catch (e) { console.error("Erro contas", e); }
    }

    useEffect(() => {
        if (isModalOpen && clients.length === 0) carregarClientes();
        if (isModalOpen && contasBancarias.length === 0) carregarContas();
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
    const [isGerandoCora, setIsGerandoCora] = useState(false);

    async function handleBulkDelete() {
        if (selectedIds.length === 0) return;
        if (!confirm(`Deseja excluir ${selectedIds.length} faturas selecionadas?`)) return;

        setIsBulkDeleting(true);
        try {
            const res = await fetch('/api/financeiro/faturas', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });
            if (res.ok) {
                toast.success(`${selectedIds.length} faturas excluídas`);
                setSelectedIds([]);
                carregarDados();
            }
        } catch (error) {
            toast.error("Erro ao excluir em massa");
        } finally {
            setIsBulkDeleting(false);
        }
    }

    function toggleSelectAll() {
        const invoices = data?.invoices || [];
        if (selectedIds.length === invoices.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(invoices.map((inv: any) => inv.id));
        }
    }

    function toggleSelect(id: string) {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }

    async function gerarCobrancaCora(metodo: 'BOLETO' | 'PIX') {
        if (!selectedInvoice) return;
        setIsGerandoCora(true);

        const promise = fetch('/api/painel/financeiro/cora/cobranca', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                invoiceId: selectedInvoice.id
            })
        }).then(async res => {
            const data = await res.json();
            if (!res.ok) {
                // Se a API retornou um erro estruturado da Cora, tenta pegar a mensagem interna
                const detail = data.message || data.error || "Erro desconhecido";
                throw new Error(detail);
            }
            return data;
        }).finally(() => {
            setIsGerandoCora(false);
            carregarDados();
        });

        toast.promise(promise, {
            loading: `Gerando cobrança na Cora...`,
            success: (data) => {
                console.log("🔍 [DEBUG CORA RETURN]:", data);
                if (metodo === 'PIX') {
                    const emv = data.payment_options?.pix?.emv;
                    const qrCode = data.payment_options?.pix?.image_url;
                    if (emv || qrCode) {
                        setPixData({ emv: emv || "", qrCode: qrCode || "" });
                        setIsPixModalOpen(true);
                        setIsModalOpen(false); // Fecha o modal de detalhes
                        return `PIX pronto para pagamento!`;
                    }
                    console.warn("⚠️ PIX solicitado mas não retornado pela Cora.");
                    throw new Error("Este documento não possui dados de PIX. Tente gerar o Boleto Cora.");
                }

                const url = data.payment_options?.bank_slip?.url;
                if (url) {
                    window.open(url, '_blank');
                    return `Abrindo boleto em nova aba...`;
                }
                return `Cobrança pronta com sucesso!`;
            },
            error: (err) => `Atenção: ${err.message}`,
        });
    }

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

        // Busca o companyId correto
        const companyId = selectedInvoice?.companyId || data?.summary?.companyId || data?.invoices?.[0]?.companyId;

        try {
            const res = await fetch("/api/financeiro/faturas", {
                method: modalType === "edit" ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...payload,
                    value: desformatarMoeda(String(payload.value)),
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
        // Busca textual
        const termo = filters.search.toLowerCase() || busca.toLowerCase();
        const matchBusca = inv.description?.toLowerCase().includes(termo) ||
            inv.client?.name?.toLowerCase().includes(termo);

        // Filtro de Entidade (Por enquanto só tem Cliente, mas deixa preparado)
        let matchEntity = true;
        if (filters.entityType === "Cliente") {
            matchEntity = !!inv.clientId;
        }

        // Status
        let matchStatus = true;
        const statusReq = filters.status !== "TODAS" ? filters.status : filtroStatus;
        const isVencido = parseISO(inv.dueDate.split('T')[0]) < startOfDay(new Date()) && inv.status === "PENDENTE";

        if (statusReq === "PAGO") {
            matchStatus = inv.status === "PAGO";
        } else if (statusReq === "PENDENTE") {
            matchStatus = inv.status === "PENDENTE" && !isVencido;
        } else if (statusReq === "ATRASADO") {
            matchStatus = isVencido;
        } else if (statusReq === "CANCELADO") {
            matchStatus = inv.status === "CANCELADO";
        }

        return matchBusca && matchStatus && matchEntity;
    }) || [];

    const getStatusStyle = (status: string, dueDate: string) => {
        const isVencido = parseISO(dueDate.split('T')[0]) < startOfDay(new Date()) && status === "PENDENTE";
        if (status === "PAGO") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
        if (isVencido) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    };

    const getStatusLabel = (status: string, dueDate: string) => {
        const isVencido = parseISO(dueDate.split('T')[0]) < startOfDay(new Date()) && status === "PENDENTE";
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
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="px-4 py-2 hover:bg-red-500/20 rounded-xl transition flex items-center gap-2 text-sm font-bold text-red-400"
                        >
                            {isBulkDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Excluir faturas
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
                    <div className="relative group">
                        <button className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-5 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-200 transition text-sm">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={`px-5 py-3 rounded-2xl font-black flex items-center gap-2 transition text-sm ${isSearchOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                    >
                        <Filter size={18} /> Busca avançada
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

            {/* Busca Avançada (Desenhado Igual Pagamentos) */}
            {isSearchOpen && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição do Pagamento</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold placeholder-gray-400"
                                placeholder="O que você busca?"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Entidade</label>
                            <select
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold text-gray-600 dark:text-gray-300 outline-none"
                                value={filters.entityType}
                                onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                            >
                                <option value="Selecione">Selecione...</option>
                                <option value="Cliente">Cliente</option>
                            </select>
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
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold text-gray-600 dark:text-gray-300 outline-none"
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="TODAS">Todas As Situações</option>
                                <option value="PENDENTE">A Vencer/Pendente</option>
                                <option value="PAGO">Creditado na Conta</option>
                                <option value="ATRASADO">Pagamento Vencido</option>
                                <option value="CANCELADO">Pagamento Cancelado</option>
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
                                    search: "",
                                    entityType: "Cliente"
                                });
                                setSelectedPeriod(format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }));
                                setBusca("");
                                setFiltroStatus("todos");
                                carregarDados();
                            }}
                            className="px-6 py-2.5 bg-red-50 text-red-500 rounded-xl font-black text-sm hover:bg-red-100 transition flex items-center gap-2"
                        >
                            <X size={18} /> Limpar
                        </button>
                    </div>
                </div>
            )}

            {/* FILTROS E BUSCA (Somente Exibidos se Busca Avançada Fechada para não poluir) */}
            {!isSearchOpen && (
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
                                        <button onClick={() => handlePeriodChange('CUSTOM')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Escolha o período</button>
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
            )}

            {/* TABELA */}
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                                <th className="px-6 py-5 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        checked={(data?.invoices?.length || 0) > 0 && selectedIds.length === (data?.invoices?.length || 0)}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
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
                                    <tr key={inv.id} className={`hover:bg-gray-50 dark:hover:bg-gray-750 transition group ${selectedIds.includes(inv.id) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                                        <td className="px-6 py-5">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                checked={selectedIds.includes(inv.id)}
                                                onChange={() => toggleSelect(inv.id)}
                                            />
                                        </td>
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
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-bold text-[11px]">
                                                    {getPaymentIcon(inv.method)}
                                                    <span className="uppercase tracking-tighter">{inv.method || "A definir"}</span>
                                                    {(inv.method === 'PIX_CORA' || inv.method === 'BOLETO') && <CheckCircle size={10} className="text-blue-500" />}
                                                </div>
                                                {inv.bankAccount && (
                                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter mt-0.5">({inv.bankAccount.name})</span>
                                                )}
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
                <ModalPortal><div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
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
                                            type="text"
                                            placeholder="R$ 0,00"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-emerald-500 transition"
                                            defaultValue={selectedInvoice?.value ? formatarMoeda(selectedInvoice.value.toString()) : ""}
                                            onChange={(e) => e.target.value = formatarMoeda(e.target.value)}
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
                                            defaultValue={selectedInvoice?.dueDate ? selectedInvoice.dueDate.split('T')[0] : ""}
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
                                            <option value="PIX_CORA">PIX</option>
                                            <option value="BOLETO">Boleto</option>
                                            <option value="DINHEIRO">Dinheiro</option>
                                            <option value="CREDITO">Cartão Crédito</option>
                                            <option value="DEBITO">Cartão Débito</option>
                                        </select>
                                    </div>
                                </div>
                                {contasBancarias.length > 0 && (
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Fundo de Caixa/Banco</label>
                                        <select
                                            name="bankAccountId"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-emerald-500 transition"
                                            defaultValue={selectedInvoice?.bankAccountId || ""}
                                            disabled={modalType === "view"}
                                        >
                                            <option value="">Não associar</option>
                                            {contasBancarias.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} (R$ {Number(c.balance).toFixed(2)})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
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
                                    {selectedInvoice?.status !== 'PAGO' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => gerarCobrancaCora('BOLETO')}
                                                disabled={isGerandoCora}
                                                className="w-full bg-blue-50 text-blue-600 border border-blue-200 p-4 rounded-2xl font-black text-sm hover:bg-blue-100 transition flex justify-center items-center gap-2"
                                            >
                                                {isGerandoCora ? <Loader2 className="animate-spin" size={18} /> : <Barcode size={18} />}
                                                {isGerandoCora ? "Gerando..." : "Gerar Boleto"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => gerarCobrancaCora('PIX')}
                                                disabled={isGerandoCora}
                                                className="w-full bg-emerald-50 text-emerald-600 border border-emerald-200 p-4 rounded-2xl font-black text-sm hover:bg-emerald-100 transition flex justify-center items-center gap-2"
                                            >
                                                {isGerandoCora ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18} />}
                                                {isGerandoCora ? "Gerando..." : "Gerar PIX"}
                                            </button>
                                        </div>
                                    )}

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
                </div></ModalPortal>
            )}

            {/* MODAL Exclusão (Personalizado como na imagem) */}
            {isDeleteModalOpen && (
                <ModalPortal><div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
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
                </div></ModalPortal>
            )}

            {/* MODAL PERÍODO CUSTOMIZADO */}
            {isCustomDateModalOpen && (
                <ModalPortal><div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[110] p-4 animate-in fade-in duration-200">
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
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-emerald-500 transition"
                                    value={customDates.start}
                                    onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Data Final</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-4 rounded-2xl font-bold dark:text-white outline-none focus:border-emerald-500 transition"
                                    value={customDates.end}
                                    onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition flex items-center justify-center gap-2 active:scale-95 mt-6"
                            >
                                <CheckCircle2 size={24} /> Aplicar Período
                            </button>
                        </form>
                    </div>
                </div></ModalPortal>
            )}

            {/* MODAL PIX CORA (QR CODE + COPIA E COLA) */}
            {isPixModalOpen && pixData && (
                <ModalPortal><div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[250] p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] w-full max-w-sm relative shadow-2xl border dark:border-gray-800 text-center animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setIsPixModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition"
                        >
                            <X size={24} />
                        </button>

                        <div className="mb-6">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <QrCode size={32} />
                            </div>
                            <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">
                                Pagamento via PIX
                            </h2>
                            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Escaneie o QR Code abaixo</p>
                        </div>

                        {pixData.qrCode && (
                            <div className="bg-white p-4 rounded-3xl border-2 border-gray-100 dark:border-gray-800 mb-6 mx-auto w-fit">
                                <img src={pixData.qrCode} alt="QR Code PIX" className="w-48 h-48" />
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Código Copia e Cola</label>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        className="flex-1 bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 p-3 rounded-xl font-mono text-[10px] dark:text-gray-300 outline-none"
                                        value={pixData.emv}
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(pixData.emv);
                                            toast.success("Código PIX copiado!");
                                        }}
                                        className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition active:scale-95"
                                        title="Copiar código"
                                    >
                                        <Download size={18} className="rotate-180" />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsPixModalOpen(false)}
                                className="w-full bg-gray-900 text-white p-4 rounded-2xl font-black uppercase text-sm hover:bg-black transition active:scale-95 mt-4"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div></ModalPortal>
            )}
        </div>
    );
}
