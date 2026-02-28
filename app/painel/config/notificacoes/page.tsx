"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Bell, Mail, MessageCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useAgenda } from "../../../../contexts/AgendaContext";

export default function NotificacoesPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [email, setEmail] = useState(true);
    const [whatsapp, setWhatsapp] = useState(true);
    const [push, setPush] = useState(true);
    const [phone, setPhone] = useState("");

    useEffect(() => {
        carregarConfig();
    }, []);

    const carregarConfig = async () => {
        try {
            const res = await fetch("/api/painel/config/notificacoes");
            if (res.ok) {
                const data = await res.json();
                setEmail(data.email);
                setWhatsapp(data.whatsapp);
                setPush(data.push);
                setPhone(data.phone || "");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar preferências");
        } finally {
            setLoading(false);
        }
    };

    const formatarTelefoneInput = (value: string) => {
        const raw = value.replace(/\D/g, "").slice(0, 11);
        if (raw.length <= 2) return raw.length > 0 ? `(${raw}` : "";
        if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
        if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
        return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    };

    const salvar = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/painel/config/notificacoes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, whatsapp, push, phone })
            });
            if (res.ok) {
                toast.success("Preferências de notificação salvas!");
            } else {
                toast.error("Erro ao salvar preferências");
            }
        } catch (err) {
            toast.error("Erro ao comunicar com servidor");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <Bell size={32} className="text-blue-600" /> Preferências de Notificação
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Escolha onde e como receber os alertas do sistema.
                    </p>
                </div>
                <button
                    onClick={salvar}
                    disabled={saving}
                    className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Salvar Alterações
                </button>
            </div>

            <div className="space-y-4">

                {/* 1. E-MAIL */}
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 md:p-8 flex items-start gap-4 shadow-sm border dark:border-gray-700">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0">
                        <Mail size={24} />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-black dark:text-white">Alertas por E-mail</h2>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={email} onChange={(e) => setEmail(e.target.checked)} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                            Receber resumo diário, alertas de login em novos dispositivos e relatórios.
                        </p>
                    </div>
                </div>

                {/* 2. PUSH (APP) */}
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 md:p-8 flex items-start gap-4 shadow-sm border dark:border-gray-700">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center shrink-0">
                        <Smartphone size={24} />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-black dark:text-white">Notificações Push (Tela)</h2>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={push} onChange={(e) => setPush(e.target.checked)} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                            Alertas instantâneos na tela do celular/PC de novos agendamentos e lembretes diários.
                        </p>
                    </div>
                </div>

                {/* 3. WHATSAPP */}
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 md:p-8 flex items-start gap-4 shadow-sm border dark:border-gray-700">
                    <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center shrink-0">
                        <MessageCircle size={24} />
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-black dark:text-white">Resumo via WhatsApp</h2>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                            Receber avisos pelo assistente automático do sistema no seu número.
                        </p>

                        {/* INPUT PARA TEFELONE SE ATIVO */}
                        {whatsapp && (
                            <div className="pt-2 animate-in fade-in zoom-in-95 duration-200">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Qual seu WhatsApp para ser avisado?</label>
                                <input
                                    type="tel"
                                    maxLength={15}
                                    className="w-full max-w-sm p-3.5 rounded-xl border-2 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50 font-bold dark:text-white outline-none focus:ring-2 ring-green-500 transition-all text-sm"
                                    placeholder="(11) 90000-0000"
                                    value={phone}
                                    onChange={(e) => setPhone(formatarTelefoneInput(e.target.value))}
                                />
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
