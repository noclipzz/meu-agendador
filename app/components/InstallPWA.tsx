"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";

// Hook compartilhado para lógica de PWA
function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [canInstall, setCanInstall] = useState(false);

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

        // No iOS, podemos "instalar" se não estiver em standalone
        if (isIosDevice && !isStandaloneMode) {
            setCanInstall(true);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const install = async () => {
        if (isIOS) {
            // Para iOS apenas informamos (não há API de trigger)
            return "ios";
        }

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

    return { canInstall, isStandalone, isIOS, install };
}

// Banner flutuante (Prompt Proativo)
export function InstallPWA() {
    const { canInstall, isStandalone, isIOS, install } = usePWAInstall();
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        if (canInstall && !isStandalone && !sessionStorage.getItem('pwa-prompt-dismissed')) {
            const timer = setTimeout(() => setShowPrompt(true), 3000); // Mostra após 3s
            return () => clearTimeout(timer);
        }
    }, [canInstall, isStandalone]);

    const handleInstallClick = async () => {
        const result = await install();
        if (result === true) {
            setShowPrompt(false);
        }
    };

    const dismissPrompt = () => {
        setShowPrompt(false);
        sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    if (!showPrompt || isStandalone) return null;

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
                    <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20 flex-shrink-0">
                        <Download size={24} />
                    </div>

                    <div className="flex-1 pr-6">
                        <h3 className="font-black text-gray-900 dark:text-white text-lg leading-tight mb-1">
                            Instalar Aplicativo
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed">
                            {isIOS
                                ? "Adicione à sua tela de início para acesso rápido e melhor experiência."
                                : "Tenha acesso rápido aos seus agendamentos direto da tela inicial."
                            }
                        </p>
                    </div>
                </div>

                <div className="mt-5">
                    {isIOS ? (
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
                            onClick={handleInstallClick}
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
    const { canInstall, isStandalone, isIOS, install } = usePWAInstall();
    const [showIOSHint, setShowIOSHint] = useState(false);

    if (isStandalone || !canInstall) return null;

    const handleClick = async () => {
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
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all font-bold border border-blue-100 dark:border-blue-900/20"
            >
                <Smartphone size={20} />
                <div className="flex flex-col items-start leading-tight">
                    <span className="text-xs">Instalar como App</span>
                </div>
            </button>

            {isIOS && showIOSHint && (
                <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-xl border-2 border-blue-200 dark:border-blue-800 text-[10px] font-bold text-gray-500 animate-in zoom-in-95 duration-200">
                    <p className="leading-relaxed">
                        Toque em <span className="italic">...</span>, depois em <span className="text-blue-500 italic">Compartilhar</span> e selecione <span className="underline">Adicionar à Tela de Início</span>.
                    </p>
                </div>
            )}
        </div>
    );
}
