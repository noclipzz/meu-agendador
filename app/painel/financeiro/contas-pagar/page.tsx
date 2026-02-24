"use client";

import { TrendingDown, Loader2, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default function ContasPagarPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2 group">
                        <Link href="/painel/financeiro" className="text-gray-400 hover:text-blue-600 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Financeiro / Contas a Pagar</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <TrendingDown size={32} className="text-red-500" />
                        Contas a Pagar
                    </h1>
                    <p className="text-gray-500 font-bold text-sm">Controle detalhado de saídas e obrigações financeiras.</p>
                </div>
                <button className="bg-red-500 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-red-600 transition shadow-lg active:scale-95">
                    <Plus size={20} /> Nova Despesa
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-12 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                    <TrendingDown size={40} className="text-red-500" />
                </div>
                <h3 className="text-xl font-black dark:text-white mb-2">Módulo em Desenvolvimento</h3>
                <p className="text-gray-500 font-medium max-w-md">Estamos preparando uma visualização detalhada para suas contas a pagar. Por enquanto, utilize a Visão Geral do Financeiro.</p>

                <Link href="/painel/financeiro" className="mt-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-6 py-3 rounded-xl font-black hover:bg-gray-200 transition">
                    Voltar para Visão Geral
                </Link>
            </div>
        </div>
    );
}
