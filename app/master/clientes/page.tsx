"use client";

import { useState, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import { Clock, ExternalLink, User, Search, CreditCard, SearchX, PauseCircle } from "lucide-react";

export default function MasterClientes() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  async function carregar() {
    try {
      const res = await fetch('/api/master');
      const data = await res.json();
      setEmpresas(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function adicionarDias(userId: string, dias: number) {
      if(!confirm(`Adicionar ${dias} dias?`)) return;
      await fetch('/api/master/assinatura', {
          method: 'POST',
          body: JSON.stringify({ targetUserId: userId, diasAdicionais: dias })
      });
      alert("Dias adicionados!");
      carregar();
  }

  // NOVA FUNÇÃO PARA PAUSAR
  async function pausarAssinatura(userId: string, nomeEmpresa: string) {
      if(!confirm(`Pausar a assinatura de "${nomeEmpresa}"? O cliente perderá o acesso.`)) return;
      
      await fetch('/api/master/assinatura', {
          method: 'POST',
          body: JSON.stringify({ 
              targetUserId: userId, 
              status: 'CANCELED' 
          })
      });
      alert("Assinatura pausada com sucesso.");
      carregar();
  }

  const empresasFiltradas = empresas.filter(emp => {
      const termo = busca.toLowerCase();
      return (
          emp.name.toLowerCase().includes(termo) || 
          emp.slug.toLowerCase().includes(termo) || 
          emp.ownerId.toLowerCase().includes(termo)
      );
  });

  if (loading) return <div className="text-center text-gray-500 mt-20">Carregando lista...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-3xl font-bold text-white">Gerenciar Clientes</h2>
          <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-3 text-gray-500" size={20} />
              <input 
                  type="text" 
                  placeholder="Buscar nome, link ou ID..." 
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl pl-10 pr-4 py-3"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
              />
          </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-12 bg-gray-800 p-4 rounded-t-lg font-bold text-gray-400 text-xs uppercase tracking-wider">
            <div className="col-span-4">Empresa & Dono</div>
            <div className="col-span-2">Plano / Pagamento</div>
            <div className="col-span-3">Validade</div>
            <div className="col-span-3 text-right">Ações</div>
        </div>

        {empresasFiltradas.length === 0 ? (
            <div className="text-center py-10 bg-gray-800/50 rounded-b-lg border border-gray-700 text-gray-500">
                <SearchX size={48} className="mx-auto mb-2 opacity-50"/>
                <p>Nenhum cliente encontrado.</p>
            </div>
        ) : (
            empresasFiltradas.map((emp) => {
                const diasRestantes = emp.expiresAt ? differenceInDays(new Date(emp.expiresAt), new Date()) : 0;
                const vencido = diasRestantes < 0;

                let corPlano = "bg-gray-700 text-gray-300";
                if(emp.plano === "PREMIUM") corPlano = "bg-blue-900 text-blue-200 border border-blue-700";
                if(emp.plano === "MASTER") corPlano = "bg-purple-900 text-purple-200 border border-purple-700";

                return (
                <div key={emp.id} className="grid grid-cols-12 bg-gray-800/30 p-4 border-b border-gray-700 hover:bg-gray-800 items-center text-sm">
                    <div className="col-span-4 pr-4">
                        <p className="font-bold text-lg text-white">{emp.name}</p>
                        <a href={`/${emp.slug}`} target="_blank" className="text-blue-400 text-xs hover:underline flex items-center gap-1 mb-2">
                            nodigital.app/{emp.slug} <ExternalLink size={10}/>
                        </a>
                        <div className="flex items-center gap-2 bg-gray-900 p-1.5 rounded border border-gray-700 w-fit">
                            <User size={12} className="text-gray-500" />
                            <code className="text-[10px] text-gray-300 font-mono select-all">{emp.ownerId}</code>
                        </div>
                    </div>

                    <div className="col-span-2 flex flex-col items-start gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${corPlano}`}>{emp.plano}</span>
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs bg-gray-900/50 px-2 py-1 rounded border border-gray-700">
                            <CreditCard size={12} className="text-green-400"/>
                            <span className="font-medium">{emp.paymentMethod || "N/A"}</span>
                        </div>
                    </div>

                    <div className="col-span-3">
                        {emp.expiresAt ? (
                            <div className={`flex items-center gap-2 ${vencido ? 'text-red-500' : 'text-green-400'}`}>
                                <Clock size={16} />
                                <div>
                                    <p className="font-bold">{vencido ? "VENCIDO" : `${diasRestantes} dias`}</p>
                                    <p className="text-[10px] text-gray-500">{format(new Date(emp.expiresAt), "dd/MM/yyyy")}</p>
                                </div>
                            </div>
                        ) : <span className="text-gray-500 text-xs">Sem expiração</span>}
                    </div>

                    <div className="col-span-3 flex justify-end gap-2">
                        <button onClick={() => adicionarDias(emp.ownerId, 30)} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs">
                            +30 Dias
                        </button>
                        
                        {/* BOTÃO DE PAUSAR (SUBSTITUIU A LIXEIRA) */}
                        <button 
                            onClick={() => pausarAssinatura(emp.ownerId, emp.name)}
                            className="text-yellow-500 hover:text-yellow-400 p-2 rounded hover:bg-yellow-900/20"
                            title="Pausar Assinatura"
                        >
                            <PauseCircle size={16} />
                        </button>
                    </div>
                </div>
            )})
        )}
      </div>
    </div>
  );
}