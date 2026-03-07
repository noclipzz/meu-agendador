"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Bell, Mail, MessageCircle, Smartphone, CheckCircle, Info, Building2, User } from "lucide-react";
import { toast } from "sonner";
import { useAgenda } from "../../../../contexts/AgendaContext";

export default function NotificacoesPage() {
    const { userRole, isOwner } = useAgenda();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Configurações do User (UserNotificationPref)
    const [userPref, setUserPref] = useState({
        email: true,
        whatsapp: true,
        push: true,
        phone: "",
        settings: {
            new_booking_email: true,
            new_booking_push: true,
            daily_agenda_push: true,
            financial_summaries_email: true
        } as Record<string, boolean>
    });

    // Configurações da Empresa (Company.notificationSettings)
    const [companySettings, setCompanySettings] = useState({
        client_new_booking_whatsapp: true,
        client_reminder_whatsapp: true,
        client_waiting_list_whatsapp: true,
        client_payment_whatsapp: true,
        client_billing_reminder_5d: true,
        client_billing_reminder_today: true,
        client_billing_reminder_2d_after: true
    } as Record<string, boolean>);

    const [companyId, setCompanyId] = useState("");
    const [canEditCompany, setCanEditCompany] = useState(false);

    useEffect(() => {
        carregarConfig();
    }, []);

    const carregarConfig = async () => {
        try {
            const res = await fetch("/api/painel/config/notificacoes");
            if (res.ok) {
                const data = await res.json();

                if (data.userPref) {
                    setUserPref({
                        email: data.userPref.email,
                        whatsapp: data.userPref.whatsapp,
                        push: data.userPref.push,
                        phone: data.userPref.phone || "",
                        settings: {
                            new_booking_email: data.userPref.settings?.new_booking_email ?? true,
                            new_booking_push: data.userPref.settings?.new_booking_push ?? true,
                            daily_agenda_push: data.userPref.settings?.daily_agenda_push ?? true,
                            financial_summaries_email: data.userPref.settings?.financial_summaries_email ?? true,
                        }
                    });
                }

                setCompanySettings({
                    client_new_booking_whatsapp: data.companySettings?.client_new_booking_whatsapp ?? true,
                    client_reminder_whatsapp: data.companySettings?.client_reminder_whatsapp ?? true,
                    client_waiting_list_whatsapp: data.companySettings?.client_waiting_list_whatsapp ?? true,
                    client_payment_whatsapp: data.companySettings?.client_payment_whatsapp ?? true,
                    client_billing_reminder_5d: data.companySettings?.client_billing_reminder_5d ?? true,
                    client_billing_reminder_today: data.companySettings?.client_billing_reminder_today ?? true,
                    client_billing_reminder_2d_after: data.companySettings?.client_billing_reminder_2d_after ?? true,
                });

                setCompanyId(data.companyId || "");
                setCanEditCompany(data.canEditCompany || false);
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
                body: JSON.stringify({
                    userPref,
                    companySettings,
                    companyId,
                    canEditCompany
                })
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

    const toggleUserSetting = (key: string) => {
        setUserPref(prev => ({
            ...prev,
            settings: { ...prev.settings, [key]: !prev.settings[key] }
        }));
    };

    const toggleCompanySetting = (key: string) => {
        setCompanySettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    if (loading) {
        return <div className="p-8 flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <Bell size={32} className="text-blue-600" /> Notificações e Alertas
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Personalize os avisos para você e para os clientes do salão.
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

            <div className="grid grid-cols-1 gap-8">

                {/* SESSÃO 1: NOTIFICAÇÕES PARA MIM (USER) */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2 border-b dark:border-gray-800 pb-2">
                        <User size={20} className="text-blue-500" /> Minhas Notificações Pessoais
                    </h2>

                    {/* Master Switches */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border dark:border-gray-700/50 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center">
                                        <Smartphone size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold dark:text-white leading-tight">Canal: Push App</h3>
                                        <p className="text-[11px] text-gray-500 uppercase tracking-widest font-black mt-0.5">Alertas no Dispositivo</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={userPref.push} onChange={(e) => setUserPref(prev => ({ ...prev, push: e.target.checked }))} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            {userPref.push && (
                                <div className="pl-1 space-y-3 pt-2 border-t dark:border-gray-700/50 animate-in fade-in duration-300">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.new_booking_push} onChange={() => toggleUserSetting('new_booking_push')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition">Novos Agendamentos (Apito Instantâneo)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.daily_agenda_push} onChange={() => toggleUserSetting('daily_agenda_push')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition">Alerta Matinal (Sua Agenda do Dia)</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border dark:border-gray-700/50 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold dark:text-white leading-tight">Canal: E-mail</h3>
                                        <p className="text-[11px] text-gray-500 uppercase tracking-widest font-black mt-0.5">Caixa de Entrada</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={userPref.email} onChange={(e) => setUserPref(prev => ({ ...prev, email: e.target.checked }))} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {userPref.email && (
                                <div className="pl-1 space-y-3 pt-2 border-t dark:border-gray-700/50 animate-in fade-in duration-300">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.new_booking_email} onChange={() => toggleUserSetting('new_booking_email')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition">Novos Agendamentos (Mais detalhes)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.financial_summaries_email} onChange={() => toggleUserSetting('financial_summaries_email')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition">Resumos Financeiros (Faturas NOHUD)</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* SESSÃO 2: NOTIFICAÇÕES PARA OS CLIENTES (COMPANY SETTINGS) */}
                {canEditCompany && (
                    <div className="space-y-4 pt-6">
                        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2 border-b dark:border-gray-800 pb-2">
                            <Building2 size={20} className="text-green-500" /> Notificações da Empresa para os Clientes
                        </h2>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border dark:border-gray-700/50 flex flex-col gap-6">

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center">
                                    <MessageCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold dark:text-white leading-tight">Automações do WhatsApp Bot</h3>
                                    <p className="text-[11px] text-gray-500 uppercase tracking-widest font-black mt-0.5">O que o Bot envia aos clientes via número</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                    <input type="checkbox" className="w-5 h-5 rounded text-green-600 border-gray-300 mt-0.5 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700" checked={companySettings.client_new_booking_whatsapp} onChange={() => toggleCompanySetting('client_new_booking_whatsapp')} />
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 dark:text-white block">Aviso de Confirmação (Reserva)</span>
                                        <p className="text-xs text-gray-500 mt-1 leading-snug">Dispara imediatamente após o agendamento pedindo o confere.</p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                    <input type="checkbox" className="w-5 h-5 rounded text-green-600 border-gray-300 mt-0.5 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700" checked={companySettings.client_reminder_whatsapp} onChange={() => toggleCompanySetting('client_reminder_whatsapp')} />
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 dark:text-white block">Lembretes 24h Antes</span>
                                        <p className="text-xs text-gray-500 mt-1 leading-snug">Ajuda a diminuir o "No-Show" e esquecimento.</p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                    <input type="checkbox" className="w-5 h-5 rounded text-green-600 border-gray-300 mt-0.5 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700" checked={companySettings.client_waiting_list_whatsapp} onChange={() => toggleCompanySetting('client_waiting_list_whatsapp')} />
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 dark:text-white block">Fila de Espera Automática</span>
                                        <p className="text-xs text-gray-500 mt-1 leading-snug">Avisa os clientes quando surge nova vaga na agenda.</p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                    <input type="checkbox" className="w-5 h-5 rounded text-green-600 border-gray-300 mt-0.5 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700" checked={companySettings.client_payment_whatsapp} onChange={() => toggleCompanySetting('client_payment_whatsapp')} />
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 dark:text-white block">Confirmação de Pagamento PIX/Cora</span>
                                        <p className="text-xs text-gray-500 mt-1 leading-snug">Avisa o cliente quando o pagamento cai no sistema.</p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                    <input type="checkbox" className="w-5 h-5 rounded text-green-600 border-gray-300 mt-0.5 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700" checked={companySettings.client_billing_reminder_5d} onChange={() => toggleCompanySetting('client_billing_reminder_5d')} />
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 dark:text-white block">Aviso de Vencimento (5 Dias Antes)</span>
                                        <p className="text-xs text-gray-500 mt-1 leading-snug">Lembrete amigável com link do boleto/PIX antes do vencimento.</p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                    <input type="checkbox" className="w-5 h-5 rounded text-green-600 border-gray-300 mt-0.5 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700" checked={companySettings.client_billing_reminder_today} onChange={() => toggleCompanySetting('client_billing_reminder_today')} />
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 dark:text-white block">Aviso de Vencimento (No Dia)</span>
                                        <p className="text-xs text-gray-500 mt-1 leading-snug">Mensagem urgente no dia que a fatura vence.</p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                    <input type="checkbox" className="w-5 h-5 rounded text-green-600 border-gray-300 mt-0.5 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700" checked={companySettings.client_billing_reminder_2d_after} onChange={() => toggleCompanySetting('client_billing_reminder_2d_after')} />
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 dark:text-white block">Aviso de Fatura Vencida (2 Dias Depois)</span>
                                        <p className="text-xs text-gray-500 mt-1 leading-snug">Cobrança de pendência para faturas não pagas.</p>
                                    </div>
                                </label>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
