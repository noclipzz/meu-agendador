"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Loader2, X, Phone, Building2, Instagram, Facebook, Clock } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';

// --- FUNÇÃO AVANÇADA DE HORÁRIOS ---
function gerarHorarios(
  inicioExpediente: string, fimExpediente: string, almocoInicio: string, almocoFim: string,
  intervalo: number, duracaoServico: number, agendamentosExistentes: any[],
  dataSelecionada: Date
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

  // Lógica para não permitir horários passados HOJE
  const agora = new Date();
  const isHoje = format(dataSelecionada, 'yyyy-MM-dd') === format(agora, 'yyyy-MM-dd');
  const minutosAgora = isHoje ? (agora.getHours() * 60 + agora.getMinutes()) : -1;

  const blocosOcupados = agendamentosExistentes.map(ag => {
    const inicioAg = new Date(ag.date).getHours() * 60 + new Date(ag.date).getMinutes();
    const fimAg = inicioAg + (ag.service?.duration || 30);
    return { inicio: inicioAg, fim: fimAg };
  });

  while (slotAtualMin + duracaoServico <= fimMin) {
    const fimSlotAtualMin = slotAtualMin + duracaoServico;
    const conflitoAlmoco = slotAtualMin < fimPausaMin && fimSlotAtualMin > inicioPausaMin;
    const conflitoAgendamento = blocosOcupados.some(bloco => slotAtualMin < bloco.fim && fimSlotAtualMin > bloco.inicio);

    // Além de conflitos, verifica se o horário já passou (com margem de 10 min)
    const jaPassou = isHoje && slotAtualMin <= minutosAgora + 10;

    if (!conflitoAlmoco && !conflitoAgendamento && !jaPassou) {
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

  // 3. Gera os horários livres
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
        empresa.interval || 30,
        servicoSelecionado.duration,
        agendamentosDoDia,
        dataSelecionada
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
        phone: telefoneCliente,
        type: "CLIENTE"
      })
    });

    if (res.ok) {
      setAgendamentoConcluido(true);
    } else {
      const err = await res.json();
      alert(err.error || "Ops! Este horário não está mais disponível.");
      setHorarioSelecionado(null);
    }
  }

  const dataBonita = format(dataSelecionada, "dd 'de' MMMM", { locale: ptBR });

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-blue-600 mb-2" size={40} />
      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Carregando Agenda...</p>
    </div>
  );

  if (!empresa) return <div className="h-screen flex items-center justify-center text-red-500 font-bold">Empresa não encontrada ou link expirado.</div>;

  if (agendamentoConcluido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-sm w-full animate-in zoom-in duration-300 border border-gray-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">✓</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Tudo certo!</h2>
          <p className="text-gray-500 mb-1 font-medium">Agendado com <strong>{profissionalSelecionado?.name}</strong></p>
          <p className="text-sm text-blue-600 font-bold mb-8 uppercase tracking-tighter">{dataBonita} às {horarioSelecionado}h</p>
          <button onClick={() => window.location.reload()} className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition shadow-lg">Novo Agendamento</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">

      {/* CABEÇALHO DA PÁGINA */}
      <div className="text-center mb-10 animate-in slide-in-from-top-4 duration-700">
        <div className="relative inline-block mb-4">
          {empresa.logoUrl ? (
            <img src={empresa.logoUrl} alt={empresa.name} className="w-28 h-28 object-cover rounded-[2.5rem] mx-auto shadow-2xl border-4 border-white" />
          ) : (
            <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center text-4xl font-black mx-auto shadow-xl border-4 border-white">
              {empresa.name.substring(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">{empresa.name}</h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Agendamento Online</p>

        {/* --- BOTÕES DE REDES SOCIAIS ADICIONADOS --- */}
        <div className="flex justify-center gap-3 mt-6">
          {empresa.instagramUrl && (
            <a
              href={empresa.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white rounded-2xl hover:scale-110 active:scale-95 transition shadow-lg"
              title="Visitar Instagram"
            >
              <Instagram size={20} />
            </a>
          )}
          {empresa.facebookUrl && (
            <a
              href={empresa.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-blue-600 text-white rounded-2xl hover:scale-110 active:scale-95 transition shadow-lg"
              title="Visitar Facebook"
            >
              <Facebook size={20} />
            </a>
          )}
        </div>
      </div>

      {/* FLUXO DE AGENDAMENTO */}
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden min-h-[500px] transition-all">

        {/* PASSO 1: SERVIÇOS */}
        {!servicoSelecionado && (
          <div className="p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" /> Selecione o Serviço
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {services.map(s => (
                <button key={s.id} onClick={() => setServicoSelecionado(s)} className="w-full text-left bg-gray-50 p-6 rounded-[2rem] border-2 border-transparent hover:border-blue-500 hover:bg-white flex justify-between items-center transition-all group">
                  <div className="space-y-1">
                    <h3 className="font-black text-gray-800 group-hover:text-blue-600 transition">{s.name}</h3>
                    <p className="text-xs text-gray-400 font-bold flex items-center gap-1 uppercase tracking-tighter">
                      <Clock size={12} /> {s.duration} min
                    </p>
                  </div>
                  <span className="font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-sm">R$ {Number(s.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASSO 2: PROFISSIONAL */}
        {servicoSelecionado && !profissionalSelecionado && (
          <div className="p-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <button onClick={() => setServicoSelecionado(null)} className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 hover:text-gray-900 transition flex items-center gap-1">← Voltar</button>
            <h2 className="text-xl font-black text-gray-900 mb-6">Com quem você deseja agendar?</h2>
            <div className="grid grid-cols-1 gap-4">
              {profissionais.map(p => (
                <button key={p.id} onClick={() => setProfissionalSelecionado(p)} className="w-full text-left bg-gray-50 p-5 rounded-[2rem] border-2 border-transparent hover:border-blue-500 flex items-center gap-5 transition-all group">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md border-2 border-white group-hover:scale-105 transition-transform">
                    {p.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xl">{p.name.charAt(0)}</div>}
                  </div>
                  <div>
                    <p className="font-black text-gray-800 group-hover:text-blue-600 transition">{p.name}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Profissional Especialista</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASSO 3: CALENDÁRIO E HORÁRIOS */}
        {servicoSelecionado && profissionalSelecionado && (
          <div className="p-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <button onClick={() => setProfissionalSelecionado(null)} className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 hover:text-gray-900 transition flex items-center gap-1">← Voltar</button>

            <div className="mb-8 p-4 bg-gray-50 rounded-[2rem]">
              <Calendar
                onChange={setDataSelecionada}
                value={dataSelecionada}
                minDate={new Date()}
                locale="pt-BR"
                className="w-full border-none !bg-transparent custom-calendar font-bold"
              />
            </div>

            <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} className="text-blue-600" /> Horários para {format(dataSelecionada, 'dd/MM')}
            </h3>

            <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar mb-8">
              {horariosDisponiveis.map(h => (
                <button key={h} onClick={() => setHorarioSelecionado(h)} className={`py-3 rounded-2xl font-bold text-sm transition-all ${horarioSelecionado === h ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {h}
                </button>
              ))}
            </div>

            {horariosDisponiveis.length === 0 && (
              <div className="text-center py-10 bg-red-50 rounded-[2rem] border border-red-100 mb-8">
                <p className="text-red-600 font-bold text-sm">Não há horários para este dia.</p>
              </div>
            )}

            {/* FORMULÁRIO FINAL */}
            {horarioSelecionado && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 border-t pt-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Seu Nome</label>
                  <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 outline-none focus:ring-2 ring-blue-500 font-bold transition-all" placeholder="Nome completo" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">WhatsApp</label>
                  <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 outline-none focus:ring-2 ring-blue-500 font-bold transition-all" placeholder="(00) 00000-0000" value={telefoneCliente} onChange={e => setTelefoneCliente(e.target.value)} />
                </div>
                <button onClick={finalizar} className="w-full bg-green-600 text-white p-5 rounded-[1.5rem] font-black text-lg shadow-xl hover:bg-green-700 transition active:scale-95">Finalizar Agendamento</button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="mt-12 text-gray-400 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest">Plataforma de Gestão NOHUD</p>
      </footer>
    </div>
  );
}