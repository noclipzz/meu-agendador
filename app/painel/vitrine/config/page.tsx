"use client";

import React, { useState, useEffect } from "react";
import { Settings2, Save, Loader2, CreditCard, Banknote, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";

export default function VitrineConfig() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        acceptedMethods: ["pix", "credit_card"],
        acceptDeliveryPayment: false,
    });

    useEffect(() => {
        async function loadConfig() {
            try {
                const res = await fetch("/api/painel/config");
                const data = await res.json();
                if (data.vitrineSettings) {
                    setSettings(prev => ({ ...prev, ...data.vitrineSettings }));
                }
            } catch (error) {
                console.error("Erro ao carregar configurações:", error);
                toast.error("Erro ao carregar configurações");
            } finally {
                setLoading(false);
            }
        }
        loadConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/painel/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vitrineSettings: settings
                })
            });

            if (res.ok) {
                toast.success("Configurações salvas com sucesso!");
            } else {
                toast.error("Erro ao salvar configurações");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        } finally {
            setSaving(false);
        }
    };

    const toggleMethod = (method: string) => {
        setSettings(prev => ({
            ...prev,
            acceptedMethods: prev.acceptedMethods.includes(method)
                ? prev.acceptedMethods.filter(m => m !== method)
                : [...prev.acceptedMethods, method]
        }));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-gray-500 font-medium">Carregando configurações...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black dark:text-white flex items-center gap-3">
                        <Settings2 size={32} className="text-blue-600" />
                        Configurações da Vitrine
                    </h1>
                    <p className="text-gray-500 font-medium">Ajuste como sua loja online deve se comportar</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition active:scale-95 shadow-xl shadow-blue-500/20 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Alterações</>}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Formas de Pagamento Online */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border dark:border-gray-700 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b dark:border-gray-700 pb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h3 className="font-black dark:text-white">Pagamentos Online</h3>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Mercado Pago</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Selecione quais formas de pagamento o cliente poderá usar no checkout via Mercado Pago:</p>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'pix', label: 'Pix (Recomendado)' },
                                { id: 'credit_card', label: 'Cartão de Crédito' },
                                { id: 'debit_card', label: 'Cartão de Débito' },
                                { id: 'ticket', label: 'Boleto Bancário' },
                            ].map(m => (
                                <label key={m.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border dark:border-gray-700 cursor-pointer hover:border-blue-300 transition-all">
                                    <span className="font-bold dark:text-gray-200">{m.label}</span>
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={settings.acceptedMethods.includes(m.id)}
                                        onChange={() => toggleMethod(m.id)}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pagamento na Entrega */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border dark:border-gray-700 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b dark:border-gray-700 pb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
                            <Banknote size={24} />
                        </div>
                        <div>
                            <h3 className="font-black dark:text-white">Pagamento na Entrega</h3>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Presencial</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Permita que seus clientes finalizem o pedido para pagar somente quando receberem o produto.</p>
                        
                        <div 
                            className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${settings.acceptDeliveryPayment ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-100 dark:border-gray-700 bg-gray-50/50'}`}
                            onClick={() => setSettings(prev => ({ ...prev, acceptDeliveryPayment: !prev.acceptDeliveryPayment }))}
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="font-black text-gray-900 dark:text-white uppercase text-xs">Ativar Pagamento na Entrega</p>
                                    <p className="text-xs text-gray-500">O pedido será finalizado sem cobrança imediata.</p>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-all ${settings.acceptDeliveryPayment ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.acceptDeliveryPayment ? 'right-1' : 'left-1'}`} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4 rounded-2xl flex gap-3">
                            <Info size={20} className="text-amber-600 shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                                <strong>Nota:</strong> Pedidos pagos na entrega precisarão ser confirmados manualmente como "Recebidos" no seu painel de pedidos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl shadow-blue-500/20">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-4 rounded-3xl">
                        <ShieldCheck size={40} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black">Automação Inteligente</h3>
                        <p className="text-blue-100 font-medium">Pagamentos aprovados pelo site são identificados e registrados no financeiro automaticamente.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
