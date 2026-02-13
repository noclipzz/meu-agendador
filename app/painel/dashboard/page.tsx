"use client";

import { useState, useEffect } from "react";
import {
    LayoutDashboard, Calendar, AlertTriangle, TrendingUp, Package,
    Clock, CheckCircle2, DollarSign, ArrowRight, BarChart3, Bell
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { subscribeUserToPush } from "@/lib/push-notifications";
import { toast } from "sonner";

export default function DashboardPage() {
    const [dados, setDados] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);

    useEffect(() => {
        fetch('/api/painel/dashboard')
            .then(res => res.json())
            .then(data => {
                setDados(data);
                setLoading(false);
            });
    }, []);

    async function handleEnableNotifications() {
        setSubscribing(true);
        try {
            await subscribeUserToPush();
            toast.success("Notificações ativadas!");
        } catch (error) {
            toast.error("Erro ao ativar notificações.");
        } finally {
            setSubscribing(false);
        }
    }

    async function handleTestNotification() {
        try {
            const res = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: "Teste NOHUD",
                    body: "Se você recebeu isso, as notificações em segundo plano estão funcionando!",
                    url: "/painel/dashboard"
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Notificação enviada!");
            } else {
                toast.error(`Erro: ${data.error || "Falha desconhecida"}`);
            }
        } catch (error) {
            toast.error("Erro na conexão com o servidor.");
        }
    }

    if (loading) return <div className="p-10 text-center animate-pulse text-gray-400 font-bold">Carregando indicadores...</div>;

    return (
        <div className="p-6 space-y-8 pb-20 font-sans">

            {/* BOAS VINDAS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 dark:text-white">Visão Geral</h1>
                        <p className="text-sm text-gray-500 font-medium">Resumo do dia e pendências importantes.</p>
                    </div>

                    {/* BOTÕES DE NOTIFICAÇÃO (APENAS MOBILE/PWA SUGGESTED) */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleEnableNotifications}
                            disabled={subscribing}
                            className="p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl text-blue-600 shadow-sm hover:bg-blue-50 transition flex items-center gap-2 text-xs font-bold"
                            title="Ativar Notificações no Celular"
                        >
                            <Bell size={18} className={subscribing ? "animate-pulse" : ""} />
                            <span className="hidden md:inline">Notificações</span>
                        </button>
                        <button
                            onClick={handleTestNotification}
                            className="p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl text-gray-400 shadow-sm hover:text-green-600 transition text-xs font-bold"
                            title="Testar Notificação"
                        >
                            Testar
                        </button>
                    </div>
                </div>
                {(dados.plano === "PREMIUM" || dados.plano === "MASTER") && (
                    <div className="relative group cursor-default">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition duration-500" />
                        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4">
                            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                                <DollarSign size={22} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-emerald-100 font-bold">
                                    Faturamento {format(new Date(), 'MMMM', { locale: ptBR })}
                                </p>
                                <p className="text-2xl font-black text-white leading-tight">
                                    R$ {dados.resumoFinanceiro?.totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* GRID PRINCIPAL UNIFICADO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* COLUNA ESQUERDA (Agenda + Gráfico) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* 1. AGENDA DO DIA */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border dark:border-gray-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-gray-700 dark:text-gray-200 flex items-center gap-2"><Calendar className="text-blue-500" /> Agenda de Hoje</h3>
                            <Link href="/painel/agenda" className="text-xs font-bold text-blue-600 hover:underline">Ver completa</Link>
                        </div>

                        <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                            {dados.agendamentosHoje?.length === 0 ? (
                                <p className="text-gray-400 text-sm italic">Nenhum agendamento para hoje.</p>
                            ) : (
                                dados.agendamentosHoje?.map((ag: any) => (
                                    <div key={ag.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-l-4 border-blue-500">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white dark:bg-gray-900 px-3 py-2 rounded-xl font-black text-lg shadow-sm">
                                                {format(new Date(ag.date), 'HH:mm')}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-white">{ag.customerName}</p>
                                                <p className="text-xs text-gray-500 uppercase font-bold">{ag.service?.name} • {ag.professional?.name}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase ${ag.status === 'CONCLUIDO' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {ag.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 3. GRÁFICO MENSAL (Apenas Premium/Master) */}
                    {(dados.plano === "PREMIUM" || dados.plano === "MASTER") && (
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border dark:border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="font-black text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-6"><TrendingUp className="text-green-500" /> Performance do Mês</h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dados.graficoDados}>
                                        <defs>
                                            <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                        <YAxis hide />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                        <Area type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorValor)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA (Estoque + Contas) */}
                <div className="space-y-6">
                    {/* 2. ESTOQUE BAIXO ou BANNER UPGRADE */}
                    {dados.plano === "MASTER" ? (
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border dark:border-gray-800">
                            <h3 className="font-black text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-6"><Package className="text-orange-500" /> Estoque Crítico</h3>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {dados.estoqueBaixo?.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-green-600">
                                        <CheckCircle2 size={40} className="mb-2 opacity-50" />
                                        <p className="text-xs font-bold uppercase">Estoque Saudável</p>
                                    </div>
                                ) : (
                                    dados.estoqueBaixo?.map((prod: any) => (
                                        <div key={prod.id} className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                                            <div>
                                                <p className="font-bold text-sm text-red-700 dark:text-red-400">{prod.name}</p>
                                                <p className="text-[10px] font-black text-red-400 uppercase">Mínimo: {Number(prod.minStock)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-red-600">{Number(prod.quantity)}</p>
                                                <p className="text-[9px] font-bold text-red-400">{prod.unit}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {dados.estoqueBaixo?.length > 0 && (
                                <Link href="/painel/estoque" className="block mt-4 text-center text-xs font-black text-red-500 hover:underline uppercase">Gerenciar Estoque</Link>
                            )}
                        </div>
                    ) : (
                        <div className="bg-blue-600 p-8 rounded-[2rem] shadow-xl text-white flex flex-col justify-between overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><LayoutDashboard size={120} /></div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-black mb-2">Evolua seu Negócio</h3>
                                <p className="text-blue-100 text-sm font-medium mb-6">Assine o plano **MASTER** para ter controle completo de estoque e validade de produtos.</p>
                            </div>
                            <Link href="/#planos" className="bg-white text-blue-600 font-black py-3 rounded-2xl text-center text-sm hover:scale-105 transition relative z-10">Ver Planos</Link>
                        </div>
                    )}

                    {/* 4. CONTAS (Apenas Premium/Master) */}
                    {(dados.plano === "PREMIUM" || dados.plano === "MASTER") && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* VENCIDAS */}
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border-l-8 border-red-500 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <h3 className="font-black text-red-600 uppercase text-xs tracking-widest flex items-center gap-2"><AlertTriangle size={16} /> Atrasadas</h3>
                                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-xs font-black">{dados.boletosVencidos?.length}</span>
                                </div>
                                <div className="space-y-2 relative z-10">
                                    {dados.boletosVencidos?.map((b: any) => (
                                        <div key={b.id} className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-300 truncate w-32">{b.client.name}</span>
                                            <span className="font-black text-red-500">R$ {Number(b.value).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {dados.boletosVencidos?.length === 0 && <p className="text-gray-400 text-xs italic">Nenhuma conta atrasada.</p>}
                                </div>
                            </div>

                            {/* A VENCER */}
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border-l-8 border-yellow-400 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <h3 className="font-black text-yellow-600 uppercase text-xs tracking-widest flex items-center gap-2"><Clock size={16} /> Próximos Vencimentos</h3>
                                </div>
                                <div className="space-y-2 relative z-10">
                                    {dados.boletosVencer?.map((b: any) => (
                                        <div key={b.id} className="flex justify-between text-sm items-center">
                                            <div>
                                                <p className="text-gray-800 dark:text-gray-200 font-bold text-xs">{b.client.name}</p>
                                                <p className="text-gray-400 text-[9px] font-black uppercase text-gray-400">{format(new Date(b.dueDate), 'dd/MM')}</p>
                                            </div>
                                            <span className="font-black text-gray-800 dark:text-white">R$ {Number(b.value).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {dados.boletosVencer?.length === 0 && <p className="text-gray-400 text-xs italic">Nada para os próximos dias.</p>}
                                </div>
                                <Link href="/painel/financeiro" className="flex items-center justify-end gap-1 text-[10px] font-black text-yellow-600 uppercase mt-4 hover:underline">Ver tudo <ArrowRight size={12} /></Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* CTA PARA UPGRADE (CASO SEJA INDIVIDUAL) */}
            {dados.plano === "INDIVIDUAL" && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-[2rem] shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 -mr-10"><BarChart3 size={180} /></div>
                    <div className="relative z-10 max-w-xl">
                        <h3 className="text-2xl font-black mb-2">Desbloqueie o Poder Financeiro</h3>
                        <p className="text-blue-100 font-medium">Você está no plano **INDIVIDUAL**. Faça upgrade para o **PREMIUM** e comece a controlar faturamento, despesas e comissões automaticamente.</p>
                    </div>
                    <Link href="/#planos" className="bg-white text-blue-600 font-black px-10 py-4 rounded-2xl text-center text-sm hover:scale-105 transition relative z-10 shadow-lg whitespace-nowrap">
                        Ver Planos de Upgrade
                    </Link>
                </div>
            )}
        </div>
    );
}