"use client";

import { useState, useEffect } from "react";
import {
    Star, Check, X, CreditCard, Receipt, Calendar,
    ArrowRight, Sparkles, Zap, ShieldCheck, History,
    TrendingUp, Layout, Users, Store, FileText,
    Shield, Briefcase, MousePointer2, Smartphone, Globe,
    MessageCircle, Download, ExternalLink, Printer, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConfigPlano() {
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        carregarConfig();
    }, []);

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

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes do plano...</div>;

    const planName = config?.plan === "MASTER" ? "Master" : config?.plan === "PREMIUM" ? "Prata" : "Individual";
    const planColor = config?.plan === "MASTER" ? "from-purple-600 to-blue-600" : config?.plan === "PREMIUM" ? "from-gray-400 to-gray-600" : "from-blue-400 to-blue-600";

    const features = [
        { name: "Usuários", value: config?.plan === "MASTER" ? "Ilimitados" : config?.plan === "PREMIUM" ? "3" : "1", included: true },
        { name: "Lojas", value: config?.plan === "MASTER" ? "5" : "1", included: true },
        { name: "Emissão de notas fiscais", value: "", included: config?.plan !== "INDIVIDUAL" },
        { name: "Emissão de boletos", value: "", included: config?.plan !== "INDIVIDUAL" },
        { name: "Layout e domínio personalizado", value: "", included: config?.plan === "MASTER" },
        { name: "Conta Integrada", value: "", included: true },
        { name: "Recursos Humanos", value: "", included: config?.plan === "MASTER" },
        { name: "Assinatura Digital", value: "0/mês", included: config?.plan === "MASTER" },
        { name: "Agenda Pro", value: "", included: true },
        { name: "MDF-e", value: "", included: config?.plan === "MASTER" },
        { name: "Tray", value: "", included: config?.plan === "MASTER" },
        { name: "Mercado Pago", value: "", included: true },
        { name: "Mercado Livre", value: "", included: config?.plan === "MASTER" },
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
                                            <td className="p-4 text-sm font-bold text-gray-700 dark:text-gray-300">02/07/2026</td>
                                            <td className="p-4 text-sm font-bold text-gray-700 dark:text-gray-300">Anual</td>
                                            <td className="p-4 text-right">
                                                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800/50">
                                                    Ativo
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/20">
                                    <RotateCcw size={16} /> Renovar assinatura
                                </button>
                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition active:scale-95 shadow-lg shadow-blue-500/20">
                                    <Star size={16} /> Alterar plano
                                </button>
                                <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition active:scale-95 shadow-lg shadow-purple-500/20">
                                    <Plus size={16} /> Recursos
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* FORMA DE PAGAMENTO */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-8 pb-4 flex items-center gap-3">
                            <CreditCard className="text-blue-500" size={20} />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-tight">Forma de pagamento</h2>
                        </div>

                        <div className="px-8 pb-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Titular do cartão</label>
                                    <p className="text-sm font-black text-gray-700 dark:text-white uppercase">{config?.name || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Número</label>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
                                            <div className="w-6 h-4 bg-red-500 rounded-sm"></div>
                                        </div>
                                        <p className="text-sm font-bold text-gray-700 dark:text-white">**** **** **** 5201</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Vencimento</label>
                                    <p className="text-sm font-bold text-gray-700 dark:text-white">08/28</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-8">
                                <p className="text-xs font-bold text-gray-500">Renovação automática:</p>
                                <span className="text-xs font-black text-red-500 uppercase">Desabilitada</span>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition active:scale-95 shadow-lg shadow-orange-500/20">
                                    <ExternalLink size={16} /> Editar forma de pagamento
                                </button>
                                <button className="bg-gray-900 dark:bg-gray-800 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition active:scale-95">
                                    <History size={16} /> Histórico de pagamentos
                                </button>
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
                                    {[
                                        { id: "202500000042250", date: "01/07/2025", desc: config?.corporateName || config?.name || "Empresa Cliente LTDA", value: "R$ 1.507,79" },
                                        { id: "202400000044948", date: "10/07/2024", desc: config?.corporateName || config?.name || "Empresa Cliente LTDA", value: "R$ 1.507,82" },
                                        { id: "202400000003686", date: "15/01/2024", desc: config?.corporateName || config?.name || "Empresa Cliente LTDA", value: "R$ 117,05" },
                                    ].map((n, i) => (
                                        <tr key={i} className="border-b dark:border-gray-800 last:border-0 hover:bg-white dark:hover:bg-white/5 transition">
                                            <td className="p-5 text-sm font-bold text-gray-700 dark:text-gray-300">{n.id}</td>
                                            <td className="p-5 text-sm font-bold text-gray-700 dark:text-gray-300">{n.date}</td>
                                            <td className="p-5 text-xs font-black text-gray-500 dark:text-gray-400 uppercase truncate max-w-[200px]">{n.desc}</td>
                                            <td className="p-5 text-sm font-black text-gray-900 dark:text-white">{n.value}</td>
                                            <td className="p-5">
                                                <button className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl text-[10px] font-black uppercase transition active:scale-95">
                                                    <Printer size={14} /> Imprimir NFS-e
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Plus({ size }: { size: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
