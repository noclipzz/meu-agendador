"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserButton, useUser } from "@clerk/nextjs";
import { ChevronLeft, ChevronRight, DollarSign, Calendar as CalendarIcon, Users, Trash2 } from "lucide-react";

export default function PainelDashboard() {
  const { user } = useUser();
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataAtual, setDataAtual] = useState(new Date());
  
  // META MENSAL (Valor inicial 5000, atualizado pelo banco)
  const [metaMensal, setMetaMensal] = useState(5000);

  // FUNÇÃO DE CARREGAR TUDO (Agenda + Meta)
  async function carregarDados() {
    try {
      // 1. Busca Agendamentos
      const resAgenda = await fetch('/api/painel');
      const dadosAgenda = await resAgenda.json();
      if (Array.isArray(dadosAgenda)) setAgendamentos(dadosAgenda);

      // 2. Busca Configuração para pegar a Meta
      const resConfig = await fetch('/api/painel/config');
      const dadosConfig = await resConfig.json();
      
      // Se tiver meta salva, atualiza o estado
      if (dadosConfig && dadosConfig.monthlyGoal) {
        setMetaMensal(Number(dadosConfig.monthlyGoal));
      }
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  }

  // Carrega ao abrir a página
  useEffect(() => { carregarDados(); }, []);

  // --- LÓGICA DO CALENDÁRIO ---
  const primeiroDiaDoMes = startOfMonth(dataAtual);
  const ultimoDiaDoMes = endOfMonth(dataAtual);
  const dataInicialCalendario = startOfWeek(primeiroDiaDoMes);
  const dataFinalCalendario = endOfWeek(ultimoDiaDoMes);
  
  const diasDoCalendario = eachDayOfInterval({ start: dataInicialCalendario, end: dataFinalCalendario });

  // --- CÁLCULOS FINANCEIROS ---
  // Filtra apenas os agendamentos do mês que está na tela
  const agendamentosDoMes = agendamentos.filter(a => isSameMonth(new Date(a.date), dataAtual));
  
  // Soma o preço dos serviços
  const faturamentoTotal = agendamentosDoMes.reduce((acc, item) => acc + Number(item.service.price), 0);
  const totalAtendimentos = agendamentosDoMes.length;
  
  // Calcula porcentagem da meta (evita divisão por zero)
  const porcentagemMeta = metaMensal > 0 ? Math.min(100, Math.round((faturamentoTotal / metaMensal) * 100)) : 0;

  // Função Deletar com atualização instantânea
  async function cancelar(id: string) {
    if(!confirm("Cancelar este agendamento?")) return;
    
    const res = await fetch('/api/painel', { method: 'DELETE', body: JSON.stringify({ id }) });
    
    if (res.ok) {
        // Remove da tela na hora
        setAgendamentos(prev => prev.filter(i => i.id !== id));
        alert("Agendamento cancelado!");
    }
  }

  return (
    <div className="space-y-8">
      
      {/* HEADER MOBILE (Aparece só no celular) */}
      <div className="md:hidden flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Olá, {user?.firstName}</h1>
        <UserButton />
      </div>

      {/* CARDS DE RESUMO (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Faturamento */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-4 bg-green-100 text-green-600 rounded-full">
                  <DollarSign size={24} />
              </div>
              <div>
                  <p className="text-sm text-gray-500 font-medium">Faturamento ({format(dataAtual, 'MMM', { locale: ptBR })})</p>
                  <h3 className="text-2xl font-bold text-gray-900">R$ {faturamentoTotal.toFixed(2)}</h3>
              </div>
          </div>

          {/* Quantidade */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
                  <Users size={24} />
              </div>
              <div>
                  <p className="text-sm text-gray-500 font-medium">Atendimentos</p>
                  <h3 className="text-2xl font-bold text-gray-900">{totalAtendimentos}</h3>
              </div>
          </div>

          {/* Meta */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-lg text-white flex justify-between items-center">
              <div>
                  <p className="text-blue-100 text-sm font-medium">Meta Mensal</p>
                  <h3 className="text-2xl font-bold">R$ {metaMensal.toFixed(2)}</h3>
              </div>
              <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
                  <span className="font-bold text-sm">{porcentagemMeta}%</span>
              </div>
            </div>
        </div>

        {/* CALENDÁRIO VISUAL */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Controles de Mês */}
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

            {/* Cabeçalho Dias */}
            <div className="grid grid-cols-7 border-b bg-gray-50">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                    <div key={dia} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {dia}
                    </div>
                ))}
            </div>

            {/* Grid de Dias */}
            <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] bg-gray-200 gap-px border-b">
                {diasDoCalendario.map((dia) => {
                    // Filtra agendamentos deste dia específico
                    const agendamentosDoDia = agendamentos.filter(a => isSameDay(new Date(a.date), dia));
                    // Soma faturamento do dia
                    const faturamentoDia = agendamentosDoDia.reduce((acc, i) => acc + Number(i.service.price), 0);
                    const ehMesAtual = isSameMonth(dia, dataAtual);

                    return (
                        <div key={dia.toString()} className={`bg-white p-2 min-h-[120px] flex flex-col gap-1 transition ${!ehMesAtual ? 'bg-gray-50/50' : ''}`}>
                            
                            {/* Cabeçalho do Dia (Número + Total R$) */}
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

                            {/* Lista de Agendamentos (Etiquetas) */}
                            <div className="flex-1 space-y-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                                {agendamentosDoDia.map(agend => (
                                    <div key={agend.id} className="group relative flex items-center justify-between text-xs p-1.5 rounded bg-blue-50 border-l-2 border-blue-500 hover:bg-blue-100 transition cursor-pointer">
                                        <div className="truncate pr-4">
                                            <span className="font-bold text-blue-700 mr-1">
                                                {format(new Date(agend.date), "HH:mm")}
                                            </span>
                                            <span className="text-gray-700">{agend.customerName}</span>
                                        </div>
                                        
                                        {/* Botão de Excluir (Só aparece no hover) */}
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