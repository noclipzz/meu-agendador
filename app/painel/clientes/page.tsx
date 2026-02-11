"use client";

import { useState, useEffect, useRef } from "react";
import {
    Plus, Search, Phone, Mail, History, X, Save, UserPlus, Pencil,
    Calendar, Clock, MapPin, FileText, CheckCircle2, UserCircle,
    DollarSign, Receipt, Trash2, Download, Image as ImageIcon,
    FileIcon, Loader2, UploadCloud, CreditCard, QrCode, Banknote, AlertTriangle,
    ClipboardList, Printer, ChevronDown, Eye
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function ClientesPage() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [busca, setBusca] = useState("");
    const [loading, setLoading] = useState(true);

    // loadingDetalhes serve para indicar se estamos baixando os dados extras (financeiro/anexos)
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);

    const [salvandoAnexo, setSalvandoAnexo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modais e Seleção
    const [modalAberto, setModalAberto] = useState(false);
    const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
    const [abaAtiva, setAbaAtiva] = useState<"DADOS" | "FINANCEIRO" | "ANEXOS" | "PRONTUARIO">("DADOS");
    const [isEditing, setIsEditing] = useState(false);
    const [confirmarExclusao, setConfirmarExclusao] = useState<{ id: string, tipo: 'CLIENTE' | 'ANEXO' } | null>(null);

    // Estado para nova observação rápida
    const [novaObs, setNovaObs] = useState("");
    const [mostrarInputObs, setMostrarInputObs] = useState(false);

    // Prontuário
    const [prontuarioTemplates, setProntuarioTemplates] = useState<any[]>([]);
    const [prontuarioEntries, setProntuarioEntries] = useState<any[]>([]);
    const [prontuarioTemplateSelecionado, setProntuarioTemplateSelecionado] = useState<string>("");
    const [prontuarioFormData, setProntuarioFormData] = useState<Record<string, any>>({});
    const [prontuarioEditId, setProntuarioEditId] = useState<string | null>(null);
    const [prontuarioSalvando, setProntuarioSalvando] = useState(false);
    const [prontuarioVisualizando, setProntuarioVisualizando] = useState<any>(null);
    const [loadingProntuarios, setLoadingProntuarios] = useState(false);

    const [form, setForm] = useState({
        id: "", name: "", phone: "", email: "", cpf: "", rg: "",
        birthDate: "", cep: "", address: "", city: "", notes: "", status: "ATIVO"
    });

    useEffect(() => { carregarClientes(); }, []);

    async function carregarClientes() {
        const res = await fetch('/api/clientes');
        const data = await res.json();
        setClientes(data);
        setLoading(false);
    }

    async function abrirFichaCliente(clienteBasico: any) {
        setClienteSelecionado(clienteBasico);
        setAbaAtiva("DADOS");
        setLoadingDetalhes(true);
        // Reset prontuário
        setProntuarioEntries([]);
        setProntuarioTemplateSelecionado("");
        setProntuarioFormData({});
        setProntuarioEditId(null);
        setProntuarioVisualizando(null);

        // 2. Inicia o carregamento dos detalhes em background

        try {
            const res = await fetch(`/api/clientes/${clienteBasico.id}`);
            if (res.ok) {
                const dadosCompletos = await res.json();

                // 3. Atualiza o cliente selecionado mesclando os dados novos
                setClienteSelecionado((prev: any) => {
                    if (prev && prev.id === clienteBasico.id) {
                        return { ...prev, ...dadosCompletos };
                    }
                    return prev;
                });
            } else {
                toast.error("Não foi possível carregar o histórico completo.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingDetalhes(false);
        }
    }

    async function salvarCliente() {
        if (!form.name) return toast.error("Nome obrigatório");
        const method = form.id ? 'PUT' : 'POST';
        const res = await fetch('/api/clientes', {
            method, body: JSON.stringify(form)
        });

        if (res.ok) {
            const clienteSalvo = await res.json();
            if (form.id) {
                setClientes(prev => prev.map(c => c.id === form.id ? clienteSalvo : c));
                if (clienteSelecionado?.id === form.id) {
                    setClienteSelecionado((prev: any) => ({ ...prev, ...clienteSalvo }));
                }
            } else {
                setClientes(prev => [...prev, clienteSalvo]);
            }
            toast.success(form.id ? "Dados atualizados!" : "Cliente cadastrado!");
            fecharModal();
        }
    }

    async function adicionarNotaRapida() {
        if (!novaObs.trim()) return;
        const dataNota = format(new Date(), "dd/MM/yy 'às' HH:mm");
        const notaFormatada = `[${dataNota}]: ${novaObs}`;
        const novaStringNotas = clienteSelecionado.notes ? `${clienteSelecionado.notes}\n${notaFormatada}` : notaFormatada;

        const res = await fetch('/api/clientes', {
            method: 'PUT',
            body: JSON.stringify({ ...clienteSelecionado, notes: novaStringNotas })
        });

        if (res.ok) {
            const atualizado = await res.json();
            setClienteSelecionado((prev: any) => ({ ...prev, notes: novaStringNotas }));
            setClientes(prev => prev.map(c => c.id === atualizado.id ? { ...c, notes: novaStringNotas } : c));
            setNovaObs(""); setMostrarInputObs(false);
            toast.success("Observação adicionada!");
        }
    }

    async function handleUploadAnexo(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setSalvandoAnexo(true);
        try {
            const resUpload = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
            const blob = await resUpload.json();
            const resBanco = await fetch('/api/clientes/anexos', {
                method: 'POST',
                body: JSON.stringify({ name: file.name, url: blob.url, type: file.type, clientId: clienteSelecionado.id })
            });
            if (resBanco.ok) {
                const novoAnexo = await resBanco.json();
                setClienteSelecionado({ ...clienteSelecionado, attachments: [...(clienteSelecionado.attachments || []), novoAnexo] });
                toast.success("Arquivo anexado!");
            }
        } catch (error) { toast.error("Erro no upload."); }
        finally { setSalvandoAnexo(false); }
    }

    async function executarExclusao() {
        if (!confirmarExclusao) return;
        const { id, tipo } = confirmarExclusao;
        const url = tipo === 'CLIENTE' ? `/api/clientes/${id}` : '/api/clientes/anexos';
        const res = await fetch(url, { method: 'DELETE', body: JSON.stringify({ id }) });
        if (res.ok) {
            if (tipo === 'CLIENTE') {
                setClientes(prev => prev.filter(c => c.id !== id));
                setClienteSelecionado(null);
            } else {
                setClienteSelecionado({ ...clienteSelecionado, attachments: clienteSelecionado.attachments.filter((a: any) => a.id !== id) });
            }
            toast.success("Excluído com sucesso.");
        }
        setConfirmarExclusao(null);
    }

    function abrirEdicao(cliente: any) { setForm({ ...cliente }); setIsEditing(true); setModalAberto(true); }
    function fecharModal() { setModalAberto(false); setIsEditing(false); setForm({ id: "", name: "", phone: "", email: "", cpf: "", rg: "", birthDate: "", cep: "", address: "", city: "", notes: "", status: "ATIVO" }); }

    // === PRONTUÁRIO ===
    async function carregarProntuario() {
        if (!clienteSelecionado) return;
        setLoadingProntuarios(true);
        try {
            const [resTemplates, resEntries] = await Promise.all([
                fetch('/api/painel/prontuarios'),
                fetch(`/api/painel/prontuarios/entries?clientId=${clienteSelecionado.id}`)
            ]);
            const [tpls, ents] = await Promise.all([resTemplates.json(), resEntries.json()]);
            setProntuarioTemplates(Array.isArray(tpls) ? tpls : []);
            setProntuarioEntries(Array.isArray(ents) ? ents : []);
        } catch (error) {
            console.error("Erro ao carregar prontuários:", error);
        } finally {
            setLoadingProntuarios(false);
        }
    }

    async function salvarProntuario() {
        if (!prontuarioTemplateSelecionado || !clienteSelecionado) return;
        setProntuarioSalvando(true);
        try {
            const res = await fetch('/api/painel/prontuarios/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: prontuarioEditId || undefined,
                    templateId: prontuarioTemplateSelecionado,
                    clientId: clienteSelecionado.id,
                    data: prontuarioFormData
                })
            });
            if (res.ok) {
                toast.success(prontuarioEditId ? "Prontuário atualizado!" : "Prontuário salvo!");
                setProntuarioFormData({});
                setProntuarioEditId(null);
                setProntuarioTemplateSelecionado("");
                carregarProntuario();
            } else {
                toast.error("Erro ao salvar prontuário");
            }
        } finally {
            setProntuarioSalvando(false);
        }
    }

    function imprimirProntuario(entry: any) {
        const fields = entry.template?.fields as any[] || [];
        const data = entry.data as Record<string, any> || {};

        let camposHtml = '';
        fields.forEach((field: any) => {
            if (field.type === 'header') {
                camposHtml += `<tr><td colspan="2" style="padding:16px 0 8px 0;font-weight:900;font-size:14px;color:#0d9488;text-transform:uppercase;letter-spacing:2px;border-bottom:2px solid #0d9488;">${field.label}</td></tr>`;
                return;
            }
            const valor = field.type === 'checkbox' ? (data[field.id] ? '✅ Sim' : '❌ Não') :
                field.type === 'checkboxGroup' ? (Array.isArray(data[field.id]) ? data[field.id].join(', ') : '---') :
                    data[field.id] || '---';
            camposHtml += `<tr>
                <td style="padding:10px 12px;font-weight:600;color:#6b7280;font-size:13px;width:40%;border-bottom:1px solid #f3f4f6;">${field.label}</td>
                <td style="padding:10px 12px;font-weight:700;color:#111827;font-size:13px;border-bottom:1px solid #f3f4f6;">${valor}</td>
            </tr>`;
        });

        const html = `<!DOCTYPE html><html><head><title>Prontuário - ${clienteSelecionado?.name}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Inter',sans-serif; padding:40px; color:#111; background:#fff; }
            .header { display:flex; justify-content:space-between; align-items:center; padding-bottom:24px; border-bottom:3px solid #0d9488; margin-bottom:24px; }
            .logo { font-size:24px; font-weight:900; color:#0d9488; }
            .info { text-align:right; font-size:11px; color:#6b7280; font-weight:600; }
            .title { font-size:22px; font-weight:900; color:#111; margin-bottom:4px; }
            .subtitle { font-size:12px; color:#9ca3af; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:24px; }
            .client-box { background:#f9fafb; padding:16px 20px; border-radius:12px; margin-bottom:24px; display:flex; gap:40px; }
            .client-box div { font-size:12px; color:#6b7280; font-weight:600; }
            .client-box span { display:block; font-size:14px; color:#111; font-weight:700; }
            table { width:100%; border-collapse:collapse; }
            .footer { margin-top:60px; text-align:center; font-size:10px; color:#9ca3af; padding-top:20px; border-top:1px solid #e5e7eb; }
            .signature { margin-top:80px; display:flex; justify-content:space-around; }
            .signature div { text-align:center; }
            .signature .line { width:200px; border-top:1px solid #000; margin-bottom:4px; }
            .signature p { font-size:11px; color:#6b7280; }
            @media print { body { padding:20px; } }
        </style></head><body>
        <div class="header">
            <div class="logo">📋 Prontuário</div>
            <div class="info">Data: ${format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm")}</div>
        </div>
        <h1 class="title">${entry.template?.name}</h1>
        <p class="subtitle">Registro Clínico</p>
        <div class="client-box">
            <div>Paciente: <span>${clienteSelecionado?.name}</span></div>
            <div>Telefone: <span>${clienteSelecionado?.phone || '---'}</span></div>
            <div>CPF: <span>${clienteSelecionado?.cpf || '---'}</span></div>
        </div>
        <table>${camposHtml}</table>
        <div class="signature">
            <div><div class="line"></div><p>Assinatura do Profissional</p></div>
            <div><div class="line"></div><p>Assinatura do Paciente</p></div>
        </div>
        <div class="footer">Documento gerado automaticamente pelo sistema</div>
        </body></html>`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        }
    }

    const filtrados = clientes.filter(c => c.name.toLowerCase().includes(busca.toLowerCase()) || c.phone?.includes(busca));

    if (loading) return <div className="p-10 text-center font-black text-gray-400 animate-pulse uppercase text-xs">Sincronizando CRM...</div>;

    return (
        <div className="space-y-6 pb-20 p-2 font-sans">
            <div className="flex justify-between items-center px-2">
                <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Gestão de Clientes</h1>
                <button onClick={() => setModalAberto(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg"><UserPlus size={20} /> Adicionar Cliente</button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border dark:border-gray-700 flex items-center gap-3 shadow-sm mx-2">
                <Search className="text-gray-400 ml-3" size={20} />
                <input className="bg-transparent outline-none flex-1 py-3 text-sm dark:text-white" placeholder="Pesquisar por nome ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                {filtrados.map(c => (
                    <div key={c.id} onClick={() => abrirFichaCliente(c)} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-transparent hover:border-blue-500 shadow-sm transition-all cursor-pointer group">
                        <div className="flex justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-bold text-xl text-blue-600">{c.name.charAt(0)}</div>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${c.status === 'ATIVO' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{c.status}</span>
                        </div>
                        <h3 className="font-black text-lg group-hover:text-blue-600 transition dark:text-white">{c.name}</h3>
                        <p className="text-sm text-gray-500">{c.phone || 'Sem telefone'}</p>
                    </div>
                ))}
            </div>

            {/* FICHA DO CLIENTE (HORIZONTAL COM ABAS) */}
            {clienteSelecionado && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                    <div className="bg-white dark:bg-gray-950 w-full max-w-6xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">

                        {/* HEADER DA FICHA */}
                        <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-xl">{clienteSelecionado.name.charAt(0)}</div>
                                <div><h2 className="text-3xl font-black dark:text-white">{clienteSelecionado.name}</h2>
                                    <div className="flex gap-4 mt-1">
                                        <span className="text-blue-600 font-bold flex items-center gap-1 text-sm"><Phone size={14} /> {clienteSelecionado.phone}</span>
                                        <span className="text-gray-400 font-bold flex items-center gap-1 text-sm"><CheckCircle2 size={14} className="text-green-500" /> Cliente {clienteSelecionado.status}</span>
                                    </div>
                                </div>
                            </div>
                            {/* BOTÕES DE AÇÃO: EDITAR, EXCLUIR, FECHAR */}
                            <div className="flex gap-3">
                                <button onClick={() => abrirEdicao(clienteSelecionado)} className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-gray-50 transition text-blue-600 shadow-sm" title="Editar"><Pencil size={20} /></button>
                                {/* BOTÃO DE EXCLUIR ADICIONADO AQUI */}
                                <button onClick={() => setConfirmarExclusao({ id: clienteSelecionado.id, tipo: 'CLIENTE' })} className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-red-50 hover:text-red-500 transition text-gray-400 shadow-sm" title="Excluir"><Trash2 size={20} /></button>
                                <button onClick={() => setClienteSelecionado(null)} className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500 transition text-gray-400 shadow-sm" title="Fechar"><X size={20} /></button>
                            </div>
                        </div>

                        {/* SELETOR DE ABAS */}
                        <div className="flex px-8 pt-6 gap-8 border-b dark:border-gray-800 bg-white dark:bg-gray-950 overflow-x-auto">
                            <button onClick={() => setAbaAtiva("DADOS")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === "DADOS" ? "border-b-4 border-blue-600 text-blue-600" : "text-gray-400"}`}>Geral</button>
                            <button onClick={() => setAbaAtiva("FINANCEIRO")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === "FINANCEIRO" ? "border-b-4 border-green-600 text-green-600" : "text-gray-400"}`}>Financeiro</button>
                            <button onClick={() => setAbaAtiva("ANEXOS")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === "ANEXOS" ? "border-b-4 border-purple-600 text-purple-600" : "text-gray-400"}`}>Documentos</button>
                            <button onClick={() => { setAbaAtiva("PRONTUARIO"); carregarProntuario(); }} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${abaAtiva === "PRONTUARIO" ? "border-b-4 border-teal-600 text-teal-600" : "text-gray-400"}`}><ClipboardList size={14} /> Prontuário</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                            {abaAtiva === "DADOS" && (
                                <div className="grid grid-cols-12 gap-8">
                                    <div className="col-span-12 lg:col-span-8 space-y-8">
                                        <section><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><FileText size={14} /> Documentação</h4>
                                            <div className="grid grid-cols-12 gap-4">
                                                <div className="col-span-6 lg:col-span-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">CPF</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.cpf || "---"}</p></div>
                                                <div className="col-span-6 lg:col-span-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">RG</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.rg || "---"}</p></div>
                                                <div className="col-span-6 lg:col-span-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Telefone</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.phone || "---"}</p></div>
                                                <div className="col-span-12 lg:col-span-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800 min-w-0"><label className="text-[9px] font-black text-gray-400 uppercase">E-mail</label><p className="font-bold dark:text-white text-xs truncate" title={clienteSelecionado.email}>{clienteSelecionado.email || "---"}</p></div>
                                                <div className="col-span-6 lg:col-span-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Nasc.</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.birthDate ? format(new Date(clienteSelecionado.birthDate), "dd/MM/yyyy") : "---"}</p></div>
                                            </div>
                                        </section>
                                        <section><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><MapPin size={14} /> Localização</h4>
                                            <div className="grid grid-cols-12 gap-4">
                                                <div className="col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">CEP</label><p className="font-bold dark:text-white text-sm">{clienteSelecionado.cep || "---"}</p></div>
                                                <div className="col-span-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Endereço</label><p className="font-bold dark:text-white text-sm truncate">{clienteSelecionado.address || "---"}</p></div>
                                                <div className="col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Cidade</label><p className="font-bold dark:text-white text-sm">{clienteSelecionado.city || "---"}</p></div>
                                            </div>
                                        </section>
                                        <section><div className="flex justify-between items-center mb-4"><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><Plus size={14} /> Notas</h4><button onClick={() => setMostrarInputObs(!mostrarInputObs)} className="p-1 bg-blue-600 text-white rounded-lg"><Plus size={14} /></button></div>
                                            {mostrarInputObs && <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2"><input className="flex-1 border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-900 text-sm outline-none dark:text-white" placeholder="Escreva..." value={novaObs} onChange={e => setNovaObs(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarNotaRapida()} /><button onClick={adicionarNotaRapida} className="bg-green-600 text-white px-4 rounded-xl font-bold text-sm">Salvar</button></div>}
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">{clienteSelecionado.notes?.split('\n').reverse().map((n: string, i: number) => (<div key={i} className="p-3 bg-yellow-50/50 dark:bg-yellow-500/5 rounded-xl border border-yellow-100 dark:border-yellow-900/30 text-sm italic dark:text-gray-200">{n}</div>)) || <p className="text-gray-400 text-sm italic">Nenhuma observação.</p>}</div>
                                        </section>
                                    </div>
                                    <div className="col-span-12 lg:col-span-4 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] p-6 border dark:border-gray-800">
                                        <h4 className="text-sm font-black mb-6 uppercase text-blue-600 flex items-center gap-2"><History size={18} /> Últimas Visitas</h4>
                                        <div className="space-y-4">
                                            {loadingDetalhes && !clienteSelecionado.bookings ? (
                                                <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-blue-600 mb-2" /> <p className="text-[10px] uppercase text-gray-400 font-bold">Buscando histórico...</p></div>
                                            ) : (
                                                <>
                                                    {clienteSelecionado.bookings?.map((b: any) => (
                                                        <div key={b.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border dark:border-gray-800 flex justify-between items-center group hover:border-blue-500 transition-all">
                                                            <div>
                                                                <p className="font-black text-sm dark:text-white uppercase leading-none mb-1">{b.service?.name || "Serviço"}</p>
                                                                <p className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1 mb-1">
                                                                    <UserCircle size={10} /> Prof: {b.professional?.name || 'Não informado'}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-gray-400">{format(new Date(b.date), "dd/MM/yy 'às' HH:mm")}</p>
                                                            </div>
                                                            <span className="font-black text-green-600 text-sm">R$ {b.service?.price}</span>
                                                        </div>
                                                    ))}
                                                    {(!clienteSelecionado.bookings || clienteSelecionado.bookings.length === 0) && (
                                                        <p className="text-center text-xs text-gray-400">Nenhuma visita.</p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {abaAtiva === "FINANCEIRO" && (
                                <div className="space-y-8 animate-in fade-in duration-500">

                                    {loadingDetalhes ? (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <div className="bg-white dark:bg-gray-900 shadow-xl rounded-full px-8 py-4 flex items-center gap-3 border dark:border-gray-800">
                                                <Loader2 className="animate-spin text-blue-600" size={24} />
                                                <span className="font-black text-xs uppercase tracking-widest text-gray-500">Carregando Ficha Financeira...</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-3 gap-6">
                                                <div className="p-8 bg-green-50 dark:bg-green-900/10 rounded-[2.5rem] border border-green-100 dark:border-green-900/30 text-center"><p className="text-[10px] font-black text-green-600 uppercase mb-1">Total Já Pago</p><p className="text-3xl font-black text-green-600">R$ {clienteSelecionado.invoices?.filter((i: any) => i.status === "PAGO").reduce((acc: any, cur: any) => acc + Number(cur.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                                                <div className="p-8 bg-red-50 dark:bg-red-900/10 rounded-[2.5rem] border border-red-100 dark:border-red-900/30 text-center"><p className="text-[10px] font-black text-red-600 uppercase mb-1">Em Aberto</p><p className="text-3xl font-black text-red-600">R$ {clienteSelecionado.invoices?.filter((i: any) => i.status === "PENDENTE").reduce((acc: any, cur: any) => acc + Number(cur.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                                                <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[2.5rem] border border-blue-100 dark:border-blue-800 text-center"><p className="text-[10px] font-black text-blue-400 uppercase mb-1">Acumulado</p><p className="text-3xl font-black dark:text-white">R$ {(clienteSelecionado.invoices?.reduce((acc: any, cur: any) => acc + Number(cur.value), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2 ml-2"><Receipt size={18} /> Detalhamento Financeiro</h4>
                                                {clienteSelecionado.invoices?.map((inv: any) => (
                                                    <div key={inv.id} className="p-6 bg-white dark:bg-gray-900 border-2 dark:border-gray-800 rounded-[2rem] flex justify-between items-center hover:border-green-500 transition-all shadow-sm">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${inv.status === 'PAGO' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                                {inv.method === 'PIX' ? <QrCode size={24} /> : inv.method === 'CARTAO' ? <CreditCard size={24} /> : <Banknote size={24} />}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-base dark:text-white uppercase tracking-tight">{inv.description}</p>
                                                                {inv.status !== 'PAGO' && (
                                                                    <p className="text-[10px] font-bold text-red-400 uppercase">Venc: {format(new Date(inv.dueDate), "dd/MM/yyyy")}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`font-black text-xl ${inv.status === 'PAGO' ? 'text-green-600' : 'text-red-600'}`}>R$ {Number(inv.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{inv.status} • {inv.method || 'A DEFINIR'}</span>
                                                        </div>
                                                    </div>
                                                )) || <p className="text-center py-20 opacity-30 italic">Sem faturamentos registrados.</p>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {abaAtiva === "ANEXOS" && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="flex justify-between items-center px-2"><h4 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2"><Plus size={18} /> Documentos e Fotos</h4>
                                        <label className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase cursor-pointer hover:bg-purple-700 transition flex items-center gap-2 shadow-lg">
                                            {salvandoAnexo ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}{salvandoAnexo ? "Subindo..." : "Novo Arquivo"}
                                            <input type="file" className="hidden" onChange={handleUploadAnexo} accept=".pdf,image/*" disabled={salvandoAnexo} />
                                        </label>
                                    </div>
                                    {loadingDetalhes && !clienteSelecionado.attachments ? (
                                        <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-purple-600 mb-2" /> <p className="text-[10px] uppercase text-gray-400 font-bold">Buscando arquivos...</p></div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            {clienteSelecionado.attachments?.map((file: any) => (
                                                <div key={file.id} className="p-6 bg-white dark:bg-gray-900 border-2 dark:border-gray-800 rounded-[2.5rem] flex justify-between items-center group hover:border-purple-500 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center">{file.type.includes('image') ? <ImageIcon size={24} /> : <FileText size={24} />}</div>
                                                        <div><p className="font-black text-sm uppercase dark:text-white truncate max-w-[150px]">{file.name}</p><p className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(file.createdAt), "dd MMM yyyy")}</p></div>
                                                    </div>
                                                    <div className="flex gap-2"><a href={file.url} target="_blank" className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:text-blue-600 transition"><Download size={18} /></a><button onClick={() => setConfirmarExclusao({ id: file.id, tipo: 'ANEXO' })} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:text-red-500 transition"><Trash2 size={18} /></button></div>
                                                </div>
                                            )) || <div className="col-span-full py-20 text-center opacity-30 italic">Sem anexos.</div>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {abaAtiva === "PRONTUARIO" && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    {loadingProntuarios ? (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <Loader2 className="animate-spin text-teal-600 mb-2" size={30} />
                                            <p className="text-[10px] uppercase text-gray-400 font-bold">Carregando prontuários...</p>
                                        </div>
                                    ) : prontuarioVisualizando ? (
                                        /* VISUALIZAÇÃO DO PRONTUÁRIO PREENCHIDO */
                                        <div>
                                            <div className="flex justify-between items-center mb-6">
                                                <button onClick={() => setProntuarioVisualizando(null)} className="text-sm text-blue-600 font-bold hover:underline flex items-center gap-1">&larr; Voltar</button>
                                                <button onClick={() => imprimirProntuario(prontuarioVisualizando)} className="bg-teal-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-teal-700 transition"><Printer size={14} /> Imprimir</button>
                                            </div>
                                            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-8">
                                                <h3 className="text-xl font-black dark:text-white mb-1">{prontuarioVisualizando.template?.name}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-6">Preenchido em {format(new Date(prontuarioVisualizando.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                                                <div className="space-y-4">
                                                    {(prontuarioVisualizando.template?.fields as any[])?.map((field: any) => {
                                                        const valor = (prontuarioVisualizando.data as any)?.[field.id];
                                                        if (field.type === 'header') return <h4 key={field.id} className="text-sm font-black text-teal-600 uppercase tracking-widest pt-4 border-t dark:border-gray-800">{field.label}</h4>;
                                                        return (
                                                            <div key={field.id} className="grid grid-cols-3 gap-4 py-2 border-b dark:border-gray-800/50">
                                                                <p className="text-xs font-bold text-gray-500 col-span-1">{field.label}</p>
                                                                <p className="text-sm font-bold dark:text-white col-span-2">
                                                                    {field.type === 'checkbox' ? (valor ? '✅ Sim' : '❌ Não') :
                                                                        field.type === 'checkboxGroup' ? (Array.isArray(valor) ? valor.join(', ') : '---') :
                                                                            valor || '---'}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* FORMULÁRIO + LISTA */
                                        <>
                                            {/* SELETOR DE TEMPLATE */}
                                            {prontuarioTemplates.length === 0 ? (
                                                <div className="text-center py-16">
                                                    <ClipboardList size={40} className="text-gray-300 mx-auto mb-4" />
                                                    <p className="text-sm text-gray-500 font-bold">Nenhum modelo de prontuário criado.</p>
                                                    <p className="text-xs text-gray-400 mt-1">Vá em <b>Prontuários</b> no menu lateral para criar um modelo.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Modelo do Prontuário</label>
                                                        <select
                                                            className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white outline-none focus:border-teal-500"
                                                            value={prontuarioTemplateSelecionado}
                                                            onChange={e => { setProntuarioTemplateSelecionado(e.target.value); setProntuarioFormData({}); setProntuarioEditId(null); }}
                                                        >
                                                            <option value="">Selecione um modelo...</option>
                                                            {prontuarioTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                        </select>
                                                    </div>

                                                    {/* CAMPOS DINÂMICOS */}
                                                    {prontuarioTemplateSelecionado && (() => {
                                                        const template = prontuarioTemplates.find((t: any) => t.id === prontuarioTemplateSelecionado);
                                                        if (!template) return null;
                                                        return (
                                                            <div className="space-y-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6">
                                                                <h4 className="font-black dark:text-white flex items-center gap-2"><FileText className="text-teal-500" size={18} /> {template.name}</h4>
                                                                {(template.fields as any[]).map((field: any) => (
                                                                    <div key={field.id}>
                                                                        {field.type === 'header' && (
                                                                            <h5 className="text-sm font-black text-teal-600 uppercase tracking-widest pt-4 pb-1 border-t dark:border-gray-800">{field.label}</h5>
                                                                        )}
                                                                        {field.type === 'text' && (
                                                                            <div>
                                                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                                                <input className="w-full border dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm font-bold dark:text-white outline-none focus:border-teal-500" value={prontuarioFormData[field.id] || ''} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.value })} />
                                                                            </div>
                                                                        )}
                                                                        {field.type === 'textarea' && (
                                                                            <div>
                                                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                                                <textarea rows={3} className="w-full border dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm font-bold dark:text-white outline-none focus:border-teal-500" value={prontuarioFormData[field.id] || ''} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.value })} />
                                                                            </div>
                                                                        )}
                                                                        {field.type === 'number' && (
                                                                            <div>
                                                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                                                <input type="number" className="w-full border dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm font-bold dark:text-white outline-none focus:border-teal-500" value={prontuarioFormData[field.id] || ''} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.value })} />
                                                                            </div>
                                                                        )}
                                                                        {field.type === 'date' && (
                                                                            <div>
                                                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                                                <input type="date" className="w-full border dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm font-bold dark:text-white outline-none focus:border-teal-500" value={prontuarioFormData[field.id] || ''} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.value })} />
                                                                            </div>
                                                                        )}
                                                                        {field.type === 'select' && (
                                                                            <div>
                                                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                                                <select className="w-full border dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm font-bold dark:text-white outline-none focus:border-teal-500" value={prontuarioFormData[field.id] || ''} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.value })}>
                                                                                    <option value="">Selecione...</option>
                                                                                    {field.options?.map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                                                                                </select>
                                                                            </div>
                                                                        )}
                                                                        {field.type === 'checkbox' && (
                                                                            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                                                                                <input type="checkbox" className="w-5 h-5 accent-teal-600" checked={prontuarioFormData[field.id] || false} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.checked })} />
                                                                                <span className="text-sm font-bold dark:text-white">{field.label}</span>
                                                                                {field.required && <span className="text-red-500 text-xs">*</span>}
                                                                            </label>
                                                                        )}
                                                                        {field.type === 'checkboxGroup' && (
                                                                            <div>
                                                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-2 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    {field.options?.map((opt: string, i: number) => (
                                                                                        <label key={i} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm">
                                                                                            <input type="checkbox" className="accent-teal-600" checked={(prontuarioFormData[field.id] || []).includes(opt)} onChange={e => {
                                                                                                const arr = prontuarioFormData[field.id] || [];
                                                                                                setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.checked ? [...arr, opt] : arr.filter((v: string) => v !== opt) });
                                                                                            }} />
                                                                                            <span className="font-bold dark:text-white">{opt}</span>
                                                                                        </label>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                <button onClick={salvarProntuario} disabled={prontuarioSalvando} className="w-full bg-teal-600 text-white p-4 rounded-2xl font-black text-sm hover:bg-teal-700 transition flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
                                                                    {prontuarioSalvando ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                                                    {prontuarioSalvando ? 'Salvando...' : (prontuarioEditId ? 'Atualizar Prontuário' : 'Salvar Prontuário')}
                                                                </button>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* LISTA DE PRONTUÁRIOS PREENCHIDOS */}
                                                    {prontuarioEntries.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-3 flex items-center gap-2"><History size={14} /> Prontuários Preenchidos</h4>
                                                            <div className="space-y-2">
                                                                {prontuarioEntries.map((entry: any) => (
                                                                    <div key={entry.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl hover:border-teal-500 transition group">
                                                                        <div>
                                                                            <p className="font-bold text-sm dark:text-white">{entry.template?.name}</p>
                                                                            <p className="text-[10px] text-gray-400 font-bold">{format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                                                                        </div>
                                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                                                            <button onClick={() => setProntuarioVisualizando(entry)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-teal-600 transition" title="Visualizar"><Eye size={14} /></button>
                                                                            <button onClick={() => { setProntuarioTemplateSelecionado(entry.templateId); setProntuarioFormData(entry.data as any); setProntuarioEditId(entry.id); }} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-blue-600 transition" title="Editar"><Pencil size={14} /></button>
                                                                            <button onClick={() => imprimirProntuario(entry)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-green-600 transition" title="Imprimir"><Printer size={14} /></button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* RODAPÉ ESTILIZADO */}
                        <div className="p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-between items-center">
                            <div className="flex gap-8">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Gasto</p><p className="font-black text-2xl text-green-600">R$ {clienteSelecionado.bookings?.reduce((acc: any, b: any) => acc + Number(b.service?.price || 0), 0) || "0"}</p></div>
                                <div className="border-l dark:border-gray-800 pl-8"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Frequência</p><p className="font-black text-2xl text-blue-600">{clienteSelecionado.bookings?.length || 0}x</p></div>
                            </div>
                            <div className="text-right"><p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Ficha atualizada em tempo real</p><p className="text-[9px] text-gray-500 mt-1 uppercase font-bold">Registro: {clienteSelecionado.createdAt ? format(new Date(clienteSelecionado.createdAt), "dd/MM/yyyy") : "---"}</p></div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CADASTRO/EDIÇÃO (MANTIDO) */}
            {modalAberto && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[80] p-4">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-4xl relative shadow-2xl overflow-y-auto max-h-[90vh]">
                        <button onClick={fecharModal} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition"><X size={24} /></button>
                        <h2 className="text-3xl font-black mb-8 dark:text-white">{isEditing ? "Editar Ficha" : "Novo Cliente"}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nome Completo</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Telefone</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Email para Alertas</label><input type="email" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">RG</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.rg} onChange={e => setForm({ ...form, rg: e.target.value })} /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nascimento</label><input type="date" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></div>
                                </div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">CPF</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} /></div>
                            </div>
                            <div className="space-y-5">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Endereço Residencial</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Cidade</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">CEP</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} /></div>
                                </div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Status</label><select className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold dark:text-white outline-none" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option></select></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Notas Iniciais</label><textarea rows={2} className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none dark:text-white font-bold" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            </div>
                        </div>
                        <button onClick={salvarCliente} className="w-full mt-8 bg-blue-600 text-white p-6 rounded-[2rem] font-black text-xl shadow-xl hover:bg-blue-700 transition flex items-center justify-center gap-3"><Save size={24} /> Salvar Registro</button>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO ESTILIZADO */}
            {confirmarExclusao && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-sm text-center shadow-2xl border dark:border-gray-800 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} /></div>
                        <h2 className="text-2xl font-black mb-2 dark:text-white tracking-tighter uppercase">Excluir?</h2>
                        <p className="text-gray-500 text-sm mb-8 font-medium">Os dados serão removidos permanentemente. Confirmar?</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setConfirmarExclusao(null)} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase text-gray-600 dark:text-gray-300">Não</button>
                            <button onClick={executarExclusao} className="p-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-red-500/20">Sim, excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}