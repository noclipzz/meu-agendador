"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, HelpCircle } from "lucide-react";
import { createPortal } from "react-dom";

type Step = {
    targetId: string;
    title: string;
    content: string;
    position: 'bottom' | 'top' | 'left' | 'right' | 'center';
};

const steps: Step[] = [
    {
        targetId: "",
        title: "Bem-vindo ao NOHUD! 🚀",
        content: "Olá! Estamos felizes em ter você aqui. Preparamos este guia rápido para você dominar todas as ferramentas do seu novo painel de gestão.",
        position: 'center'
    },
    {
        targetId: "tour-dashboard-content",
        title: "Sua Visão Geral 📊",
        content: "Aqui você tem um resumo em tempo real do faturamento, agendamentos do dia e alertas de estoque. Tudo o que você precisa para começar o dia!",
        position: 'bottom'
    },
    {
        targetId: "tour-sidebar",
        title: "Menu de Navegação 🧭",
        content: "É por aqui que você acessa todas as áreas do sistema: Clientes, Financeiro, Serviços e Equipe.",
        position: 'right'
    },
    {
        targetId: "tour-new-appointment",
        title: "O Coração do Negócio ❤️",
        content: "Sempre que precisar marcar um novo cliente, use este botão. Ele é rápido, inteligente e já verifica conflitos de horário automaticamente.",
        position: 'right'
    },
    {
        targetId: "tour-nav-profissionais",
        title: "Sua Equipe 👥",
        content: "Em 'Equipe', você cadastra seus profissionais e define os horários de trabalho e comissões de cada um.",
        position: 'right'
    },
    {
        targetId: "tour-nav-config",
        title: "Personalização ⚙️",
        content: "Aqui você define o nome da sua empresa, horários de pausa, logo e as mensagens automáticas de WhatsApp para seus clientes.",
        position: 'right'
    },
    {
        targetId: "",
        title: "Pronto para Decolar! ✨",
        content: "O guia terminou, mas o suporte nunca acaba. Se precisar de ajuda, basta explorar as ferramentas. Sucesso nos seus negócios!",
        position: 'center'
    }
];

export function UserGuide() {
    const [currentStep, setCurrentStep] = useState(-1);
    const [mounted, setMounted] = useState(false);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        setMounted(true);
        const hasCompleted = localStorage.getItem("nohud-guide-completed");
        if (!hasCompleted) {
            const timer = setTimeout(() => setCurrentStep(0), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        if (currentStep >= 0 && currentStep < steps.length) {
            updateStyles();
            window.addEventListener('resize', updateStyles);
            return () => window.removeEventListener('resize', updateStyles);
        }
    }, [currentStep]);

    const updateStyles = () => {
        const step = steps[currentStep];
        if (!step.targetId) {
            setSpotlightStyle({ display: 'none' });
            setPopoverStyle({
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000
            });
            return;
        }

        const element = document.getElementById(step.targetId);
        if (element) {
            const rect = element.getBoundingClientRect();
            const padding = 8;

            setSpotlightStyle({
                position: 'fixed',
                top: rect.top - padding,
                left: rect.left - padding,
                width: rect.width + (padding * 2),
                height: rect.height + (padding * 2),
                borderRadius: '16px',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 15px rgba(37, 99, 235, 0.5)',
                zIndex: 998,
                pointerEvents: 'none',
                transition: 'all 0.3s ease-in-out'
            });

            const popPadding = 20;
            let top = rect.bottom + popPadding;
            let left = rect.left + (rect.width / 2);
            let transform = 'translateX(-50%)';

            if (step.position === 'right') {
                top = rect.top + (rect.height / 2);
                left = rect.right + popPadding;
                transform = 'translateY(-50%)';
            } else if (step.position === 'top') {
                top = rect.top - popPadding;
                left = rect.left + (rect.width / 2);
                transform = 'translate(-50%, -100%)';
            }

            // Boundary checks
            if (left + 150 > window.innerWidth) left = window.innerWidth - 170;
            if (left - 150 < 0) left = 170;

            setPopoverStyle({
                position: 'fixed',
                top: top,
                left: left,
                transform: transform,
                zIndex: 1000,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            });
        }
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            finish();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const finish = () => {
        setCurrentStep(-1);
        localStorage.setItem("nohud-guide-completed", "true");
    };

    if (!mounted || currentStep === -1) return null;

    const step = steps[currentStep];

    return createPortal(
        <div className="fixed inset-0 z-[999] pointer-events-none overflow-hidden">
            {/* Spotlight */}
            <div style={spotlightStyle} />

            {/* Popover */}
            <div
                style={popoverStyle}
                className="w-[320px] pointer-events-auto animate-in zoom-in-95 duration-300"
            >
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white dark:border-gray-800 shadow-2xl rounded-[2.5rem] p-6 relative overflow-hidden group">
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />

                    <button
                        onClick={finish}
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/30">
                            {currentStep === 0 || currentStep === steps.length - 1 ? <Sparkles size={18} /> : <HelpCircle size={18} />}
                        </div>
                        <h4 className="font-black text-gray-900 dark:text-white text-base">
                            {step.title}
                        </h4>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 text-sm font-medium leading-relaxed mb-6">
                        {step.content}
                    </p>

                    <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-4 bg-blue-600' : 'w-1 bg-gray-200 dark:bg-gray-700'}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-2">
                            {currentStep > 0 && (
                                <button
                                    onClick={prevStep}
                                    className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            <button
                                onClick={nextStep}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition"
                            >
                                {currentStep === steps.length - 1 ? (
                                    <>Começar <CheckCircle2 size={18} /></>
                                ) : (
                                    <>Próximo <ChevronRight size={18} /></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
