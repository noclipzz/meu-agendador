"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone, Bell, BellRing, CheckCircle2 } from "lucide-react";
import { subscribeUserToPush } from "@/lib/push-notifications";
import { toast } from "sonner";

// Hook compartilhado para lógica de PWA e Notificações
function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [canInstall, setCanInstall] = useState(false);
    const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

    useEffect(() => {
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        setIsStandalone(isStandaloneMode);

        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        if (isIosDevice && !isStandaloneMode) {
            setCanInstall(true);
        }

        // Verifica permissão de notificação
        if ("Notification" in window) {
            setHasNotificationPermission(Notification.permission === "granted");
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const install = async () => {
        if (isIOS) return "ios";
        if (!deferredPrompt) return false;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setCanInstall(false);
            return true;
        }
        return false;
    };

    const enableNotifications = async () => {
        try {
            await subscribeUserToPush();
            setHasNotificationPermission(true);
            toast.success("Alertas ativados com sucesso! 🔔");
            return true;
        } catch (error: any) {
            toast.error(`Erro ao ativar alertas: ${error.message}`);
            return false;
        }
    };

    return {
        canInstall,
        isStandalone,
        isIOS,
        install,
        enableNotifications,
        hasNotificationPermission
    };
}

// Banner flutuante (Prompt Proativo)
export function InstallPWA() {
    const {
        canInstall,
        isStandalone,
        isIOS,
        install,
        enableNotifications,
        hasNotificationPermission
    } = usePWAInstall();

    const [showPrompt, setShowPrompt] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);

    useEffect(() => {
        // Se já instalou mas não ativou alertas, mostra o prompt de alertas
        if (isStandalone && !hasNotificationPermission && !sessionStorage.getItem('pwa-alerts-dismissed')) {
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }

        // Se não instalou, mostra o prompt de instalação
        if (canInstall && !isStandalone && !sessionStorage.getItem('pwa-prompt-dismissed')) {
            const timer = setTimeout(() => setShowPrompt(true), 5000);
            return () => clearTimeout(timer);
        }
    }, [canInstall, isStandalone, hasNotificationPermission]);

    const handleActionClick = async () => {
        if (isStandalone) {
            setIsSubscribing(true);
            const success = await enableNotifications();
            if (success) {
                setShowPrompt(false);
                sessionStorage.setItem('pwa-alerts-dismissed', 'true');
            }
            setIsSubscribing(false);
        } else {
            const result = await install();
            if (result === true) setShowPrompt(false);
        }
    };

    const dismissPrompt = () => {
        setShowPrompt(false);
        if (isStandalone) {
            sessionStorage.setItem('pwa-alerts-dismissed', 'true');
        } else {
            sessionStorage.setItem('pwa-prompt-dismissed', 'true');
        }
    };

    if (!showPrompt || (isStandalone && hasNotificationPermission)) return null;

    return (
        <div className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-8 md:w-96 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/30 shadow-2xl rounded-3xl p-5 relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-500" />

                <button
                    onClick={dismissPrompt}
                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex gap-4 items-start">
                    <div className={`${isStandalone ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-600 shadow-blue-500/20'} p-3 rounded-2xl text-white shadow-lg flex-shrink-0 transition-colors duration-500`}>
                        {isStandalone ? <BellRing size={24} className="animate-bounce" /> : <Download size={24} />}
                    </div>

                    <div className="flex-1 pr-6">
                        <h3 className="font-black text-gray-900 dark:text-white text-lg leading-tight mb-1">
                            {isStandalone ? "Ativar Alertas" : "Instalar Aplicativo"}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed">
                            {isStandalone
                                ? "Não perca nenhum agendamento! Ative os alertas para receber notificações em tempo real."
                                : isIOS
                                    ? "Adicione à sua tela de início para acesso rápido e melhor experiência."
                                    : "Tenha acesso rápido aos seus agendamentos direto da tela inicial."
                            }
                        </p>
                    </div>
                </div>

                <div className="mt-5">
                    {isStandalone ? (
                        <button
                            onClick={handleActionClick}
                            disabled={isSubscribing}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isSubscribing ? <Loader2 className="animate-spin" /> : <BellRing size={20} />}
                            {isSubscribing ? "Ativando..." : "Ativar Alertas Agora"}
                        </button>
                    ) : isIOS ? (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3">
                            <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Passo a passo no iPhone:</p>
                            <ol className="text-[11px] font-bold text-gray-600 dark:text-gray-300 space-y-2 list-decimal ml-4">
                                <li>Pressione os <span className="inline-flex items-center bg-white dark:bg-gray-800 border px-1.5 rounded ml-1 italic">...</span> (três pontinhos)</li>
                                <li>Escolha <span className="inline-flex items-center bg-white dark:bg-gray-800 border px-1.5 rounded ml-1"><Share size={12} className="mr-1 text-blue-500" /> Compartilhar</span></li>
                                <li>Role e toque em <span className="inline-flex items-center bg-white dark:bg-gray-800 border px-1.5 rounded ml-1"><PlusSquare size={12} className="mr-1" /> Adicionar à Tela de Início</span></li>
                            </ol>
                        </div>
                    ) : (
                        <button
                            onClick={handleActionClick}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <PlusSquare size={20} />
                            Instalar Agora
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Botão da Sidebar (Ponto de entrada permanente)
export function InstallSidebarButton() {
    const {
        canInstall,
        isStandalone,
        isIOS,
        install,
        enableNotifications,
        hasNotificationPermission
    } = usePWAInstall();

    const [showIOSHint, setShowIOSHint] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);

    // Se já instalou E já ativou alertas, não mostra nada
    if (isStandalone && hasNotificationPermission) return null;

    // Se não pode instalar e não está em standalone, não mostra nada
    if (!canInstall && !isStandalone) return null;

    const handleClick = async () => {
        if (isStandalone) {
            setIsSubscribing(true);
            await enableNotifications();
            setIsSubscribing(false);
            return;
        }

        if (isIOS) {
            setShowIOSHint(!showIOSHint);
            return;
        }
        await install();
    };

    return (
        <div className="w-full">
            <button
                onClick={handleClick}
                disabled={isSubscribing}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold border ${isStandalone
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 hover:bg-emerald-100"
                        : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/20 hover:bg-blue-100"
                    }`}
            >
                {isStandalone ? <Bell size={20} /> : <Smartphone size={20} />}
                <div className="flex flex-col items-start leading-tight">
                    <span className="text-xs">{isStandalone ? (isSubscribing ? "Ativando..." : "Ativar Alertas") : "Instalar App"}</span>
                </div>
            </button>

            {isIOS && !isStandalone && showIOSHint && (
                <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-xl border-2 border-blue-200 dark:border-blue-800 text-[10px] font-bold text-gray-500 animate-in zoom-in-95 duration-200">
                    <p className="leading-relaxed">
                        Toque em <span className="italic">...</span>, depois em <span className="text-blue-500 italic">Compartilhar</span> e selecione <span className="underline">Adicionar à Tela de Início</span>.
                    </p>
                </div>
            )}
        </div>
    );
}

import { Loader2 } from "lucide-react";
