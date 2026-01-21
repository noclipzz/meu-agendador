"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PainelAdmin() {
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca os dados assim que a tela abre
  useEffect(() => {
    async function carregarAgenda() {
      try {
        const resposta = await fetch('/api/admin');
        const dados = await resposta.json();
        setAgendamentos(dados);
      } catch (error) {
        console.error("Erro", error);
      } finally {
        setLoading(false);
      }
    }
    carregarAgenda();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Painel do Profissional</h1>
          <div className="bg-white px-4 py-2 rounded-lg shadow text-sm">
            Total de Agendamentos: <strong>{agendamentos.length}</strong>
          </div>
        </div>

        {loading && <p className="text-center text-gray-500">Carregando agenda...</p>}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Cabeçalho da Tabela */}
          <div className="grid grid-cols-4 bg-gray-50 p-4 border-b font-bold text-gray-600">
            <div>Data e Hora</div>
            <div>Cliente</div>
            <div>Serviço</div>
            <div>Contato</div>
          </div>

          {/* Lista de Agendamentos */}
          {agendamentos.map((item) => (
            <div key={item.id} className="grid grid-cols-4 p-4 border-b hover:bg-gray-50 transition items-center">
              
              {/* Coluna 1: Data */}
              <div className="text-blue-600 font-bold">
                {format(new Date(item.date), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </div>

              {/* Coluna 2: Nome */}
              <div className="font-medium text-gray-800">
                {item.customerName}
              </div>

              {/* Coluna 3: Serviço */}
              <div className="text-sm bg-blue-100 text-blue-800 py-1 px-3 rounded-full w-fit">
                {item.service.name}
              </div>

              {/* Coluna 4: Telefone */}
              <div className="text-gray-500 text-sm">
                {item.customerPhone}
              </div>

            </div>
          ))}

          {!loading && agendamentos.length === 0 && (
            <div className="p-10 text-center text-gray-400">
              Nenhum agendamento encontrado.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}