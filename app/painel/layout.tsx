"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Settings, Users, PlusCircle, X, Loader2, User as UserIcon, Search, Check, MapPin, Trash2, BarChart3 } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { AgendaProvider, useAgenda } from "../../contexts/AgendaContext";
import { toast } from "sonner";
import { isBefore } from "date-fns";

// --- HELPER: MÁSCARA DE TELEFONE (ADICIONADO) ---
const formatarTelefoneInput = (value: string) => {
  if (!value) return "";
  value = value.replace(/\D/g, ""); // Remove tudo que não é dígito
  if (value.length > 11) value = value.substring(0, 11); // Limita a 11 dígitos
  // Adiciona parênteses e traço conforme digita
  if (value.length > 10) {
    value = value.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
  } else if (value.length > 6) {
    value = value.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  } else if (value.length > 2) {
    value = value.replace(/^(\d\d)(\d{0,5}).*/, "($1) $2");
  } else {
    value = value.replace(/^(\d*)/, "($1");
  }
  return value;
};

function PainelConteudo({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const { refreshAgenda, companyId, setCompanyId } = useAgenda();
  
  const [verificando, setVerificando] = useState(true);
  const [userRole, setUserRole] = useState<"ADMIN" | "PROFESSIONAL">("PROFESSIONAL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [tipoAgendamento, setTipoAgendamento] = useState<"CLIENTE" | "EVENTO">("CLIENTE");

  const [services, setServices] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [clientesCadastrados, setClientesCadastrados] = useState<any[]>([]);
  
  const [novo, setNovo] = useState({ 
    clientId: "",
    nome: "", 
    phone: "", 
    local: "", 
    date: new Date().toISOString().split('T')[0], 
    time: "", 
    serviceId: "", 
    professionalId: "" 
  });

  useEffect(() => {
    setNovo({
      clientId: "",
      nome: "",
      phone: "",
      local: "",
      date: new Date().toISOString().split('T')[0],
      time: "",
      serviceId: "",
      professionalId: ""
    });
  }, [tipoAgendamento]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    async function verificarStatus() {
        try {
            const resPag = await fetch('/api/checkout');
            const dadosPag = await resPag.json();
            if (!dadosPag.active) { router.push('/#planos'); return; }

            const resEmpresa = await fetch('/api/painel/config');
            const dadosEmpresa = await resEmpresa.json();

            if (dadosEmpresa && dadosEmpresa.id) {
                if (dadosEmpresa.ownerId === user.id) setUserRole("ADMIN");
                setCompanyId(dadosEmpresa.id);
                setVerificando(false);
            } else {
                if (pathname !== '/novo-negocio') router.push('/novo-negocio');
                return; 
            }
        } catch (error) { router.push('/'); }
    }
    verificarStatus();
  }, [router, user, isLoaded, setCompanyId, pathname]);

  useEffect(() => {
    if(isModalOpen && companyId) {
        fetch('/api/painel/servicos').then(r => r.json()).then(setServices);
        fetch('/api/painel/profissionais').then(r => r.json()).then(setProfissionais);
        fetch('/api/clientes').then(r => r.json()).then(setClientesCadastrados);
    }
  }, [isModalOpen, companyId]);

  async function salvarAgendamento() {
    // 1. Validação básica antes de tentar enviar
    if(!novo.nome || !novo.date || !novo.time) {
        toast.error("Por favor, preencha o nome, a data e o horário.");
        return;
    }

    if (tipoAgendamento === "CLIENTE" && (!novo.serviceId || !novo.professionalId)) {
        toast.error("Selecione um serviço e um profissional.");
        return;
    }

    // 2. Montagem da data com segurança (evita 'Invalid Date')
    const dataString = `${novo.date}T${novo.time}:00`;
    const dataFinal = new Date(dataString);

    if (isNaN(dataFinal.getTime())) {
        toast.error("Formato de data ou hora inválido.");
        return;
    }
    
    // 3. Trava de horário passado (com margem de 5 min)
    if (isBefore(dataFinal, subMinutes(new Date(), 5))) {
        toast.error("❌ Erro: O horário selecionado já passou.");
        return;
    }

    setSalvando(true);

    try {
        // 4. Envio dos dados (Mapeando os nomes corretamente para a API)
        const res = await fetch('/api/agendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: novo.nome,        // Mapeado
                phone: novo.phone,      // Mapeado
                date: dataFinal.toISOString(),
                serviceId: tipoAgendamento === "CLIENTE" ? novo.serviceId : null,
                professionalId: tipoAgendamento === "CLIENTE" ? novo.professionalId : null,
                clientId: novo.clientId || null,
                type: tipoAgendamento,
                location: novo.local || null,
                companyId: companyId
            })
        });

        const data = await res.json();

        if (res.ok) {
            toast.success(tipoAgendamento === "CLIENTE" ? "Agendado!" : "Evento criado!");
            setIsModalOpen(false);
            setNovo({ clientId: "", nome: "", phone: "", local: "", date: new Date().toISOString().split('T')[0], time: "", serviceId: "", professionalId: "" });
            if (refreshAgenda) refreshAgenda();
        } else {
            toast.error(data.error || "Erro ao salvar agendamento.");
        }
    } catch (error) {
        toast.error("Erro de conexão com o servidor.");
    } finally {
        setSalvando(false);
    }
  }

  const clientesFiltrados = clientesCadastrados.filter(c => 
    c.name.toLowerCase().includes(termoBusca.toLowerCase()) || c.phone?.replace(/\D/g, '').includes(termoBusca.replace(/\D/g, ''))
  );

  const menuItems = [
    { name: "Agenda", path: "/painel", icon: <Calendar size={20}/> },
    { name: "Clientes", path: "/painel/clientes", icon: <Users size={20}/> },
  ];
  if (userRole === "ADMIN") {
    menuItems.push(
        { name: "Financeiro", path: "/painel/financeiro", icon: <BarChart3 size={20}/> },
        { name: "Equipe", path: "/painel/profissionais", icon: <UserIcon size={20}/> },
        { name: "Configurações", path: "/painel/config", icon: <Settings size={20}/> }
    );
  }

  if (verificando) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40}/><p className="text-gray-500 font-bold animate-pulse text-sm">Acessando ambiente...</p>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans ${theme}`}>
      <aside className="w-full md:w-64 bg-white dark:bg-gray-950 border-r dark:border-gray-800 flex flex-col z-20">
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center"><Link href="/" className="flex items-center gap-2"><Image src="/nohud-logo.png" alt="NOHUD" width={32} height={32}/><span className="text-xl font-bold dark:text-white">NOHUD</span></Link></div>
        <nav className="flex-1 p-4 space-y-2">{menuItems.map(item => (<Link key={item.path} href={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${pathname === item.path ? "bg-blue-600 text-white shadow-md font-bold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>{item.icon} {item.name}</Link>))}</nav>
        <div className="p-4"><button onClick={() => { setTipoAgendamento("CLIENTE"); setIsModalOpen(true); }} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg hover:bg-blue-700 transition active:scale-95"><PlusCircle size={20}/> Novo Agendamento</button></div>
        <div className="p-4 border-t dark:border-gray-800 hidden md:block"><UserButton showName/><div className="mt-2 px-1 italic text-[10px] text-gray-400 uppercase tracking-widest">Modo: {userRole}</div></div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen relative bg-gray-100 dark:bg-gray-900">
        {children}

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] w-full max-w-md relative shadow-2xl border dark:border-gray-800">
                    
                    {/* BOTÃO X CORRIGIDO */}
                    <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all z-[60]"
                    >
                        <X size={24}/>
                    </button>
                    
                    <h3 className="text-2xl font-black mb-6 dark:text-white text-center">O que vamos criar?</h3>

                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-[1.2rem] mb-8">
                        <button 
                            onClick={() => setTipoAgendamento("CLIENTE")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition ${tipoAgendamento === "CLIENTE" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-500"}`}
                        >
                            <UserIcon size={14}/> AGENDAMENTO
                        </button>
                        <button 
                            onClick={() => setTipoAgendamento("EVENTO")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition ${tipoAgendamento === "EVENTO" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-500"}`}
                        >
                            <Calendar size={14}/> EVENTO
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        {tipoAgendamento === "CLIENTE" ? (
                            <>
                                {/* SELEÇÃO DE CLIENTE FIXO */}
                                <div className="space-y-2">
                                    {novo.clientId ? (
                                        <div className="w-full flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                                                <Check size={18}/> {novo.nome}
                                            </div>
                                            <button 
                                                onClick={() => setNovo({...novo, clientId: "", nome: "", phone: ""})}
                                                className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setIsSearchModalOpen(true)} 
                                            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 dark:border-blue-900 p-4 rounded-2xl text-blue-600 text-sm font-black hover:bg-blue-50 dark:hover:bg-blue-900/10 transition"
                                        >
                                            <Search size={18}/> BUSCAR CLIENTE CADASTRADO
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <input 
                                        className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold" 
                                        placeholder="Nome do Cliente" 
                                        value={novo.nome} 
                                        onChange={e => setNovo({...novo, nome: e.target.value, clientId: e.target.value === "" ? "" : novo.clientId})}
                                    />
                                    {/* CAMPO TELEFONE COM MÁSCARA (AQUI) */}
                                    <input 
                                        className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold" 
                                        placeholder="(00) 00000-0000" 
                                        value={formatarTelefoneInput(novo.phone)} 
                                        onChange={e => setNovo({...novo, phone: e.target.value})}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Nome do Evento (ex: Reunião)" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})}/>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-4 text-gray-400" size={20}/>
                                    <input className="w-full border dark:border-gray-700 p-4 pl-12 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Onde será o evento?" value={novo.local} onChange={e => setNovo({...novo, local: e.target.value})}/>
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Data</label>
                                <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.date} onChange={e => setNovo({...novo, date: e.target.value})}/>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Horário</label>
                                <input type="time" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.time} onChange={e => setNovo({...novo, time: e.target.value})}/>
                            </div>
                        </div>

                        {tipoAgendamento === "CLIENTE" && (
                            <div className="grid grid-cols-1 gap-3">
                                <select className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.serviceId} onChange={e => setNovo({...novo, serviceId: e.target.value})}>
                                    <option value="">Selecione o Serviço...</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                                </select>
                                <select className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.professionalId} onChange={e => setNovo({...novo, professionalId: e.target.value})}>
                                    <option value="">Selecione o Profissional...</option>
                                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        )}

                        <button 
                            onClick={salvarAgendamento} 
                            disabled={salvando} 
                            className={`w-full p-5 rounded-2xl font-black text-lg shadow-xl transition active:scale-95 flex justify-center items-center gap-2 ${salvando ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                            {salvando ? <Loader2 className="animate-spin" /> : tipoAgendamento === "CLIENTE" ? "Confirmar Agendamento" : "Criar Evento"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL DE BUSCA DE CLIENTES */}
        {isSearchModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] border dark:border-gray-800">
                    <div className="flex justify-between items-center mb-4 dark:text-white">
                        <h3 className="font-black text-xl ml-2">Buscar Cliente</h3>
                        <button onClick={() => setIsSearchModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"><X/></button>
                    </div>
                    <div className="relative mb-4 px-2">
                        <Search className="absolute left-6 top-4 text-gray-400" size={20}/>
                        <input autoFocus className="w-full pl-12 pr-4 py-4 border dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Nome ou telefone..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} />
                    </div>
                    <div className="overflow-y-auto flex-1 space-y-2 custom-scrollbar pr-2 px-2">
                        {clientesFiltrados.map(c => (
                            <button key={c.id} onClick={() => { setNovo({...novo, clientId: c.id, nome: c.name, phone: c.phone || ""}); setIsSearchModalOpen(false); setTermoBusca(""); }} className="w-full text-left p-5 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-transparent hover:border-blue-200 transition flex justify-between items-center dark:text-white group">
                                <div><p className="font-black text-base group-hover:text-blue-600 transition">{c.name}</p><p className="text-xs font-bold text-gray-500">{c.phone || "Sem telefone"}</p></div>
                                <PlusCircle size={22} className="text-blue-500 opacity-0 group-hover:opacity-100 transition"/>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

export default function PainelLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AgendaProvider><PainelConteudo>{children}</PainelConteudo></AgendaProvider>
  );
}