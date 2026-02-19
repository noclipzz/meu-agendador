"use client";

import { useState, useEffect } from "react";
import {
    Trash2, Plus, Save, Loader2, Pencil, X, UserCircle, Phone, ShieldCheck, Check,
    Users, History, Star, Calendar, Clock, Mail, UploadCloud, Image as ImageIcon, Search,
    MapPin, FileText, LayoutDashboard, BarChart3, Package, ClipboardList, Briefcase, Settings, User as UserIcon, Megaphone,
    Download, Eye, Receipt, QrCode, CreditCard, Banknote
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { useAgenda } from "../../../contexts/AgendaContext";

// --- HELPER: MASCARAS ---
const formatarTelefone = (value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw.length > 0 ? `(${raw}` : "";
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
};
const formatarCPF = (value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
    if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
};
const formatarCEP = (value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 8);
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
};

export default function GestaoEquipe() {
    const { refreshAgenda } = useAgenda();
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [userPlan, setUserPlan] = useState<string>("INDIVIDUAL"); // Detecta o plano do usuário

    const [profissionais, setProfissionais] = useState<any[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [proSelecionado, setProSelecionado] = useState<any>(null);
    const [abaAtiva, setAbaAtiva] = useState<"RESUMO" | "DADOS" | "DOCUMENTOS">("RESUMO");
    const [salvandoAnexo, setSalvandoAnexo] = useState(false);
    const [novaObs, setNovaObs] = useState("");
    const [mostrarInputObs, setMostrarInputObs] = useState(false);
    const [editandoNota, setEditandoNota] = useState<{ index: number, text: string } | null>(null);

    // FORMULÁRIO
    const [form, setForm] = useState({
        id: "",
        name: "",
        email: "",
        phone: "",
        color: "#3b82f6",
        photoUrl: "",
        cpf: "", rg: "", birthDate: "", cep: "", address: "", number: "", complement: "", neighborhood: "", city: "", state: "", notes: "", maritalStatus: "", status: "ATIVO",
        permissions: {
            dashboard: false,
            agenda: true,
            listaEspera: false,
            clientes: true,
            financeiro: false,
            estoque: false,
            prontuarios: false,
            servicos: false,
            profissionais: false,
            config: false,
            mural: true
        }
    });

    async function handleCEPChange(cep: string) {
        const formatado = formatarCEP(cep);
        setForm(prev => ({ ...prev, cep: formatado }));
        const cleanCEP = formatado.replace(/\D/g, "");
        if (cleanCEP.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setForm(prev => ({
                        ...prev,
                        cep: formatado,
                        address: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    }));
                    toast.success("Endereço localizado!");
                }
            } catch (error) { console.error("Erro CEP", error); }
        }
    }

    useEffect(() => { carregarDados(); }, []);

    async function carregarDados() {
        try {
            // Carrega profissionais e informações do usuário
            const [resPro, resCheckout] = await Promise.all([
                fetch('/api/painel/profissionais'),
                fetch('/api/checkout')
            ]);

            const dataPro = await resPro.json();
            if (Array.isArray(dataPro)) setProfissionais(dataPro);

            const dataCheckout = await resCheckout.json();
            setUserPlan(dataCheckout.plan || "INDIVIDUAL");
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar lista de profissionais.");
        } finally {
            setLoading(false);
        }
    }

    // --- CÁLCULO DE COMISSÃO ---
    const calcularMetricas = (pro: any) => {
        const confirmados = pro.bookings?.filter((b: any) => ["CONFIRMADO", "CONCLUIDO"].includes(b.status)) || [];

        const totalGeral = confirmados.reduce((acc: number, b: any) => acc + Number(b.service?.price || 0), 0);

        const totalComissao = confirmados.reduce((acc: number, b: any) => {
            const preco = Number(b.service?.price || 0);
            const porc = Number(b.service?.commission || 0);
            return acc + (preco * (porc / 100));
        }, 0);

        return { totalGeral, totalComissao, atendimentos: confirmados.length };
    };

    async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        toast.info("Enviando foto...");
        try {
            const blob = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/upload/token',
            });
            if (blob.url) {
                setForm(prev => ({ ...prev, photoUrl: blob.url }));
                toast.success("Foto enviada!");
            } else {
                toast.error("Erro ao processar imagem.");
            }
        } catch (error: any) {
            console.error("ERRO_UPLOAD_FOTO_PRO:", error);
            toast.error("Erro no upload: " + (error.message || "Verifique o console"));
        }
    }

    async function adicionarNotaRapidaPro() {
        if (!proSelecionado || !novaObs.trim()) return;
        const dataNota = format(new Date(), "dd/MM/yy 'às' HH:mm");
        const notaFormatada = `[${dataNota}]: ${novaObs}`;
        const novaStringNotas = proSelecionado.notes ? `${proSelecionado.notes}\n${notaFormatada}` : notaFormatada;

        const res = await fetch('/api/painel/profissionais', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: proSelecionado.id, notes: novaStringNotas })
        });

        if (res.ok) {
            setProSelecionado((prev: any) => ({ ...prev, notes: novaStringNotas }));
            setProfissionais(prev => prev.map(p => p.id === proSelecionado.id ? { ...p, notes: novaStringNotas } : p));
            setNovaObs(""); setMostrarInputObs(false);
            toast.success("Observação adicionada!");
        } else {
            toast.error("Erro ao adicionar observação.");
        }
    }

    async function deletarNotaPro(index: number) {
        if (!proSelecionado) return;
        const notasArray = (proSelecionado.notes || "").split('\n').filter((n: string) => n.trim() !== "");
        const indexOriginal = notasArray.length - 1 - index; // Adjust index for reversed display
        const novasNotasArr = notasArray.filter((_: any, i: number) => i !== indexOriginal);
        const novaStringNotas = novasNotasArr.join('\n');

        const res = await fetch('/api/painel/profissionais', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: proSelecionado.id, notes: novaStringNotas })
        });

        if (res.ok) {
            setProSelecionado((prev: any) => ({ ...prev, notes: novaStringNotas }));
            setProfissionais(prev => prev.map(p => p.id === proSelecionado.id ? { ...p, notes: novaStringNotas } : p));
            toast.success("Observação removida!");
        } else {
            toast.error("Erro ao remover observação.");
        }
    }

    async function salvarEdicaoNotaPro() {
        if (!proSelecionado || !editandoNota) return;
        const notasArray = (proSelecionado.notes || "").split('\n').filter((n: string) => n.trim() !== "");
        const indexOriginal = notasArray.length - 1 - editandoNota.index; // Adjust index for reversed display
        const novasNotasArr = [...notasArray];
        novasNotasArr[indexOriginal] = editandoNota.text;
        const novaStringNotas = novasNotasArr.join('\n');

        const res = await fetch('/api/painel/profissionais', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: proSelecionado.id, notes: novaStringNotas })
        });

        if (res.ok) {
            setProSelecionado((prev: any) => ({ ...prev, notes: novaStringNotas }));
            setProfissionais(prev => prev.map(p => p.id === proSelecionado.id ? { ...p, notes: novaStringNotas } : p));
            setEditandoNota(null);
            toast.success("Observação atualizada!");
        } else {
            toast.error("Erro ao atualizar observação.");
        }
    }

    async function handleUploadAnexoPro(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0] || !proSelecionado) return;
        const file = e.target.files[0];
        setSalvandoAnexo(true);
        try {
            const blob = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/upload/token',
            });
            const resBanco = await fetch('/api/painel/profissionais/anexos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: file.name,
                    url: blob.url,
                    type: file.type,
                    size: file.size,
                    professionalId: proSelecionado.id
                })
            });
            if (resBanco.ok) {
                const novoAnexo = await resBanco.json();
                setProSelecionado({ ...proSelecionado, attachments: [...(proSelecionado.attachments || []), novoAnexo] });
                setProfissionais(prev => prev.map(p => p.id === proSelecionado.id ? { ...p, attachments: [...(p.attachments || []), novoAnexo] } : p));
                toast.success("Arquivo anexado!");
            } else {
                const err = await resBanco.json();
                toast.error(err.error || "Erro ao salvar anexo.");
            }
        } catch (error: any) { toast.error(error.message || "Erro no upload."); }
        finally { setSalvandoAnexo(false); }
    }

    async function deletarAnexoPro(id: string) {
        if (!confirm("Deseja excluir este anexo?")) return;
        const res = await fetch('/api/painel/profissionais/anexos', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (res.ok) {
            setProSelecionado({ ...proSelecionado, attachments: proSelecionado.attachments.filter((a: any) => a.id !== id) });
            setProfissionais(prev => prev.map(p => p.id === proSelecionado.id ? { ...p, attachments: p.attachments.filter((a: any) => a.id !== id) } : p));
            toast.success("Excluído com sucesso.");
        } else {
            toast.error("Erro ao excluir.");
        }
    }

    async function salvarProfissional() {
        if (!form.name) return toast.error("O nome é obrigatório.");

        setSalvando(true);
        const method = form.id ? 'PUT' : 'POST';

        try {
            const res = await fetch('/api/painel/profissionais', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(form.id ? "Dados atualizados!" : "Profissional adicionado e convite criado!");
                fecharModal();
                carregarDados();
                if (refreshAgenda) refreshAgenda();
            } else {
                toast.error(data.error || "Erro ao salvar profissional.");
            }
        } catch (error) {
            toast.error("Erro de conexão com o servidor.");
        } finally {
            setSalvando(false);
        }
    }

    async function deletar(id: string, nome: string) {
        toast(`Remover ${nome} da equipe?`, {
            action: {
                label: "Confirmar",
                onClick: async () => {
                    const res = await fetch('/api/painel/profissionais', {
                        method: 'DELETE',
                        body: JSON.stringify({ id })
                    });
                    if (res.ok) {
                        setProfissionais(prev => prev.filter(p => p.id !== id));
                        toast.success("Removido com sucesso.");
                        if (refreshAgenda) refreshAgenda();
                    }
                }
            }
        });
    }

    function prepararEdicao(e: React.MouseEvent, p: any) {
        e.stopPropagation();
        setForm({
            id: p.id,
            name: p.name,
            email: p.email || "",
            phone: formatarTelefone(p.phone || ""),
            color: p.color || "#3b82f6",
            photoUrl: p.photoUrl || "",
            cpf: formatarCPF(p.cpf || ""),
            rg: p.rg || "",
            birthDate: p.birthDate || "",
            cep: formatarCEP(p.cep || ""),
            address: p.address || "",
            number: p.number || "",
            complement: p.complement || "",
            neighborhood: p.neighborhood || "",
            maritalStatus: p.maritalStatus || "",
            city: p.city || "",
            state: p.state || "",
            notes: p.notes || "",
            status: p.status || "ATIVO",
            permissions: p.permissions || {
                dashboard: false,
                agenda: true,
                listaEspera: false,
                clientes: true,
                financeiro: false,
                estoque: false,
                prontuarios: false,
                servicos: false,
                profissionais: false,
                config: false,
                mural: true
            }
        });
        setModalAberto(true);
    }

    function fecharModal() {
        setModalAberto(false);
        setForm({
            id: "", name: "", email: "", phone: "", color: "#3b82f6", photoUrl: "",
            cpf: "", rg: "", birthDate: "", cep: "", address: "", number: "", complement: "", neighborhood: "", city: "", state: "", notes: "", maritalStatus: "", status: "ATIVO",
            permissions: {
                dashboard: false,
                agenda: true,
                listaEspera: false,
                clientes: true,
                financeiro: false,
                estoque: false,
                prontuarios: false,
                servicos: false,
                profissionais: false,
                config: false,
                mural: true
            }
        });
    }

    if (loading) return (
        <div className="h-screen w-full flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Sincronizando Equipe...</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-20 px-2 font-sans">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight flex items-center gap-2">
                        <ShieldCheck className="text-blue-600" size={32} /> Gestão de Equipe
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Cadastre seus colaboradores para liberar o acesso ao sistema.</p>
                </div>
                <button
                    onClick={() => {
                        // Verifica limite do plano INDIVIDUAL
                        if (userPlan === "INDIVIDUAL" && profissionais.length >= 1) {
                            toast.error("O plano INDIVIDUAL permite apenas 1 profissional. Faça upgrade para PREMIUM.");
                            return;
                        }
                        setModalAberto(true);
                    }}
                    className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <Plus size={20} /> Novo Profissional
                    {userPlan === "INDIVIDUAL" && <span className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-full ml-2">Máx: {profissionais.length}/1</span>}
                </button>
            </div>

            {/* LISTA DE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                {profissionais.map(p => {
                    const { totalGeral, atendimentos } = calcularMetricas(p);
                    return (
                        <div
                            key={p.id}
                            onClick={() => { setProSelecionado(p); setAbaAtiva("RESUMO"); }}
                            className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-blue-500 transition-all shadow-sm group cursor-pointer relative"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg overflow-hidden shrink-0"
                                    style={{ backgroundColor: p.photoUrl ? 'transparent' : p.color }}
                                >
                                    {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produção</p>
                                    <p className="font-black text-blue-600">R$ {totalGeral.toLocaleString()}</p>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold dark:text-white group-hover:text-blue-600 transition">{p.name}</h3>

                            <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-tighter">
                                <span>{atendimentos} atendimentos</span>
                                <div className="flex gap-2">
                                    <button onClick={(e) => prepararEdicao(e, p)} className="text-gray-400 hover:text-blue-500 transition"><Pencil size={16} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); deletar(p.id, p.name); }} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    )
                })}

                {profissionais.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[3rem]">
                        <Users size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Nenhum profissional cadastrado</p>
                    </div>
                )}
            </div>

            {/* FICHA DO PROFISSIONAL (TABBED) */}
            {proSelecionado && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-6xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

                        {/* HEADER DA FICHA */}
                        <div className="p-8 border-b dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl overflow-hidden shrink-0" style={{ backgroundColor: proSelecionado.photoUrl ? 'transparent' : proSelecionado.color }}>
                                    {proSelecionado.photoUrl ? <img src={proSelecionado.photoUrl} alt={proSelecionado.name} className="w-full h-full object-cover" /> : proSelecionado.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black dark:text-white">{proSelecionado.name}</h2>
                                    <div className="flex gap-4 mt-1">
                                        <span className="text-blue-600 font-bold flex items-center gap-1 text-sm"><Phone size={14} /> {proSelecionado.phone || "Sem telefone"}</span>
                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${proSelecionado.status === 'ATIVO' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50 text-green-600' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50 text-red-600'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${proSelecionado.status === 'ATIVO' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                            {proSelecionado.status === 'INATIVO' ? 'Inativo' : 'Ativo'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mr-4">
                                    <button onClick={() => setAbaAtiva("RESUMO")} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition flex items-center gap-2 ${abaAtiva === "RESUMO" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600"}`}><LayoutDashboard size={14} /> Resumo</button>
                                    <button onClick={() => setAbaAtiva("DADOS")} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition flex items-center gap-2 ${abaAtiva === "DADOS" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600"}`}><UserCircle size={14} /> Dados</button>
                                    <button onClick={() => setAbaAtiva("DOCUMENTOS")} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition flex items-center gap-2 ${abaAtiva === "DOCUMENTOS" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600"}`}><FileText size={14} /> Documentos</button>
                                </div>
                                <button onClick={(e) => { setProSelecionado(null); prepararEdicao(e, proSelecionado); }} className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-gray-50 transition text-blue-600 shadow-sm"><Pencil size={20} /></button>
                                <button onClick={() => setProSelecionado(null)} className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-red-50 hover:text-red-500 transition shadow-sm"><X size={20} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                            {/* ABA RESUMO */}
                            {abaAtiva === "RESUMO" && (
                                <div className="grid grid-cols-12 gap-8">
                                    <div className="col-span-12 lg:col-span-8 space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-800"><p className="text-[10px] font-black text-blue-400 uppercase mb-1">Produção Total</p><p className="text-2xl font-black text-blue-600">R$ {calcularMetricas(proSelecionado).totalGeral.toLocaleString()}</p></div>
                                            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-[2rem] border border-green-100 dark:border-green-800"><p className="text-[10px] font-black text-green-400 uppercase mb-1">Comissões</p><p className="text-2xl font-black text-green-600">R$ {calcularMetricas(proSelecionado).totalComissao.toLocaleString()}</p></div>
                                            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border dark:border-gray-800"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Atendimentos</p><p className="text-2xl font-black dark:text-white">{calcularMetricas(proSelecionado).atendimentos}</p></div>
                                        </div>
                                        <section>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><History size={16} /> Histórico Recente</h4>
                                            <div className="space-y-3">
                                                {proSelecionado.bookings?.filter((b: any) => ["CONFIRMADO", "CONCLUIDO"].includes(b.status)).length > 0 ? (
                                                    proSelecionado.bookings.filter((b: any) => ["CONFIRMADO", "CONCLUIDO"].includes(b.status)).slice(0, 10).map((b: any) => (
                                                        <div key={b.id} className="p-6 bg-gray-50 dark:bg-gray-900 rounded-[2rem] flex justify-between items-center border border-transparent hover:border-blue-500 transition-all">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm"><Star size={20} className="text-yellow-500" /></div>
                                                                <div>
                                                                    <p className="font-black text-sm uppercase dark:text-white">{b.service?.name}</p>
                                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-gray-400 uppercase mt-1">
                                                                        <span className="text-blue-500">Atendeu: {b.customerName}</span>
                                                                        <span>{format(new Date(b.date), "dd/MM/yyyy HH:mm")}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right"><p className="font-black text-base dark:text-white">R$ {b.service?.price}</p></div>
                                                        </div>
                                                    ))
                                                ) : <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-[2rem] opacity-40 italic text-sm">Sem histórico.</div>}
                                            </div>
                                        </section>
                                    </div>
                                    <div className="col-span-12 lg:col-span-4 space-y-6">
                                        <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800">
                                            <h4 className="font-black text-xs uppercase tracking-widest mb-6 text-gray-400">Status do sistema</h4>
                                            <div className="space-y-5">
                                                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm"><label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Login Vinculado</label><div className="flex items-center gap-2">{proSelecionado.userId ? <><Check size={16} className="text-green-500" /><span className="text-sm font-bold text-green-600 uppercase">Sim</span></> : <><X size={16} className="text-red-500" /><span className="text-sm font-bold text-red-500 uppercase">Não</span></>}</div></div>
                                                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm"><label className="text-[9px] font-black text-gray-400 uppercase block mb-1">E-mail</label><p className="text-xs font-bold dark:text-white break-all">{proSelecionado.email || "---"}</p></div>
                                            </div>
                                            <button onClick={() => { if (confirm("Remover membro?")) deletar(proSelecionado.id, proSelecionado.name); setProSelecionado(null); }} className="w-full mt-10 p-4 border-2 border-red-100 text-red-500 rounded-2xl text-xs font-black uppercase hover:bg-red-50 transition">Excluir Profissional</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ABA DADOS CADASTRAIS */}
                            {abaAtiva === "DADOS" && (
                                <div className="grid grid-cols-12 gap-8">
                                    <div className="col-span-12 lg:col-span-8 space-y-8">
                                        <section>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><FileText size={14} /> Documentação</h4>
                                            <div className="grid grid-cols-12 gap-4">
                                                <div className="col-span-6 md:col-span-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">CPF</label><p className="font-bold dark:text-white text-sm">{formatarCPF(proSelecionado.cpf || "") || "---"}</p></div>
                                                <div className="col-span-6 md:col-span-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">RG</label><p className="font-bold dark:text-white text-sm">{proSelecionado.rg || "---"}</p></div>
                                                <div className="col-span-6 md:col-span-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Nascimento</label><p className="font-bold dark:text-white text-sm">{proSelecionado.birthDate && !isNaN(new Date(proSelecionado.birthDate).getTime()) ? format(new Date(proSelecionado.birthDate), "dd/MM/yyyy") : "---"}</p></div>
                                                <div className="col-span-6 md:col-span-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Estado Civil</label><p className="font-bold dark:text-white text-sm">{proSelecionado.maritalStatus || "---"}</p></div>
                                            </div>
                                        </section>
                                        <section>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><MapPin size={14} /> Endereço Residencial</h4>
                                            <div className="grid grid-cols-12 gap-4">
                                                <div className="col-span-6 md:col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">CEP</label><p className="font-bold dark:text-white text-xs truncate">{formatarCEP(proSelecionado.cep || "") || "---"}</p></div>
                                                <div className="col-span-6 md:col-span-9 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Endereço</label><p className="font-bold dark:text-white text-xs truncate">{proSelecionado.address || "---"}, {proSelecionado.number || "S/N"}</p></div>
                                                <div className="col-span-6 md:col-span-5 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Bairro</label><p className="font-bold dark:text-white text-xs truncate">{proSelecionado.neighborhood || "---"}</p></div>
                                                <div className="col-span-6 md:col-span-7 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Cidade / UF</label><p className="font-bold dark:text-white text-xs truncate">{proSelecionado.city || "---"} - {proSelecionado.state || "-"}</p></div>
                                            </div>
                                        </section>
                                    </div>
                                    <div className="col-span-12 lg:col-span-4 space-y-6">
                                        <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800">
                                            <div className="flex justify-between items-center mb-6">
                                                <h4 className="font-black text-xs uppercase tracking-widest text-gray-400">Anotações Internas</h4>
                                                <button onClick={() => setMostrarInputObs(!mostrarInputObs)} className="p-1 px-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                                    <Plus size={14} />
                                                </button>
                                            </div>

                                            {mostrarInputObs && (
                                                <div className="flex gap-2 mb-6 animate-in slide-in-from-top-2">
                                                    <input
                                                        className="flex-1 border-2 dark:border-gray-800 p-3 rounded-2xl bg-white dark:bg-gray-950 text-xs outline-none focus:border-blue-500 dark:text-white transition"
                                                        placeholder="Nova nota..."
                                                        value={novaObs}
                                                        onChange={e => setNovaObs(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && adicionarNotaRapidaPro()}
                                                    />
                                                    <button onClick={adicionarNotaRapidaPro} className="bg-green-600 text-white px-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-green-600/20 hover:bg-green-700 transition">OK</button>
                                                </div>
                                            )}

                                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                {proSelecionado.notes?.split('\n').filter((n: string) => n.trim() !== "").reverse().map((n: string, i: number) => (
                                                    <div key={i} className="group relative p-4 bg-yellow-50/40 dark:bg-yellow-500/5 rounded-2xl border border-yellow-100 dark:border-yellow-900/20 text-xs dark:text-gray-200 transition-all hover:border-yellow-200 dark:hover:border-yellow-800/50">
                                                        {editandoNota?.index === i ? (
                                                            <div className="space-y-2">
                                                                <textarea
                                                                    className="w-full bg-white dark:bg-gray-950 border-2 border-blue-500 p-3 rounded-xl outline-none font-bold text-xs"
                                                                    value={editandoNota.text}
                                                                    onChange={e => setEditandoNota({ ...editandoNota, text: e.target.value })}
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => setEditandoNota(null)} className="text-[9px] font-black uppercase text-gray-400">Canc.</button>
                                                                    <button onClick={salvarEdicaoNotaPro} className="text-[9px] font-black uppercase text-blue-600">Salvar</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-between items-start gap-4">
                                                                <p className="flex-1 leading-relaxed italic">{n}</p>
                                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                                    <button onClick={() => setEditandoNota({ index: i, text: n })} className="text-blue-400"><Pencil size={12} /></button>
                                                                    <button onClick={() => { if (confirm("Excluir nota?")) deletarNotaPro(i); }} className="text-red-400"><Trash2 size={12} /></button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )) || <p className="text-gray-400 text-xs italic opacity-40">Sem notas.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ABA DOCUMENTOS */}
                            {abaAtiva === "DOCUMENTOS" && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="flex justify-between items-center px-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><Plus size={16} /> Documentos e Arquivos</h4>
                                        <label className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase cursor-pointer hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95">
                                            {salvandoAnexo ? <Loader2 className="animate-spin" size={14} /> : <UploadCloud size={14} />}
                                            {salvandoAnexo ? "Subindo..." : "Novo Arquivo"}
                                            <input type="file" className="hidden" onChange={handleUploadAnexoPro} accept=".pdf,image/*" disabled={salvandoAnexo} />
                                        </label>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] p-8 border dark:border-gray-800">
                                        <div className="flex justify-between items-center mb-6">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Armazenamento Utilizado</p>
                                            <p className="text-[10px] font-black text-blue-600 uppercase">
                                                {((proSelecionado.attachments?.reduce((acc: number, cur: any) => acc + (cur.size || 0), 0) || 0) / (1024 * 1024)).toFixed(2)} MB / 10 MB
                                            </p>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 transition-all duration-500"
                                                style={{ width: `${Math.min(100, ((proSelecionado.attachments?.reduce((acc: number, cur: any) => acc + (cur.size || 0), 0) || 0) / (10 * 1024 * 1024)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {proSelecionado.attachments?.length > 0 ? (
                                            proSelecionado.attachments.map((file: any) => (
                                                <div key={file.id} className="p-6 bg-gray-50 dark:bg-gray-900 border-2 border-transparent hover:border-blue-500 rounded-[2rem] flex justify-between items-center group transition-all">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className="w-12 h-12 bg-white dark:bg-gray-800 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                            {file.type.includes('image') ? <ImageIcon size={20} /> : <FileText size={20} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-xs uppercase dark:text-white truncate" title={file.name}>{file.name}</p>
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase">
                                                                {((file.size || 0) / 1024).toFixed(0)} KB • {format(new Date(file.createdAt), "dd/MM/yyyy")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a href={file.url} target="_blank" className="p-3 bg-white dark:bg-gray-800 rounded-xl hover:text-blue-600 transition shadow-sm" title="Baixar">
                                                            <Download size={16} />
                                                        </a>
                                                        <button onClick={() => deletarAnexoPro(file.id)} className="p-3 bg-white dark:bg-gray-800 rounded-xl hover:text-red-500 transition shadow-sm" title="Excluir">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                                                <UploadCloud size={40} className="mx-auto text-gray-300 mb-4" />
                                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nenhum documento anexado</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {modalAberto && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] w-full max-w-5xl max-h-[90vh] relative shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border dark:border-gray-800">
                        {/* HEADER FIXO */}
                        <div className="p-8 pb-4 shrink-0 flex justify-between items-center">
                            <h2 className="text-3xl font-black dark:text-white px-2 tracking-tighter">{form.id ? "Editar Ficha Técnica" : "Novo Profissional"}</h2>
                            <button onClick={fecharModal} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-red-500 transition shadow-sm"><X size={24} /></button>
                        </div>

                        {/* CONTEÚDO SCROLLÁVEL */}
                        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                            <div className="space-y-8 sm:px-2">
                                {/* 1. FOTO E IDENTIFICAÇÃO */}
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    <div className="shrink-0 flex flex-col items-center gap-2">
                                        <div className="w-24 h-24 rounded-[2rem] bg-gray-100 flex items-center justify-center overflow-hidden border-2 dark:border-gray-700 relative group">
                                            {form.photoUrl ? <img src={form.photoUrl} className="w-full h-full object-cover" /> : <UserCircle size={48} className="text-gray-300" />}
                                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white font-bold text-xs uppercase"><UploadCloud size={24} /><input type="file" className="hidden" onChange={handleUploadFoto} accept="image/*" /></label>
                                        </div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Foto do<br />Perfil</p>
                                    </div>
                                    <div className="flex-1 w-full space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-3 mb-1 block">Nome Completo (Obrigatório)</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white" placeholder="Ex: Anna Silva" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-3 mb-1 block">Telefone / WhatsApp</label><input type="tel" maxLength={15} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({ ...form, phone: formatarTelefone(e.target.value) })} /></div>
                                        </div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-3 mb-1 block">URL da Foto (Opcional)</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white text-xs" placeholder="Cole um link de imagem..." value={form.photoUrl} onChange={e => setForm({ ...form, photoUrl: e.target.value })} /></div>
                                    </div>
                                </div>

                                {/* 2. DADOS PESSOAIS */}
                                <section>
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><UserCircle size={16} /> Documentação Pessoal</h3>
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-[2.5rem] border dark:border-gray-800 grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-3">CPF</label><input maxLength={14} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white" value={form.cpf} onChange={e => setForm({ ...form, cpf: formatarCPF(e.target.value) })} placeholder="000.000.000-00" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-3">RG</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white" value={form.rg} onChange={e => setForm({ ...form, rg: e.target.value })} /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Data Nasc.</label><input type="date" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white" value={form.birthDate?.includes('/') ? "" : form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Estado Civil</label>
                                            <select className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.maritalStatus} onChange={e => setForm({ ...form, maritalStatus: e.target.value })}>
                                                <option value="">Selecione...</option>
                                                <option value="Solteiro(a)">Solteiro(a)</option>
                                                <option value="Casado(a)">Casado(a)</option>
                                                <option value="Divorciado(a)">Divorciado(a)</option>
                                                <option value="Viúvo(a)">Viúvo(a)</option>
                                                <option value="União Estável">União Estável</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                {/* 3. ENDEREÇO COMPLETO */}
                                <section>
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin size={16} /> Endereço Residencial</h3>
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-[2.5rem] border dark:border-gray-800 grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-3 relative"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">CEP</label><div className="relative"><input maxLength={9} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white" value={form.cep} onChange={e => handleCEPChange(e.target.value)} placeholder="00000-000" /><Search className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={18} /></div></div>
                                        <div className="md:col-span-7"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Rua / Avenida</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                                        <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Número</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} /></div>

                                        <div className="md:col-span-4"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Bairro</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white" value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} /></div>
                                        <div className="md:col-span-4"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Complemento</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white" value={form.complement} onChange={e => setForm({ ...form, complement: e.target.value })} /></div>
                                        <div className="md:col-span-4"><label className="text-[10px] font-black text-gray-400 uppercase ml-3">Cidade / UF</label><div className="flex gap-2"><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Cidade" /><input maxLength={2} className="w-20 border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white text-center uppercase" value={form.state} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })} placeholder="UF" /></div></div>
                                    </div>
                                </section>

                                {/* 4. ACESSO E SISTEMA */}
                                <section>
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldCheck size={16} /> Configurações de Acesso</h3>
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-[2.5rem] border dark:border-gray-800 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* E-MAIL PARA LOGIN - Apenas PREMIUM e MASTER */}
                                            {userPlan === "PREMIUM" || userPlan === "MASTER" ? (
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-3 mb-1 block flex items-center gap-1"><Mail size={12} /> E-mail de Login</label>
                                                    <input type="email" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white" placeholder="colaborador@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!form.id} />
                                                    <p className="text-[9px] text-gray-400 ml-3 mt-1">{form.id ? "E-mail de acesso não pode ser alterado." : "Será enviado um convite para este e-mail."}</p>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl">
                                                    <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 flex items-center gap-2"><ShieldCheck size={14} /> Plano INDIVIDUAL</p>
                                                    <p className="text-[10px] text-yellow-600 dark:text-yellow-500 mt-1">Faça upgrade para permitir login de colaboradores.</p>
                                                </div>
                                            )}

                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-3 mb-1 block">Cor na Agenda</label>
                                                <div className="flex gap-2 bg-white dark:bg-gray-900 p-3 rounded-2xl border-2 dark:border-gray-700 overflow-x-auto">
                                                    {["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#111827", "#6366f1", "#14b8a6"].map(c => (
                                                        <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`w-8 h-8 rounded-full shrink-0 border-2 transition-all ${form.color === c ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600 scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ backgroundColor: c }} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* GRID DE PERMISSÕES */}
                                        {(form.email || form.id) && (userPlan === "PREMIUM" || userPlan === "MASTER") && (
                                            <div className="animate-in fade-in slide-in-from-top-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-3 mb-3 block">Permissões de Acesso</label>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                    {[
                                                        { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
                                                        { key: 'agenda', label: 'Agenda', icon: <Calendar size={14} /> },
                                                        { key: 'listaEspera', label: 'Lista Espera', icon: <Clock size={14} /> },
                                                        { key: 'clientes', label: 'Clientes', icon: <Users size={14} /> },
                                                        { key: 'financeiro', label: 'Financeiro', icon: <BarChart3 size={14} /> },
                                                        { key: 'estoque', label: 'Estoque', icon: <Package size={14} /> },
                                                        { key: 'prontuarios', label: 'Fichas Técnicas', icon: <ClipboardList size={14} /> },
                                                        { key: 'servicos', label: 'Serviços', icon: <Briefcase size={14} /> },
                                                        { key: 'profissionais', label: 'Equipe', icon: <UserIcon size={14} /> },
                                                        { key: 'config', label: 'Configurações', icon: <Settings size={14} /> },
                                                        { key: 'mural', label: 'Mural', icon: <Megaphone size={14} /> },
                                                    ].map((perm) => (
                                                        <button
                                                            key={perm.key}
                                                            type="button"
                                                            onClick={() => setForm({
                                                                ...form,
                                                                permissions: {
                                                                    ...form.permissions,
                                                                    [perm.key]: !form.permissions[perm.key as keyof typeof form.permissions]
                                                                }
                                                            })}
                                                            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${form.permissions[perm.key as keyof typeof form.permissions]
                                                                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300 font-bold'
                                                                : 'bg-white border-gray-100 text-gray-400 dark:bg-gray-900 dark:border-gray-800'
                                                                }`}
                                                        >
                                                            {perm.icon}
                                                            <span className="text-[11px] uppercase tracking-tighter">{perm.label}</span>
                                                            {form.permissions[perm.key as keyof typeof form.permissions] && <Check size={14} className="ml-auto" />}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[9px] text-gray-400 ml-3 mt-3">* Defina o que este colaborador poderá visualizar ou alterar no sistema.</p>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3 mb-1 block">Status do Cadastro</label>
                                            <select className="w-full md:w-1/3 border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white outline-none focus:border-blue-500" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                                <option value="ATIVO">ATIVO</option>
                                                <option value="INATIVO">INATIVO (Bloqueia agendamentos)</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-8 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Observações Internas (Resumo)</label>
                                            <textarea rows={2} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Dê informações extras sobre o profissional..." />
                                            <p className="text-[9px] text-gray-400 font-black ml-4 mt-1 leading-none">* Dica: Você pode gerenciar notas rápidas diretamente na ficha do profissional.</p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* RODAPÉ FIXO */}
                        <div className="p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0">
                            <button onClick={salvarProfissional} disabled={salvando} className="w-full bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
                                {salvando ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Alterações</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}