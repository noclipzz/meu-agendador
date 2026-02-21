"use client";

import { useState, useEffect } from "react";
import {
    Plus, Trash2, Save, GripVertical, X, FileText, ChevronDown,
    Type, AlignLeft, ListOrdered, CheckSquare, Calendar, Hash,
    Heading, Loader2, Pencil, Copy, ClipboardList
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useAgenda } from "../../../contexts/AgendaContext";

type FieldType = "header" | "text" | "textarea" | "select" | "checkbox" | "checkboxGroup" | "date" | "number";

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
];

export default function ProntuariosPage() {
    const { userRole } = useAgenda();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    // Editor State
    const [editando, setEditando] = useState(false);
    const [templateAtual, setTemplateAtual] = useState<Template | null>(null);
    const [nome, setNome] = useState("");
    const [descricao, setDescricao] = useState("");
    const [campos, setCampos] = useState<FormField[]>([]);
    const [salvando, setSalvando] = useState(false);
    const [templateParaExcluir, setTemplateParaExcluir] = useState<string | null>(null);

    useEffect(() => { carregarTemplates(); }, []);

    async function carregarTemplates() {
        try {
            const res = await fetch('/api/painel/prontuarios');
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
            ...(type === "select" || type === "checkboxGroup" ? { options: [""] } : {})
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
        if (!nome.trim()) return toast.error("Nome do prontuário é obrigatório");
        if (campos.length === 0) return toast.error("Adicione pelo menos um campo");

        const camposInvalidos = campos.filter(c => !c.label.trim() && c.type !== "header");
        if (camposInvalidos.length > 0) return toast.error("Preencha o nome de todos os campos");

        setSalvando(true);
        try {
            const method = templateAtual?.id ? 'PUT' : 'POST';
            const url = templateAtual?.id ? `/api/painel/prontuarios/${templateAtual.id}` : '/api/painel/prontuarios';

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
        const res = await fetch(`/api/painel/prontuarios/${id}`, { method: 'DELETE' });
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

                {/* CAMPOS DO FORMULÁRIO */}
                <div className="space-y-3">
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

                                {/* OPÇÕES PARA SELECT E CHECKBOX GROUP */}
                                {(campo.type === "select" || campo.type === "checkboxGroup") && (
                                    <div className="pl-4 space-y-2">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">Opções:</p>
                                        {campo.options?.map((opt, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <span className="text-[10px] text-gray-400 font-bold w-5">{i + 1}.</span>
                                                <input
                                                    className="flex-1 border dark:border-gray-700 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm outline-none dark:text-white"
                                                    placeholder={`Opção ${i + 1}`}
                                                    value={opt}
                                                    onChange={e => updateOption(campo.id, i, e.target.value)}
                                                />
                                                <button onClick={() => removeOption(campo.id, i)} className="text-red-400 hover:text-red-600 transition"><X size={14} /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => addOption(campo.id)} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                                            <Plus size={12} /> Adicionar opção
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

                {/* BOTÃO SALVAR */}
                <button
                    onClick={salvarTemplate}
                    disabled={salvando}
                    className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {salvando ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
                    {salvando ? "Salvando..." : "Salvar Ficha Técnica"}
                </button>
            </div>
        );
    }

    // --- LISTA DE TEMPLATES ---
    return (
        <div className="space-y-6 pb-20 p-2 font-sans">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white">Fichas Técnicas</h1>
                    <p className="text-sm text-gray-500">Crie formulários personalizados para seus acompanhamentos.</p>
                </div>
                {userRole === "ADMIN" && (
                    <button onClick={novoTemplate} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg">
                        <Plus size={20} /> Nova Ficha Técnica
                    </button>
                )}
            </div>

            {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
                        <ClipboardList size={40} className="text-blue-500" />
                    </div>
                    <h3 className="text-xl font-black dark:text-white mb-2">Nenhuma ficha técnica criada</h3>
                    <p className="text-gray-500 text-sm max-w-md mb-6">
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
                        <div key={t.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border-2 dark:border-gray-800 hover:border-blue-500 transition-all cursor-pointer group shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                                    <FileText size={22} />
                                </div>
                                {userRole === "ADMIN" && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => editarTemplate(t)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hover:text-blue-600 transition">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => setTemplateParaExcluir(t.id)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hover:text-red-500 transition">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <h3 className="font-black text-lg dark:text-white mb-1">{t.name}</h3>
                            {t.description && <p className="text-xs text-gray-500 mb-3">{t.description}</p>}
                            <div className="flex gap-3 text-[10px] font-bold text-gray-400 uppercase">
                                <span>{(t.fields as any[])?.length || 0} campos</span>
                                <span>•</span>
                                <span>{t._count?.entries || 0} preenchidos</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* MODAL DE CONFIRMAÇÃO */}
            <ConfirmationModal
                isOpen={!!templateParaExcluir}
                onClose={() => setTemplateParaExcluir(null)}
                onConfirm={() => templateParaExcluir && excluirTemplate(templateParaExcluir)}
                title="Excluir Ficha Técnica?"
                message="Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita."
                isDeleting={true}
            />
        </div >
    );
}
