"use client";

import { TrendingUp, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default function ContasReceberPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/painel/financeiro" className="text-gray-400 hover:text-blue-600 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Financeiro / Contas a Receber</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <TrendingUp size={32} className="text-emerald-500" />
                        Contas a Receber
                    </h1>
                    <p className="text-gray-500 font-bold text-sm">Gestão de faturas, boletos e entradas futuras.</p>
                </div>
                <button className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-700 transition shadow-lg active:scale-95">
                    <Plus size={20} /> Lançar Entrada
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-12 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-6">
                    <TrendingUp size={40} className="text-emerald-500" />
                </div>
                <h3 className="text-xl font-black dark:text-white mb-2">Módulo em Desenvolvimento</h3>
                <p className="text-gray-500 font-medium max-w-md">Gerencie suas cobranças de forma centralizada em breve!</p>

                <Link href="/painel/financeiro" className="mt-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-6 py-3 rounded-xl font-black hover:bg-gray-200 transition">
                    Voltar para Visão Geral
                </Link>
            </div>
        </div>
    );
}
