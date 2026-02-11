"use client";

import { Settings, Shield, Database, Webhook } from "lucide-react";

export default function MasterConfig() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-white mb-2">Configurações do Sistema</h1>
                <p className="text-gray-400">Gerenciamento avançado da plataforma</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SUPER ADMIN */}
                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-purple-600/20 rounded-xl">
                            <Shield className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">Super Admin</h3>
                            <p className="text-xs text-gray-500">Controle de acesso</p>
                        </div>
                    </div>
                    <div className="bg-gray-900 p-4 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Super Admin ID (Clerk)</p>
                        <p className="text-white font-mono text-sm break-all">
                            {process.env.NEXT_PUBLIC_SUPER_ADMIN_ID || "user_38aeICHQCoSI3FGUxX6SVCyvEQh"}
                        </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                        Apenas este usuário tem acesso ao painel administrativo
                    </p>
                </div>

                {/* BANCO DE DADOS */}
                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-600/20 rounded-xl">
                            <Database className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">Banco de Dados</h3>
                            <p className="text-xs text-gray-500">Neon PostgreSQL</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                            <span className="text-sm text-gray-400">Status</span>
                            <span className="text-sm text-green-400 font-bold">✓ Conectado</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                            <span className="text-sm text-gray-400">Provider</span>
                            <span className="text-sm text-white font-bold">Neon</span>
                        </div>
                    </div>
                </div>

                {/* STRIPE */}
                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-green-600/20 rounded-xl">
                            <Webhook className="text-green-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">Stripe Webhooks</h3>
                            <p className="text-xs text-gray-500">Pagamentos e assinaturas</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="bg-gray-900 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Endpoint</p>
                            <p className="text-white text-xs font-mono break-all">
                                /api/webhooks/stripe
                            </p>
                        </div>
                        <div className="bg-gray-900 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Eventos</p>
                            <div className="flex gap-2 flex-wrap mt-2">
                                <span className="text-[10px] bg-gray-700 px-2 py-1 rounded text-gray-300">
                                    checkout.session.completed
                                </span>
                                <span className="text-[10px] bg-gray-700 px-2 py-1 rounded text-gray-300">
                                    customer.subscription.deleted
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PLANOS E PREÇOS */}
                <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-yellow-600/20 rounded-xl">
                            <Settings className="text-yellow-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">Planos</h3>
                            <p className="text-xs text-gray-500">Preços mensais</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                            <span className="text-sm text-gray-400">Individual</span>
                            <span className="text-sm text-blue-400 font-bold">R$ 35,00</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                            <span className="text-sm text-gray-400">Premium</span>
                            <span className="text-sm text-purple-400 font-bold">R$ 65,00</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                            <span className="text-sm text-gray-400">Master</span>
                            <span className="text-sm text-yellow-400 font-bold">R$ 99,00</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* INFORMAÇÕES DO SISTEMA */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-3xl border border-gray-700">
                <h3 className="text-lg font-black text-white mb-4">Informações do Sistema</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Versão</p>
                        <p className="text-white font-bold">1.0.0</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Framework</p>
                        <p className="text-white font-bold">Next.js 14</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Deploy</p>
                        <p className="text-white font-bold">Vercel</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Ambiente</p>
                        <p className="text-green-400 font-bold">Production</p>
                    </div>
                </div>
            </div>
        </div>
    );
}