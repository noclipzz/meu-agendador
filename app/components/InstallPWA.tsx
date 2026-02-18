"use client";

import { useState, useEffect } from "react";
import {
    Download, X, Share, PlusSquare, Smartphone,
    Bell, BellRing, CheckCircle2, AlertTriangle, Loader2,
    MoreVertical
} from "lucide-react";
import { subscribeUserToPush } from "@/lib/push-notifications";
import { toast } from "sonner";

// Hook compartilhado para lógica de PWA e Notificações
function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [canInstall, setCanInstall] = useState(false);
    const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
    const [notificationDenied, setNotificationDenied] = useState(false);

    useEffect(() => {
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        setIsStandalone(isStandaloneMode);

        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isAndroidDevice = /android/.test(userAgent);

        setIsIOS(isIosDevice);
        setIsAndroid(isAndroidDevice);

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // No iOS ou Android, sempre podemos sugerir a instalação manual se não estiver em standalone
        if ((isIosDevice || isAndroidDevice) && !isStandaloneMode) {
            setCanInstall(true);
        }

        if (typeof window !== "undefined" && "Notification" in window) {
            setHasNotificationPermission(Notification.permission === "granted");
            setNotificationDenied(Notification.permission === "denied");
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const install = async () => {
        if (isIOS) return "ios";
        if (!deferredPrompt) return "manual"; // Retorna manual se o prompt não existir

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setCanInstall(false);
            return "success";
        }
        return "dismissed";
    };

    const enableNotifications = async () => {
        if (typeof window === "undefined" || !("Notification" in window)) return false;
        if (Notification.permission === "denied") {
            setNotificationDenied(true);
            return false;
        }
        try {
            await subscribeUserToPush();
            setHasNotificationPermission(true);
            setNotificationDenied(false);
            toast.success("Alertas ativos! 🔔");
            return true;
        } catch (error: any) {
            if (Notification.permission === "denied") setNotificationDenied(true);
            toast.error(`Erro: ${error.message}`);
            return false;
        }
    };

    return {
        canInstall,
        isStandalone,
        isIOS,
        isAndroid,
        install,
        enableNotifications,
        hasNotificationPermission,
        notificationDenied,
        hasDeferredPrompt: !!deferredPrompt
    };
}

export function InstallPWA() {
    const {
        canInstall, isStandalone, isIOS, isAndroid,
        install, enableNotifications, hasNotificationPermission,
        notificationDenied, hasDeferredPrompt
    } = usePWAInstall();

    const [showPrompt, setShowPrompt] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [showAndroidManual, setShowAndroidManual] = useState(false);

    useEffect(() => {
        if (isStandalone && !hasNotificationPermission && !notificationDenied && !sessionStorage.getItem('pwa-alerts-dismissed')) {
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }
        if (canInstall && !isStandalone && !sessionStorage.getItem('pwa-prompt-dismissed')) {
            const timer = setTimeout(() => setShowPrompt(true), 5000);
            return () => clearTimeout(timer);
        }
    }, [canInstall, isStandalone, hasNotificationPermission, notificationDenied]);

    const handleActionClick = async () => {
        if (isStandalone) {
            if (notificationDenied) {
                toast.info("Ative nos Ajustes do seu sistema.");
                return;
            }
            setIsSubscribing(true);
            const success = await enableNotifications();
            if (success) {
                setShowPrompt(false);
                sessionStorage.setItem('pwa-alerts-dismissed', 'true');
            }
            setIsSubscribing(false);
        } else {
            const result = await install();
            if (result === "success") {
                setShowPrompt(false);
            } else if (result === "manual") {
                setShowAndroidManual(true);
            }
        }
    };

    const dismissPrompt = () => {
        setShowPrompt(false);
        if (isStandalone) sessionStorage.setItem('pwa-alerts-dismissed', 'true');
        else sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    if (!showPrompt || (isStandalone && hasNotificationPermission && !notificationDenied)) return null;

    return (
        <div className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-8 md:w-96 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/30 shadow-2xl rounded-3xl p-5 relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-500" />

                <button onClick={dismissPrompt} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <X size={20} />
                </button>

                <div className="flex gap-4 items-start">
                    <div className={`${isStandalone ? (notificationDenied ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-blue-600'} p-3 rounded-2xl text-white shadow-lg flex-shrink-0 transition-colors duration-500`}>
                        {isStandalone ? (notificationDenied ? <AlertTriangle size={24} /> : <BellRing size={24} className="animate-bounce" />) : <Download size={24} />}
                    </div>

                    <div className="flex-1 pr-6">
                        <h3 className="font-black text-gray-900 dark:text-white text-lg leading-tight mb-1">
                            {isStandalone ? (notificationDenied ? "Alertas Bloqueados" : "Ativar Alertas") : "Instalar Aplicativo"}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed">
                            {isStandalone
                                ? notificationDenied
                                    ? "Notificações bloqueadas. Reative nas configurações para receber alertas."
                                    : "Não perca nenhum agendamento! Ative as notificações em tempo real."
                                : isIOS
                                    ? "Adicione à sua tela de início para uma experiência completa."
                                    : "Instale o app para acesso rápido e melhor performance."
                            }
                        </p>
                    </div>
                </div>

                <div className="mt-5">
                    {isStandalone ? (
                        notificationDenied ? (
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 space-y-2 text-[10px] font-bold">
                                <p className="text-amber-700 dark:text-amber-400 uppercase tracking-wider">Como reativar:</p>
                                <p className="text-amber-600 dark:text-amber-500">Ajustes &gt; Notificações &gt; NOHUD &gt; Permitir</p>
                            </div>
                        ) : (
                            <button onClick={handleActionClick} disabled={isSubscribing} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2">
                                {isSubscribing ? <Loader2 className="animate-spin" /> : <BellRing size={20} />}
                                {isSubscribing ? "Ativando..." : "Ativar Alertas Agora"}
                            </button>
                        )
                    ) : (isIOS || (isAndroid && showAndroidManual && !hasDeferredPrompt)) ? (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3">
                            <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                {isIOS ? "Passo a passo no iPhone:" : "Passo a passo no Android:"}
                            </p>
                            <ol className="text-[11px] font-bold text-gray-600 dark:text-gray-300 space-y-2 list-decimal ml-4">
                                {isIOS ? (
                                    <>
                                        <li>Pressione os <b>...</b></li>
                                        <li>Escolha <b><Share size={12} className="inline mr-1" /> Compartilhar</b></li>
                                        <li>Toque em <b>Adicionar à Tela de Início</b></li>
                                    </>
                                ) : (
                                    <>
                                        <li>Toque nos <b><MoreVertical size={12} className="inline" /> três pontinhos</b> no topo</li>
                                        <li>Selecione <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b></li>
                                    </>
                                )}
                            </ol>
                        </div>
                    ) : (
                        <button onClick={handleActionClick} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2">
                            <PlusSquare size={20} />
                            Instalar Agora
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function InstallSidebarButton() {
    const {
        canInstall, isStandalone, isIOS, isAndroid,
        install, enableNotifications, hasNotificationPermission,
        notificationDenied, hasDeferredPrompt
    } = usePWAInstall();

    const [showHint, setShowHint] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);

    // Se já tem permissão de notificação, esconde o botão lateral (conforme pedido)
    if (hasNotificationPermission) return null;

    // Se estiver em modo App (Standalone) mas sem permissão (e não negado), mostra para ativar.
    // Se for navegador e puder instalar, mostra para instalar.
    if (isStandalone && !notificationDenied) {
        // Mostra botão para ativar notificações
    } else if (canInstall && !isStandalone) {
        // Mostra botão para instalar
    } else {
        // Caso contrário, esconde (ex: navegador desktop que não suporta install ou já negou)
        return null;
    }

    const handleClick = async () => {
        if (isStandalone) {
            if (notificationDenied) {
                toast.info("Ative nos Ajustes do sistema.");
                return;
            }
            setIsSubscribing(true);
            await enableNotifications();
            setIsSubscribing(false);
            return;
        }

        const result = await install();
        if (result === "manual" || (isIOS && !isStandalone)) {
            setShowHint(!showHint);
        }
    };

    return (
        <div className="w-full">
            <button
                onClick={handleClick}
                disabled={isSubscribing}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold border ${isStandalone
                    ? notificationDenied ? "text-amber-600 bg-amber-50 border-amber-100" : "text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100"
                    : "text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-900/20"
                    }`}
            >
                {isStandalone ? (notificationDenied ? <AlertTriangle size={20} /> : <Bell size={20} />) : <Smartphone size={20} />}
                <div className="flex flex-col items-start leading-tight">
                    <span className="text-xs">
                        {isStandalone ? (notificationDenied ? "Alertas Bloqueados" : (isSubscribing ? "Ativando..." : "Ativar Alertas")) : "Instalar App"}
                    </span>
                </div>
            </button>

            {showHint && !isStandalone && (
                <div className="mt-2 p-3 bg-white dark:bg-gray-950 rounded-xl border border-blue-100 text-[10px] font-bold text-gray-500 animate-in zoom-in-95">
                    <p>Clique {isIOS ? "em Compartilhar" : "nos 3 pontinhos"} e selecione <b>{isIOS ? "Adicionar à Tela de Início" : "Instalar aplicativo"}</b>.</p>
                </div>
            )}
        </div>
    );
}
