"use client";

import React from "react";
import Link from "next/link";
import { 
    Layers, BarChart4, ChevronRight, TrendingUp, TrendingDown, Clock, Search 
} from "lucide-react";

export default function RelatoriosPage() {
    const reportCards = [
        {
            title: "Demonstração do Resultado (DRE)",
            description: "Visão gerencial de receitas, custos e despesas para apuração do lucro líquido.",
            icon: <Layers size={32} className="text-blue-600" />,
            path: "/painel/financeiro/dre",
            color: "blue"
        },
        {
            title: "Fluxo de Caixa",
            description: "Acompanhe todas as movimentações de entradas e saídas por período.",
            icon: <BarChart4 size={32} className="text-emerald-600" />,
            path: "/painel/financeiro/fluxo-caixa",
            color: "emerald"
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportCards.map((report) => (
                    <Link 
                        key={report.path} 
                        href={report.path}
                        className="group bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between"
                    >
                        <div className="space-y-4">
                            <div className={`p-4 bg-${report.color}-50 dark:bg-${report.color}-900/20 w-fit rounded-2xl`}>
                                {report.icon}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter group-hover:text-blue-600 transition-colors">
                                    {report.title}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
                                    {report.description}
                                </p>
                            </div>
                        </div>
                        
                        <div className="mt-8 flex items-center gap-2 text-sm font-black text-gray-400 group-hover:text-blue-600 transition-colors">
                            ACESSAR RELATÓRIO <ChevronRight size={16} />
                        </div>
                    </Link>
                ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-10 rounded-[3rem] border border-blue-100 dark:border-blue-800 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-2">
                    <h4 className="text-xl font-black text-blue-900 dark:text-blue-300 uppercase tracking-tight">Precisa de um relatório personalizado?</h4>
                    <p className="text-blue-700 dark:text-blue-400 font-medium max-w-md">Em breve teremos filtros avançados por categorias, centros de custo e profissionais na nossa área de busca global.</p>
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-blue-400">
                        <Search size={20} />
                    </div>
                    <input 
                        type="text" 
                        disabled 
                        placeholder="Pesquisar transações..." 
                        className="bg-white dark:bg-gray-800 pl-12 pr-6 py-4 rounded-2xl w-full md:w-64 text-sm font-bold border border-blue-200 dark:border-blue-700 outline-none opacity-50 cursor-not-allowed"
                    />
                </div>
            </div>
        </div>
    );
}
