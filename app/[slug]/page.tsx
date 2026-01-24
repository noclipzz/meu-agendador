"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User } from "lucide-react";

// --- FUNÇÃO AUXILIAR PARA GERAR HORÁRIOS ---
function gerarHorarios(inicio: string, fim: string, intervalo: number, almocoInicio: string, almocoFim: string) {
    const slots = [];
    
    // Converte tudo para minutos do dia
    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    let atual = toMinutes(inicio);
    const limite = toMinutes(fim);
    const inicioPausa = toMinutes(almocoInicio);
    const fimPausa = toMinutes(almocoFim);

    while (atual < limite) {
        // Pula o almoço
        if (atual >= inicioPausa && atual < fimPausa) {
            atual += intervalo;
            continue; 
        }

        const h = Math.floor(atual / 60).toString().padStart(2, '0');
        const m = (atual % 60).toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
        
        atual += intervalo;
    }
    return slots;
}

export default function PaginaEmpresa({ params }: { params: { slug: string } }) {
  // Dados Gerais
  const [empresa, setEmpresa] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]); // Lista de equipe
  const [loading, setLoading] = useState(true);
  
  // Fluxo de Agendamento
  const [servicoSelecionado, setServicoSelecionado] = useState<any>(null);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<any>(null); // Profissional escolhido
  
  // Data e Hora
  const [dataSelecionada, setDataSelecionada] = useState<any>(new Date());
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  
  // Dados do Cliente
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [agendamentoConcluido, setAgendamentoConcluido] = useState(false);

  // 1. CARREGA DADOS DA EMPRESA E EQUIPE
  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await fetch(`/api/empresa-publica?slug=${params.slug}`);
        if (!res.ok) return; 
        const data = await res.json();
        setEmpresa(data);
        setServices(data.services || []);
        setProfissionais(data.professionals || []); // Carrega os profissionais
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [params.slug]);

  // 2. GERA A LISTA DE HORÁRIOS POSSÍVEIS (BASEADO NA CONFIG)
  useEffect(() => {
    if (empresa) {
        const diaSemana = dataSelecionada.getDay().toString();
        const diasTrabalho = empresa.workDays ? empresa.workDays.split(',') : [];
        
        if (!diasTrabalho.includes(diaSemana)) {
            setHorariosDisponiveis([]);
        } else {
            const slots = gerarHorarios(
                empresa.openTime, 
                empresa.closeTime, 
                empresa.interval,
                empresa.lunchStart || "12:00",
                empresa.lunchEnd || "13:00"
            );
            setHorariosDisponiveis(slots);
        }
    }
  }, [empresa, dataSelecionada]);

  // 3. VERIFICA QUAIS HORÁRIOS ESTÃO OCUPADOS (PARA AQUELE PROFISSIONAL)
  useEffect(() => {
    if (!servicoSelecionado || !profissionalSelecionado) return; // Só verifica se já escolheu o profissional
    
    async function verificar() {
        setHorarioSelecionado(null);
        setHorariosOcupados([]); 
        try {
            const response = await fetch('/api/verificar', {
                method: 'POST',
                body: JSON.stringify({ 
                    date: dataSelecionada, 
                    companyId: empresa.id,
                    professionalId: profissionalSelecionado.id // <--- Verifica a agenda DELE
                })
            });
            const data = await response.json();
            if (data.horariosOcupados) setHorariosOcupados(data.horariosOcupados);
        } catch (error) { console.error("Erro ao verificar"); }
    }
    verificar();
  }, [dataSelecionada, servicoSelecionado, profissionalSelecionado, empresa]);

  // 4. FINALIZA O AGENDAMENTO
  async function finalizar() {
    if (!nomeCliente || !telefoneCliente || !horarioSelecionado) return alert("Preencha todos os dados!");

    const dataFinal = new Date(dataSelecionada);
    const [hora, minuto] = horarioSelecionado.split(':');
    dataFinal.setHours(parseInt(hora), parseInt(minuto));

    const res = await fetch('/api/agendar', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: servicoSelecionado.id,
          companyId: empresa.id,
          professionalId: profissionalSelecionado.id, // <--- Salva com o profissional
          date: dataFinal,
          name: nomeCliente,
          phone: telefoneCliente
        })
    });

    if (res.ok) {
        setAgendamentoConcluido(true);
    } else {
        alert("Ops! Esse horário acabou de ser ocupado.");
        setHorarioSelecionado(null);
        // O ideal seria recarregar a verificação aqui
    }
  }

  const dataBonita = format(dataSelecionada, "dd 'de' MMMM", { locale: ptBR });

  // --- RENDERIZAÇÃO ---

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50 text-gray-400">Carregando...</div>;
  if (!empresa) return <div className="flex justify-center items-center h-screen bg-gray-50 text-red-500">Link inválido.</div>;

  // TELA DE SUCESSO
  if (agendamentoConcluido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-sm w-full animate-in zoom-in">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirmado!</h2>
          <p className="text-gray-600 mb-1">Agendado com <strong>{profissionalSelecionado?.name}</strong></p>
          <p className="text-sm text-gray-400 mb-8">{dataBonita} às {horarioSelecionado}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">Novo Agendamento</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4 font-sans">
      
      {/* CABEÇALHO COM LOGO */}
      <div className="text-center mb-8 animate-in slide-in-from-top-4 duration-500">
        {empresa.logoUrl ? (
            <img src={empresa.logoUrl} alt={empresa.name} className="w-24 h-24 object-cover rounded-full mx-auto shadow-lg border-4 border-white mb-4" />
        ) : (
            <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg border-4 border-white">
                {empresa.name.substring(0,2).toUpperCase()}
            </div>
        )}
        <h1 className="text-3xl font-extrabold text-gray-900">{empresa.name}</h1>
        <p className="text-gray-500 mt-1">Agendamento Online</p>
      </div>

      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-gray-100 overflow-hidden min-h-[400px]">
        
        {/* --- PASSO 1: SELECIONAR SERVIÇO --- */}
        {!servicoSelecionado && (
          <div className="p-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-bold text-gray-700 mb-4 px-2">Selecione o Serviço</h2>
            <div className="space-y-3">
              {services.map((service) => (
                <button key={service.id} onClick={() => setServicoSelecionado(service)} 
                  className="w-full text-left bg-gray-50 p-5 rounded-2xl border border-transparent hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 flex justify-between items-center group">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-700">{service.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">⏱ {service.duration} min</p>
                  </div>
                  <span className="font-bold text-gray-900 group-hover:text-blue-700">R$ {Number(service.price).toFixed(2)}</span>
                </button>
              ))}
              {services.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum serviço disponível.</p>}
            </div>
          </div>
        )}

        {/* --- PASSO 2: SELECIONAR PROFISSIONAL (NOVO!) --- */}
        {servicoSelecionado && !profissionalSelecionado && (
          <div className="p-6 animate-in fade-in slide-in-from-right-4">
            <button onClick={() => setServicoSelecionado(null)} className="text-sm text-gray-400 hover:text-blue-600 mb-4 flex items-center gap-1">← Voltar</button>
            <h2 className="text-lg font-bold text-gray-700 mb-4 px-2">Com quem deseja fazer?</h2>
            
            <div className="space-y-3">
                {profissionais.map((pro) => (
                    <button key={pro.id} onClick={() => setProfissionalSelecionado(pro)}
                        className="w-full text-left bg-gray-50 p-4 rounded-2xl border border-transparent hover:border-blue-500 hover:bg-blue-50/50 transition-all flex items-center gap-4 group">
                        {pro.photoUrl ? (
                            <img src={pro.photoUrl} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                        ) : (
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-400 border border-gray-200"><User /></div>
                        )}
                        <div>
                            <h3 className="font-bold text-gray-800 group-hover:text-blue-700">{pro.name}</h3>
                            <p className="text-xs text-gray-400">Disponível</p>
                        </div>
                    </button>
                ))}
                {profissionais.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                        <p>Nenhum profissional cadastrado.</p>
                        <button onClick={() => setProfissionalSelecionado({ id: "qualquer", name: "Qualquer Profissional" })} className="text-blue-600 text-sm underline mt-2">Continuar sem escolher</button>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* --- PASSO 3: CALENDÁRIO E FINALIZAÇÃO --- */}
        {servicoSelecionado && profissionalSelecionado && (
          <div className="flex flex-col animate-in fade-in slide-in-from-right-4">
            
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
                <button onClick={() => { setProfissionalSelecionado(null); setHorarioSelecionado(null); }} className="p-2 hover:bg-gray-200 rounded-full transition">←</button>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Agendando com</p>
                    <p className="text-sm font-bold text-gray-800">{profissionalSelecionado.name}</p>
                </div>
            </div>

            <div className="p-6">
                <div className="mb-6">
                    <Calendar onChange={setDataSelecionada} value={dataSelecionada} locale="pt-BR" minDate={new Date()} className="w-full border-none !bg-transparent custom-calendar" />
                </div>

                <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Horários Disponíveis</h3>
                    
                    <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                        {horariosDisponiveis
                            .filter((h) => !horariosOcupados.includes(h))
                            .map((horario) => (
                                <button key={horario} onClick={() => setHorarioSelecionado(horario)}
                                    className={`py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${horarioSelecionado === horario ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"}`}>
                                    {horario}
                                </button>
                        ))}
                    </div>
                    {horariosDisponiveis.filter(h => !horariosOcupados.includes(h)).length === 0 && (
                        <p className="text-center text-gray-400 py-4 bg-gray-50 rounded-xl mt-2">Sem horários livres.</p>
                    )}
                </div>

                {horarioSelecionado && (
                    <div className="space-y-3 pt-4 border-t animate-in fade-in slide-in-from-bottom-2">
                        <input type="text" placeholder="Seu Nome Completo" className="w-full bg-gray-50 border-0 p-4 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} />
                        <input type="tel" placeholder="Seu WhatsApp" className="w-full bg-gray-50 border-0 p-4 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" value={telefoneCliente} onChange={(e) => setTelefoneCliente(e.target.value)} />
                        <button onClick={finalizar} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-xl transition transform hover:scale-[1.02]">Confirmar Agendamento</button>
                    </div>
                )}
            </div>
          </div>
        )}

      </div>
      <p className="mt-8 text-gray-400 text-xs">Desenvolvido por NoDigital</p>
    </div>
  );
}