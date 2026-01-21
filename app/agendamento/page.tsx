"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: string;
  companyId: string;
}

export default function PaginaAgendamento() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [servicoSelecionado, setServicoSelecionado] = useState<Service | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<any>(new Date());
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);
  
  // NOVA LISTA: Horários que já estão ocupados
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [agendamentoConcluido, setAgendamentoConcluido] = useState(false);

  // Lista fixa de horários da barbearia
  const horariosDisponiveis = ["09:00", "09:30", "10:00", "14:00", "15:30", "16:00"];

  // 1. Carrega serviços ao abrir
  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch('/api/servicos');
        const data = await response.json();
        if (data.services) setServices(data.services);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  // 2. SEMPRE QUE MUDAR A DATA, VERIFICA O QUE ESTÁ OCUPADO
  useEffect(() => {
    async function verificarDisponibilidade() {
        // Reseta a seleção anterior
        setHorarioSelecionado(null);
        setHorariosOcupados([]); 

        try {
            const response = await fetch('/api/verificar', {
                method: 'POST',
                body: JSON.stringify({ date: dataSelecionada })
            });
            const data = await response.json();
            if (data.horariosOcupados) {
                setHorariosOcupados(data.horariosOcupados);
            }
        } catch (error) {
            console.error("Erro ao verificar agenda");
        }
    }
    
    if (servicoSelecionado) {
        verificarDisponibilidade();
    }
  }, [dataSelecionada, servicoSelecionado]); // Roda quando muda a data ou o serviço

  async function finalizarAgendamento() {
    if (!nomeCliente || !telefoneCliente || !servicoSelecionado || !horarioSelecionado) {
      alert("Preencha todos os dados!");
      return;
    }

    const dataFinal = new Date(dataSelecionada);
    const [hora, minuto] = horarioSelecionado.split(':');
    dataFinal.setHours(parseInt(hora), parseInt(minuto));

    try {
      const response = await fetch('/api/agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: servicoSelecionado.id,
          companyId: servicoSelecionado.companyId,
          date: dataFinal,
          name: nomeCliente,
          phone: telefoneCliente
        })
      });

      if (response.ok) {
        setAgendamentoConcluido(true);
      } else {
        alert("Erro ao agendar.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  }

  const dataBonita = format(dataSelecionada, "dd 'de' MMMM", { locale: ptBR });

  if (agendamentoConcluido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sucesso!</h2>
          <p className="text-gray-600 mb-6">Agendamento confirmado.</p>
          <button onClick={() => window.location.reload()} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
            Novo Agendamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden min-h-[500px]">
        
        <div className="bg-blue-600 p-6 text-white text-center">
          <h2 className="text-2xl font-bold">Barbearia do Mestre</h2>
          <p className="opacity-90">{servicoSelecionado ? "Escolha o horário" : "Selecione um serviço"}</p>
        </div>

        {!servicoSelecionado ? (
          <div className="p-6 space-y-4">
            {loading && <p className="text-center text-gray-500">Carregando...</p>}
            {services.map((service) => (
              <button key={service.id} onClick={() => setServicoSelecionado(service)} className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition flex justify-between items-center group">
                <div>
                  <h3 className="font-bold text-gray-800">{service.name}</h3>
                  <p className="text-sm text-gray-500">{service.duration} minutos</p>
                </div>
                <span className="font-bold text-blue-600">R$ {Number(service.price).toFixed(2)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center">
            <button onClick={() => { setServicoSelecionado(null); setHorarioSelecionado(null); }} className="text-sm text-gray-500 hover:text-blue-600 mb-4 self-start">← Voltar</button>

            <div className="calendar-container mb-6 w-full">
                <Calendar onChange={setDataSelecionada} value={dataSelecionada} locale="pt-BR" minDate={new Date()} className="rounded-lg border-none shadow-sm text-sm p-2 w-full" />
            </div>

            <div className="w-full mb-6">
                <h3 className="font-bold text-gray-700 mb-2 text-center">Horários para {dataBonita}:</h3>
                <div className="grid grid-cols-4 gap-2">
                    {horariosDisponiveis.map((horario) => {
                        // Verifica se esse horário está na lista de ocupados
                        const estaOcupado = horariosOcupados.includes(horario);

                        return (
                          <button 
                              key={horario} 
                              disabled={estaOcupado} // Desabilita o clique se ocupado
                              onClick={() => setHorarioSelecionado(horario)}
                              className={`py-1 px-2 rounded-md text-sm font-medium transition 
                                  ${estaOcupado 
                                      ? "bg-red-100 text-red-400 cursor-not-allowed line-through" // Visual de Ocupado (Vermelho e Riscado)
                                      : horarioSelecionado === horario 
                                          ? "bg-blue-600 text-white" 
                                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                  }`}
                          >
                              {horario}
                          </button>
                        )
                    })}
                </div>
            </div>

            {horarioSelecionado && (
              <div className="w-full space-y-3 animate-in slide-in-from-bottom-2">
                <input type="text" placeholder="Seu Nome" className="w-full border p-3 rounded-lg" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} />
                <input type="text" placeholder="WhatsApp" className="w-full border p-3 rounded-lg" value={telefoneCliente} onChange={(e) => setTelefoneCliente(e.target.value)} />
                <button onClick={finalizarAgendamento} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 mt-2">Agendar</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}