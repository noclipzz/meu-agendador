"use client";

import { useState, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import { ShieldAlert, Calendar, DollarSign, Crown, Clock, Trash2 } from "lucide-react";

export default function MasterAdmin() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [negado, setNegado] = useState(false);

  async function carregar() {
    const res = await fetch('/api/master');
    if (res.status === 403) { setNegado(true); return; }
    const data = await res.json();
    setEmpresas(data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function adicionarDias(userId: string, dias: number) {
      if(!confirm(`Adicionar ${dias} dias?`)) return;
      await fetch('/api/master/assinatura', {
          method: 'POST',
          body: JSON.stringify({ targetUserId: userId, diasAdicionais: dias })
      });
      carregar();
  }

  // --- FUNÇÃO EXCLUIR CLIENTE ---
  async function excluirCliente(companyId: string, nomeEmpresa: string) {
      const senha = prompt(`ATENÇÃO! Você vai apagar a empresa "${nomeEmpresa}" e TODOS os dados dela.\n\nDigite a senha de segurança para confirmar:`);
      
      if (senha !== "Yangatinho10#") {
          if (senha) alert("Senha incorreta!");
          return;
      }

      const res = await fetch('/api/master', {
          method: 'DELETE',
          body: JSON.stringify({ companyId })
      });

      if (res.ok) {
          alert("Empresa excluída com sucesso.");
          carregar();
      } else {
          alert("Erro ao excluir.");
      }
  }

  if (negado) return <div className="h-screen flex items-center justify-center text-red-600 font-bold bg-gray-900">ACESSO NEGADO</div>;
  if (loading) return <div className="p-10 bg-gray-900 text-white h-screen">Carregando império...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <header className="flex justify-between items-center mb-10 border-b border-gray-700 pb-6">
        <div>
            <h1 className="text-3xl font-bold text-blue-400 flex items-center gap-2"><Crown /> Painel Mestre</h1>
            <p className="text-gray-400">Gestão de Validade e Acesso.</p>
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded text-sm border border-gray-700">Total: <strong>{empresas.length}</strong></div>
      </header>

      <div className="space-y-4">
        <div className="grid grid-cols-12 bg-gray-800 p-4 rounded-t-lg font-bold text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
            <div className="col-span-3">Empresa</div>
            <div className="col-span-2">Criado em</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-4 text-right">Ações</div>
            <div className="col-span-1 text-center">Excluir</div>
        </div>

        {empresas.map((emp) => {
            const diasRestantes = emp.expiresAt ? differenceInDays(new Date(emp.expiresAt), new Date()) : 0;
            const vencido = diasRestantes < 0;

            return (
            <div key={emp.id} className="grid grid-cols-12 bg-gray-800/30 p-4 border-b border-gray-700 hover:bg-gray-800 transition items-center text-sm">
                
                <div className="col-span-3">
                    <p className="font-bold text-lg text-white">{emp.name}</p>
                    <a href={`/${emp.slug}`} target="_blank" className="text-blue-400 text-xs hover:underline">nodigital.app/{emp.slug}</a>
                </div>

                <div className="col-span-2 text-gray-400">{format(new Date(emp.createdAt), "dd/MM/yyyy")}</div>

                <div className="col-span-2">
                    {emp.expiresAt ? (
                        <div className={`flex items-center gap-2 ${vencido ? 'text-red-500' : 'text-green-400'}`}>
                            <Clock size={16} />
                            <div>
                                <p className="font-bold">{vencido ? "VENCIDO" : `${diasRestantes} dias`}</p>
                                <p className="text-[10px] text-gray-500">Vence: {format(new Date(emp.expiresAt), "dd/MM")}</p>
                            </div>
                        </div>
                    ) : <span className="text-gray-500">Sem assinatura</span>}
                </div>

                <div className="col-span-4 flex justify-end gap-2">
                    <button onClick={() => adicionarDias(emp.ownerId, 30)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs">+30 Dias</button>
                    <button onClick={() => adicionarDias(emp.ownerId, 365)} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs">+1 Ano</button>
                </div>

                {/* BOTÃO DESTRUIR */}
                <div className="col-span-1 flex justify-center">
                    <button 
                        onClick={() => excluirCliente(emp.id, emp.name)}
                        className="text-red-500 hover:text-red-400 hover:bg-red-900/30 p-2 rounded-full transition"
                        title="Excluir Empresa"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        )})}
      </div>
    </div>
  );
}