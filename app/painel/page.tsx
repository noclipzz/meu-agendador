"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner"; // Importa o toast
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUser } from "@clerk/nextjs";
import { ChevronLeft, ChevronRight, DollarSign, Users, Trash2, Building2, Clock, X, Phone, Calendar } from "lucide-react";
import { useAgenda } from "../contexts/AgendaContext";

export default function PainelDashboard() {
  const { user } = useUser();
  const { refreshKey } = useAgenda();
  
  const [empresaInfo, setEmpresaInfo] = useState({ name: "Carregando...", logo: "" });
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null);
  const [metaMensal, setMetaMensal] = useState(5000);

  async function carregarDados() {
    setLoading(true);
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

  useEffect(() => {
    carregarDados();
  }, [refreshKey]);

  // FUNÇÃO CANCELAR ATUALIZADA
  async function cancelar(id: string, nome: string) {
    toast("Cancelar este agendamento?", {
        description: `Cliente: ${nome}`,
        action: {
            label: "Confirmar Cancelamento",
            onClick: async () => {
                const res = await fetch('/api/painel', { method: 'DELETE', body: JSON.stringify({ id }) });
                if (res.ok) {
                    setAgendamentos(prev => prev.filter(i => i.id !== id));
                    setAgendamentoSelecionado(null);
                    toast.success("Cancelado com sucesso!");
                } else {
                    toast.error("Erro ao cancelar no servidor.");
                }
            },
        },
        cancel: {
            label: "Manter",
        },
        duration: 10000,
    });
  }

  const primeiroDiaDoMes = startOfMonth(dataAtual);
  const ultimoDiaDoMes = endOfMonth(dataAtual);
  const dataInicialCalendario = startOfWeek(primeiroDiaDoMes, { weekStartsOn: 0 });
  const dataFinalCalendario = endOfWeek(ultimoDiaDoMes, { weekStartsOn: 0 });
  const diasDoCalendario = eachDayOfInterval({ start: dataInicialCalendario, end: dataFinalCalendario });

  const agendamentosDoMes = agendamentos.filter(a => isSameMonth(new Date(a.date), dataAtual));
  const faturamentoTotal = agendamentosDoMes.reduce((acc, item) => acc + Number(item.service.price), 0);
  const totalAtendimentos = agendamentosDoMes.length;
  const porcentagemMeta = metaMensal > 0 ? Math.min(100, Math.round((faturamentoTotal / metaMensal) * 100)) : 0;
  
  if (loading) return <div className="text-center text-gray-500 dark:text-gray-400 py-20">Carregando...</div>;

  return (
    <div className="space-y-8 pb-10">
      
      <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-sm border dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                {empresaInfo.logo ? <img src={empresaInfo.logo} alt="Logo" className="w-full h-full object-cover rounded-full" /> : <Building2 className="text-gray-300 dark:text-gray-600" size={32} />}
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{empresaInfo.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Olá, {user?.firstName} 👋</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Faturamento ({format(dataAtual, 'MMM', { locale: ptBR })})</p>
              <h3 className="text-3xl font-bold text-green-500 dark:text-green-400 mt-2">R$ {faturamentoTotal.toFixed(2)}</h3>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Atendimentos</p>
              <h3 className="text-3xl font-bold text-blue-500 dark:text-blue-400 mt-2">{totalAtendimentos}</h3>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
              <div className="flex justify-between items-center"><p className="text-sm text-gray-500 dark:text-gray-400">Meta</p><span className="text-xs font-bold text-gray-700 dark:text-white">{porcentagemMeta}%</span></div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-2">R$ {metaMensal.toFixed(2)}</h3>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${porcentagemMeta}%` }}></div></div>
          </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
              <h2 className="text-xl font-bold capitalize text-gray-800 dark:text-white w-48">{format(dataAtual, "MMMM yyyy", { locale: ptBR })}</h2>
              <div className="flex items-center gap-1">
                  <button onClick={() => setDataAtual(subMonths(dataAtual, 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronLeft size={20}/></button>
                  <button onClick={() => setDataAtual(new Date())} className="text-sm font-medium px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Hoje</button>
                  <button onClick={() => setDataAtual(addMonths(dataAtual, 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronRight size={20}/></button>
              </div>
          </div>
          <div className="grid grid-cols-7 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs font-bold text-gray-500 dark:text-gray-400 text-center py-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => <div key={dia}>{dia}</div>)}
          </div>
          <div className="grid grid-cols-7 bg-gray-200 dark:bg-gray-700 gap-px">
              {diasDoCalendario.map((dia) => {
                  const agendamentosDoDia = agendamentos.filter(a => isSameDay(new Date(a.date), dia));
                  const faturamentoDia = agendamentosDoDia.reduce((acc, i) => acc + Number(i.service.price), 0);
                  const ehMesAtual = isSameMonth(dia, dataAtual);

                  return (
                      <div key={dia.toString()} className={`bg-white dark:bg-gray-800 p-2 min-h-[120px] flex flex-col gap-1 ${!ehMesAtual && 'opacity-40'}`}>
                          <div className="flex justify-between items-start">
                              <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isSameDay(dia, new Date()) && 'bg-blue-500 text-white'}`}>{format(dia, 'd')}</span>
                              {faturamentoDia > 0 && <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">R$ {faturamentoDia}</span>}
                          </div>
                          <div className="flex-1 space-y-1 overflow-y-auto">
                              {agendamentosDoDia.map(agend => {
                                  const pro = profissionais.find(p => p.id === agend.professionalId);
                                  const cor = pro ? pro.color : '#6b7280';
                                  
                                  return (
                                    <button 
                                        key={agend.id}
                                        onClick={() => setAgendamentoSelecionado(agend)}
                                        className="w-full group relative p-1.5 rounded text-[10px] text-left text-white" 
                                        style={{ backgroundColor: `${cor}40`, borderLeft: `3px solid ${cor}` }}
                                    >
                                        <p className="font-bold truncate" style={{ color: cor }}>
                                            {format(new Date(agend.date), "HH:mm")} - {agend.customerName}
                                        </p>
                                    </button>
                                  )
                              })}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>
      
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
                        <p className="text-gray-500 dark:text-gray-400">Detalhes</p>
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
                    <a href={`https://wa.me/55${agendamentoSelecionado.customerPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${agendamentoSelecionado.customerName}! Tudo bem? 😊 Confirmando seu agendamento: ${format(new Date(agendamentoSelecionado.date), "dd/MM/yy 'às' HH:mm")} para ${agendamentoSelecionado.service.name}.`)}`}
                        target="_blank" className="w-full bg-green-500 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-green-600">
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