"use client";

import { Check, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface AddonPaywallProps {
    title: string;
    description: string;
    benefits: string[];
    icon: ReactNode;
    color?: "blue" | "indigo" | "emerald" | "amber";
}

export function AddonPaywall({ title, description, benefits, icon, color = "blue" }: AddonPaywallProps) {
    const colorClasses = {
        blue: "from-blue-600 to-blue-700 shadow-blue-500/30",
        indigo: "from-indigo-600 to-indigo-700 shadow-indigo-500/30",
        emerald: "from-emerald-600 to-emerald-700 shadow-emerald-500/30",
        amber: "from-amber-500 to-amber-600 shadow-amber-500/30"
    };

    return (
        <div className="max-w-4xl mx-auto p-4 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="bg-white dark:bg-gray-900 rounded-[3rem] border dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col md:flex-row">

                {/* LADO ESQUERDO: APELO VISUAL */}
                <div className={`p-10 md:w-2/5 bg-gradient-to-br ${colorClasses[color]} text-white flex flex-col justify-between relative overflow-hidden`}>
                    <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
                        {icon && <div className="scale-[5]">{icon}</div>}
                    </div>

                    <div className="relative z-10">
                        <div className="bg-white/20 backdrop-blur-md w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-white/30 shadow-xl">
                            {icon}
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-3">Add-on<br />Premium</h2>
                        <div className="h-1 w-12 bg-white/50 rounded-full" />
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Investimento</p>
                            <p className="text-2xl font-black">R$ 19,90<span className="text-xs font-bold opacity-70"> /mês</span></p>
                        </div>
                    </div>
                </div>

                {/* LADO DIREITO: BENEFÍCIOS E CTA */}
                <div className="p-10 md:w-3/5 space-y-8 flex flex-col justify-center">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">{title}</h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                            {description}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {benefits.map((b, i) => (
                            <div key={i} className="flex items-center gap-3 group">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${color === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                    <Check size={14} className="font-bold" />
                                </div>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:translate-x-1 transition-transform">{b}</span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-4">
                        <Link
                            href="/painel/config/plano"
                            className={`flex-1 bg-gradient-to-r ${colorClasses[color]} text-white font-black py-4 rounded-2xl text-center shadow-lg hover:scale-[1.02] transition active:scale-95 flex items-center justify-center gap-2`}
                        >
                            Ativar Agora <ArrowRight size={18} />
                        </Link>
                        <button className="flex-1 border-2 dark:border-gray-800 text-gray-500 font-black py-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            Falar com Suporte
                        </button>
                    </div>

                    <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
                        Cancele ou pause quando quiser • Ativação Instantânea
                    </p>
                </div>
            </div>
        </div>
    );
}
