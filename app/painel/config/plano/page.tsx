"use client";

import { useState, useEffect } from "react";
import {
    Star, Check, X, CreditCard, Receipt, Calendar,
    ArrowRight, Sparkles, Zap, ShieldCheck, History,
    TrendingUp, Layout, Users, Store, FileText,
    Shield, Briefcase, MousePointer2, Smartphone, Globe,
    MessageCircle, Download, ExternalLink, Printer, RotateCcw,
    ShoppingBag, Plus, Sparkle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConfigPlano() {
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [extraStaffQty, setExtraStaffQty] = useState(1);

    useEffect(() => {
        Promise.all([carregarConfig(), carregarFaturas()]).finally(() => setLoading(false));
    }, []);

    async function carregarFaturas() {
        try {
            const res = await fetch('/api/checkout/invoices');
            const data = await res.json();
            if (Array.isArray(data)) setInvoices(data);
        } catch (e) {
            console.error(e);
        }
    }

    async function carregarConfig() {
        try {
            const res = await fetch('/api/painel/config');
            const data = await res.json();
            setConfig(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function toggleRenovacao() {
        try {
            const novoEstado = !config?.cancelAtPeriodEnd;
            toast.loading(novoEstado ? "Desativando renovação..." : "Ativando renovação...");

            const res = await fetch('/api/checkout/subscription/toggle-recurrence', {
                method: 'POST',
                body: JSON.stringify({ cancelAtPeriodEnd: novoEstado })
            });

            if (res.ok) {
                setConfig({ ...config, cancelAtPeriodEnd: novoEstado });
                toast.success(novoEstado ? "Renovação automática desativada." : "Renovação automática ativada!");
            } else {
                toast.error("Erro ao atualizar status.");
            }
        } catch (e) {
            toast.error("Erro de conexão.");
        } finally {
            toast.dismiss();
        }
    }

    async function handleAddItem(itemType: string, quantity: number = 1) {
        try {
            toast.loading("Adicionando recurso ao seu plano...");
            const res = await fetch('/api/checkout/subscription/add-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemType, quantity })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Recurso adicionado com sucesso! Sua fatura foi atualizada.");
                carregarConfig(); // Recarrega para mostrar o status "Ativo"
            } else {
                toast.error(data.error || "Erro ao adicionar recurso.");
            }
        } catch (e) {
            toast.error("Erro de conexão.");
        } finally {
            toast.dismiss();
        }
    }

    async function handleRemoveItem(itemType: string, quantity: number = 1) {
        if (!confirm(`Tem certeza que deseja remover este recurso? Ele será desativado imediatamente.`)) return;

        try {
            toast.loading("Removendo recurso do seu plano...");
            const res = await fetch('/api/checkout/subscription/remove-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemType, quantity })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Recurso removido com sucesso.");
                carregarConfig();
            } else {
                toast.error(data.error || "Erro ao remover recurso.");
            }
        } catch (e) {
            toast.error("Erro de conexão.");
        } finally {
            toast.dismiss();
        }
    }

    async function handleOpenPortal() {
        try {
            toast.loading("Abrindo portal de pagamentos...");
            const res = await fetch('/api/checkout/portal', { method: 'POST' });
            const data = await res.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error(data.error || "Erro ao abrir portal.");
            }
        } catch (e) {
            toast.error("Erro de conexão.");
        } finally {
            toast.dismiss();
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes do plano...</div>;

    const planName = config?.plan === "MASTER" ? "Master" : config?.plan === "PREMIUM" ? "Premium" : "Individual";
    const planColor = config?.plan === "MASTER" ? "from-amber-500 to-yellow-600" : config?.plan === "PREMIUM" ? "from-blue-500 to-blue-700" : "from-gray-600 to-gray-800";
    const expiresAt = config?.expiresAt ? format(new Date(config.expiresAt), "dd/MM/yyyy", { locale: ptBR }) : "---";
    const statusLabel = config?.subscriptionStatus === "ACTIVE" ? "Ativo" : config?.subscriptionStatus === "PAST_DUE" ? "Atrasado" : "Inativo";
    const statusColor = config?.subscriptionStatus === "ACTIVE" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50";

    const limitPrefix = config?.plan === "MASTER" ? 15 : ((config?.plan === "PREMIUM" ? 5 : 1) + (config?.extraUsersCount || 0));

    const features = [
        { name: "Profissionais / Usuários", value: config?.plan === "MASTER" && !config?.extraUsersCount ? "Até 15" : `Até ${limitPrefix}`, included: true },
        { name: "Agendamentos Online", value: "Ilimitados", included: true },
        { name: "Financeiro Completo", value: "", included: true },
        { name: "Gestão de Clientes", value: "", included: true },
        { name: "Fichas Técnicas e Histórico", value: "", included: true },
        { name: "WhatsApp Automático", value: "", included: config?.plan === "MASTER" },
        { name: "Gestão de Estoques", value: "", included: config?.plan === "MASTER" || config?.plan === "PREMIUM" },
        { name: "Link de Pagamento", value: "", included: config?.plan === "MASTER" || config?.plan === "PREMIUM" },
        { name: "Relatórios DRE Avançados", value: "", included: config?.plan === "MASTER" },
        { name: "Emissão de Notas Fiscais", value: config?.hasNfeModule ? "Ativo" : "Add-on", included: !!config?.hasNfeModule },
        { name: "Emissão de Boletos", value: config?.hasBoletoModule ? "Ativo" : "Add-on", included: !!config?.hasBoletoModule },
        { name: "Assinatura Digital Autêntica", value: config?.hasDigitalSignatureModule ? "Ativo" : "Add-on", included: !!config?.hasDigitalSignatureModule },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 p-4 font-sans animate-in fade-in duration-500">
            <header className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <Star className="text-yellow-500 animate-pulse" size={24} />
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Meu Plano</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Gerencie sua assinatura e visualize os recursos disponíveis.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* PLANO CONTRATADO */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-8 pb-4 flex items-center gap-3">
                            <ShieldCheck className="text-blue-500" size={20} />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-tight">Plano contratado</h2>
                        </div>

                        <div className="px-8 pb-8">
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl border dark:border-gray-800 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b dark:border-gray-800">
                                            <th className="p-4 text-[10px] font-black text-gray-400 uppercase">Plano</th>
                                            <th className="p-4 text-[10px] font-black text-gray-400 uppercase">Vencimento</th>
                                            <th className="p-4 text-[10px] font-black text-gray-400 uppercase">Período</th>
                                            <th className="p-4 text-[10px] font-black text-gray-400 uppercase text-right">Situação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="p-4">
                                                <span className={`px-4 py-1.5 rounded-full text-xs font-black text-white bg-gradient-to-r ${planColor} uppercase`}>
                                                    {planName}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm font-bold text-gray-700 dark:text-gray-300">{expiresAt}</td>
                                            <td className="p-4 text-sm font-bold text-gray-700 dark:text-gray-300">Mensal / Anual</td>
                                            <td className="p-4 text-right">
                                                <span className={`${statusColor} px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border`}>
                                                    {statusLabel}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button onClick={handleOpenPortal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/20">
                                    <RotateCcw size={16} /> Detalhes da Assinatura
                                </button>
                                <button onClick={() => window.location.href = '/'} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition active:scale-95 shadow-lg shadow-blue-500/20">
                                    <Star size={16} /> Mudar de Plano
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* FORMA DE PAGAMENTO */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-8 pb-4 flex items-center gap-3">
                            <CreditCard className="text-blue-500" size={20} />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-tight">Pagamento e Faturas</h2>
                        </div>

                        <div className="px-8 pb-8">
                            <p className="text-sm text-gray-500 mb-6">Utilizamos o **Stripe** para processar seus pagamentos de forma segura. Clique abaixo para gerenciar seus cartões e baixar faturas antigas.</p>

                            <div className="flex items-center gap-3 mb-8 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/10">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Renovação automática</p>
                                        {!config?.cancelAtPeriodEnd ? (
                                            <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">Ativa</span>
                                        ) : (
                                            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">Manual</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Sua assinatura será renovada automaticamente em {expiresAt}.</p>
                                </div>
                                <button
                                    onClick={toggleRenovacao}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${!config?.cancelAtPeriodEnd
                                        ? "bg-white text-red-600 border border-red-200 hover:bg-red-50"
                                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                                        }`}
                                >
                                    {!config?.cancelAtPeriodEnd ? "Desativar" : "Ativar"}
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button onClick={handleOpenPortal} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition active:scale-95 shadow-lg shadow-orange-500/20">
                                    <ExternalLink size={16} /> Abrir Portal de Pagamentos
                                </button>
                                <button onClick={handleOpenPortal} className="bg-gray-900 dark:bg-gray-800 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition active:scale-95">
                                    <History size={16} /> Histórico Completo na Stripe
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ADICIONAIS / EXTRAS */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 shadow-sm overflow-hidden border-dashed border-blue-500/30">
                        <div className="p-8 pb-4 flex items-center gap-3">
                            <ShoppingBag className="text-blue-500" size={20} />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-tight">Add-ons / Extras</h2>
                        </div>

                        <div className="px-8 pb-8 space-y-4">
                            <p className="text-sm text-gray-500 mb-6">Personalize seu plano com recursos extras. O valor será adicionado mensalmente à sua fatura.</p>

                            {/* Módulo NF-e */}
                            <div className={`flex items-center justify-between p-6 rounded-3xl border transition-all ${config?.hasNfeModule ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 group hover:border-blue-500'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm">
                                        <FileText className={config?.hasNfeModule ? "text-emerald-600" : "text-blue-600"} size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                            Emissão de NF-e
                                        </h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 italic text-blue-600/70">
                                            Emita notas fiscais de serviço (NFS-e) ilimitadas
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                    {!config?.hasNfeModule ? (
                                        <>
                                            <span className="text-xs font-black text-gray-900 dark:text-white uppercase">+ R$ 29,90/mês</span>
                                            <button
                                                onClick={() => handleAddItem('NFE')}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition active:scale-95 flex items-center gap-2">
                                                <Plus size={14} /> Adicionar
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                                                <Check size={14} /> Ativo no Plano
                                            </span>
                                            <button
                                                onClick={() => handleRemoveItem('NFE')}
                                                className="text-[9px] font-black text-red-500 uppercase hover:underline"
                                            >
                                                Remover do Plano
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Módulo Boletos */}
                            <div className={`flex items-center justify-between p-6 rounded-3xl border transition-all ${config?.hasBoletoModule ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 group hover:border-blue-500'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden">
                                        <img src="/cora-icon.png" className="w-full h-full object-cover" alt="CORA" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                            BANCO CORA
                                        </h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 italic text-blue-600/70">
                                            Cobranças automáticas via PIX e Boleto Cora
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                    {!config?.hasBoletoModule ? (
                                        <>
                                            <span className="text-xs font-black text-gray-900 dark:text-white uppercase">+ R$ 24,90/mês</span>
                                            <button
                                                onClick={() => handleAddItem('BOLETO')}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition active:scale-95 flex items-center gap-2">
                                                <Plus size={14} /> Adicionar
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                                                <Check size={14} /> Ativo no Plano
                                            </span>
                                            <button
                                                onClick={() => handleRemoveItem('BOLETO')}
                                                className="text-[9px] font-black text-red-500 uppercase hover:underline"
                                            >
                                                Remover do Plano
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Assinatura Digital */}
                            <div className={`flex items-center justify-between p-6 rounded-3xl border transition-all ${config?.hasDigitalSignatureModule ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 group hover:border-blue-500'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm">
                                        <ShieldCheck className={config?.hasDigitalSignatureModule ? "text-emerald-600" : "text-blue-600"} size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                            Assinatura Digital
                                        </h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 italic text-blue-600/70">
                                            Assine documentos digitalmente com validade e QR Code
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                    {!config?.hasDigitalSignatureModule ? (
                                        <>
                                            <span className="text-xs font-black text-gray-900 dark:text-white uppercase">+ R$ 14,90/mês</span>
                                            <button
                                                onClick={() => handleAddItem('SIGNATURE')}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition active:scale-95 flex items-center gap-2">
                                                <Plus size={14} /> Adicionar
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                                                <Check size={14} /> Ativo no Plano
                                            </span>
                                            <button
                                                onClick={() => handleRemoveItem('SIGNATURE')}
                                                className="text-[9px] font-black text-red-500 uppercase hover:underline"
                                            >
                                                Remover do Plano
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Colaborador Extra */}
                            <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border dark:border-white/10 group hover:border-gray-400 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm">
                                        <Users className="text-gray-600 dark:text-gray-400" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Colaboradores Extras</h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 italic">
                                            {config?.extraUsersCount > 0 ? `Você possui ${config.extraUsersCount} slots adicionais` : "Contrate slots de acesso avulsos"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3 text-right">
                                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">+ R$ 15,00/mês cada</span>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-1 shadow-sm h-12">
                                            <button
                                                onClick={() => setExtraStaffQty(Math.max(1, extraStaffQty - 1))}
                                                className="w-8 h-full flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors text-lg font-bold"
                                            >
                                                -
                                            </button>
                                            <span className="w-10 text-center text-sm font-black text-blue-600">{extraStaffQty}</span>
                                            <button
                                                onClick={() => setExtraStaffQty(extraStaffQty + 1)}
                                                className="w-8 h-full flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors text-lg font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {extraStaffQty > 0 && (
                                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md animate-in fade-in zoom-in duration-300">
                                                    +{(extraStaffQty * 15).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2">
                                                {config?.extraUsersCount > 0 && (
                                                    <button
                                                        onClick={() => handleRemoveItem('STAFF', extraStaffQty)}
                                                        className="bg-white border border-red-200 text-red-600 px-4 h-12 rounded-xl text-[10px] font-black uppercase transition active:scale-95 flex items-center gap-2 whitespace-nowrap hover:bg-red-50">
                                                        <X size={14} /> Remover {extraStaffQty}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleAddItem('STAFF', extraStaffQty)}
                                                    className="bg-gray-900 dark:bg-gray-800 hover:bg-black text-white px-5 h-12 rounded-xl text-[10px] font-black uppercase transition active:scale-95 flex items-center gap-2 whitespace-nowrap">
                                                    <Plus size={14} /> Adicionar {config?.extraUsersCount > 0 ? "Mais" : ""}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RECURSOS */}
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 pb-4 flex items-center gap-3">
                        <Zap className="text-yellow-500" size={20} />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-tight">Recursos</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-8">
                        <div className="space-y-1">
                            {features.map((f, i) => (
                                <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl transition group">
                                    <span className={`text-[13px] font-bold ${f.included ? "text-gray-700 dark:text-gray-300" : "text-gray-400 line-through"}`}>
                                        {f.name}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        {f.value && <span className="text-[11px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg group-hover:scale-110 transition">{f.value}</span>}
                                        {f.included ? (
                                            <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center">
                                                <Check size={12} strokeWidth={4} />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center">
                                                <X size={12} strokeWidth={4} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* NOTAS FISCAIS */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-8 pb-4 flex items-center gap-3">
                    <Receipt className="text-blue-500" size={20} />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-tight">Notas fiscais de serviço</h2>
                </div>

                <div className="p-8 pt-4">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border dark:border-gray-800 overflow-hidden">
                        <div className="overflow-x-auto">

                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b dark:border-gray-800">
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase">Número</th>
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase">Data de emissão</th>
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase">Destinatário</th>
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase">Valor total</th>
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.length > 0 ? (
                                        invoices.map((n, i) => (
                                            <tr key={i} className="border-b dark:border-gray-800 last:border-0 hover:bg-white dark:hover:bg-white/5 transition">
                                                <td className="p-5 text-sm font-bold text-gray-700 dark:text-gray-300">{n.id}</td>
                                                <td className="p-5 text-sm font-bold text-gray-700 dark:text-gray-300">{n.date}</td>
                                                <td className="p-5 text-xs font-black text-gray-500 dark:text-gray-400 uppercase truncate max-w-[200px]">{config?.corporateName || config?.name || "Cliente Nohud"}</td>
                                                <td className="p-5 text-sm font-black text-gray-900 dark:text-white">{n.value}</td>
                                                <td className="p-5">
                                                    {n.pdf ? (
                                                        <button onClick={() => window.open(n.pdf, '_blank')} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl text-[10px] font-black uppercase transition active:scale-95">
                                                            <Printer size={14} /> Imprimir / PDF
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase block text-center italic">Processando...</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-10 text-center text-gray-400 text-xs font-bold uppercase italic">
                                                Nenhuma fatura encontrada.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


