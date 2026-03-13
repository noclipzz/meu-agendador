"use client";

import { useState, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
    Settings2, ArrowLeft, Plus, Pencil, Trash2, X, Tag,
    CreditCard, Briefcase, Building2, Save,
    Folder, AlertCircle, Loader2
} from "lucide-react";

// Initial Constants as Fallback
const DEFAULT_CATEGORIAS_DESPESA = [
    { id: "ALUGUEL", name: "Aluguel", icon: "🏠", color: "bg-indigo-500" },
    { id: "AGUA_LUZ_INTERNET", name: "Água / Luz / Internet", icon: "💡", color: "bg-cyan-500" },
    { id: "FORNECEDORES", name: "Fornecedores", icon: "📦", color: "bg-orange-500" },
    { id: "FOLHA_PAGAMENTO", name: "Folha de Pagamento", icon: "👥", color: "bg-green-500" },
    { id: "IMPOSTOS", name: "Impostos e Taxas", icon: "🏛️", color: "bg-red-500" },
    { id: "MARKETING", name: "Marketing e Publicidade", icon: "📣", color: "bg-pink-500" },
    { id: "MANUTENCAO", name: "Manutenção", icon: "🔧", color: "bg-yellow-500" },
    { id: "OUTROS", name: "Outros", icon: "📋", color: "bg-gray-500" },
];

const DEFAULT_METODOS_PAGAMENTO = [
    { id: "DINHEIRO", name: "Dinheiro", icon: "💵" },
    { id: "PIX", name: "PIX", icon: "⚡" },
    { id: "PIX_CORA", name: "PIX Cora", icon: "🟢" },
    { id: "BOLETO", name: "Boleto", icon: "📄" },
    { id: "BOLETO_CORA", name: "Boleto Cora", icon: "🔵" },
    { id: "CARTAO_CREDITO", name: "Cartão de Crédito", icon: "💳" },
    { id: "CARTAO_DEBITO", name: "Cartão de Débito", icon: "💳" },
    { id: "TRANSFERENCIA", name: "Transferência Bancária", icon: "🏦" },
];

const DEFAULT_CENTROS_CUSTO = [
    { id: "ADMINISTRATIVO", name: "Administrativo", description: "Despesas de escritório e administração" },
    { id: "OPERACIONAL", name: "Operacional", description: "Custo direto da operação" },
    { id: "COMERCIAL", name: "Comercial", description: "Vendas e marketing" },
    { id: "FINANCEIRO", name: "Financeiro", description: "Juros, taxas bancárias" },
];

type TabKey = "categorias" | "pagamentos" | "centros" | "contas";

export default function AuxiliaresPage() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const isConfig = pathname.startsWith("/painel/config");
    const initialTab = (searchParams.get("tab") as TabKey) || "categorias";
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
    const [loading, setLoading] = useState(true);

    // States for custom data
    const [categorias, setCategorias] = useState<any[]>(DEFAULT_CATEGORIAS_DESPESA);
    const [pagamentos, setPagamentos] = useState<any[]>(DEFAULT_METODOS_PAGAMENTO);
    const [centros, setCentros] = useState<any[]>(DEFAULT_CENTROS_CUSTO);
    const [contasReais, setContasReais] = useState<any[]>([]);

    // Modal States
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<TabKey | "">("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ id: "", name: "", icon: "📌", description: "", color: "bg-blue-500" });

    useEffect(() => {
        const tab = searchParams.get("tab") as TabKey;
        if (tab && ["categorias", "pagamentos", "centros", "contas"].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [auxRes, contasRes] = await Promise.all([
                fetch("/api/painel/financeiro/auxiliares"),
                fetch("/api/painel/financeiro/contas-bancarias")
            ]);

            const auxData = await auxRes.json();
            const contasData = await contasRes.json();

            if (auxData) {
                if (auxData.categorias && auxData.categorias.length > 0) setCategorias(auxData.categorias);
                if (auxData.pagamentos && auxData.pagamentos.length > 0) setPagamentos(auxData.pagamentos);
                if (auxData.centros && auxData.centros.length > 0) setCentros(auxData.centros);
            }

            if (contasData && !contasData.error) {
                setContasReais(contasData);
            }
        } catch (error) {
            console.error("Erro ao carregar auxiliares", error);
        } finally {
            setLoading(false);
        }
    };

    const saveAuxiliariesToDB = async (cats: any[], pags: any[], cents: any[]) => {
        try {
            const payload = { categorias: cats, pagamentos: pags, centros: cents };
            await fetch("/api/painel/financeiro/auxiliares", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            toast.error("Erro ao sincronizar com banco de dados.");
        }
    };

    const handleFormSubmit = async () => {
        if (!form.name || !form.id) {
            return toast.error("Preencha um ID único e um Nome.");
        }

        const safeId = form.id.toUpperCase().replace(/\s+/g, "_");

        let newCats = [...categorias];
        let newPags = [...pagamentos];
        let newCents = [...centros];

        if (modalType === "categorias") {
            if (editingId) newCats = newCats.map(c => c.id === editingId ? { ...form, id: safeId } : c);
            else {
                if (newCats.find(c => c.id === safeId)) return toast.error("Este ID já existe.");
                newCats.push({ ...form, id: safeId });
            }
            setCategorias(newCats);
        } else if (modalType === "pagamentos") {
            if (editingId) newPags = newPags.map(c => c.id === editingId ? { ...form, id: safeId } : c);
            else {
                if (newPags.find(c => c.id === safeId)) return toast.error("Este ID já existe.");
                newPags.push({ ...form, id: safeId });
            }
            setPagamentos(newPags);
        } else if (modalType === "centros") {
            if (editingId) newCents = newCents.map(c => c.id === editingId ? { ...form, id: safeId } : c);
            else {
                if (newCents.find(c => c.id === safeId)) return toast.error("Este ID já existe.");
                newCents.push({ ...form, id: safeId });
            }
            setCentros(newCents);
        }

        await saveAuxiliariesToDB(newCats, newPags, newCents);
        toast.success("Opção salva com sucesso!");
        setModalOpen(false);
    };

    const handleDelete = async (type: TabKey, id: string) => {
        if (!confirm("Deseja realmente remover esta opção? Se existirem faturas atreladas a ela, poderão perder a referência textual.")) return;

        let newCats = [...categorias];
        let newPags = [...pagamentos];
        let newCents = [...centros];

        if (type === "categorias") newCats = newCats.filter(c => c.id !== id);
        if (type === "pagamentos") newPags = newPags.filter(c => c.id !== id);
        if (type === "centros") newCents = newCents.filter(c => c.id !== id);

        setCategorias(newCats);
        setPagamentos(newPags);
        setCentros(newCents);

        await saveAuxiliariesToDB(newCats, newPags, newCents);
        toast.success("Removido com sucesso!");
    };

    const openModal = (type: TabKey, item?: any) => {
        setModalType(type);
        if (item) {
            setEditingId(item.id);
            setForm({ id: item.id, name: item.name, icon: item.icon || "📌", description: item.description || "", color: item.color || "bg-blue-500" });
        } else {
            setEditingId(null);
            setForm({ id: "", name: "", icon: "📌", description: "", color: "bg-blue-500" });
        }
        setModalOpen(true);
    };

    const tabsList: { key: TabKey; label: string; icon: any; count: number }[] = [
        { key: "categorias", label: "Categorias", icon: Tag, count: categorias.length },
        { key: "pagamentos", label: "Formas de Pagamento", icon: CreditCard, count: pagamentos.length },
        { key: "centros", label: "Centros de Custo", icon: Briefcase, count: centros.length },
        { key: "contas", label: "Contas e Fundos", icon: Building2, count: contasReais.length },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 size={48} className="animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header - Hidden in Config because parent layout provide it */}
            {!isConfig && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/painel/financeiro" className="text-gray-400 hover:text-blue-600 transition">
                                <ArrowLeft size={18} />
                            </Link>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início / Financeiro / Auxiliares</span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                            <Settings2 size={32} className="text-blue-600" />
                            Opções Auxiliares
                        </h1>
                        <p className="text-gray-500 font-bold text-sm mt-1">Gerencie categorias, métodos de pagamento e configurações financeiras.</p>
                    </div>

                    {activeTab !== "contas" && (
                        <button
                            onClick={() => openModal(activeTab)}
                            className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={18} /> Adicionar Nova
                        </button>
                    )}
                </div>
            )}

            {isConfig && activeTab !== "contas" && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => openModal(activeTab)}
                        className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={18} /> Adicionar Nova
                    </button>
                </div>
            )}

            {/* Info Banner */}
            {activeTab !== "contas" ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                            As categorias, formas de pagamento e centros de custos agora são 100% dinâmicas!
                        </p>
                        <p className="text-xs font-medium text-blue-500 mt-1">
                            Você pode criar, editar ou apagar as tags. As faturas puxadas em DREs e Fluxos usarão essas nomenclaturas.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-4 flex items-start flex-col gap-2">
                    <div className="flex gap-3">
                        <Building2 size={20} className="text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Integração Automática com Caixa</p>
                            <p className="text-xs font-medium text-emerald-600 mt-1">
                                As contas listadas abaixo agora são puxadas diretamente do seu caixa real ativo. Para criar novos fundos ou caixas, acesse o painel dedicado de Contas Bancárias.
                            </p>
                        </div>
                    </div>
                    <Link href="/painel/financeiro/contas-bancarias" className="ml-8 mt-2 inline-flex items-center text-xs font-black bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
                        Gerenciar Contas e Fundos
                    </Link>
                </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                {tabsList.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm transition ${activeTab === tab.key
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 border dark:border-gray-700'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${activeTab === tab.key
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border dark:border-gray-800 overflow-hidden">
                {/* === CATEGORIAS === */}
                {activeTab === "categorias" && (
                    <div>
                        <div className="p-6 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                                <Tag size={20} className="text-blue-600" />
                                Categorias de Despesas
                            </h3>
                        </div>
                        <div className="divide-y dark:divide-gray-800">
                            {categorias.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 ${cat.color || "bg-blue-500"} rounded-xl flex items-center justify-center text-lg text-white`}>
                                            {cat.icon}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-800 dark:text-white text-sm">{cat.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{cat.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => openModal('categorias', cat)} className="p-2 text-gray-400 hover:text-blue-500"><Pencil size={16} /></button>
                                        <button onClick={() => handleDelete('categorias', cat.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === FORMAS DE PAGAMENTO === */}
                {activeTab === "pagamentos" && (
                    <div>
                        <div className="p-6 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                                <CreditCard size={20} className="text-blue-600" />
                                Formas de Pagamento
                            </h3>
                        </div>
                        <div className="divide-y dark:divide-gray-800">
                            {pagamentos.map((met) => (
                                <div key={met.id} className="flex items-center justify-between px-6 py-5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-xl">
                                            {met.icon}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-800 dark:text-white text-sm">{met.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{met.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => openModal('pagamentos', met)} className="p-2 text-gray-400 hover:text-blue-500"><Pencil size={16} /></button>
                                        <button onClick={() => handleDelete('pagamentos', met.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === CENTROS DE CUSTO === */}
                {activeTab === "centros" && (
                    <div>
                        <div className="p-6 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                                <Briefcase size={20} className="text-blue-600" />
                                Centros de Custo
                            </h3>
                        </div>
                        <div className="divide-y dark:divide-gray-800">
                            {centros.map((cc) => (
                                <div key={cc.id} className="flex items-center justify-between px-6 py-5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center">
                                            <Folder size={18} />
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-800 dark:text-white text-sm">{cc.name}</p>
                                            <p className="text-xs font-bold text-gray-400">{cc.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => openModal('centros', cc)} className="p-2 text-gray-400 hover:text-blue-500"><Pencil size={16} /></button>
                                        <button onClick={() => handleDelete('centros', cc.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === CONTAS REAIS === */}
                {activeTab === "contas" && (
                    <div>
                        <div className="p-6 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                                <Building2 size={20} className="text-emerald-600" />
                                Contas Bancárias (Integração)
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
                            {contasReais.length === 0 ? (
                                <p className="text-sm text-gray-500 col-span-2">Nenhuma conta cadastrada no seu banco de dados principal. <Link href="/painel/financeiro/contas-bancarias" className="text-blue-600 underline">Crie uma aqui.</Link></p>
                            ) : null}
                            {contasReais.map((conta) => (
                                <div key={conta.id} className="border-2 dark:border-gray-700 rounded-2xl p-5 hover:border-emerald-500 transition group relative">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center">
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-800 dark:text-white text-sm">{conta.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Físico</span>
                                        <span className={`text-sm font-black ${Number(conta.balance) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {Number(conta.balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>

                                    <Link href="/painel/financeiro/contas-bancarias" className="absolute top-4 right-4 text-gray-300 hover:text-emerald-500 transition">
                                        <Pencil size={15} />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Add/Edit */}
            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative border dark:border-gray-800 animate-in zoom-in-95 duration-200">
                        <button onClick={() => setModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition"><X size={20} /></button>

                        <div className="flex items-center gap-3 mb-6">
                            <h2 className="text-xl font-black dark:text-white">{editingId ? "Editar Opção" : "Nova Opção"}</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Nome de exibição</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 p-3 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-blue-500"
                                    placeholder="Ex: Combustível, Boleto Bradesco..."
                                    value={form.name}
                                    onChange={e => {
                                        let baseCode = e.target.value.toUpperCase().replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9_]/g, "");
                                        setForm({ ...form, name: e.target.value, id: editingId ? form.id : baseCode })
                                    }}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Identificador Único (ID Numérico/Letra)</label>
                                <input
                                    type="text"
                                    disabled={!!editingId}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 p-3 rounded-xl text-sm font-bold text-gray-500 outline-none"
                                    value={form.id}
                                    onChange={e => setForm({ ...form, id: e.target.value })}
                                />
                                <p className="text-[10px] text-red-400 mt-1 pl-1">O ID fica cravado no banco de dados e não pode ser editado depois.</p>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Emoji/Ícone</label>
                                    <input
                                        type="text"
                                        maxLength={3}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 p-3 rounded-xl text-center text-xl outline-none focus:border-blue-500"
                                        value={form.icon}
                                        onChange={e => setForm({ ...form, icon: e.target.value })}
                                    />
                                </div>
                                {modalType === "categorias" && (
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Cor da Tag</label>
                                        <select
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 p-3 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-blue-500"
                                            value={form.color}
                                            onChange={e => setForm({ ...form, color: e.target.value })}
                                        >
                                            <option value="bg-blue-500">Azul</option>
                                            <option value="bg-red-500">Vermelho</option>
                                            <option value="bg-green-500">Verde</option>
                                            <option value="bg-orange-500">Laranja</option>
                                            <option value="bg-purple-500">Roxo</option>
                                            <option value="bg-pink-500">Rosa</option>
                                            <option value="bg-gray-500">Cinza</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {modalType === "centros" && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Descrição do Centro (Opcional)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 p-3 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-blue-500"
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleFormSubmit}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition shadow-lg mt-4 flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                Salvar Opção Analítica
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
