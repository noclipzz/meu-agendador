"use client";

import { useState, useEffect } from "react";
import {
    X, ChevronRight, ChevronLeft, CheckCircle2,
    Sparkles, LayoutDashboard, Calendar, Users,
    Settings, PlusCircle, Briefcase, ShieldCheck
} from "lucide-react";
import { createPortal } from "react-dom";

type Step = {
    title: string;
    content: string;
    icon: React.ReactNode;
    color: string;
};

const steps: Step[] = [
    {
        title: "Bem-vindo ao NOHUD! 🚀",
        content: "Olá! Estamos felizes em ter você aqui. Preparamos este guia rápido para você dominar todas as ferramentas do seu novo painel de gestão.",
        icon: <Sparkles size={48} />,
        color: "bg-blue-600"
    },
    {
        title: "Sua Visão Geral 📊",
        content: "No Dashboard, você tem um resumo em tempo real do faturamento, agendamentos do dia e alertas de estoque. Tudo o que você precisa em uma única tela.",
        icon: <LayoutDashboard size={48} />,
        color: "bg-emerald-600"
    },
    {
        title: "Sua Agenda Inteligente 📅",
        content: "Gerencie todos os seus horários com facilidade. O sistema já verifica conflitos automaticamente e avisa você em tempo real.",
        icon: <Calendar size={48} />,
        color: "bg-purple-600"
    },
    {
        title: "Gestores de Clientes 👥",
        content: "Mantenha o histórico completo de seus clientes, com telefone, prontuários e frequência de visitas sempre à mão.",
        icon: <Users size={48} />,
        color: "bg-amber-600"
    },
    {
        title: "Novo Agendamento ➕",
        content: "Sempre que precisar marcar um novo cliente, use o botão azul na lateral. Ele é rápido e intuitivo para não tomar o seu tempo.",
        icon: <PlusCircle size={48} />,
        color: "bg-blue-600"
    },
    {
        title: "Equipe e Serviços 💼",
        content: "Cadastre seus profissionais, defina horários de trabalho e crie sua lista de serviços com preços e durações personalizadas.",
        icon: <Briefcase size={48} />,
        color: "bg-indigo-600"
    },
    {
        title: "Personalização Completa ⚙️",
        content: "Em Configurações, você define o nome do negócio, logo e ativa os Alertas de WhatsApp para reduzir as faltas dos seus clientes.",
        icon: <Settings size={48} />,
        color: "bg-gray-700"
    },
    {
        title: "Pronto para Decolar! ✨",
        content: "O guia terminou, mas o suporte nunca acaba. Explore as ferramentas e sinta-se à vontade. Sucesso nos seus negócios!",
        icon: <ShieldCheck size={48} />,
        color: "bg-green-600"
    }
];

export function UserGuide() {
    const [currentStep, setCurrentStep] = useState(-1);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const hasCompleted = localStorage.getItem("nohud-guide-completed-v2");
        if (!hasCompleted) {
            const timer = setTimeout(() => setCurrentStep(0), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Bloqueia Scroll quando o guia está aberto
    useEffect(() => {
        if (currentStep !== -1) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [currentStep]);

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
        localStorage.setItem("nohud-guide-completed-v2", "true");
    };

    if (!mounted || currentStep === -1) return null;

    const step = steps[currentStep];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop Negro Blur (Impede cliques/scroll no fundo) */}
            <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-md" />

            {/* Modal de Tutorial */}
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 dark:border-gray-800 animate-in zoom-in-95 duration-500">

                {/* Cabeçalho de Cor */}
                <div className={`${step.color} h-48 flex items-center justify-center text-white transition-colors duration-500 relative`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
                    <div className="relative z-10 animate-bounce">
                        {step.icon}
                    </div>

                    <button
                        onClick={finish}
                        className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="p-8 md:p-10 text-center">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
                        {step.title}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm md:text-base leading-relaxed mb-10 min-h-[80px]">
                        {step.content}
                    </p>

                    {/* Barra de Progresso */}
                    <div className="flex justify-center gap-1.5 mb-10">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200 dark:bg-gray-800'}`}
                            />
                        ))}
                    </div>

                    {/* Navegação */}
                    <div className="flex gap-4">
                        {currentStep > 0 ? (
                            <button
                                onClick={prevStep}
                                className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-black py-4 rounded-2xl transition flex items-center justify-center gap-2"
                            >
                                <ChevronLeft size={20} /> Voltar
                            </button>
                        ) : null}

                        <button
                            onClick={nextStep}
                            className={`${currentStep > 0 ? 'flex-[2]' : 'w-full'} bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition flex items-center justify-center gap-2`}
                        >
                            {currentStep === steps.length - 1 ? (
                                <>Começar Agora <CheckCircle2 size={20} /></>
                            ) : (
                                <>Próximo Passo <ChevronRight size={20} /></>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer Decorativo */}
                <div className="pb-6 text-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-50">
                        Tutorial NOHUD • Passo {currentStep + 1} de {steps.length}
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
}
