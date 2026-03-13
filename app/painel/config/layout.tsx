"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    Settings, FileText, Bell, Star, 
    Tag, CreditCard, Briefcase, Building2, 
    Calculator, Users, Code, ShieldCheck 
} from "lucide-react";

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        { name: "GERAL", path: "/painel/config/gerais", icon: <Settings size={14} /> },
        { name: "BOLETOS", path: "/painel/config/faturamento?tab=boletos", icon: <FileText size={14} /> },
        { name: "FISCAL", path: "/painel/config/faturamento", icon: <FileText size={14} /> },
        { name: "NOTIFICAÇÕES", path: "/painel/config/notificacoes", icon: <Bell size={14} /> },
        { name: "MEU PLANO", path: "/painel/config/plano", icon: <Star size={14} /> },
    ];

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Configurações</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Gerencie todos os aspectos da sua empresa.</p>
            </header>

            {/* BARRA DE ABAS */}
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden overflow-x-auto custom-scrollbar flex shrink-0">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.path || (pathname.startsWith(tab.path) && tab.path !== "/painel/config");
                    return (
                        <Link
                            key={tab.name}
                            href={tab.path}
                            className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2
                                ${isActive 
                                    ? "bg-emerald-500 text-white border-emerald-600" 
                                    : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent"
                                }`}
                        >
                            {tab.icon}
                            {tab.name}
                        </Link>
                    );
                })}
            </div>

            <div className="animate-in fade-in duration-500">
                {children}
            </div>
        </div>
    );
}
