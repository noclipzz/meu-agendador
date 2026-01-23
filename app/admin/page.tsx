"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserButton, useUser } from "@clerk/nextjs";

export default function PainelAdmin() {
  const { user } = useUser();
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca os dados ao abrir a tela
  useEffect(() => {
    async function carregarAgenda() {
      try {
        const resposta = await fetch('/api/admin');
        const dados = await resposta.json();
        // Se a API retornar erro ou vazio, garante que seja um array
        if (Array.isArray(dados)) {
            setAgendamentos(dados);
        } else {
            setAgendamentos([]);
        }
      } catch (error) {
        console.error("Erro", error);
      } finally {
        setLoading(false);
      }
    }
    carregarAgenda();
  }, []);

  // --- FUNÇÃO DELETAR CORRIGIDA ---
  async function cancelarAgendamento(id: string) {
    if(!confirm("Tem certeza que deseja cancelar este agendamento?")) return;

    try {
        // 1. Manda apagar no banco
        const res = await fetch('/api/admin', {
            method: 'DELETE',
            body: JSON.stringify({ id })
        });

        if (res.ok) {
            // 2. A MÁGICA: Apaga da TELA imediatamente
            // Filtra a lista mantendo apenas os agendamentos que NÃO são o que acabamos de apagar
            setAgendamentos((listaAtual) => listaAtual.filter((item) => item.id !== id));
            
            // Pequeno delay para o alerta não travar a remoção visual
            setTimeout(() => alert("Agendamento cancelado!"), 100);
        } else {
            alert("Erro ao cancelar no servidor.");
        }
    } catch (error) {
        alert("Erro de conexão.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4 px-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Painel Administrativo</h1>
          <p className="text-sm text-gray-500">Olá, {user?.firstName} 👋</p>
        </div>
        <UserButton showName />
      </header>

      <main className="max-w-5xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-700">Agenda do Dia</h2>
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-bold">
            Total: {agendamentos.length}
          </div>
        </div>

        {loading && <p className="text-center text-gray-500 py-10">Carregando...</p>}

        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="grid grid-cols-5 bg-gray-50 p-4 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div>Horário</div>
            <div>Cliente</div>
            <div>Serviço</div>
            <div>Contato</div>
            <div className="text-right">Ações</div>
          </div>

          {agendamentos.map((item) => (
            <div key={item.id} className="grid grid-cols-5 p-4 border-b hover:bg-gray-50 transition items-center text-sm">
              <div className="font-bold text-gray-800">
                {format(new Date(item.date), "dd/MMM", { locale: ptBR })} <br/>
                <span className="text-blue-600 text-lg">{format(new Date(item.date), "HH:mm")}</span>
              </div>
              <div className="font-medium text-gray-900">{item.customerName}</div>
              <div>
                <span className="bg-gray-100 text-gray-700 py-1 px-2 rounded text-xs border">
                  {item.service.name}
                </span>
              </div>
              <div className="text-gray-500">{item.customerPhone}</div>
              
              <div className="text-right">
                <button 
                    onClick={() => cancelarAgendamento(item.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition font-medium border border-transparent hover:border-red-200"
                >
                    Cancelar
                </button>
              </div>
            </div>
          ))}

          {!loading && agendamentos.length === 0 && (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
              <p>Nenhum agendamento encontrado.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}