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
            daily_agenda_email: true,
            daily_agenda_push: true,
            financial_summaries_email: true,
            financial_summaries_push: true,
            booking_cancellation_email: true,
            booking_cancellation_push: true,
            payment_received_email: true,
            payment_received_push: true,
            waiting_list_email: true,
            waiting_list_push: true,
            stock_alerts_email: true,
            stock_alerts_push: true
        } as Record<string, boolean>
    });

    // Configurações da Empresa (Company.notificationSettings)
    const [companySettings, setCompanySettings] = useState({
        client_new_booking_whatsapp: true,
        client_new_booking_email: true,
        client_reminder_whatsapp: true,
        client_reminder_email: true,
        client_waiting_list_whatsapp: true,
        client_waiting_list_email: true,
        client_payment_whatsapp: true,
        client_payment_email: true,
        client_confirm_whatsapp: true,
        client_confirm_email: true,
        client_cancel_whatsapp: true,
        client_cancel_email: true,
        client_order_whatsapp: true,
        client_order_email: true,
        client_billing_email: true,
        client_billing_reminder_5d: true,
        client_billing_reminder_today: true,
        client_billing_reminder_2d_after: true,
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
                            daily_agenda_email: data.userPref.settings?.daily_agenda_email ?? true,
                            daily_agenda_push: data.userPref.settings?.daily_agenda_push ?? true,
                            financial_summaries_email: data.userPref.settings?.financial_summaries_email ?? true,
                            financial_summaries_push: data.userPref.settings?.financial_summaries_push ?? true,
                            booking_cancellation_email: data.userPref.settings?.booking_cancellation_email ?? true,
                            booking_cancellation_push: data.userPref.settings?.booking_cancellation_push ?? true,
                            payment_received_email: data.userPref.settings?.payment_received_email ?? true,
                            payment_received_push: data.userPref.settings?.payment_received_push ?? true,
                            waiting_list_email: data.userPref.settings?.waiting_list_email ?? true,
                            waiting_list_push: data.userPref.settings?.waiting_list_push ?? true,
                            stock_alerts_email: data.userPref.settings?.stock_alerts_email ?? true,
                            stock_alerts_push: data.userPref.settings?.stock_alerts_push ?? true,
                        }
                    });
                }

                setCompanySettings({
                    client_new_booking_whatsapp: data.companySettings?.client_new_booking_whatsapp ?? true,
                    client_new_booking_email: data.companySettings?.client_new_booking_email ?? true,
                    client_reminder_whatsapp: data.companySettings?.client_reminder_whatsapp ?? true,
                    client_reminder_email: data.companySettings?.client_reminder_email ?? true,
                    client_waiting_list_whatsapp: data.companySettings?.client_waiting_list_whatsapp ?? true,
                    client_waiting_list_email: data.companySettings?.client_waiting_list_email ?? true,
                    client_payment_whatsapp: data.companySettings?.client_payment_whatsapp ?? true,
                    client_payment_email: data.companySettings?.client_payment_email ?? true,
                    client_confirm_whatsapp: data.companySettings?.client_confirm_whatsapp ?? true,
                    client_confirm_email: data.companySettings?.client_confirm_email ?? true,
                    client_cancel_whatsapp: data.companySettings?.client_cancel_whatsapp ?? true,
                    client_cancel_email: data.companySettings?.client_cancel_email ?? true,
                    client_order_whatsapp: data.companySettings?.client_order_whatsapp ?? true,
                    client_order_email: data.companySettings?.client_order_email ?? true,
                    client_billing_email: data.companySettings?.client_billing_email ?? true,
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-end gap-4">
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
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition">Novos Agendamentos</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.booking_cancellation_push} onChange={() => toggleUserSetting('booking_cancellation_push')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition">Cancelamentos de Clientes</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.payment_received_push} onChange={() => toggleUserSetting('payment_received_push')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition">Pagamentos Recebidos</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.daily_agenda_push} onChange={() => toggleUserSetting('daily_agenda_push')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition">Alerta Matinal (Agenda)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.financial_summaries_push} onChange={() => toggleUserSetting('financial_summaries_push')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition">Resumos Financeiros</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.waiting_list_push} onChange={() => toggleUserSetting('waiting_list_push')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition">Entradas na Lista de Espera</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.stock_alerts_push} onChange={() => toggleUserSetting('stock_alerts_push')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition">Alertas de Estoque Baixo</span>
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
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition">Novos Agendamentos</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.booking_cancellation_email} onChange={() => toggleUserSetting('booking_cancellation_email')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition">Cancelamentos de Clientes</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.payment_received_email} onChange={() => toggleUserSetting('payment_received_email')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition">Pagamentos Recebidos</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.daily_agenda_email} onChange={() => toggleUserSetting('daily_agenda_email')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition">Alerta Matinal (Agenda)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.financial_summaries_email} onChange={() => toggleUserSetting('financial_summaries_email')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition">Resumos Financeiros</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.waiting_list_email} onChange={() => toggleUserSetting('waiting_list_email')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition">Entradas na Lista de Espera</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" checked={userPref.settings.stock_alerts_email} onChange={() => toggleUserSetting('stock_alerts_email')} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition">Alertas de Estoque Baixo</span>
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
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-800 dark:text-white block">Aviso de Confirmação (Reserva)</span>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500" checked={companySettings.client_new_booking_whatsapp} onChange={() => toggleCompanySetting('client_new_booking_whatsapp')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Zap</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" checked={companySettings.client_new_booking_email} onChange={() => toggleCompanySetting('client_new_booking_email')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Email</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">Dispara imediatamente após o agendamento pedindo o confere.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-800 dark:text-white block">Lembretes 24h Antes</span>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500" checked={companySettings.client_reminder_whatsapp} onChange={() => toggleCompanySetting('client_reminder_whatsapp')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Zap</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" checked={companySettings.client_reminder_email} onChange={() => toggleCompanySetting('client_reminder_email')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Email</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">Ajuda a diminuir o "No-Show" e esquecimento.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-800 dark:text-white block">Aviso de Confirmado</span>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500" checked={companySettings.client_confirm_whatsapp} onChange={() => toggleCompanySetting('client_confirm_whatsapp')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Zap</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" checked={companySettings.client_confirm_email} onChange={() => toggleCompanySetting('client_confirm_email')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Email</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">O Bot avisa o cliente quando você aceita no painel.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-800 dark:text-white block">Aviso de Cancelamento</span>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500" checked={companySettings.client_cancel_whatsapp} onChange={() => toggleCompanySetting('client_cancel_whatsapp')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Zap</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" checked={companySettings.client_cancel_email} onChange={() => toggleCompanySetting('client_cancel_email')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Email</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">Informa que o horário foi removido ou cancelado.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-800 dark:text-white block">Fila de Espera Automática</span>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500" checked={companySettings.client_waiting_list_whatsapp} onChange={() => toggleCompanySetting('client_waiting_list_whatsapp')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Zap</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" checked={companySettings.client_waiting_list_email} onChange={() => toggleCompanySetting('client_waiting_list_email')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Email</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">Avisa os clientes quando surge nova vaga.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-800 dark:text-white block">Pagamento Fatura (Baixa)</span>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500" checked={companySettings.client_payment_whatsapp} onChange={() => toggleCompanySetting('client_payment_whatsapp')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Zap</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" checked={companySettings.client_payment_email} onChange={() => toggleCompanySetting('client_payment_email')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Email</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">Avisa o cliente quando o pagamento de uma fatura cai.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-800 dark:text-white block">Venda Vitrine / Comprovante</span>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500" checked={companySettings.client_order_whatsapp} onChange={() => toggleCompanySetting('client_order_whatsapp')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Zap</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" checked={companySettings.client_order_email} onChange={() => toggleCompanySetting('client_order_email')} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Email</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">Envia o resumo do pedido e link de pagamento.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-4 p-4 rounded-xl border dark:border-gray-700/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer transition">
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-800 dark:text-white block">Lembretes de Fatura (Vencimento)</span>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" checked={companySettings.client_billing_email} onChange={() => {
                                                            const val = !companySettings.client_billing_email;
                                                            setCompanySettings(prev => ({
                                                                ...prev,
                                                                client_billing_email: val,
                                                                client_billing_reminder_5d: val,
                                                                client_billing_reminder_today: val,
                                                                client_billing_reminder_2d_after: val
                                                            }));
                                                        }} />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Email</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 opacity-50 cursor-not-allowed">
                                                        <input type="checkbox" checked={true} disabled className="w-4 h-4 rounded text-green-600 border-gray-300" />
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Zap (Auto)</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">Envia alertas de vencimento (5d antes, no dia e 2d depois).</p>
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
