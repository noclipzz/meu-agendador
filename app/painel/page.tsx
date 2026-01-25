"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay, addDays, subDays, getHours, getMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUser } from "@clerk/nextjs";
import { ChevronLeft, ChevronRight, DollarSign, Users, Trash2, Building2, Clock, X, Phone, Calendar } from "lucide-react";
import { toast } from "sonner";

// CORREÇÃO: Usando caminho relativo manual (sai de painel, sai de app -> entra em contexts)
import { useAgenda } from "../../contexts/AgendaContext";

export default function PainelDashboard() {
  const { user } = useUser();
  const { refreshKey } = useAgenda();
  
  // ESTADO DA VISUALIZAÇÃO (Mês, Semana, Dia)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  
  const [empresaInfo, setEmpresaInfo] = useState({ name: "...", logo: "" });
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null);
  const [metaMensal, setMetaMensal] = useState(5000);

  async function carregarDados() {
    // setLoading(true); // Comentado para evitar piscar tela toda hora
    try {
      const [resAgenda, resConfig, resPro] = await Promise.all([
        fetch('/api/painel'), 
        fetch('/api/painel/config'), 
        fetch('/api/painel/profissionais')
      ]);
      
      const dadosAgenda = await resAgenda.json();
      if (Array.isArray(dadosAgenda)) setAgendamentos(dadosAgenda);
      
      const dadosConfig = await resConfig.json();
      if (dadosConfig) {
        if (dadosConfig.monthlyGoal) setMetaMensal(Number(dadosConfig.monthlyGoal));
        setEmpresaInfo({ name: dadosConfig.name || "", logo: dadosConfig.logoUrl || "" });
      }
      
      const dadosPro = await resPro.json();
      if (Array.isArray(dadosPro)) setProfissionais(dadosPro);
      
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  }

  useEffect(() => { carregarDados(); }, [refreshKey]);

  async function cancelar(id: string, nome: string) {
    toast(`Cancelar agendamento de ${nome}?`, {
        action: {
            label: "Confirmar",
            onClick: async () => {
                const res = await fetch('/api/painel', { method: 'DELETE', body: JSON.stringify({ id }) });
                if (res.ok) {
                    setAgendamentos(prev => prev.filter(i => i.id !== id));
                    setAgendamentoSelecionado(null);
                    toast.success("Cancelado!");
                } else {
                    toast.error("Erro ao cancelar.");
                }
            },
        },
        cancel: { label: "Voltar" },
        duration: 5000,
    });
  }

  // --- LÓGICA DAS DATAS PARA CADA VISUALIZAÇÃO ---
  let diasParaMostrar: Date[] = [];
  let tituloCalendario = "";

  if (view === 'month') {
      const start = startOfWeek(startOfMonth(dataAtual), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(dataAtual), { weekStartsOn: 0 });
      diasParaMostrar = eachDayOfInterval({ start, end });
      tituloCalendario = format(dataAtual, "MMMM yyyy", { locale: ptBR });
  } else if (view === 'week') {
      const start = startOfWeek(dataAtual, { weekStartsOn: 0 });
      const end = endOfWeek(dataAtual, { weekStartsOn: 0 });
      diasParaMostrar = eachDayOfInterval({ start, end });
      tituloCalendario = `Semana de ${format(start, "dd/MM", { locale: ptBR })}`;
  } else if (view === 'day') {
      diasParaMostrar = [dataAtual];
      tituloCalendario = format(dataAtual, "dd 'de' MMMM", { locale: ptBR });
  }

  const navegar = (direcao: number) => {
      if (view === 'month') setDataAtual(direcao > 0 ? addMonths(dataAtual, 1) : subMonths(dataAtual, 1));
      if (view === 'week') setDataAtual(direcao > 0 ? addWeeks(dataAtual, 1) : subWeeks(dataAtual, 1));
      if (view === 'day') setDataAtual(direcao > 0 ? addDays(dataAtual, 1) : subDays(dataAtual, 1));
  };

  const agendamentosDoMes = agendamentos.filter(a => isSameMonth(new Date(a.date), dataAtual));
  const faturamentoTotal = agendamentosDoMes.reduce((acc, item) => acc + Number(item.service.price), 0);
  const totalAtendimentos = agendamentosDoMes.length;
  const porcentagemMeta = metaMensal > 0 ? Math.min(100, Math.round((faturamentoTotal / metaMensal) * 100)) : 0;

  // --- RENDERIZAÇÃO DO MÊS (GRID) ---
  const renderMes = () => {
      return (
             <div className="grid grid-cols-7 bg-gray-200 dark:bg-gray-700 gap-px h-full overflow-y-auto">
                {diasParaMostrar.map((dia) => {
                    const ags = agendamentos.filter(a => isSameDay(new Date(a.date), dia));
                    const faturamento = ags.reduce((acc, i) => acc + Number(i.service.price), 0);
                    const ehMes = isSameMonth(dia, dataAtual);
                    const isToday = isSameDay(dia, new Date());

                    return (
                        <div key={dia.toString()} 
                             onClick={() => { setDataAtual(dia); setView('day'); }}
                             className={`bg-white dark:bg-gray-800 p-2 min-h-[100px] flex flex-col gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition ${!ehMes && 'opacity-40'}`}>
                            <div className="flex justify-between items-start">
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday && 'bg-blue-500 text-white'}`}>{format(dia, 'd')}</span>
                                {faturamento > 0 && <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-1 rounded">R${faturamento}</span>}
                            </div>
                            <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                {ags.map(ag => {
                                    const pro = profissionais.find(p => p.id === ag.professionalId);
                                    const cor = pro ? pro.color : '#6b7280';
                                    return (
                                        <div key={ag.id} className="text-[10px] px-1 rounded truncate text-white font-medium" style={{ backgroundColor: cor }}>
                                            {format(new Date(ag.date), "HH:mm")} {ag.customerName}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
      )
  };

  // --- RENDERIZAÇÃO DO DIA (TIME GRID - GOOGLE AGENDA) ---
  const renderDia = () => {
      const horas = Array.from({ length: 24 }, (_, i) => i); // 0 a 23
      const PIXELS_POR_HORA = 80;
      const agsDoDia = agendamentos.filter(a => isSameDay(new Date(a.date), dataAtual));

      return (
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-800">
            <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                {horas.map(h => (
                    <div key={h} className="flex border-b dark:border-gray-700 h-[80px]">
                        <div className="w-16 text-xs text-gray-400 text-right pr-4 pt-2 -mt-2.5 bg-gray-50 dark:bg-gray-900/50 sticky left-0 z-10 border-r dark:border-gray-700">
                            {h.toString().padStart(2,'0')}:00
                        </div>
                        <div className="flex-1 relative">
                            {/* Linha de meio período (30min) */}
                            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed dark:border-gray-800 opacity-50"></div>
                        </div>
                    </div>
                ))}

                {/* BLOCOS DE AGENDAMENTO (POSICIONAMENTO ABSOLUTO) */}
                {agsDoDia.map(ag => {
                    const data = new Date(ag.date);
                    const pro = profissionais.find(p => p.id === ag.professionalId);
                    const cor = pro ? pro.color : '#3b82f6';
                    
                    // Cálculo da Posição
                    const minutosDesdeInicio = getHours(data) * 60 + getMinutes(data);
                    const top = (minutosDesdeInicio / 60) * PIXELS_POR_HORA;
                    const height = (ag.service.duration / 60) * PIXELS_POR_HORA;

                    return (
                        <button
                            key={ag.id}
                            onClick={(e) => { e.stopPropagation(); setAgendamentoSelecionado(ag); }}
                            className="absolute left-16 right-2 rounded-lg p-2 text-left text-white shadow-md hover:brightness-110 hover:z-50 transition border-l-4 border-black/20 flex flex-col justify-center overflow-hidden"
                            style={{ 
                                top: `${top}px`, 
                                height: `${height}px`,
                                backgroundColor: cor,
                                minHeight: '40px'
                            }}
                        >
                            <div className="font-bold text-xs flex justify-between items-center w-full">
                                <span>{ag.service.name}</span>
                                <span className="opacity-80">{format(data, "HH:mm")}</span>
                            </div>
                            <div className="text-[10px] opacity-90 truncate">{ag.customerName}</div>
                        </button>
                    )
                })}
                
                {/* Linha do Tempo Atual (Se for hoje) */}
                {isSameDay(dataAtual, new Date()) && (
                    <div 
                        className="absolute left-16 right-0 border-t-2 border-red-500 z-40 pointer-events-none flex items-center"
                        style={{ top: `${(getHours(new Date()) * 60 + getMinutes(new Date())) / 60 * PIXELS_POR_HORA}px` }}
                    >
                        <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5"></div>
                    </div>
                )}
            </div>
        </div>
      )
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div className="h-screen flex flex-col p-4 gap-4 overflow-hidden text-gray-800 dark:text-gray-100">
      
      {/* HEADER COMPACTO */}
      <div className="flex flex-col md:flex-row gap-4 h-auto flex-shrink-0">
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 flex items-center gap-3 flex-1 shadow-sm">
            <div className="w-12 h-12 rounded-full border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                {empresaInfo.logo ? <img src={empresaInfo.logo} className="w-full h-full object-cover" /> : <Building2 className="text-gray-400" size={24} />}
            </div>
            <div>
                <h1 className="text-lg font-bold leading-tight">{empresaInfo.name}</h1>
                <p className="text-xs text-gray-500">Olá, {user?.firstName}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 flex-1 shadow-sm flex flex-col justify-center">
              <p className="text-xs text-gray-500 uppercase font-bold">Faturamento mensal atual</p>
              <div className="flex items-center gap-2">
                  <DollarSign size={20} className="text-green-500"/>
                  <span className="text-2xl font-bold">R$ {faturamentoTotal}</span>
              </div>
          </div>

           <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 flex-1 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-gray-500 uppercase font-bold">Meta</p>
                  <span className="text-xs font-bold text-blue-600">{porcentagemMeta}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${porcentagemMeta}%` }}></div>
              </div>
              <p className="text-xs text-gray-400 text-right">de R$ {metaMensal}</p>
          </div>
      </div>

      {/* CALENDÁRIO (AREA FLEXÍVEL) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 flex flex-col flex-1 overflow-hidden shadow-sm">
          
          {/* BARRA DE CONTROLE */}
          <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div className="flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700">
                  {['month', 'week', 'day'].map((v) => (
                      <button key={v} onClick={() => setView(v as any)} 
                        className={`px-3 py-1 text-xs font-bold rounded transition capitalize ${view === v ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                      </button>
                  ))}
              </div>

              <div className="flex items-center gap-4">
                  <button onClick={() => navegar(-1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><ChevronLeft size={20}/></button>
                  <span className="text-sm font-bold capitalize w-32 text-center">{tituloCalendario}</span>
                  <button onClick={() => navegar(1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><ChevronRight size={20}/></button>
              </div>
          </div>

          {/* CABEÇALHO SEMANA (Só mostra se não for dia) */}
          {view !== 'day' && (
             <div className="grid grid-cols-7 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                    <div key={d} className="py-2 text-center text-xs font-bold text-gray-400">{d}</div>
                ))}
             </div>
          )}

          {/* AREA DE CONTEUDO DO CALENDARIO */}
          <div className="flex-1 overflow-hidden">
             {view === 'day' ? renderDia() : renderMes()}
          </div>
      </div>

      {/* MODAL DE DETALHES (O mesmo de antes) */}
      {agendamentoSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-lg relative text-gray-800 dark:text-white">
                <button onClick={() => setAgendamentoSelecionado(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white"><X /></button>
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Calendar size={32} className="text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{agendamentoSelecionado.customerName}</h2>
                        <p className="text-gray-500 dark:text-gray-400">Detalhes do Agendamento</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                        <p className="text-xs text-gray-500 font-bold uppercase">Serviço</p>
                        <p className="font-medium text-lg">{agendamentoSelecionado.service.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                            <p className="text-xs text-gray-500 font-bold uppercase">Data</p>
                            <p className="font-medium">{format(new Date(agendamentoSelecionado.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                            <p className="text-xs text-gray-500 font-bold uppercase">Horário</p>
                            <p className="font-medium">{format(new Date(agendamentoSelecionado.date), "HH:mm")}</p>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                        <p className="text-xs text-gray-500 font-bold uppercase">Profissional</p>
                        <p className="font-medium">{profissionais.find(p => p.id === agendamentoSelecionado.professionalId)?.name || 'N/A'}</p>
                    </div>
                </div>
                <div className="mt-8 flex gap-4">
                    <a href={`https://wa.me/55${agendamentoSelecionado.customerPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${agendamentoSelecionado.customerName}!`)}`} target="_blank" className="w-full bg-green-500 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-green-600">
                        <Phone /> WhatsApp
                    </a>
                    <button onClick={() => cancelar(agendamentoSelecionado.id, agendamentoSelecionado.customerName)} className="w-full bg-red-100 text-red-600 font-bold py-3 rounded-lg hover:bg-red-200">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}