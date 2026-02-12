"use client";

import { useState, useEffect } from "react";
import {
    DollarSign,
    TrendingUp,
    CreditCard,
    Loader2,
    ExternalLink,
    AlertTriangle,
    CheckCircle2,
    Search,
    UserPlus,
    Clock,
    Send,
    X,
    ChevronDown,
    Sparkles,
    Shield,
    Crown,
    Zap,
    CalendarDays,
    BadgeCheck
} from "lucide-react";
import { toast } from "sonner";

const PLANOS = [
    { value: "INDIVIDUAL", label: "Individual", preco: "R$ 35/mês", cor: "blue", icon: <Zap size={18} /> },
    { value: "PREMIUM", label: "Premium", preco: "R$ 65/mês", cor: "purple", icon: <Crown size={18} /> },
    { value: "MASTER", label: "Master", preco: "R$ 99/mês", cor: "yellow", icon: <Shield size={18} /> },
    { value: "MANUAL", label: "Manual", preco: "Personalizado", cor: "gray", icon: <Sparkles size={18} /> },
];

const PERIODOS = [
    { dias: 30, label: "1 Mês" },
    { dias: 90, label: "3 Meses" },
    { dias: 180, label: "6 Meses" },
    { dias: 365, label: "1 Ano" },
];

export default function MasterAssinaturas() {
    const [dados, setDados] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Estado do modal de adicionar assinatura
    const [modalOpen, setModalOpen] = useState(false);
    const [userIdInput, setUserIdInput] = useState("");
    const [planoSelecionado, setPlanoSelecionado] = useState("INDIVIDUAL");
    const [diasSelecionados, setDiasSelecionados] = useState(30);
    const [diasCustom, setDiasCustom] = useState("");
    const [usandoCustom, setUsandoCustom] = useState(false);
    const [buscando, setBuscando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [resultado, setResultado] = useState<any>(null);
    const [erro, setErro] = useState("");

    useEffect(() => {
        carregarDados();
    }, []);

    async function carregarDados() {
        try {
            const res = await fetch('/api/master');
            const data = await res.json();
            setDados(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // Buscar info de um userId
    async function buscarUsuario() {
        if (!userIdInput.trim()) {
            setErro("Digite o User ID do Clerk");
            return;
        }

        setBuscando(true);
        setErro("");
        setUserInfo(null);
        setResultado(null);

        try {
            const res = await fetch(`/api/master/assinaturas?userId=${encodeURIComponent(userIdInput.trim())}`);
            const data = await res.json();

            if (res.ok) {
                setUserInfo(data);
            } else {
                setErro(data.error || "Erro ao buscar usuário");
            }
        } catch {
            setErro("Erro de conexão ao buscar usuário");
        } finally {
            setBuscando(false);
        }
    }

    // Criar/atualizar assinatura
    async function criarAssinatura() {
        const dias = usandoCustom ? parseInt(diasCustom) : diasSelecionados;

        if (!dias || dias < 1 || dias > 365) {
            toast.error("A duração deve ser entre 1 e 365 dias.");
            setErro("Dias deve ser entre 1 e 365");
            return;
        }

        console.log("🚀 Enviando assinatura...", { targetUserId: userIdInput, plano: planoSelecionado, dias });
        const toastId = toast.loading("Processando assinatura...");

        setEnviando(true);
        setErro("");
        setResultado(null);

        try {
            const res = await fetch('/api/master/assinaturas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId: userIdInput.trim(),
                    plano: planoSelecionado,
                    diasAdicionais: dias,
                }),
            });

            console.log("📡 Resposta Status:", res.status);
            const data = await res.json();
            console.log("📦 Dados recebidos:", data);

            if (res.ok) {
                toast.success(data.message || "Assinatura ativada com sucesso!", { id: toastId });
                setResultado(data);
                // Recarrega dados da página
                carregarDados();
                // Busca info atualizada do user para mostrar no modal
                if (userIdInput.trim()) {
                    buscarUsuario();
                }
            } else {
                const msg = data.error || "Erro ao criar assinatura";
                toast.error(msg, { id: toastId });
                setErro(msg);
                console.error("❌ Erro API:", data);
            }
        } catch (error) {
            console.error("❌ Erro Fetch:", error);
            toast.error("Erro de conexão. Verifique o console.", { id: toastId });
            setErro("Erro de conexão. Verifique o console.");
        } finally {
            setEnviando(false);
        }
    }

    function fecharModal() {
        setModalOpen(false);
        setUserIdInput("");
        setUserInfo(null);
        setResultado(null);
        setErro("");
        setPlanoSelecionado("INDIVIDUAL");
        setDiasSelecionados(30);
        setDiasCustom("");
        setUsandoCustom(false);
    }

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    const { metricas, distribuicaoPorPlano, empresas } = dados;

    const assinaturasAtivas = empresas.filter((e: any) => e.status === 'ACTIVE');
    const assinaturasInativas = empresas.filter((e: any) => e.status === 'INACTIVE');

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2">Gestão Financeira</h1>
                    <p className="text-gray-400">Visão completa de receitas e assinaturas</p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-green-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <UserPlus size={20} />
                    Adicionar Assinatura
                </button>
            </div>

            {/* MÉTRICAS FINANCEIRAS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-3xl shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <DollarSign className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-green-100 text-xs font-bold">MRR Total</p>
                            <p className="text-green-100 text-xs opacity-60">Monthly Recurring Revenue</p>
                        </div>
                    </div>
                    <h3 className="text-4xl font-black text-white">R$ {metricas.mrr.toFixed(2)}</h3>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-3xl shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <TrendingUp className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-blue-100 text-xs font-bold">ARR Projetado</p>
                            <p className="text-blue-100 text-xs opacity-60">Annual Recurring Revenue</p>
                        </div>
                    </div>
                    <h3 className="text-4xl font-black text-white">R$ {metricas.arr.toFixed(2)}</h3>
                </div>

                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 className="text-green-500" size={24} />
                        <div>
                            <p className="text-gray-400 text-xs font-bold">Assinaturas Ativas</p>
                        </div>
                    </div>
                    <h3 className="text-4xl font-black text-white">{metricas.empresasAtivas}</h3>
                    <p className="text-xs text-gray-500 mt-2">{metricas.taxaAtivacao}% do total</p>
                </div>

                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <CreditCard className="text-purple-500" size={24} />
                        <div>
                            <p className="text-gray-400 text-xs font-bold">Ticket Médio</p>
                        </div>
                    </div>
                    <h3 className="text-4xl font-black text-white">R$ {metricas.ticketMedio.toFixed(2)}</h3>
                    <p className="text-xs text-gray-500 mt-2">Por cliente ativo</p>
                </div>
            </div>

            {/* DISTRIBUIÇÃO POR PLANO */}
            <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700">
                <h2 className="text-2xl font-black text-white mb-6">Receita por Plano</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(distribuicaoPorPlano).map(([plano, data]: [string, any]) => {
                        const percentualClientes = (data.count / metricas.totalEmpresas) * 100;
                        const percentualMRR = metricas.mrr > 0 ? (data.mrr / metricas.mrr) * 100 : 0;

                        const cores: any = {
                            INDIVIDUAL: { bg: 'from-blue-600 to-blue-700', text: 'blue' },
                            PREMIUM: { bg: 'from-purple-600 to-purple-700', text: 'purple' },
                            MASTER: { bg: 'from-yellow-600 to-yellow-700', text: 'yellow' },
                        };
                        const cor = cores[plano] || { bg: 'from-gray-600 to-gray-700', text: 'gray' };

                        return (
                            <div key={plano} className={`bg-gradient-to-br ${cor.bg} p-6 rounded-2xl shadow-lg`}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-2xl font-black text-white">{plano}</h3>
                                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold text-white">
                                        {percentualMRR.toFixed(0)}% MRR
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-white/70 mb-1">Clientes</p>
                                        <p className="text-3xl font-black text-white">{data.count}</p>
                                        <p className="text-xs text-white/70">{percentualClientes.toFixed(1)}% do total</p>
                                    </div>
                                    <div className="pt-3 border-t border-white/10">
                                        <p className="text-xs text-white/70 mb-1">Receita Mensal</p>
                                        <p className="text-2xl font-black text-white">R$ {data.mrr.toFixed(2)}</p>
                                    </div>
                                    <div className="pt-3 border-t border-white/10">
                                        <p className="text-xs text-white/70 mb-1">Projeção Anual</p>
                                        <p className="text-xl font-black text-white">R$ {(data.mrr * 12).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* LISTA DE ASSINATURAS ATIVAS */}
            <div className="bg-gray-800 rounded-3xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-2xl font-black text-white">Assinaturas Ativas ({assinaturasAtivas.length})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-900">
                            <tr>
                                <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Cliente</th>
                                <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Plano</th>
                                <th className="text-right p-4 text-xs font-black text-gray-400 uppercase">Valor Mensal</th>
                                <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Próximo Vencimento</th>
                                <th className="text-center p-4 text-xs font-black text-gray-400 uppercase">Stripe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assinaturasAtivas.map((emp: any) => {
                                const diasRestantes = emp.expiresAt
                                    ? Math.ceil((new Date(emp.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                    : null;

                                return (
                                    <tr key={emp.id} className="border-t border-gray-700 hover:bg-gray-900/50">
                                        <td className="p-4">
                                            <p className="font-bold text-white">{emp.name}</p>
                                            <p className="text-xs text-gray-500">{emp.slug}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${emp.plano === 'MASTER' ? 'bg-yellow-600/20 text-yellow-400' :
                                                emp.plano === 'PREMIUM' ? 'bg-purple-600/20 text-purple-400' :
                                                    emp.plano === 'MANUAL' ? 'bg-gray-600/20 text-gray-400' :
                                                        'bg-blue-600/20 text-blue-400'
                                                }`}>
                                                {emp.plano}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="font-bold text-green-400">R$ {emp.valor.toFixed(2)}</p>
                                        </td>
                                        <td className="p-4">
                                            {emp.expiresAt ? (
                                                <div>
                                                    <p className="text-white text-sm">
                                                        {new Date(emp.expiresAt).toLocaleDateString('pt-BR')}
                                                    </p>
                                                    <p className={`text-xs ${diasRestantes && diasRestantes < 7
                                                        ? 'text-red-400'
                                                        : 'text-gray-500'
                                                        }`}>
                                                        {diasRestantes !== null && `${diasRestantes} dias`}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {emp.stripeCustomerId ? (
                                                <a
                                                    href={`https://dashboard.stripe.com/customers/${emp.stripeCustomerId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                                                >
                                                    Ver <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <span className="text-gray-600 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ASSINATURAS INATIVAS */}
            {assinaturasInativas.length > 0 && (
                <div className="bg-gray-800 rounded-3xl border border-red-900/50 overflow-hidden">
                    <div className="p-6 border-b border-gray-700 flex items-center gap-3">
                        <AlertTriangle className="text-red-500" />
                        <h2 className="text-2xl font-black text-white">Assinaturas Inativas ({assinaturasInativas.length})</h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {assinaturasInativas.map((emp: any) => (
                                <div key={emp.id} className="bg-red-900/10 border border-red-900/30 p-4 rounded-2xl">
                                    <p className="font-bold text-white mb-1">{emp.name}</p>
                                    <p className="text-xs text-gray-500 mb-2">{emp.slug}</p>
                                    <span className="text-xs bg-red-600/20 text-red-400 px-2 py-1 rounded">
                                        {emp.plano || 'SEM PLANO'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* LINK PARA STRIPE */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-3xl shadow-xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-white mb-2">Gerenciar no Stripe</h3>
                        <p className="text-white/80 text-sm">Acesse o dashboard do Stripe para ver transações detalhadas</p>
                    </div>
                    <a
                        href="https://dashboard.stripe.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-purple-600 px-6 py-3 rounded-2xl font-bold hover:bg-gray-100 transition flex items-center gap-2"
                    >
                        Abrir Stripe <ExternalLink size={16} />
                    </a>
                </div>
            </div>

            {/* ============ MODAL ADICIONAR ASSINATURA ============ */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={fecharModal}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Header */}
                        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 rounded-t-3xl flex justify-between items-center z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                    <UserPlus size={22} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white">Adicionar Assinatura</h2>
                                    <p className="text-xs text-gray-500">Ativar plano manualmente por User ID</p>
                                </div>
                            </div>
                            <button
                                onClick={fecharModal}
                                className="p-2 hover:bg-gray-800 rounded-xl transition"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* STEP 1: User ID */}
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">
                                    <span className="flex items-center gap-2">
                                        <Search size={14} />
                                        Clerk User ID
                                    </span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={userIdInput}
                                        onChange={(e) => setUserIdInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && buscarUsuario()}
                                        placeholder="user_xxxxxxxxxxxxx"
                                        className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    />
                                    <button
                                        onClick={buscarUsuario}
                                        disabled={buscando}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold text-sm transition flex items-center gap-2"
                                    >
                                        {buscando ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Search size={16} />
                                        )}
                                        Buscar
                                    </button>
                                </div>
                            </div>

                            {/* Info do Usuário encontrado */}
                            {userInfo && (
                                <div className={`border rounded-2xl p-4 ${userInfo.found ? 'bg-blue-950/30 border-blue-800' : 'bg-gray-800 border-gray-600'}`}>
                                    {userInfo.company ? (
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <BadgeCheck size={18} className="text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-sm">{userInfo.company.name}</p>
                                                <p className="text-xs text-gray-500 font-mono">/{userInfo.company.slug}</p>
                                                {userInfo.subscription && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${userInfo.subscription.status === 'ACTIVE'
                                                            ? 'bg-green-600/20 text-green-400'
                                                            : 'bg-red-600/20 text-red-400'
                                                            }`}>
                                                            {userInfo.subscription.status}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 font-bold">
                                                            {userInfo.subscription.plan || 'SEM PLANO'}
                                                        </span>
                                                        {userInfo.subscription.expiresAt && (
                                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                <CalendarDays size={12} />
                                                                Vence: {new Date(userInfo.subscription.expiresAt).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle size={18} className="text-yellow-500" />
                                            <div>
                                                <p className="text-sm text-yellow-400 font-bold">Nenhuma empresa encontrada</p>
                                                <p className="text-xs text-gray-500">Este userId não possui empresa cadastrada, mas a assinatura será criada normalmente.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 2: Selecionar Plano */}
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-3">
                                    <span className="flex items-center gap-2">
                                        <CreditCard size={14} />
                                        Selecionar Plano
                                    </span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {PLANOS.map((plano) => {
                                        const selected = planoSelecionado === plano.value;
                                        const borderColor = selected
                                            ? plano.cor === 'blue' ? 'border-blue-500 ring-2 ring-blue-500/30'
                                                : plano.cor === 'purple' ? 'border-purple-500 ring-2 ring-purple-500/30'
                                                    : plano.cor === 'yellow' ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                                                        : 'border-gray-500 ring-2 ring-gray-500/30'
                                            : 'border-gray-700 hover:border-gray-600';

                                        const bgColor = selected
                                            ? plano.cor === 'blue' ? 'bg-blue-950/40'
                                                : plano.cor === 'purple' ? 'bg-purple-950/40'
                                                    : plano.cor === 'yellow' ? 'bg-yellow-950/40'
                                                        : 'bg-gray-800/60'
                                            : 'bg-gray-800/40';

                                        return (
                                            <button
                                                key={plano.value}
                                                onClick={() => setPlanoSelecionado(plano.value)}
                                                className={`p-4 rounded-2xl border transition-all text-left ${borderColor} ${bgColor}`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    {plano.icon}
                                                    <span className="font-black text-white text-sm">{plano.label}</span>
                                                </div>
                                                <p className="text-xs text-gray-400">{plano.preco}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* STEP 3: Duração */}
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-3">
                                    <span className="flex items-center gap-2">
                                        <Clock size={14} />
                                        Duração
                                    </span>
                                </label>
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                    {PERIODOS.map((p) => (
                                        <button
                                            key={p.dias}
                                            onClick={() => {
                                                setDiasSelecionados(p.dias);
                                                setUsandoCustom(false);
                                            }}
                                            className={`p-3 rounded-xl border text-center transition-all ${!usandoCustom && diasSelecionados === p.dias
                                                ? 'border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/30'
                                                : 'border-gray-700 hover:border-gray-600 bg-gray-800/40'
                                                }`}
                                        >
                                            <p className="font-black text-white text-sm">{p.label}</p>
                                            <p className="text-[10px] text-gray-500">{p.dias} dias</p>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={usandoCustom}
                                            onChange={(e) => setUsandoCustom(e.target.checked)}
                                            className="rounded accent-blue-500"
                                        />
                                        Personalizado:
                                    </label>
                                    <input
                                        type="number"
                                        value={diasCustom}
                                        onChange={(e) => {
                                            setDiasCustom(e.target.value);
                                            setUsandoCustom(true);
                                        }}
                                        placeholder="Ex: 15"
                                        min={1}
                                        max={365}
                                        className="w-24 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    />
                                    <span className="text-xs text-gray-500">dias</span>
                                </div>
                            </div>

                            {/* Resumo */}
                            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Resumo</p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">User ID:</span>
                                        <span className="text-white font-mono text-xs">{userIdInput || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Plano:</span>
                                        <span className="text-white font-bold">{planoSelecionado}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Duração:</span>
                                        <span className="text-white font-bold">
                                            {usandoCustom ? (diasCustom || '—') : diasSelecionados} dias
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-gray-700">
                                        <span className="text-gray-400">Expira em:</span>
                                        <span className="text-green-400 font-bold">
                                            {(() => {
                                                const dias = usandoCustom ? parseInt(diasCustom) : diasSelecionados;
                                                if (!dias) return '—';
                                                const d = new Date();
                                                d.setDate(d.getDate() + dias);
                                                return d.toLocaleDateString('pt-BR');
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Erro */}
                            {erro && (
                                <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 flex items-center gap-3">
                                    <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
                                    <p className="text-sm text-red-300">{erro}</p>
                                </div>
                            )}

                            {/* Resultado de sucesso */}
                            {resultado && resultado.success && (
                                <div className="bg-green-950/40 border border-green-800 rounded-xl p-4 flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-green-300 font-bold">{resultado.message}</p>
                                        <p className="text-xs text-green-400/70 mt-1">
                                            Plano: {resultado.subscription.plan} • Expira em: {new Date(resultado.subscription.expiresAt).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Botão de ação */}
                            <button
                                onClick={criarAssinatura}
                                disabled={enviando || !userIdInput.trim()}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-6 py-4 rounded-2xl font-black text-base shadow-lg shadow-green-500/20 disabled:shadow-none transition-all hover:scale-[1.01] active:scale-[0.99]"
                            >
                                {enviando ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Ativar Assinatura
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
