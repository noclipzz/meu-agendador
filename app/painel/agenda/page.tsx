"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay, addDays, subDays, getHours, getMinutes, isBefore, addMinutes, areIntervalsOverlapping } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUser } from "@clerk/nextjs";
import { ChevronLeft, ChevronRight, DollarSign, Building2, X, Phone, Calendar, Search, Filter, Pencil, Save, Clock, User as UserIcon, UserCircle, CheckCheck, CreditCard, Banknote, QrCode, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAgenda } from "../../../contexts/AgendaContext";

// --- HELPERS ---
// --- HELPER: MÁSCARA DE TELEFONE ---
const formatarTelefone = (value: string) => {
    const raw = (value || "").replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw.length > 0 ? `(${raw}` : "";
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
};

const calcularLayoutVisual = (agendamentos: any[]) => {
    if (!agendamentos.length) return [];
    const sorted = [...agendamentos].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const result = [];
    let cluster: any[] = [];
    let clusterEnd = 0;
    for (const ag of sorted) {
        const start = new Date(ag.date).getTime();
        const durationMs = (ag.service?.duration || 30) * 60000;
        const end = start + durationMs;
        if (cluster.length > 0 && start >= clusterEnd) {
            const count = cluster.length;
            cluster.forEach((item, index) => result.push({ ...item, _layout: { count, index } }));
            cluster = [];
            clusterEnd = 0;
        }
        cluster.push(ag);
        if (end > clusterEnd) clusterEnd = end;
    }
    if (cluster.length > 0) {
        const count = cluster.length;
        cluster.forEach((item, index) => result.push({ ...item, _layout: { count, index } }));
    }
    return result;
};

export default function PainelDashboard() {
    const { user } = useUser();
    const { refreshKey } = useAgenda();

    const [view, setView] = useState<'month' | 'week' | 'day'>('day');
    const [agendamentos, setAgendamentos] = useState<any[]>([]);
    const [profissionais, setProfissionais] = useState<any[]>([]);
    const [servicosDisponiveis, setServicosDisponiveis] = useState<any[]>([]);
    const [empresaInfo, setEmpresaInfo] = useState({ name: "...", logo: "" });
    const [loading, setLoading] = useState(true);
    const [dataAtual, setDataAtual] = useState(new Date());

    // ESTADOS DE SELEÇÃO E MODAIS
    const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [modalCheckout, setModalCheckout] = useState(false);
    const [editForm, setEditForm] = useState<any>(null);

    // ESTADO DO CHECKOUT
    const [checkoutData, setCheckoutData] = useState({
        method: "PIX",
        status: "PAGO",
        dueDate: new Date().toISOString().split('T')[0]
    });

    const [busca, setBusca] = useState("");
    const [filtroProfissional, setFiltroProfissional] = useState("todos");
    const [msgWhatsapp, setMsgWhatsapp] = useState("");
    const [agora, setAgora] = useState<Date>(new Date());
    const [metaMensal, setMetaMensal] = useState(5000);

    useEffect(() => {
        const intervalo = setInterval(() => setAgora(new Date()), 60000);
        return () => clearInterval(intervalo);
    }, []);

    async function carregarDados() {
        try {
            const [resAgenda, resConfig, resPro, resServ] = await Promise.all([
                fetch('/api/painel'), fetch('/api/painel/config'), fetch('/api/painel/profissionais'), fetch('/api/painel/servicos')
            ]);
            const dadosAgenda = await resAgenda.json();
            if (Array.isArray(dadosAgenda)) setAgendamentos(dadosAgenda);
            const dadosConfig = await resConfig.json();
            if (dadosConfig) {
                setMetaMensal(Number(dadosConfig.monthlyGoal) || 5000);
                setEmpresaInfo({ name: dadosConfig.name || "Minha Empresa", logo: dadosConfig.logoUrl || "" });
                setMsgWhatsapp(dadosConfig.whatsappMessage || "");
            }
            const dadosPro = await resPro.json();
            if (Array.isArray(dadosPro)) setProfissionais(dadosPro);
            const dadosServ = await resServ.json();
            if (Array.isArray(dadosServ)) setServicosDisponiveis(dadosServ);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    }

    useEffect(() => { carregarDados(); }, [refreshKey]);

    // POLLING (Atualização Automática)
    useEffect(() => {
        const intervaloSincronia = setInterval(() => {
            if (!isEditing && !modalCheckout && !agendamentoSelecionado) {
                carregarDados();
            }
        }, 10000);

        return () => clearInterval(intervaloSincronia);
    }, [isEditing, modalCheckout, agendamentoSelecionado]);

    function verificarConflito(novoAgendamento: any): boolean {
        const inicioNovo = new Date(novoAgendamento.date);
        const servico = servicosDisponiveis.find(s => s.id === novoAgendamento.serviceId);
        if (!servico) return false;

        const fimNovo = addMinutes(inicioNovo, servico.duration);

        const conflitos = agendamentos.filter(ag => {
            if (ag.id === novoAgendamento.id) return false;
            if (ag.professionalId !== novoAgendamento.professionalId) return false;
            if (ag.status === "CANCELADO") return false;

            const inicioExistente = new Date(ag.date);
            const fimExistente = addMinutes(inicioExistente, ag.service?.duration || 30);

            return areIntervalsOverlapping(
                { start: inicioNovo, end: fimNovo },
                { start: inicioExistente, end: fimExistente }
            );
        });

        if (conflitos.length > 0) {
            const conflito = conflitos[0];
            toast.error(`Choque de horário! ${conflito.customerName} já está agendado neste período.`);
            return true;
        }
        return false;
    }

    async function finalizarCheckout() {
        if (!agendamentoSelecionado.clientId) {
            return toast.error("Vincule este agendamento a um cliente fixo para gerar a fatura.");
        }
        setLoading(true);
        try {
            const res = await fetch('/api/financeiro/faturas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: agendamentoSelecionado.clientId,
                    companyId: agendamentoSelecionado.companyId,
                    bookingId: agendamentoSelecionado.id,
                    description: `Serviço: ${agendamentoSelecionado.service?.name}`,
                    value: agendamentoSelecionado.service?.price,
                    ...checkoutData
                })
            });
            if (res.ok) {
                toast.success("Atendimento Concluído!");
                setModalCheckout(false);
                setAgendamentoSelecionado(null);
                carregarDados();
            }
        } catch (error) { toast.error("Erro no checkout."); }
        finally { setLoading(false); }
    }

    async function confirmarAgendamentoManual(id: string) {
        try {
            const res = await fetch('/api/agendar/confirmar', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) { toast.success("Confirmado!"); setAgendamentoSelecionado(null); carregarDados(); }
        } catch (e) { toast.error("Erro."); }
    }

    function iniciarEdicao() {
        const data = new Date(agendamentoSelecionado.date);
        setEditForm({
            id: agendamentoSelecionado.id,
            customerName: agendamentoSelecionado.customerName,
            customerPhone: agendamentoSelecionado.customerPhone,
            serviceId: agendamentoSelecionado.serviceId,
            professionalId: agendamentoSelecionado.professionalId,
            dataPura: format(data, "yyyy-MM-dd"),
            horaPura: format(data, "HH:mm")
        });
        setIsEditing(true);
    }

    async function salvarAlteracoesAgendamento() {
        try {
            const novaData = new Date(`${editForm.dataPura}T${editForm.horaPura}:00`);
            if (isBefore(novaData, new Date())) return toast.error("Não é possível agendar para o passado!");

            const temConflito = verificarConflito({
                id: editForm.id,
                date: novaData,
                serviceId: editForm.serviceId,
                professionalId: editForm.professionalId
            });

            if (temConflito) return;

            const res = await fetch('/api/painel', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...editForm, date: novaData.toISOString() })
            });
            if (res.ok) { toast.success("Atualizado!"); setIsEditing(false); setAgendamentoSelecionado(null); carregarDados(); }
        } catch (error) { toast.error("Erro."); }
    }

    async function cancelar(id: string, nome: string) {
        toast(`Remover agendamento de ${nome}?`, {
            action: {
                label: "Confirmar", onClick: async () => {
                    const res = await fetch('/api/painel', { method: 'DELETE', body: JSON.stringify({ id }) });
                    if (res.ok) { setAgendamentos(prev => prev.filter(i => i.id !== id)); setAgendamentoSelecionado(null); toast.success("Removido!"); }
                }
            }
        });
    }

    const getWhatsappLink = (ag: any) => {
        if (!ag) return "#";
        const numero = ag.customerPhone?.replace(/\D/g, '');
        const data = new Date(ag.date);
        let textoFinal = (msgWhatsapp || "Olá {nome}, seu agendamento está confirmado!")
            .replace("{nome}", ag.customerName || "").replace("{dia}", format(data, "dd/MM")).replace("{hora}", format(data, "HH:mm")).replace("{servico}", ag.service?.name || "");
        return `https://wa.me/55${numero}?text=${encodeURIComponent(textoFinal)}`;
    }

    const agendamentosFiltrados = agendamentos.filter(ag => {
        const termo = busca.toLowerCase();
        const matchTexto = ag.customerName?.toLowerCase().includes(termo) || ag.service?.name?.toLowerCase().includes(termo);
        const matchProfissional = filtroProfissional === "todos" || ag.professionalId === filtroProfissional;
        return matchTexto && matchProfissional;
    });

    const navegar = (direcao: number) => {
        if (view === 'month') setDataAtual(addMonths(dataAtual, direcao));
        else if (view === 'week') setDataAtual(addDays(dataAtual, direcao * 7));
        else setDataAtual(addDays(dataAtual, direcao));
    };

    // --- CORREÇÃO AQUI: Faturamento só soma se status for CONCLUIDO ---
    const faturamentoTotal = agendamentosFiltrados
        .filter(a => isSameMonth(new Date(a.date), dataAtual) && a.status === "CONCLUIDO")
        .reduce((acc, item) => acc + Number(item.service?.price || 0), 0);

    const porcentagemMeta = metaMensal > 0 ? Math.min(100, Math.round((faturamentoTotal / metaMensal) * 100)) : 0;

    const renderGrid = (dias: Date[]) => (
        <div className="grid grid-cols-7 bg-gray-200 dark:bg-gray-700 gap-px h-full overflow-y-auto">
            {dias.map((dia) => {
                const ags = agendamentosFiltrados.filter(a => isSameDay(new Date(a.date), dia));
                // Faturamento do dia também só soma se CONCLUIDO
                const faturamentoDia = ags
                    .filter(a => a.status === "CONCLUIDO")
                    .reduce((acc, i) => acc + Number(i.service?.price || 0), 0);

                const ehMes = isSameMonth(dia, dataAtual);
                const diaSemanaCurto = format(dia, 'EEE', { locale: ptBR }).replace('.', '').toUpperCase();
                return (
                    <div key={dia.toString()} onClick={() => { setDataAtual(dia); setView('day'); }} className={`bg-white dark:bg-gray-800 p-1.5 h-[150px] flex flex-col cursor-pointer hover:bg-gray-50 transition ${!ehMes && 'opacity-30'}`}>
                        <div className="flex justify-between items-center mb-1 border-b dark:border-gray-700 pb-1 flex-shrink-0">
                            <div className="flex items-center gap-1"><span className="text-[9px] font-black text-gray-400">{diaSemanaCurto}</span><span className={`text-xs font-bold flex items-center justify-center rounded-full w-5 h-5 ${isSameDay(dia, new Date()) ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-200'}`}>{format(dia, 'd')}</span></div>
                            {faturamentoDia > 0 && <span className="text-[9px] font-black text-green-600 bg-green-50 px-1 rounded">R${faturamentoDia}</span>}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
                            {ags.map(ag => {
                                const pro = profissionais.find(p => p.id === ag.professionalId);
                                const isConcluido = ag.status === "CONCLUIDO";
                                return (
                                    <div key={ag.id} className={`text-[9px] px-1 py-0.5 rounded truncate text-white font-bold leading-tight flex items-center gap-0.5 ${ag.status === "CONFIRMADO" ? 'opacity-100' : 'opacity-60'}`} style={{ backgroundColor: pro?.color || '#3b82f6' }}>
                                        {ag.status === "CONFIRMADO" && <CheckCheck size={10} />}
                                        {isConcluido && <CheckCircle2 size={10} className="text-green-300" />}
                                        {format(new Date(ag.date), "HH:mm")} {ag.customerName}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderDia = () => {
        const horas = Array.from({ length: 24 }, (_, i) => i);
        const PIXELS_POR_HORA = 80;
        const agsDoDia = agendamentosFiltrados.filter(a => isSameDay(new Date(a.date), dataAtual));
        const agsProcessados = calcularLayoutVisual(agsDoDia);
        const isToday = isSameDay(dataAtual, new Date());
        // Cálculo corrigido da linha do tempo
        const topLinha = (getHours(agora) * 60 + getMinutes(agora)) / 60 * PIXELS_POR_HORA;

        return (
            <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-800 font-sans relative">
                <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                    {horas.map(h => (
                        <div key={h} className="flex border-b dark:border-gray-700 h-[80px]">
                            <div className="w-16 text-xs text-gray-400 text-right pr-4 pt-2 -mt-2.5 sticky left-0 z-10">{h.toString().padStart(2, '0')}:00</div>
                            <div className="flex-1 border-r dark:border-gray-700 relative"><div className="absolute top-1/2 left-0 right-0 border-t border-dashed dark:border-gray-800 opacity-30"></div></div>
                        </div>
                    ))}

                    {isToday && (
                        <div className="absolute left-16 right-0 z-30 flex items-center pointer-events-none" style={{ top: `${topLinha}px` }}>
                            <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 shadow-sm"></div>
                            <div className="h-[2px] w-full bg-red-500 shadow-sm opacity-80"></div>
                        </div>
                    )}

                    {agsProcessados.map(ag => {
                        const data = new Date(ag.date);
                        const pro = profissionais.find(p => p.id === ag.professionalId);
                        const top = (getHours(data) * 60 + getMinutes(data)) / 60 * PIXELS_POR_HORA;
                        const height = (ag.service?.duration / 60 * PIXELS_POR_HORA) || 40;
                        const { count, index } = ag._layout;
                        const isConfirmado = ag.status === "CONFIRMADO";
                        const isConcluido = ag.status === "CONCLUIDO";

                        return (
                            <button key={ag.id} onClick={() => { setAgendamentoSelecionado(ag); setIsEditing(false); }}
                                className={`absolute rounded-xl text-left text-white shadow-md transition-all border-l-[6px] flex flex-col justify-center overflow-hidden px-3
                                ${isConcluido ? 'opacity-50 grayscale' : isConfirmado ? 'opacity-100 scale-100' : 'opacity-75 hover:opacity-100'} 
                            `}
                                style={{
                                    top: `${top}px`, height: `${height}px`, backgroundColor: pro?.color || '#3b82f6',
                                    borderColor: 'rgba(0,0,0,0.1)',
                                    width: `calc((100% - 4rem) * ${100 / count / 100})`,
                                    left: `calc(4rem + ((100% - 4rem) * ${(index * (100 / count)) / 100}))`,
                                }}>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-black text-[11px] flex items-center gap-1">
                                        {format(data, "HH:mm")}
                                        {isConcluido ? <CheckCircle2 size={14} /> : isConfirmado ? <CheckCheck size={14} className="text-green-300" /> : <Clock size={12} className="text-white/60" />}
                                    </span>
                                    <div className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-black/10 text-white">{ag.status}</div>
                                </div>
                                <span className="font-bold text-[12px] truncate uppercase tracking-tighter mt-1">{ag.customerName}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    let tituloCalendario = "";
    let diasParaMostrar: Date[] = [];
    if (view === 'month') {
        tituloCalendario = format(dataAtual, "MMMM yyyy", { locale: ptBR });
        diasParaMostrar = eachDayOfInterval({ start: startOfWeek(startOfMonth(dataAtual)), end: endOfWeek(endOfMonth(dataAtual)) });
    } else if (view === 'week') {
        tituloCalendario = `Semana de ${format(startOfWeek(dataAtual), "dd/MM")}`;
        diasParaMostrar = eachDayOfInterval({ start: startOfWeek(dataAtual), end: endOfWeek(dataAtual) });
    } else {
        tituloCalendario = format(dataAtual, "dd 'de' MMMM", { locale: ptBR });
    }

    if (loading) return <div className="p-20 text-center text-gray-400 font-bold animate-pulse">Sincronizando Agenda...</div>;

    return (
        <div className="h-screen flex flex-col p-4 gap-4 overflow-hidden text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 font-sans">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row gap-4 h-auto flex-shrink-0">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 flex items-center gap-3 flex-1 shadow-sm">
                    <div className="w-12 h-12 rounded-full border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                        {empresaInfo.logo ? <img src={empresaInfo.logo} className="w-full h-full object-cover" /> : <Building2 className="text-gray-400" size={24} />}
                    </div>
                    <div className="flex-1"><h1 className="text-lg font-bold leading-tight">{empresaInfo.name}</h1><p className="text-xs text-gray-500">Olá, {user?.firstName}</p></div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 flex-1 shadow-sm flex flex-col justify-center">
                    <p className="text-xs text-gray-500 uppercase font-bold">Faturamento Mensal</p>
                    <div className="flex items-center gap-2"><DollarSign size={20} className="text-green-500" /><span className="text-2xl font-bold">R$ {faturamentoTotal}</span></div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 flex-1 shadow-sm">
                    <div className="flex justify-between items-center mb-1"><p className="text-xs text-gray-500 uppercase font-bold">Meta</p><span className="text-xs font-bold text-blue-600">{porcentagemMeta}%</span></div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${porcentagemMeta}%` }}></div></div>
                    <p className="text-xs text-gray-400 text-right">de R$ {metaMensal}</p>
                </div>
            </div>

            {/* FILTROS */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700 shadow-sm w-full md:w-auto">
                    {['month', 'week', 'day'].map((v) => (
                        <button key={v} onClick={() => setView(v as any)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition capitalize ${view === v ? 'bg-blue-100 text-blue-700 dark:bg-blue-900' : 'text-gray-500'}`}>
                            {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="flex items-center bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-3 py-1.5 flex-1 shadow-sm">
                        <Search size={16} className="text-gray-400 mr-2" /><input type="text" placeholder="Buscar cliente..." className="bg-transparent outline-none text-sm w-full" value={busca} onChange={(e) => setBusca(e.target.value)} />
                    </div>
                    <select className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-2 text-sm shadow-sm outline-none font-bold" value={filtroProfissional} onChange={(e) => setFiltroProfissional(e.target.value)}>
                        <option value="todos">Todos Profissionais</option>
                        {profissionais.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>

            {/* ÁREA DA AGENDA */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 flex flex-col flex-1 overflow-hidden shadow-sm">
                <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center gap-2 mx-auto">
                        <button onClick={() => navegar(-1)} className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-md transition"><ChevronLeft size={18} /></button>
                        <span className="text-sm font-bold capitalize w-40 text-center">{tituloCalendario}</span>
                        <button onClick={() => navegar(1)} className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-md transition"><ChevronRight size={18} /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">{view === 'day' ? renderDia() : renderGrid(diasParaMostrar)}</div>
            </div>

            {/* MODAL DETALHES / EDITAR */}
            {agendamentoSelecionado && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-lg relative">
                        <button onClick={() => setAgendamentoSelecionado(null)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition"><X /></button>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500"><Calendar size={32} /></div>
                                <div>
                                    {isEditing ? (
                                        <div className="space-y-2 w-full">
                                            <input className="text-2xl font-bold bg-gray-100 dark:bg-gray-800 p-1 rounded w-full outline-blue-500" value={editForm.customerName} onChange={e => setEditForm({ ...editForm, customerName: e.target.value })} placeholder="Nome" />
                                            <input className="text-lg font-bold bg-gray-100 dark:bg-gray-800 p-1 rounded w-full outline-blue-500" value={editForm.customerPhone} onChange={e => setEditForm({ ...editForm, customerPhone: formatarTelefone(e.target.value) })} placeholder="(00) 00000-0000" />
                                        </div>
                                    ) : (
                                        <>
                                            <h2 className="text-2xl font-bold dark:text-white">{agendamentoSelecionado.customerName}</h2>
                                            <p className="text-gray-500 text-sm font-bold flex items-center gap-1"><Phone size={12} /> {agendamentoSelecionado.customerPhone || "N/A"}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            {!isEditing && <button onClick={iniciarEdicao} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-blue-600 transition"><Pencil size={20} /></button>}
                        </div>
                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700">
                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-widest">Serviço</p>
                                {isEditing ? <select className="w-full bg-white dark:bg-gray-900 p-2 rounded border outline-none" value={editForm.serviceId} onChange={e => setEditForm({ ...editForm, serviceId: e.target.value })}>{servicosDisponiveis.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select> : <p className="font-bold dark:text-gray-200">{agendamentoSelecionado.service?.name || 'Evento'}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-widest">Data</p>
                                    {isEditing ? <input type="date" min={format(new Date(), "yyyy-MM-dd")} className="w-full bg-white dark:bg-gray-900 p-1 rounded outline-none" value={editForm.dataPura} onChange={e => setEditForm({ ...editForm, dataPura: e.target.value })} /> : <p className="font-bold dark:text-gray-200">{format(new Date(agendamentoSelecionado.date), "dd/MM/yyyy")}</p>}
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-widest">Horário</p>
                                    {isEditing ? <input type="time" className="w-full bg-white dark:bg-gray-900 p-1 rounded outline-none" value={editForm.horaPura} onChange={e => setEditForm({ ...editForm, horaPura: e.target.value })} /> : <p className="font-bold dark:text-gray-200">{format(new Date(agendamentoSelecionado.date), "HH:mm")}h</p>}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700">
                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-widest">Profissional</p>
                                {isEditing ? <select className="w-full bg-white dark:bg-gray-900 p-2 rounded border outline-none" value={editForm.professionalId} onChange={e => setEditForm({ ...editForm, professionalId: e.target.value })}>{profissionais.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select> : <p className="font-bold dark:text-gray-200">{profissionais.find(p => p.id === agendamentoSelecionado.professionalId)?.name || 'N/A'}</p>}
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col gap-2">
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 font-bold py-3 rounded-xl hover:bg-gray-200 transition">Cancelar</button>
                                    <button onClick={salvarAlteracoesAgendamento} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"><Save size={18} /> Salvar</button>
                                </div>
                            ) : (
                                <>
                                    {agendamentoSelecionado.status === "CONFIRMADO" && (
                                        <button onClick={() => setModalCheckout(true)} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl mb-2 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95"><CheckCircle2 size={20} /> Concluir Atendimento e Cobrar</button>
                                    )}

                                    {agendamentoSelecionado.status === "PENDENTE" && (
                                        <button onClick={() => confirmarAgendamentoManual(agendamentoSelecionado.id)} className="w-full bg-blue-100 text-blue-700 font-black py-3 rounded-xl hover:bg-blue-200 transition mb-2">Marcar como Confirmado</button>
                                    )}

                                    <div className="flex gap-2">
                                        <a href={getWhatsappLink(agendamentoSelecionado)} target="_blank" className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-green-500/20 hover:bg-green-600 transition font-black"><Phone size={18} /> WhatsApp</a>
                                        <button onClick={() => cancelar(agendamentoSelecionado.id, agendamentoSelecionado.customerName)} className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition">Cancelar</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CHECKOUT FINANCEIRO */}
            {modalCheckout && agendamentoSelecionado && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-md relative shadow-2xl border dark:border-gray-800">
                        <button onClick={() => setModalCheckout(false)} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition"><X size={24} /></button>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><DollarSign size={32} /></div>
                            <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Fechar Conta</h2>
                            <p className="text-gray-500 text-sm font-bold">{agendamentoSelecionado.customerName}</p>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[2rem] text-center border-2 border-dashed dark:border-gray-700">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor do Serviço</p>
                                <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">R$ {Number(agendamentoSelecionado.service?.price || 0).toLocaleString()}</h3>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Forma de Pagamento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[{ id: 'PIX', icon: <QrCode size={16} /> }, { id: 'CARTAO', icon: <CreditCard size={16} /> }, { id: 'DINHEIRO', icon: <Banknote size={16} /> }, { id: 'FATURADO', icon: <Clock size={16} /> }].map(m => (
                                        <button key={m.id} onClick={() => setCheckoutData({ ...checkoutData, method: m.id, status: m.id === 'FATURADO' ? 'PENDENTE' : 'PAGO' })} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-black text-xs transition ${checkoutData.method === m.id ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 dark:border-gray-800 text-gray-500'}`}>{m.icon} {m.id}</button>
                                    ))}
                                </div>
                                {checkoutData.method === 'FATURADO' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Vencimento</label>
                                        <input type="date" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl dark:bg-gray-800 font-bold dark:text-white" value={checkoutData.dueDate} onChange={e => setCheckoutData({ ...checkoutData, dueDate: e.target.value })} />
                                    </div>
                                )}
                            </div>
                            <button onClick={finalizarCheckout} disabled={loading} className="w-full bg-green-600 text-white p-5 rounded-[2rem] font-black text-lg shadow-xl shadow-green-500/20 hover:bg-green-700 transition flex items-center justify-center gap-2 active:scale-95">{loading ? <Loader2 className="animate-spin" /> : "Finalizar e Receber"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}