"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Lock, Rocket } from "lucide-react";

interface AddonPaywallProps {
    title: string;
    description: string;
    benefits: string[];
    icon: React.ReactNode;
    color: string;
}

export function AddonPaywall({ title, description, benefits, icon, color }: AddonPaywallProps) {
    const router = useRouter();

    const handleAction = () => {
        router.push("/painel/config/plano");
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-3xl w-full bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border dark:border-gray-800 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Lado Esquerdo - Info */}
                    <div className="p-8 md:p-12 space-y-6">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg mb-4 bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`}>
                            {icon}
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                                {title}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                {description}
                            </p>
                        </div>

                        <ul className="space-y-3">
                            {benefits.map((benefit, i) => (
                                <li key={i} className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-bold text-sm">
                                    <CheckCircle2 className={`text-${color}-500 shrink-0`} size={18} />
                                    {benefit}
                                </li>
                            ))}
                        </ul>

                        <div className="pt-4 flex flex-col gap-3">
                            <button
                                onClick={handleAction}
                                className={`w-full py-4 px-8 rounded-2xl bg-${color}-600 hover:bg-${color}-700 text-white font-black flex items-center justify-center gap-3 transition shadow-xl shadow-${color}-500/30 active:scale-95 group`}
                            >
                                <Rocket size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition" />
                                Ativar este Addon
                            </button>
                            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                Liberação imediata após ativação
                            </p>
                        </div>
                    </div>

                    {/* Lado Direito - Estético / Mockup */}
                    <div className={`hidden md:block bg-${color}-50 dark:bg-gray-800/50 relative p-12 overflow-hidden`}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-200 dark:text-gray-700 pointer-events-none">
                            {icon && <div style={{ transform: 'scale(10)' }}>{icon}</div>}
                        </div>

                        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center space-y-4">
                            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl border dark:border-gray-700 max-w-[280px] animate-bounce-slow">
                                <Lock className={`text-${color}-500 mb-4 mx-auto`} size={48} />
                                <h3 className="font-black text-gray-800 dark:text-white text-lg">Módulo Exclusivo</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                                    Potencialize seu faturamento com automação profissional.
                                </p>
                            </div>
                        </div>

                        {/* Elementos flutuantes */}
                        <div className={`absolute top-10 right-10 w-20 h-20 bg-${color}-200/50 rounded-full blur-2xl animate-pulse`} />
                        <div className={`absolute bottom-10 left-10 w-32 h-32 bg-${color}-300/30 rounded-full blur-3xl animate-pulse delay-700`} />
                    </div>
                </div>
            </div>
        </div>
    );
}
