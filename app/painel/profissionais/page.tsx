"use client";

import { useState, useEffect } from "react";
import {
    Trash2, Plus, Save, Loader2, Pencil, X, UserCircle, Phone, ShieldCheck, Check,
    Users, History, Star, Calendar, Clock, Mail, UploadCloud, Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAgenda } from "../../../contexts/AgendaContext";

// --- HELPER: MÁSCARA DE TELEFONE ---
const formatarTelefone = (value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw.length > 0 ? `(${raw}` : "";
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
};

export default function GestaoEquipe() {
    const { refreshAgenda } = useAgenda();
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [userPlan, setUserPlan] = useState<string>("INDIVIDUAL"); // Detecta o plano do usuário

    const [profissionais, setProfissionais] = useState<any[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [proSelecionado, setProSelecionado] = useState<any>(null);

    // FORMULÁRIO
    const [form, setForm] = useState({
        id: "",
        name: "",
        email: "", // NOVO CAMPO EMAIL
        phone: "",
        color: "#3b82f6",
        photoUrl: ""
    });

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
        const confirmados = pro.bookings?.filter((b: any) => b.status === "CONFIRMADO") || [];

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
        // setSalvando(true); // Opcional: mostrar loading no botão de upload
        toast.info("Enviando foto...");
        try {
            const resUpload = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
            const blob = await resUpload.json();
            if (blob.url) {
                setForm(prev => ({ ...prev, photoUrl: blob.url }));
                toast.success("Foto enviada!");
            } else {
                toast.error("Erro ao processar imagem.");
            }
        } catch (error) { toast.error("Erro no upload."); }
        // finally { setSalvando(false); }
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
            photoUrl: p.photoUrl || ""
        });
        setModalAberto(true);
    }

    function fecharModal() {
        setModalAberto(false);
        setForm({ id: "", name: "", email: "", phone: "", color: "#3b82f6", photoUrl: "" });
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
                            onClick={() => setProSelecionado(p)}
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

            {/* FICHA DO PROFISSIONAL (HORIZONTAL PRO) */}
            {proSelecionado && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-6xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

                        {/* HEADER DA FICHA */}
                        <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl overflow-hidden shrink-0" style={{ backgroundColor: proSelecionado.photoUrl ? 'transparent' : proSelecionado.color }}>
                                    {proSelecionado.photoUrl ? <img src={proSelecionado.photoUrl} alt={proSelecionado.name} className="w-full h-full object-cover" /> : proSelecionado.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black dark:text-white">{proSelecionado.name}</h2>
                                    <div className="flex gap-4 mt-1">
                                        <span className="text-blue-600 font-bold flex items-center gap-1 text-sm"><Phone size={14} /> {proSelecionado.phone || "Sem telefone"}</span>
                                        <span className="text-gray-400 font-bold flex items-center gap-1 text-sm"><Check size={14} className="text-green-500" /> Profissional Ativo</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={(e) => { setProSelecionado(null); prepararEdicao(e, proSelecionado); }} className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-gray-50 transition text-blue-600 shadow-sm"><Pencil size={20} /></button>
                                <button onClick={() => setProSelecionado(null)} className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-red-50 hover:text-red-500 transition shadow-sm"><X size={20} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-12 gap-8">

                                {/* COLUNA ESQUERDA: PERFORMANCE */}
                                <div className="col-span-12 lg:col-span-8 space-y-8">

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-800">
                                            <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Total Produzido</p>
                                            <p className="text-2xl font-black text-blue-600">R$ {calcularMetricas(proSelecionado).totalGeral.toLocaleString()}</p>
                                        </div>
                                        <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-[2rem] border border-green-100 dark:border-green-800">
                                            <p className="text-[10px] font-black text-green-400 uppercase mb-1">Comissão Acumulada</p>
                                            <p className="text-2xl font-black text-green-600">R$ {calcularMetricas(proSelecionado).totalComissao.toLocaleString()}</p>
                                        </div>
                                        <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border dark:border-gray-800">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Atendimentos</p>
                                            <p className="text-2xl font-black dark:text-white">{calcularMetricas(proSelecionado).atendimentos}</p>
                                        </div>
                                    </div>

                                    <section>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                                            <History size={16} /> Histórico de Atendimentos Realizados
                                        </h4>
                                        <div className="space-y-3">
                                            {proSelecionado.bookings?.filter((b: any) => b.status === "CONFIRMADO").length > 0 ? (
                                                proSelecionado.bookings.filter((b: any) => b.status === "CONFIRMADO").map((b: any) => (
                                                    <div key={b.id} className="p-6 bg-gray-50 dark:bg-gray-900 rounded-[2rem] flex justify-between items-center border border-transparent hover:border-blue-500 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm"><Star size={20} className="text-yellow-500" /></div>
                                                            <div>
                                                                <p className="font-black text-sm uppercase dark:text-white">{b.service?.name}</p>
                                                                <div className="flex gap-4 text-[10px] font-bold text-gray-400 uppercase mt-1">
                                                                    <span className="flex items-center gap-1"><Calendar size={12} /> {format(new Date(b.date), "dd/MM/yyyy")}</span>
                                                                    <span className="flex items-center gap-1"><Clock size={12} /> {format(new Date(b.date), "HH:mm")}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-base dark:text-white">R$ {b.service?.price}</p>
                                                            <p className="text-[10px] font-black text-green-600">COMISSÃO: R$ {(Number(b.service?.price) * Number(b.service?.commission) / 100).toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-[2rem] opacity-40 italic text-sm">
                                                    Nenhum atendimento confirmado no histórico.
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                {/* COLUNA DIREITA: DADOS TÉCNICOS */}
                                <div className="col-span-12 lg:col-span-4 space-y-6">
                                    <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800">
                                        <h4 className="font-black text-xs uppercase tracking-widest mb-6 text-gray-400">Configurações de Acesso</h4>
                                        <div className="space-y-5">
                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                                                <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Status de Login</label>
                                                <div className="flex items-center gap-2">
                                                    {proSelecionado.userId ? (
                                                        <><Check size={16} className="text-green-500" /><span className="text-sm font-bold text-green-600 uppercase">Vinculado</span></>
                                                    ) : (
                                                        <><X size={16} className="text-red-500" /><span className="text-sm font-bold text-red-500 uppercase">Aguardando Login</span></>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                                                <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">ID do Clerk (Login)</label>
                                                <code className="text-[10px] font-mono text-blue-500 break-all">{proSelecionado.userId || "PENDENTE"}</code>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { if (confirm("Deseja realmente remover?")) deletar(proSelecionado.id, proSelecionado.name); setProSelecionado(null); }}
                                            className="w-full mt-10 p-4 border-2 border-red-100 text-red-500 rounded-2xl text-xs font-black uppercase hover:bg-red-50 transition"
                                        >
                                            Excluir da Equipe
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ADICIONAR/EDITAR (CORRIGIDO) */}
            {modalAberto && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-md relative shadow-2xl border dark:border-gray-800 animate-in zoom-in-95">
                        <button onClick={fecharModal} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition"><X size={24} /></button>
                        <h2 className="text-3xl font-black mb-8 dark:text-white tracking-tighter">{form.id ? "Editar Membro" : "Novo Profissional"}</h2>

                        {/* FOTO UPLOAD */}
                        <div className="flex gap-4 items-center mb-6">
                            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border-2 dark:border-gray-700">
                                {form.photoUrl ? <img src={form.photoUrl} className="w-full h-full object-cover" /> : <UserCircle size={40} className="text-gray-300" />}
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Foto do Perfil</label>
                                <div className="flex gap-2">
                                    <input className="flex-1 border-2 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs font-bold dark:text-white outline-none" placeholder="Cole o link..." value={form.photoUrl} onChange={e => setForm({ ...form, photoUrl: e.target.value })} />
                                    <label className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-3 rounded-xl cursor-pointer transition flex items-center justify-center h-[42px] w-[42px]">
                                        <UploadCloud size={20} />
                                        <input type="file" className="hidden" onChange={handleUploadFoto} accept="image/*" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nome Completo</label>
                                <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white" placeholder="Ex: Anna Silva" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>

                            {/* E-MAIL PARA LOGIN - Apenas PREMIUM e MASTER */}
                            {userPlan === "PREMIUM" || userPlan === "MASTER" ? (
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block flex items-center gap-1"><Mail size={12} /> E-mail para Login (Obrigatório)</label>
                                    <input type="email" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white" placeholder="colaborador@gmail.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!form.id} />
                                    {form.id && <p className="text-[9px] text-gray-400 ml-2 mt-1">O e-mail não pode ser alterado após o cadastro.</p>}
                                    <p className="text-[9px] text-blue-500 ml-2 mt-1 flex items-center gap-1"><ShieldCheck size={10} /> Este profissional poderá fazer login no sistema.</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl">
                                    <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                                        <ShieldCheck size={14} />
                                        Plano INDIVIDUAL: Profissional sem acesso ao sistema
                                    </p>
                                    <p className="text-[10px] text-yellow-600 dark:text-yellow-500 mt-1">
                                        Faça upgrade para PREMIUM para permitir login de colaboradores.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">WhatsApp</label>
                                <input type="tel" maxLength={15} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({ ...form, phone: formatarTelefone(e.target.value) })} />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-3 block">Cor na Agenda</label>
                                <div className="flex justify-between px-2">
                                    {["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#111827"].map(c => (
                                        <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`w-9 h-9 rounded-full border-4 transition-all ${form.color === c ? 'border-white ring-2 ring-blue-500 scale-125 z-10' : 'border-transparent opacity-60'}`} style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                            </div>

                            <button onClick={salvarProfissional} disabled={salvando} className="w-full mt-4 bg-blue-600 text-white p-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                                {salvando ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Dados</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}