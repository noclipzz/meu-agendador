"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Settings, Users, PlusCircle, X, Loader2, User as UserIcon, Search, Check } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { AgendaProvider, useAgenda } from "../../contexts/AgendaContext";
import { toast } from "sonner";
import { isBefore } from "date-fns";

function PainelConteudo({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const { refreshAgenda, companyId, setCompanyId } = useAgenda();
  
  const [verificando, setVerificando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");
  
  // NOVO: Estado para impedir múltiplos cliques
  const [salvando, setSalvando] = useState(false);

  const [services, setServices] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [clientesCadastrados, setClientesCadastrados] = useState<any[]>([]);
  
  const [novo, setNovo] = useState({ 
    clientId: "",
    nome: "", 
    phone: "", 
    date: new Date().toISOString().split('T')[0], 
    time: "", 
    serviceId: "", 
    professionalId: "" 
  });

  // --- LÓGICA DE PROTEÇÃO E REDIRECIONAMENTO (SaaS) ---
  useEffect(() => {
    if (!isLoaded || !user) return;

    async function verificarStatus() {
        try {
            const resPag = await fetch('/api/checkout');
            const dadosPag = await resPag.json();
            
            if (!dadosPag.active) { 
                console.log("REDIRECIONADO: Assinatura inativa");
                router.push('/#planos'); 
                return; 
            }

            const resEmpresa = await fetch('/api/painel/config');
            const dadosEmpresa = await resEmpresa.json();

            if (!dadosEmpresa || !dadosEmpresa.id) { 
                if (pathname !== '/novo-negocio') {
                    router.push('/novo-negocio');
                }
                return; 
            }
            
            setCompanyId(dadosEmpresa.id);
            setVerificando(false);
        } catch (error) { 
            console.error("Erro crítica na verificação:", error);
            router.push('/'); 
        }
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
    if(!novo.date || !novo.time || !novo.serviceId || !novo.professionalId || !companyId) {
        toast.error("Preencha todos os campos obrigatórios.");
        return;
    }

    const dataFinal = new Date(`${novo.date}T${novo.time}`);
    if (isBefore(dataFinal, new Date())) {
        toast.error("❌ Erro: Não é possível agendar um horário que já passou.");
        return;
    }

    // TRAVA O PROCESSO AQUI
    setSalvando(true);
    
    try {
        const res = await fetch('/api/agendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...novo,
                companyId: companyId,
                date: dataFinal, 
                name: novo.nome, 
                phone: novo.phone,
            })
        });

        if(res.ok) {
            toast.success("Agendado com sucesso!");
            setIsModalOpen(false);
            setNovo({ clientId: "", nome: "", phone: "", date: new Date().toISOString().split('T')[0], time: "", serviceId: "", professionalId: "" });
            if (refreshAgenda) refreshAgenda();
        } else {
            const errorData = await res.json();
            toast.error(errorData.error || "Erro ao agendar.");
        }
    } catch (error) {
        toast.error("Erro de conexão com o servidor.");
    } finally {
        // LIBERA O BOTÃO
        setSalvando(false);
    }
  }

  const clientesFiltrados = clientesCadastrados.filter(c => 
    c.name.toLowerCase().includes(termoBusca.toLowerCase()) || c.phone?.includes(termoBusca)
  );

  const menuItems = [
    { name: "Agenda", path: "/painel", icon: <Calendar size={20}/> },
    { name: "Clientes", path: "/painel/clientes", icon: <Users size={20}/> },
    { name: "Equipe", path: "/painel/profissionais", icon: <UserIcon size={20}/> },
    { name: "Configurações", path: "/painel/config", icon: <Settings size={20}/> }
  ];

  if (verificando) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40}/>
        <p className="text-gray-500 font-bold animate-pulse text-sm tracking-widest uppercase">Validando sua Empresa...</p>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans ${theme}`}>
      <aside className="w-full md:w-64 bg-white dark:bg-gray-950 border-r dark:border-gray-800 flex flex-col z-20">
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
                <Image src="/nohud-logo.png" alt="NOHUD" width={32} height={32}/>
                <span className="text-xl font-bold dark:text-white">NOHUD</span>
            </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            {menuItems.map(item => (
                <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${pathname === item.path ? "bg-blue-600 text-white shadow-md font-bold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                    {item.icon} {item.name}
                </Link>
            ))}
        </nav>
        <div className="p-4">
            <button onClick={() => setIsModalOpen(true)} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg hover:bg-blue-700 transition active:scale-95">
                <PlusCircle size={20}/> Novo Agendamento
            </button>
        </div>
        <div className="p-4 border-t dark:border-gray-800 hidden md:block">
            <UserButton showName/>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen relative bg-gray-100 dark:bg-gray-900">
        {children}

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] w-full max-w-md relative shadow-2xl border dark:border-gray-800">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition"><X/></button>
                    <h3 className="text-2xl font-black mb-8 dark:text-white text-center">Agendar Horário</h3>
                    
                    <div className="space-y-4">
                        <button onClick={() => setIsSearchModalOpen(true)} className="w-full flex items-center justify-between border-2 border-dashed border-blue-200 dark:border-blue-900 p-4 rounded-2xl text-blue-600 dark:text-blue-400 text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/10 transition">
                            <span className="flex items-center gap-2"><Search size={18}/> {novo.nome || "Selecionar Cliente Cadastrado"}</span>
                            {novo.nome && <Check size={18} className="text-green-500"/>}
                        </button>

                        <div className="space-y-3">
                            <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Nome do Cliente" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})}/>
                            <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Telefone" value={novo.phone} onChange={e => setNovo({...novo, phone: e.target.value})}/>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.date} onChange={e => setNovo({...novo, date: e.target.value})}/>
                            <input type="time" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.time} onChange={e => setNovo({...novo, time: e.target.value})}/>
                        </div>

                        <select className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.serviceId} onChange={e => setNovo({...novo, serviceId: e.target.value})}>
                            <option value="">Selecione o Serviço...</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                        </select>

                        <select className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.professionalId} onChange={e => setNovo({...novo, professionalId: e.target.value})}>
                            <option value="">Selecione o Profissional...</option>
                            {profissionais.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>

                        {/* BOTÃO COM TRAVA DE MULTI-CLIQUE */}
                        <button 
                            onClick={salvarAgendamento} 
                            disabled={salvando}
                            className={`w-full p-5 rounded-2xl font-black text-lg shadow-xl transition flex items-center justify-center gap-2 ${salvando ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-green-600 hover:bg-green-700 text-white active:scale-95'}`}
                        >
                            {salvando ? <Loader2 className="animate-spin" /> : "Confirmar Agendamento"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL DE BUSCA DE CLIENTES */}
        {isSearchModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
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
    <AgendaProvider>
      <PainelConteudo>
          {children}
      </PainelConteudo>
    </AgendaProvider>
  );
}