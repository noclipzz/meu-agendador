"use client";

import React from "react";
import { Calculator, Hammer } from "lucide-react";

export default function OperacoesPage() {
    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-12 rounded-[2.5rem] border dark:border-gray-800 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
                <Calculator size={40} />
            </div>
            <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Configurações de Operações</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto">
                Esta seção está em desenvolvimento. Em breve você poderá configurar regras operacionais, automações de workflow e mais.
            </p>
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full w-fit mx-auto">
                <Hammer size={14} /> Em Breve
            </div>
        </div>
    );
}
