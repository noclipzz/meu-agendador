"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Loader2, X, Phone, Building2 } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';

// --- FUNÇÃO AVANÇADA DE HORÁRIOS ---
function gerarHorarios(
  inicioExpediente: string, fimExpediente: string, almocoInicio: string, almocoFim: string,
  intervalo: number, duracaoServico: number, agendamentosExistentes: any[]
) {
  const slots: string[] = [];
  const toMinutes = (time: string) => {
    if (!time || !time.includes(':')) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  
  const inicioMin = toMinutes(inicioExpediente);
  const fimMin = toMinutes(fimExpediente);
  const inicioPausaMin = toMinutes(almocoInicio);
  const fimPausaMin = toMinutes(almocoFim);
  
  let slotAtualMin = inicioMin;

  const blocosOcupados = agendamentosExistentes.map(ag => {
    const inicioAg = new Date(ag.date).getHours() * 60 + new Date(ag.date).getMinutes();
    const fimAg = inicioAg + ag.service.duration;
    return { inicio: inicioAg, fim: fimAg };
  });

  while (slotAtualMin + duracaoServico <= fimMin) {
    const fimSlotAtualMin = slotAtualMin + duracaoServico;
    const conflitoAlmoco = slotAtualMin < fimPausaMin && fimSlotAtualMin > inicioPausaMin;
    const conflitoAgendamento = blocosOcupados.some(bloco => slotAtualMin < bloco.fim && fimSlotAtualMin > bloco.inicio);
    
    if (!conflitoAlmoco && !conflitoAgendamento) {
      const hora = Math.floor(slotAtualMin / 60).toString().padStart(2, '0');
      const minuto = (slotAtualMin % 60).toString().padStart(2, '0');
      slots.push(`${hora}:${minuto}`);
    }
    slotAtualMin += intervalo;
  }
  return slots;
}

export default function PaginaEmpresa({ params }: { params: { slug: string } }) {
  const [empresa, setEmpresa] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [servicoSelecionado, setServicoSelecionado] = useState<any>(null);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<any>(null);
  const [dataSelecionada, setDataSelecionada] = useState<any>(new Date());
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);
  
  const [agendamentosDoDia, setAgendamentosDoDia] = useState<any[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [agendamentoConcluido, setAgendamentoConcluido] = useState(false);

  // 1. Carrega dados da empresa
  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await fetch(`/api/empresa-publica?slug=${params.slug}`);
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setEmpresa(data);
        setServices(data.services || []);
        setProfissionais(data.professionals || []);
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    }
    carregarDados();
  }, [params.slug]);

  // 2. Busca ocupados
  useEffect(() => {
    async function verificarOcupados() {
        if (!empresa || !profissionalSelecionado || !servicoSelecionado) return;
        setHorarioSelecionado(null);
        try {
            const res = await fetch('/api/verificar', {
                method: 'POST',
                body: JSON.stringify({ 
                    date: dataSelecionada, 
                    companyId: empresa.id,
                    professionalId: profissionalSelecionado.id
                })
            });
            const data = await res.json();
            setAgendamentosDoDia(data.agendamentos || []);
        } catch (error) { console.error(error); }
    }
    verificarOcupados();
  }, [dataSelecionada, profissionalSelecionado, servicoSelecionado, empresa]);

  // 3. Gera os horários livres (CORRIGIDO PARA LER O INTERVALO DO BANCO)
  useEffect(() => {
    if (empresa && servicoSelecionado) {
        const diaSemana = dataSelecionada.getDay().toString();
        const diasTrabalho = empresa.workDays ? empresa.workDays.split(',') : [];
        if (!diasTrabalho.includes(diaSemana)) {
            setHorariosDisponiveis([]);
            return;
        }

        const slots = gerarHorarios(
            empresa.openTime, 
            empresa.closeTime, 
            empresa.lunchStart || "12:00",
            empresa.lunchEnd || "13:00",
            empresa.interval || 30, // <--- AQUI: Usa a configuração do banco ou 30 min padrão
            servicoSelecionado.duration,
            agendamentosDoDia
        );
        setHorariosDisponiveis(slots);
    }
  }, [agendamentosDoDia, empresa, servicoSelecionado, dataSelecionada]);

  // 4. Salva o agendamento
  async function finalizar() {
    if (!nomeCliente || !telefoneCliente || !horarioSelecionado) return alert("Preencha todos os dados!");

    const dataFinal = new Date(dataSelecionada);
    const [hora, minuto] = horarioSelecionado.split(':');
    dataFinal.setHours(parseInt(hora), parseInt(minuto), 0, 0);

    const res = await fetch('/api/agendar', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: servicoSelecionado.id,
          companyId: empresa.id,
          professionalId: profissionalSelecionado.id,
          date: dataFinal,
          name: nomeCliente,
          phone: telefoneCliente
        })
    });

    if (res.ok) {
        setAgendamentoConcluido(true);
    } else {
        alert("Ops! Esse horário foi ocupado. Por favor, escolha outro.");
        setHorarioSelecionado(null);
        // Força recarregar os ocupados
        const event = new Event('refreshOcupados');
        window.dispatchEvent(event);
    }
  }

  const dataBonita = format(dataSelecionada, "dd 'de' MMMM", { locale: ptBR });

  if (loading) return <div className="h-screen flex items-center justify-center">Carregando...</div>;
  if (!empresa) return <div className="h-screen flex items-center justify-center text-red-500">Empresa não encontrada.</div>;

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
      <div className="text-center mb-8 animate-in slide-in-from-top-4 duration-500">
        {empresa.logoUrl ? <img src={empresa.logoUrl} alt={empresa.name} className="w-24 h-24 object-cover rounded-full mx-auto shadow-lg border-4 border-white mb-4" /> : <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg border-4 border-white">{empresa.name.substring(0,2).toUpperCase()}</div>}
        <h1 className="text-3xl font-extrabold text-gray-900">{empresa.name}</h1>
        <p className="text-gray-500 mt-1">Agendamento Online</p>
      </div>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-gray-100 overflow-hidden min-h-[400px]">
        
        {!servicoSelecionado && (
          <div className="p-6 animate-in fade-in">
            <h2 className="text-lg font-bold text-gray-700 mb-4 px-2">Selecione o Serviço</h2>
            <div className="space-y-3">{services.map(s => <button key={s.id} onClick={() => setServicoSelecionado(s)} className="w-full text-left bg-gray-50 p-5 rounded-2xl border hover:border-blue-500 flex justify-between"><div><h3 className="font-bold">{s.name}</h3><p className="text-sm text-gray-400">⏱ {s.duration} min</p></div><span className="font-bold text-blue-600">R$ {Number(s.price)}</span></button>)}</div>
          </div>
        )}

        {servicoSelecionado && !profissionalSelecionado && (
          <div className="p-6 animate-in fade-in"><button onClick={() => setServicoSelecionado(null)}>← Voltar</button><h2 className="font-bold my-4">Escolha o Profissional</h2>
            <div className="space-y-3">{profissionais.map(p => <button key={p.id} onClick={() => setProfissionalSelecionado(p)} className="w-full text-left bg-gray-50 p-4 rounded-2xl flex items-center gap-4">{p.photoUrl && <img src={p.photoUrl} className="w-10 h-10 rounded-full"/>}{p.name}</button>)}</div>
          </div>
        )}

        {servicoSelecionado && profissionalSelecionado && (
          <div className="p-6 animate-in fade-in">
            <button onClick={() => setProfissionalSelecionado(null)}>← Voltar</button>
            <div className="my-4"><Calendar onChange={setDataSelecionada} value={dataSelecionada} minDate={new Date()} locale="pt-BR" className="w-full border-none !bg-transparent custom-calendar" /></div>
            <h3 className="font-bold mb-2">Horários Disponíveis</h3>
            <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {horariosDisponiveis.map(h => (
                    <button key={h} onClick={() => setHorarioSelecionado(h)} className={`p-2 rounded ${horarioSelecionado === h ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{h}</button>
                ))}
            </div>
            {horariosDisponiveis.length === 0 && <p className="text-center text-gray-400 py-4 bg-gray-50 rounded-xl mt-2">Agenda lotada ou fechada.</p>}
            {horarioSelecionado && (<div className="mt-4 space-y-2"><input placeholder="Nome" className="w-full border p-2 rounded" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} /><input placeholder="Telefone" className="w-full border p-2 rounded" value={telefoneCliente} onChange={e => setTelefoneCliente(e.target.value)} /><button onClick={finalizar} className="w-full bg-green-500 text-white p-3 rounded">Confirmar</button></div>)}
          </div>
        )}
      </div>
    </div>
  );
}