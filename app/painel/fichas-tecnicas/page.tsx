"use client";

import { useState, useEffect } from "react";
import {
    Plus, Trash2, Save, GripVertical, X, FileText, ChevronDown,
    Type, AlignLeft, ListOrdered, CheckSquare, Calendar, Hash,
    Heading, Loader2, Pencil, Copy, ClipboardList, LayoutGrid,
    Search, Clock, Filter, ArrowRight, History as HistoryIcon, Printer, Trash
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useAgenda } from "../../../contexts/AgendaContext";

type FieldType = "header" | "text" | "textarea" | "select" | "checkbox" | "checkboxGroup" | "date" | "number" | "table";

interface FormField {
    id: string;
    type: FieldType;
    label: string;
    required?: boolean;
    options?: string[];
    placeholder?: string;
    allowsDetails?: boolean;
    detailsLabel?: string;
}

interface Template {
    id: string;
    name: string;
    description: string | null;
    fields: FormField[];
    _count?: { entries: number };
    createdAt: string;
}

const FIELD_TYPES: { type: FieldType; label: string; icon: any; desc: string }[] = [
    { type: "header", label: "Título de Seção", icon: Heading, desc: "Divisor visual" },
    { type: "text", label: "Texto Curto", icon: Type, desc: "Uma linha" },
    { type: "textarea", label: "Texto Longo", icon: AlignLeft, desc: "Múltiplas linhas" },
    { type: "select", label: "Seleção", icon: ListOrdered, desc: "Dropdown" },
    { type: "checkbox", label: "Sim / Não", icon: CheckSquare, desc: "Checkbox" },
    { type: "checkboxGroup", label: "Múltipla Escolha", icon: CheckSquare, desc: "Vários itens" },
    { type: "date", label: "Data", icon: Calendar, desc: "Calendário" },
    { type: "number", label: "Número", icon: Hash, desc: "Valor numérico" },
    { type: "table", label: "Tabela", icon: LayoutGrid, desc: "Tabela com colunas definidas" },
];

export default function FichasTecnicasPage() {
    const { userRole } = useAgenda();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    // Tab State
    const [tab, setTab] = useState<"templates" | "history">("templates");

    // History State
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyFilters, setHistoryFilters] = useState({
        search: "",
        startDate: "",
        endDate: ""
    });

    // Entry View State
    const [entryVisualizando, setEntryVisualizando] = useState<any>(null);
    const [entryParaExcluir, setEntryParaExcluir] = useState<string | null>(null);

    // Editor State
    const [editando, setEditando] = useState(false);
    const [templateAtual, setTemplateAtual] = useState<Template | null>(null);
    const [nome, setNome] = useState("");
    const [descricao, setDescricao] = useState("");
    const [campos, setCampos] = useState<FormField[]>([]);
    const [salvando, setSalvando] = useState(false);
    const [templateParaExcluir, setTemplateParaExcluir] = useState<string | null>(null);

    useEffect(() => {
        if (tab === "templates") carregarTemplates();
        if (tab === "history") carregarHistorico();
    }, [tab]);

    async function carregarHistorico() {
        setLoadingHistory(true);
        try {
            const params = new URLSearchParams();
            if (historyFilters.search) params.append('search', historyFilters.search);
            if (historyFilters.startDate) params.append('startDate', historyFilters.startDate);
            if (historyFilters.endDate) params.append('endDate', historyFilters.endDate);

            const res = await fetch(`/api/painel/fichas-tecnicas/entries?${params.toString()}`);
            const data = await res.json();
            setHistory(data);
        } finally {
            setLoadingHistory(false);
        }
    }

    async function excluirFichaPreenchida(id: string) {
        try {
            const res = await fetch(`/api/painel/fichas-tecnicas/entries`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                toast.success("Registro excluído com sucesso!");
                setHistory(history.filter(h => h.id !== id));
                setEntryVisualizando(null);
                setEntryParaExcluir(null);
            }
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    }

    function imprimirFicha() {
        if (!entryVisualizando) return;
        window.print();
    }

    async function carregarTemplates() {
        try {
            const res = await fetch('/api/painel/fichas-tecnicas');
            const data = await res.json();
            setTemplates(data);
        } finally { setLoading(false); }
    }

    function novoTemplate() {
        setTemplateAtual(null);
        setNome("");
        setDescricao("");
        setCampos([]);
        setEditando(true);
    }

    function editarTemplate(t: Template) {
        setTemplateAtual(t);
        setNome(t.name);
        setDescricao(t.description || "");
        setCampos(t.fields || []);
        setEditando(true);
    }

    function adicionarCampo(type: FieldType) {
        const novoCampo: FormField = {
            id: crypto.randomUUID(),
            type,
            label: "",
            required: false,
            ...(type === "select" || type === "checkboxGroup" || type === "table" ? { options: [""] } : {})
        };
        setCampos([...campos, novoCampo]);
    }

    function atualizarCampo(id: string, updates: Partial<FormField>) {
        setCampos(campos.map(c => c.id === id ? { ...c, ...updates } : c));
    }

    function removerCampo(id: string) {
        setCampos(campos.filter(c => c.id !== id));
    }

    function moverCampo(index: number, direction: -1 | 1) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= campos.length) return;
        const nova = [...campos];
        [nova[index], nova[newIndex]] = [nova[newIndex], nova[index]];
        setCampos(nova);
    }

    function addOption(fieldId: string) {
        setCampos(campos.map(c => c.id === fieldId ? { ...c, options: [...(c.options || []), ""] } : c));
    }

    function updateOption(fieldId: string, optIndex: number, value: string) {
        setCampos(campos.map(c => {
            if (c.id !== fieldId) return c;
            const opts = [...(c.options || [])];
            opts[optIndex] = value;
            return { ...c, options: opts };
        }));
    }

    function removeOption(fieldId: string, optIndex: number) {
        setCampos(campos.map(c => {
            if (c.id !== fieldId) return c;
            return { ...c, options: (c.options || []).filter((_, i) => i !== optIndex) };
        }));
    }

    async function salvarTemplate() {
        if (!nome.trim()) return toast.error("Nome da ficha técnica é obrigatório");
        if (campos.length === 0) return toast.error("Adicione pelo menos um campo");

        const camposInvalidos = campos.filter(c => !c.label.trim() && c.type !== "header");
        if (camposInvalidos.length > 0) return toast.error("Preencha o nome de todos os campos");

        setSalvando(true);
        try {
            const method = templateAtual?.id ? 'PUT' : 'POST';
            const url = templateAtual?.id ? `/api/painel/fichas-tecnicas/${templateAtual.id}` : '/api/painel/fichas-tecnicas';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nome, description: descricao, fields: campos })
            });

            if (res.ok) {
                toast.success(templateAtual?.id ? "Ficha Técnica atualizada!" : "Ficha Técnica criada!");
                setEditando(false);
                carregarTemplates();
            } else {
                toast.error("Erro ao salvar");
            }
        } finally { setSalvando(false); }
    }

    async function excluirTemplate(id: string) {
        const res = await fetch(`/api/painel/fichas-tecnicas/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success("Ficha Técnica excluída!");
            setTemplates(templates.filter(t => t.id !== id));
        }
    }

    if (loading) return <div className="p-10 text-center font-black text-gray-400 animate-pulse text-xs uppercase">Carregando fichas...</div>;

    // --- EDITOR DE TEMPLATE ---
    if (editando) {
        return (
            <div className="space-y-6 pb-20 p-2 font-sans overflow-x-hidden">
                {/* HEADER */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 dark:text-white">
                            {templateAtual ? "Editar Ficha Técnica" : "Nova Ficha Técnica"}
                        </h1>
                        <p className="text-sm text-gray-500">Configure os campos que o profissional vai preencher.</p>
                    </div>
                    <button onClick={() => setEditando(false)} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-gray-200 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* NOME E DESCRIÇÃO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nome da Ficha Técnica</label>
                        <input
                            className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white"
                            placeholder="Ex: Ficha de Avaliação ou Anamnese"
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Descrição (opcional)</label>
                        <input
                            className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white"
                            placeholder="Ex: Formulário de primeira consulta"
                            value={descricao}
                            onChange={e => setDescricao(e.target.value)}
                        />
                    </div>
                </div>

                {/* FORMULÁRIO E LIVE PREVIEW EM DUAS COLUNAS */}
                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* COLUNA ESQUERDA: EDITOR DOS CAMPOS */}
                    <div className="flex-1 space-y-3 w-full">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Campos do Formulário</h3>

                        {campos.map((campo, index) => (
                            <div key={campo.id} className="bg-white dark:bg-gray-900 border-2 dark:border-gray-800 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row gap-4 items-start group hover:border-blue-500 transition-all overflow-hidden">
                                {/* DRAG HANDLE (MOBILE: HORIZONTAL) */}
                                <div className="flex flex-row md:flex-col items-center gap-2 md:gap-1 pt-0 md:pt-2 w-full md:w-auto border-b md:border-b-0 pb-2 md:pb-0 dark:border-gray-800">
                                    <button onClick={() => moverCampo(index, -1)} className="text-gray-300 hover:text-blue-500 transition p-1" disabled={index === 0}>▲</button>
                                    <GripVertical size={16} className="text-gray-300 hidden md:block" />
                                    <button onClick={() => moverCampo(index, 1)} className="text-gray-300 hover:text-blue-500 transition p-1" disabled={index === campos.length - 1}>▼</button>
                                    <div className="flex-1 md:hidden"></div>
                                    <button onClick={() => removerCampo(campo.id)} className="p-2 text-red-400 md:hidden">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                {/* CONTEÚDO DO CAMPO */}
                                <div className="flex-1 space-y-3 w-full min-w-0">
                                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                        <span className="text-[9px] font-black bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-lg uppercase shrink-0">
                                            {FIELD_TYPES.find(f => f.type === campo.type)?.label}
                                        </span>
                                        <input
                                            className="flex-1 border dark:border-gray-700 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none text-sm font-bold dark:text-white focus:border-blue-500"
                                            placeholder={campo.type === "header" ? "Título da seção (ex: Histórico de Tratamento)" : "Pergunta / Nome do campo (ex: Tipo de Cabelo/Pele)"}
                                            value={campo.label}
                                            onChange={e => atualizarCampo(campo.id, { label: e.target.value })}
                                        />
                                        {campo.type !== "header" && (
                                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 cursor-pointer whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={campo.required || false}
                                                    onChange={e => atualizarCampo(campo.id, { required: e.target.checked })}
                                                    className="accent-blue-600"
                                                />
                                                Obrigatório
                                            </label>
                                        )}
                                    </div>

                                    {/* OPÇÕES PARA SELECT, CHECKBOX GROUP E TABELA (COLUNAS) */}
                                    {(campo.type === "select" || campo.type === "checkboxGroup" || campo.type === "table") && (
                                        <div className="pl-4 space-y-2 border-l-2 border-blue-100 dark:border-gray-800 ml-1 py-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase">
                                                {campo.type === "table" ? "Colunas da Tabela:" : "Opções:"}
                                            </p>
                                            {campo.options?.map((opt, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                    <span className="text-[10px] text-gray-400 font-bold w-5">{i + 1}.</span>
                                                    <input
                                                        className="flex-1 border dark:border-gray-700 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm outline-none dark:text-white"
                                                        placeholder={campo.type === "table" ? `Nome da Coluna ${i + 1}` : `Opção ${i + 1}`}
                                                        value={opt}
                                                        onChange={e => updateOption(campo.id, i, e.target.value)}
                                                    />
                                                    <button onClick={() => removeOption(campo.id, i)} className="text-red-400 hover:text-red-600 transition"><X size={14} /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => addOption(campo.id)} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 mt-2">
                                                <Plus size={12} /> {campo.type === "table" ? "Adicionar Coluna" : "Adicionar Opção"}
                                            </button>
                                        </div>
                                    )}

                                    {/* OPÇÃO DE JUSTIFICATIVA PARA CHECKBOX */}
                                    {campo.type === "checkbox" && (
                                        <div className="pl-4 space-y-3">
                                            <label className="flex items-center gap-2 cursor-pointer group/opt">
                                                <input
                                                    type="checkbox"
                                                    className="accent-blue-600 w-4 h-4"
                                                    checked={campo.allowsDetails || false}
                                                    onChange={e => atualizarCampo(campo.id, { allowsDetails: e.target.checked })}
                                                />
                                                <span className="text-[11px] font-bold text-gray-500 group-hover/opt:text-blue-600 transition">Ativar justificativa se a resposta for "SIM"</span>
                                            </label>

                                            {campo.allowsDetails && (
                                                <div className="animate-in slide-in-from-top-2 duration-200">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1 mb-1 block">Pergunta da Justificativa (Ex: Qual?)</label>
                                                    <input
                                                        className="w-full border dark:border-gray-700 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none text-sm font-bold dark:text-white focus:border-blue-500 transition"
                                                        placeholder="Ex: Se sim, descreva qual..."
                                                        value={campo.detailsLabel || ""}
                                                        onChange={e => atualizarCampo(campo.id, { detailsLabel: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* BOTÃO REMOVER (DESKTOP) */}
                                <button onClick={() => removerCampo(campo.id)} className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 md:group-hover:opacity-100 hidden md:block">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}

                        {/* BOTÕES DE ADICIONAR CAMPO SEMPRE VISÍVEIS */}
                        <div className="bg-blue-50/50 dark:bg-gray-800/30 p-5 rounded-3xl border-2 border-dashed border-blue-200 dark:border-gray-700">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Plus size={14} /> Adicionar Novo Campo à Ficha
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {FIELD_TYPES.map(ft => (
                                    <button
                                        key={ft.type}
                                        onClick={() => adicionarCampo(ft.type)}
                                        className="p-3 rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 hover:border-blue-500 hover:shadow-md transition-all text-left group"
                                    >
                                        <ft.icon size={20} className="mb-2 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                        <p className="font-bold text-xs dark:text-white group-hover:text-blue-600 transition-colors">{ft.label}</p>
                                        <p className="text-[9px] text-gray-400 mt-1 leading-tight">{ft.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: LIVE PREVIEW OTIMIZADO */}
                    <div className="w-full lg:w-[45%] xl:w-[40%] sticky top-8 order-first lg:order-last">
                        <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-6 overflow-hidden">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FileText size={16} /> Visão em Tempo Real
                            </h3>

                            {/* CAIXA DO PREVIEW - MOCKUP DO FORMULÁRIO */}
                            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-7 max-h-[70vh] overflow-y-auto custom-scrollbar relative">
                                <div className="border-b dark:border-gray-800 pb-4 mb-5">
                                    <h2 className="font-black text-2xl dark:text-white leading-tight">{nome || "Nome da Ficha"}</h2>
                                    <p className="text-sm text-gray-500 mt-1.5">{descricao || "A descrição explicativa do seu formulário aparecerá aqui."}</p>
                                </div>

                                {campos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                        <LayoutGrid size={32} className="text-gray-300 mb-3" />
                                        <p className="text-[10px] uppercase font-black tracking-widest text-center text-gray-400 pointer-events-none">O formulário está vazio</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 pointer-events-none">
                                        {campos.map((campo, i) => (
                                            <div key={i} className="animate-in fade-in duration-300">
                                                {campo.type === 'header' ? (
                                                    <h3 className="font-black text-gray-800 dark:text-gray-200 text-lg border-b-2 border-gray-100 dark:border-gray-800 pb-2 mt-8 mb-4">
                                                        {campo.label || "Título de seção..."}
                                                    </h3>
                                                ) : (
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 block mb-2 leading-tight">
                                                            {campo.label || "Escreva a sua pergunta..."} {campo.required && <span className="text-red-500">*</span>}
                                                        </label>

                                                        {campo.type === 'text' && (
                                                            <div className="w-full border-2 border-gray-100 dark:border-gray-800 p-3.5 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-300 dark:text-gray-600 text-sm font-medium">Resposta curta...</div>
                                                        )}
                                                        {campo.type === 'textarea' && (
                                                            <div className="w-full border-2 border-gray-100 dark:border-gray-800 p-3.5 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-300 dark:text-gray-600 text-sm font-medium h-24">Resposta longa descritiva...</div>
                                                        )}
                                                        {campo.type === 'number' && (
                                                            <div className="w-full border-2 border-gray-100 dark:border-gray-800 p-3.5 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-300 dark:text-gray-600 text-sm font-medium">123...</div>
                                                        )}
                                                        {campo.type === 'date' && (
                                                            <div className="w-full border-2 border-gray-100 dark:border-gray-800 p-3.5 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                                                                <span className="text-gray-300 dark:text-gray-600 text-sm font-medium">dd/mm/aaaa</span>
                                                                <Calendar size={16} className="text-gray-300 dark:text-gray-600" />
                                                            </div>
                                                        )}
                                                        {campo.type === 'select' && (
                                                            <div className="w-full border-2 border-gray-100 dark:border-gray-800 p-3.5 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                                                                <span className="text-gray-300 dark:text-gray-600 text-sm font-medium">Selecione uma opção...</span>
                                                                <ChevronDown size={16} className="text-gray-300 dark:text-gray-600" />
                                                            </div>
                                                        )}
                                                        {campo.type === 'checkbox' && (
                                                            <div className="flex flex-col gap-2.5 mt-2">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-5 h-5 rounded border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"></div>
                                                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Sim, confirmo</span>
                                                                </div>
                                                                {campo.allowsDetails && (
                                                                    <div className="pl-6 mt-1 border-l-2 border-gray-100 dark:border-gray-800 ml-2.5">
                                                                        <label className="text-[9px] font-bold text-gray-400 uppercase mb-1.5 block">↳ {campo.detailsLabel || 'Justificativa...'}</label>
                                                                        <div className="w-full border-2 border-gray-100 dark:border-gray-800 p-2.5 rounded-lg bg-gray-50/50 dark:bg-gray-900/50 text-gray-300 dark:text-gray-600 text-xs font-medium">Detalhes aqui...</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {campo.type === 'checkboxGroup' && (
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {campo.options?.length ? campo.options.map((opt, v) => (
                                                                    <div key={v} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 rounded-lg border-2 border-gray-100 dark:border-gray-800">
                                                                        <div className="w-4 h-4 rounded border-2 border-gray-200 dark:border-gray-700"></div>
                                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{opt || `Item ${v + 1}`}</span>
                                                                    </div>
                                                                )) : (
                                                                    <span className="text-xs text-gray-300 dark:text-gray-600 italic">Nenhuma opção adicionada</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {campo.type === 'table' && (
                                                            <div className="overflow-x-auto border-2 border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50 mt-1">
                                                                <table className="w-full text-left text-xs">
                                                                    <thead>
                                                                        <tr className="border-b-2 border-gray-100 dark:border-gray-800">
                                                                            {campo.options?.length ? campo.options.map((col, c) => (
                                                                                <th key={c} className="p-2.5 font-bold text-gray-400 uppercase">{col || `Coluna ${c + 1}`}</th>
                                                                            )) : <th className="p-2.5 text-gray-300">Sem colunas</th>}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        <tr>
                                                                            {campo.options?.length ? campo.options.map((_, c) => (
                                                                                <td key={c} className="p-2.5 border-r border-gray-100 dark:border-gray-800 last:border-0">
                                                                                    <div className="h-6 w-full bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700"></div>
                                                                                </td>
                                                                            )) : <td></td>}
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTÃO SALVAR */}
                <button
                    onClick={salvarTemplate}
                    disabled={salvando}
                    className="w-full mt-8 bg-blue-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {salvando ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
                    {salvando ? "Salvando..." : "Salvar Ficha Técnica"}
                </button>
            </div>
        );
    }

    // --- LISTAGEM E HISTÓRICO ---
    return (
        <div className="space-y-6 pb-20 p-2 font-sans overflow-x-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white">Fichas Técnicas</h1>
                    <p className="text-sm text-gray-500">
                        {tab === "templates"
                            ? "Crie formulários personalizados para seus acompanhamentos."
                            : "Veja o registro cronológico de todas as fichas preenchidas."}
                    </p>
                </div>
                {userRole === "ADMIN" && tab === "templates" && (
                    <button onClick={novoTemplate} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg w-full sm:w-auto justify-center">
                        <Plus size={20} /> Nova Ficha Técnica
                    </button>
                )}
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl w-fit border dark:border-gray-700 print:hidden">
                <button
                    onClick={() => setTab("templates")}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 ${tab === "templates" ? "bg-white dark:bg-gray-900 shadow-xl text-blue-600 border dark:border-gray-700" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"}`}
                >
                    <LayoutGrid size={14} /> Modelos
                </button>
                <button
                    onClick={() => setTab("history")}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 ${tab === "history" ? "bg-white dark:bg-gray-900 shadow-xl text-blue-600 border dark:border-gray-700" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"}`}
                >
                    <HistoryIcon size={14} /> Histórico
                </button>
            </div>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .fixed.inset-0.z-\[100\], .fixed.inset-0.z-\[100\] * {
                        visibility: visible;
                    }
                    .fixed.inset-0.z-\[100\] {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: auto;
                        background: white !important;
                    }
                    .fixed.inset-0.z-\[100\] .bg-white {
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .fixed.inset-0.z-\[100\] .overflow-y-auto {
                        overflow: visible !important;
                        height: auto !important;
                    }
                    .fixed.inset-0.z-\[100\] .border-t,
                    .fixed.inset-0.z-\[100\] .border-b,
                    .fixed.inset-0.z-\[100\] button {
                        display: none !important;
                    }
                    .fixed.inset-0.z-\[100\] .p-8,
                    .fixed.inset-0.z-\[100\] .p-12 {
                        padding: 20px !important;
                    }
                }
            `}</style>

            {tab === "templates" ? (
                <>
                    {templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
                                <ClipboardList size={40} className="text-blue-500" />
                            </div>
                            <h3 className="text-xl font-black dark:text-white mb-2">Nenhuma ficha técnica criada</h3>
                            <p className="text-gray-500 text-sm max-w-md mb-6 px-4">
                                Crie um formulário personalizado para seu negócio. Defina as perguntas que seus profissionais vão
                                preencher durante o acompanhamento do cliente.
                            </p>
                            {userRole === "ADMIN" && (
                                <button onClick={novoTemplate} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg">
                                    <Plus size={20} /> Criar Primeiro Formulário
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map(t => (
                                <div key={t.id} onClick={() => userRole === "ADMIN" && editarTemplate(t)} className="bg-white dark:bg-gray-900 p-7 rounded-[2.5rem] border-2 border-gray-50 dark:border-gray-800 hover:border-blue-500 transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[180px]">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                                <FileText size={22} />
                                            </div>
                                            {userRole === "ADMIN" && (
                                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition translate-y-2 group-hover:translate-y-0 duration-300">
                                                    <button onClick={(e) => { e.stopPropagation(); editarTemplate(t); }} className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:text-blue-600 transition border dark:border-gray-700">
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setTemplateParaExcluir(t.id); }} className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:text-red-500 transition border dark:border-gray-700">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-black text-lg dark:text-white mb-1 group-hover:text-blue-600 transition-colors">{t.name}</h3>
                                        {t.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{t.description}</p>}
                                    </div>
                                    <div className="flex gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">
                                        <span className="flex items-center gap-1.5"><LayoutGrid size={12} /> {(t.fields as any[])?.length || 0} campos</span>
                                        <span className="flex items-center gap-1.5"><FileText size={12} /> {t._count?.entries || 0} preenchidos</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* FILTROS DE HISTÓRICO */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border-2 border-gray-50 dark:border-gray-800 shadow-sm transition-all">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Buscar por Cliente</label>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nome do cliente..."
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold dark:text-white"
                                        value={historyFilters.search}
                                        onChange={e => setHistoryFilters({ ...historyFilters, search: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Data Inicial</label>
                                <input
                                    type="date"
                                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold dark:text-white"
                                    value={historyFilters.startDate}
                                    onChange={e => setHistoryFilters({ ...historyFilters, startDate: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Data Final</label>
                                    <input
                                        type="date"
                                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold dark:text-white"
                                        value={historyFilters.endDate}
                                        onChange={e => setHistoryFilters({ ...historyFilters, endDate: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={carregarHistorico}
                                    className="bg-gray-900 text-white p-4 rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
                                >
                                    <Filter size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* LISTA DE HISTÓRICO */}
                    {loadingHistory ? (
                        <div className="p-20 text-center">
                            <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={32} />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Consultando registros...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-20 text-center bg-gray-50 dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search size={32} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-black dark:text-white mb-2">Nenhum registro encontrado</h3>
                            <p className="text-gray-500 text-sm max-w-sm mx-auto">Tente ajustar seus filtros ou verifique se há fichas preenchidas no período.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {history.map((entry) => (
                                <div
                                    key={entry.id}
                                    onClick={() => setEntryVisualizando(entry)}
                                    className="group bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border-2 border-gray-50 dark:border-gray-800 hover:border-blue-500 transition-all cursor-pointer shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                                            <ClipboardList className="text-blue-600 group-hover:text-white transition-colors" size={24} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{entry.template?.name}</span>
                                            <h4 className="text-lg font-black text-gray-800 dark:text-white group-hover:text-blue-600 transition-colors">{entry.client?.name}</h4>
                                            <div className="flex flex-wrap items-center gap-4 mt-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(entry.createdAt).toLocaleDateString('pt-BR')}</span>
                                                <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(entry.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="flex items-center gap-1.5"><Pencil size={12} /> {entry.professional?.name || "Sistema"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 pt-4 sm:pt-0">
                                        <button className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-blue-600 hover:text-white px-5 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider group/btn">
                                            Ver Detalhes <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL DETALHES DA FICHA PREENCHIDA */}
            {entryVisualizando && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-950 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col border dark:border-gray-800 relative scale-100 animate-in zoom-in-95 duration-300">
                        {/* Header Modal */}
                        <div className="p-8 border-b dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-start">
                            <div>
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-2 block">Visualizando Registro</span>
                                <h2 className="text-3xl font-black text-gray-800 dark:text-white leading-tight">
                                    {entryVisualizando.template?.name}
                                </h2>
                                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-full">{entryVisualizando.client?.name}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(entryVisualizando.createdAt).toLocaleDateString('pt-BR')}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1.5"><Pencil size={14} /> Atendido por: {entryVisualizando.professional?.name || "Sistema"}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setEntryVisualizando(null)}
                                className="p-4 bg-white dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm border dark:border-gray-700"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Corpo Modal */}
                        <div className="flex-1 overflow-y-auto p-8 sm:p-12 custom-scrollbar space-y-8">
                            {entryVisualizando.template?.fields.map((campo: any, idx: number) => {
                                const value = entryVisualizando.data[campo.id];

                                if (campo.type === 'header') {
                                    return (
                                        <div key={idx} className="border-b-2 border-gray-100 dark:border-gray-900 pt-8 pb-3 first:pt-0">
                                            <h3 className="font-black text-xl text-gray-800 dark:text-gray-200 uppercase tracking-tight">
                                                {campo.label}
                                            </h3>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={idx} className="animate-in fade-in slide-in-from-left-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <label className="text-[11px] font-black text-gray-400 uppercase mb-2.5 block tracking-widest">{campo.label}</label>

                                        <div className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-2xl border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-800 transition-colors">
                                            {campo.type === 'table' ? (
                                                <div className="overflow-x-auto rounded-xl border dark:border-gray-800">
                                                    <table className="w-full text-left text-sm">
                                                        <thead>
                                                            <tr className="bg-gray-100/50 dark:bg-gray-800/50">
                                                                {campo.options.map((col: string, ci: number) => (
                                                                    <th key={ci} className="p-4 font-black text-[10px] text-gray-400 uppercase">{col}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(value || [[]]).map((row: any[], ri: number) => (
                                                                <tr key={ri} className="border-t dark:border-gray-800">
                                                                    {row.map((cell: any, ci: number) => (
                                                                        <td key={ci} className="p-4 font-bold text-gray-700 dark:text-gray-300">{cell || "-"}</td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : campo.type === 'checkboxGroup' ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {Array.isArray(value) && value.length > 0 ? value.map((v: string, i: number) => (
                                                        <span key={i} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase ring-4 ring-blue-500/10">
                                                            {v}
                                                        </span>
                                                    )) : <span className="text-gray-400 italic font-medium">Nenhum item selecionado</span>}
                                                </div>
                                            ) : campo.type === 'checkbox' ? (
                                                <div className="space-y-3">
                                                    <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase inline-block ${value?.checked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'}`}>
                                                        {value?.checked ? "Sim" : "Não"}
                                                    </span>
                                                    {value?.checked && value.details && (
                                                        <div className="pl-4 border-l-4 border-blue-500 py-1">
                                                            <p className="text-[10px] font-black text-blue-500 uppercase mb-1">{campo.detailsLabel || 'Detalhes'}</p>
                                                            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{value.details}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="font-black text-gray-700 dark:text-gray-200 text-lg whitespace-pre-wrap leading-relaxed">
                                                    {value || "-"}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-8 border-t dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex gap-3">
                                <button
                                    onClick={imprimirFicha}
                                    className="flex-1 sm:flex-none px-6 py-4 bg-white dark:bg-gray-800 border-2 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer size={16} /> Imprimir Registro
                                </button>
                                <button
                                    onClick={() => setEntryParaExcluir(entryVisualizando.id)}
                                    className="flex-1 sm:flex-none px-6 py-4 bg-white dark:bg-gray-800 border-2 border-red-50 dark:border-red-900/30 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash size={16} /> Excluir
                                </button>
                            </div>
                            <button
                                onClick={() => setEntryVisualizando(null)}
                                className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95"
                            >
                                Fechar Visualização
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DO MODELO */}
            <ConfirmationModal
                isOpen={!!templateParaExcluir}
                onClose={() => setTemplateParaExcluir(null)}
                onConfirm={() => templateParaExcluir && excluirTemplate(templateParaExcluir)}
                title="Excluir Modelo de Ficha?"
                message="Tem certeza? Todos os preenchimentos baseados neste modelo continuarão salvos, mas você não poderá mais usar este formulário para novos atendimentos."
                confirmText="Sim, Excluir Modelo"
                isDeleting={true}
            />

            {/* MODAL DE CONFIRMAÇÃO DO REGISTRO */}
            <ConfirmationModal
                isOpen={!!entryParaExcluir}
                onClose={() => setEntryParaExcluir(null)}
                onConfirm={() => entryParaExcluir && excluirFichaPreenchida(entryParaExcluir)}
                title="Excluir Registro Permanente?"
                message="Esta ação é irreversível. Todas as respostas dadas nesta consulta serão apagadas do histórico do cliente."
                confirmText="Sim, Excluir Registro"
                isDeleting={true}
            />
        </div >
    );
}
