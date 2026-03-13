"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    BarChart3, TrendingUp, TrendingDown, ClipboardList, Barcode, FileText, Tag, Building2
} from "lucide-react";

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        { name: "VISÃO GERAL", path: "/painel/financeiro", icon: <BarChart3 size={14} /> },
        { name: "CONTAS A RECEBER", path: "/painel/financeiro/contas-receber", icon: <TrendingUp size={14} /> },
        { name: "CONTAS A PAGAR", path: "/painel/financeiro/contas-pagar", icon: <TrendingDown size={14} /> },
        { name: "PLANO DE CONTAS", path: "/painel/financeiro/auxiliares?tab=categorias", icon: <Tag size={14} /> },
        { name: "CONTAS CAIXA", path: "/painel/financeiro/contas-bancarias", icon: <Building2 size={14} /> },
        { name: "BOLETOS", path: "/painel/financeiro/boletos", icon: <Barcode size={14} /> },
        { name: "NOTA FISCAL", path: "/painel/financeiro/notas-fiscais", icon: <FileText size={14} /> },
        { name: "RELATÓRIOS", path: "/painel/financeiro/relatorios", icon: <ClipboardList size={14} /> },
    ];

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Financeiro</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Controle suas receitas, despesas e saúde financeira.</p>
            </header>

            {/* BARRA DE ABAS */}
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden overflow-x-auto custom-scrollbar flex shrink-0">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.path || (pathname.startsWith(tab.path) && tab.path !== "/painel/financeiro") || (tab.path === "/painel/financeiro/relatorios" && (pathname === "/painel/financeiro/dre" || pathname === "/painel/financeiro/fluxo-caixa"));
                    
                    return (
                        <Link
                            key={tab.name}
                            href={tab.path}
                            className={`flex items-center gap-3 px-6 py-4 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2
                                ${isActive 
                                    ? "bg-blue-600 text-white border-blue-700" 
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
