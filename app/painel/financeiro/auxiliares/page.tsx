"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
    Settings2, ArrowLeft, Plus, Pencil, Trash2, X, Tag,
    CreditCard, Briefcase, Building2, Save, ChevronDown,
    Folder, Receipt, CheckCircle2, AlertCircle
} from "lucide-react";

// Dados padrão (estáticos, pois não temos API de auxiliares dedicada)
const CATEGORIAS_DESPESA = [
    { id: "ALUGUEL", name: "Aluguel", icon: "🏠", color: "bg-indigo-500" },
    { id: "AGUA_LUZ_INTERNET", name: "Água / Luz / Internet", icon: "💡", color: "bg-cyan-500" },
    { id: "FORNECEDORES", name: "Fornecedores", icon: "📦", color: "bg-orange-500" },
    { id: "FOLHA_PAGAMENTO", name: "Folha de Pagamento", icon: "👥", color: "bg-green-500" },
    { id: "IMPOSTOS", name: "Impostos e Taxas", icon: "🏛️", color: "bg-red-500" },
    { id: "MARKETING", name: "Marketing e Publicidade", icon: "📣", color: "bg-pink-500" },
    { id: "MANUTENCAO", name: "Manutenção", icon: "🔧", color: "bg-yellow-500" },
    { id: "OUTROS", name: "Outros", icon: "📋", color: "bg-gray-500" },
];

const METODOS_PAGAMENTO = [
    { id: "DINHEIRO", name: "Dinheiro", icon: "💵" },
    { id: "PIX", name: "PIX", icon: "⚡" },
    { id: "PIX_CORA", name: "PIX Cora", icon: "🟢" },
    { id: "BOLETO", name: "Boleto", icon: "📄" },
    { id: "BOLETO_CORA", name: "Boleto Cora", icon: "🔵" },
    { id: "CARTAO_CREDITO", name: "Cartão de Crédito", icon: "💳" },
    { id: "CARTAO_DEBITO", name: "Cartão de Débito", icon: "💳" },
    { id: "TRANSFERENCIA", name: "Transferência Bancária", icon: "🏦" },
];

const CENTROS_CUSTO = [
    { id: "ADMINISTRATIVO", name: "Administrativo", description: "Despesas de escritório e administração" },
    { id: "OPERACIONAL", name: "Operacional", description: "Custo direto da operação" },
    { id: "COMERCIAL", name: "Comercial", description: "Vendas e marketing" },
    { id: "FINANCEIRO", name: "Financeiro", description: "Juros, taxas bancárias" },
    { id: "TI", name: "Tecnologia", description: "Software, hardware, sistemas" },
    { id: "RH", name: "Recursos Humanos", description: "Salários, benefícios, treinamentos" },
];

const CONTAS_PAGAMENTO = [
    { id: "CAIXA", name: "Caixa", type: "Dinheiro em espécie", saldo: null },
    { id: "CONTA_CORRENTE", name: "Conta Corrente", type: "Conta bancária principal", saldo: null },
    { id: "CONTA_POUPANCA", name: "Poupança", type: "Conta poupança", saldo: null },
    { id: "CORA", name: "Conta Cora", type: "Conta digital Cora", saldo: null },
];

type TabKey = "categorias" | "pagamentos" | "centros" | "contas";

export default function AuxiliaresPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("categorias");

    const tabs: { key: TabKey; label: string; icon: any; count: number }[] = [
        { key: "categorias", label: "Categorias", icon: Tag, count: CATEGORIAS_DESPESA.length },
        { key: "pagamentos", label: "Formas de Pagamento", icon: CreditCard, count: METODOS_PAGAMENTO.length },
        { key: "centros", label: "Centros de Custo", icon: Briefcase, count: CENTROS_CUSTO.length },
        { key: "contas", label: "Contas", icon: Building2, count: CONTAS_PAGAMENTO.length },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/painel/financeiro" className="text-gray-400 hover:text-blue-600 transition">
                            <ArrowLeft size={18} />
                        </Link>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início / Financeiro / Auxiliares</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <Settings2 size={32} className="text-blue-600" />
                        Opções Auxiliares
                    </h1>
                    <p className="text-gray-500 font-bold text-sm mt-1">Gerencie categorias, métodos de pagamento e configurações financeiras.</p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        As categorias e formas de pagamento abaixo são utilizadas nos módulos de Contas a Pagar e Contas a Receber.
                    </p>
                    <p className="text-xs font-medium text-blue-500 mt-1">
                        Em breve você poderá criar suas próprias categorias personalizadas.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm transition ${activeTab === tab.key
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 border dark:border-gray-700'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${activeTab === tab.key
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border dark:border-gray-800 overflow-hidden">
                {/* === CATEGORIAS === */}
                {activeTab === "categorias" && (
                    <div>
                        <div className="p-6 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                                    <Tag size={20} className="text-blue-600" />
                                    Categorias de Despesas
                                </h3>
                                <p className="text-xs text-gray-500 font-bold mt-1">Organize as despesas da sua empresa por categoria.</p>
                            </div>
                        </div>
                        <div className="divide-y dark:divide-gray-800">
                            {CATEGORIAS_DESPESA.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 ${cat.color} rounded-xl flex items-center justify-center text-lg`}>
                                            {cat.icon}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-800 dark:text-white text-sm">{cat.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{cat.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg text-[10px] font-black uppercase">
                                            Ativa
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === FORMAS DE PAGAMENTO === */}
                {activeTab === "pagamentos" && (
                    <div>
                        <div className="p-6 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                                    <CreditCard size={20} className="text-blue-600" />
                                    Formas de Pagamento
                                </h3>
                                <p className="text-xs text-gray-500 font-bold mt-1">Métodos aceitos para pagamentos e cobranças.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 dark:divide-gray-800">
                            {METODOS_PAGAMENTO.map((met) => (
                                <div key={met.id} className="flex items-center gap-4 px-6 py-5 border-b sm:border-r dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-xl">
                                        {met.icon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-gray-800 dark:text-white text-sm">{met.name}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{met.id}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg text-[10px] font-black uppercase">
                                        Ativo
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === CENTROS DE CUSTO === */}
                {activeTab === "centros" && (
                    <div>
                        <div className="p-6 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                                    <Briefcase size={20} className="text-blue-600" />
                                    Centros de Custo
                                </h3>
                                <p className="text-xs text-gray-500 font-bold mt-1">Agrupe despesas por área ou departamento.</p>
                            </div>
                        </div>
                        <div className="divide-y dark:divide-gray-800">
                            {CENTROS_CUSTO.map((cc) => (
                                <div key={cc.id} className="flex items-center justify-between px-6 py-5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center">
                                            <Folder size={18} />
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-800 dark:text-white text-sm">{cc.name}</p>
                                            <p className="text-xs font-bold text-gray-400">{cc.description}</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg text-[10px] font-black uppercase">
                                        Ativo
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === CONTAS === */}
                {activeTab === "contas" && (
                    <div>
                        <div className="p-6 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                                    <Building2 size={20} className="text-blue-600" />
                                    Contas de Pagamento
                                </h3>
                                <p className="text-xs text-gray-500 font-bold mt-1">Contas utilizadas para recebimentos e pagamentos.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
                            {CONTAS_PAGAMENTO.map((conta) => (
                                <div key={conta.id} className="border-2 dark:border-gray-700 rounded-2xl p-5 hover:border-blue-500 transition group">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-800 dark:text-white text-sm">{conta.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{conta.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID</span>
                                        <span className="text-xs font-black text-gray-500 dark:text-gray-400">{conta.id}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
