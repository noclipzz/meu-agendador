"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserButton, useUser } from "@clerk/nextjs";
import { ChevronLeft, ChevronRight, DollarSign, Calendar as CalendarIcon, Users, Trash2, Building2 } from "lucide-react";

export default function PainelDashboard() {
  const { user } = useUser();
  
  // DADOS DA EMPRESA (NOVO)
  const [empresaInfo, setEmpresaInfo] = useState({ name: "Carregando...", logo: "" });
  
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataAtual, setDataAtual] = useState(new Date());
  
  // META MENSAL
  const [metaMensal, setMetaMensal] = useState(5000);

  // FUNÇÃO DE CARREGAR TUDO
  async function carregarDados() {
    try {
      // 1. Busca Agendamentos
      const resAgenda = await fetch('/api/painel');
      const dadosAgenda = await resAgenda.json();
      if (Array.isArray(dadosAgenda)) setAgendamentos(dadosAgenda);

      // 2. Busca Configuração (Meta + Dados da Empresa)
      const resConfig = await fetch('/api/painel/config');
      const dadosConfig = await resConfig.json();
      
      if (dadosConfig) {
        // Atualiza Meta
        if (dadosConfig.monthlyGoal) setMetaMensal(Number(dadosConfig.monthlyGoal));
        
        // Atualiza Info da Empresa (NOVO)
        setEmpresaInfo({
            name: dadosConfig.name || "Minha Empresa",
            logo: dadosConfig.logoUrl || ""
        });
      }
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { carregarDados(); }, []);

  // --- LÓGICA DO CALENDÁRIO ---
  const primeiroDiaDoMes = startOfMonth(dataAtual);
  const ultimoDiaDoMes = endOfMonth(dataAtual);
  const dataInicialCalendario = startOfWeek(primeiroDiaDoMes);
  const dataFinalCalendario = endOfWeek(ultimoDiaDoMes);
  
  const diasDoCalendario = eachDayOfInterval({ start: dataInicialCalendario, end: dataFinalCalendario });

  // --- CÁLCULOS FINANCEIROS ---
  const agendamentosDoMes = agendamentos.filter(a => isSameMonth(new Date(a.date), dataAtual));
  const faturamentoTotal = agendamentosDoMes.reduce((acc, item) => acc + Number(item.service.price), 0);
  const totalAtendimentos = agendamentosDoMes.length;
  const porcentagemMeta = metaMensal > 0 ? Math.min(100, Math.round((faturamentoTotal / metaMensal) * 100)) : 0;

  async function cancelar(id: string) {
    if(!confirm("Cancelar este agendamento?")) return;
    
    const res = await fetch('/api/painel', { method: 'DELETE', body: JSON.stringify({ id }) });
    
    if (res.ok) {
        setAgendamentos(prev => prev.filter(i => i.id !== id));
        alert("Agendamento cancelado!");
    }
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER MOBILE */}
      <div className="md:hidden flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Olá, {user?.firstName}</h1>
        <UserButton />
      </div>

      {/* HEADER PERSONALIZADO DA EMPRESA (NOVO) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center gap-4">
            {/* LOGO */}
            <div className="w-16 h-16 rounded-full border-2 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm">
                {empresaInfo.logo ? (
                    <img src={empresaInfo.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                    <Building2 className="text-gray-300" size={32} />
                )}
            </div>
            
            {/* NOME E SAUDAÇÃO */}
            <div>
                <h1 className="text-2xl font-extrabold text-gray-800">{empresaInfo.name}</h1>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Painel Online • Olá, {user?.firstName}
                </p>
            </div>
        </div>

        <div className="hidden md:block">
            <UserButton showName/>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
              <div className="p-4 bg-green-100 text-green-600 rounded-full">
                  <DollarSign size={24} />
              </div>
              <div>
                  <p className="text-sm text-gray-500 font-medium">Faturamento ({format(dataAtual, 'MMM', { locale: ptBR })})</p>
                  <h3 className="text-2xl font-bold text-gray-900">R$ {faturamentoTotal.toFixed(2)}</h3>
              </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
                  <Users size={24} />
              </div>
              <div>
                  <p className="text-sm text-gray-500 font-medium">Atendimentos</p>
                  <h3 className="text-2xl font-bold text-gray-900">{totalAtendimentos}</h3>
              </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-lg text-white flex justify-between items-center transition hover:scale-[1.01]">
              <div>
                  <p className="text-blue-100 text-sm font-medium">Meta Mensal</p>
                  <h3 className="text-2xl font-bold">R$ {metaMensal.toFixed(2)}</h3>
              </div>
              <div className="relative h-14 w-14">
                  {/* Círculo de Progresso simples com SVG */}
                  <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-blue-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeOpacity="0.5"/>
                    <path className="text-white" strokeDasharray={`${porcentagemMeta}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-sm">{porcentagemMeta}%</div>
              </div>
            </div>
        </div>

        {/* CALENDÁRIO VISUAL */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold capitalize text-gray-800">
                        {format(dataAtual, "MMMM yyyy", { locale: ptBR })}
                    </h2>
                    <div className="flex gap-1">
                        <button onClick={() => setDataAtual(subMonths(dataAtual, 1))} className="p-1 hover:bg-gray-100 rounded transition"><ChevronLeft /></button>
                        <button onClick={() => setDataAtual(new Date())} className="text-sm font-medium px-3 hover:bg-gray-100 rounded transition">Hoje</button>
                        <button onClick={() => setDataAtual(addMonths(dataAtual, 1))} className="p-1 hover:bg-gray-100 rounded transition"><ChevronRight /></button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 border-b bg-gray-50">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                    <div key={dia} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {dia}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] bg-gray-200 gap-px border-b">
                {diasDoCalendario.map((dia) => {
                    const agendamentosDoDia = agendamentos.filter(a => isSameDay(new Date(a.date), dia));
                    const faturamentoDia = agendamentosDoDia.reduce((acc, i) => acc + Number(i.service.price), 0);
                    const ehMesAtual = isSameMonth(dia, dataAtual);

                    return (
                        <div key={dia.toString()} className={`bg-white p-2 min-h-[120px] flex flex-col gap-1 transition ${!ehMesAtual ? 'bg-gray-50/50' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full 
                                    ${isSameDay(dia, new Date()) ? 'bg-blue-600 text-white' : 'text-gray-700'} 
                                    ${!ehMesAtual && 'text-gray-300'}`}>
                                    {format(dia, 'd')}
                                </span>
                                {faturamentoDia > 0 && (
                                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                                        R$ {faturamentoDia}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 space-y-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                                {agendamentosDoDia.map(agend => (
                                    <div key={agend.id} className="group relative flex items-center justify-between text-xs p-1.5 rounded bg-blue-50 border-l-2 border-blue-500 hover:bg-blue-100 transition cursor-pointer">
                                        <div className="truncate pr-4">
                                            <span className="font-bold text-blue-700 mr-1">
                                                {format(new Date(agend.date), "HH:mm")}
                                            </span>
                                            <span className="text-gray-700">{agend.customerName}</span>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); cancelar(agend.id); }}
                                            className="absolute right-1 top-1 bottom-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 bg-white/80 rounded"
                                            title="Cancelar Agendamento"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
}