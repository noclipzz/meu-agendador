"use client";

import { useState, useEffect } from "react";
import { DollarSign, Users, TrendingUp, ShieldAlert } from "lucide-react";

export default function MasterDashboard() {
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [negado, setNegado] = useState(false);

  useEffect(() => {
    async function carregar() {
      const res = await fetch('/api/master');
      if (res.status === 403) { setNegado(true); return; }
      const data = await res.json();
      setDados(data);
      setLoading(false);
    }
    carregar();
  }, []);

  // --- CÁLCULO DE FATURAMENTO (SIMULADO) ---
  const precos: any = { "INDIVIDUAL": 35, "PREMIUM": 65, "MASTER": 99, "GRATIS": 0, "MANUAL": 0 };
  
  const faturamentoMensal = dados.reduce((acc, emp) => {
      const preco = precos[emp.plano] || 0;
      return acc + preco;
  }, 0);

  const ativos = dados.filter(d => d.status === 'ACTIVE').length;

  if (negado) return <div className="text-red-500 font-bold text-center mt-20">ACESSO NEGADO</div>;
  if (loading) return <div className="text-gray-500 text-center mt-20">Carregando métricas...</div>;

  return (
    <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white mb-6">Visão Geral do Império</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CARD FATURAMENTO */}
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={100} /></div>
                <p className="text-gray-400 font-medium mb-1">MRR (Faturamento Mensal)</p>
                <h3 className="text-4xl font-bold text-green-400">R$ {faturamentoMensal.toFixed(2)}</h3>
                <p className="text-xs text-gray-500 mt-2">Baseado nos planos ativos</p>
            </div>

            {/* CARD CLIENTES */}
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-gray-400 font-medium">Clientes Totais</p>
                    <Users className="text-blue-500" />
                </div>
                <h3 className="text-4xl font-bold text-white">{dados.length}</h3>
                <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> {ativos} Ativos
                </p>
            </div>

            {/* CARD TICKET MÉDIO */}
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-gray-400 font-medium">Ticket Médio</p>
                    <TrendingUp className="text-purple-500" />
                </div>
                <h3 className="text-4xl font-bold text-white">
                    R$ {(dados.length > 0 ? faturamentoMensal / dados.length : 0).toFixed(2)}
                </h3>
                <p className="text-xs text-gray-500 mt-2">Por cliente</p>
            </div>
        </div>

        {/* LISTA RÁPIDA (Últimos cadastros) */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Últimos Clientes Cadastrados</h3>
            <div className="space-y-3">
                {dados.slice(0, 5).map(emp => (
                    <div key={emp.id} className="flex justify-between items-center border-b border-gray-700 pb-3 last:border-0 last:pb-0">
                        <div>
                            <p className="font-bold text-gray-200">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.slug}</p>
                        </div>
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{emp.plano}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}