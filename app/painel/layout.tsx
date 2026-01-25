"use client";

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Settings, Users, PlusCircle, X, Loader2 } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { AgendaProvider, useAgenda } from "../contexts/AgendaContext";
import { toast } from "sonner";

function PainelConteudo({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const { refreshAgenda, companyId, setCompanyId } = useAgenda();
  
  const [verificando, setVerificando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [novo, setNovo] = useState({ nome: "", phone: "", date: new Date().toISOString().split('T')[0], time: "", serviceId: "", professionalId: "" });

  useEffect(() => {
    if (!isLoaded) return;
    async function verificarStatus() {
        const resPag = await fetch('/api/checkout');
        const dadosPag = await resPag.json();
        if (!dadosPag.active) { router.push('/'); return; }

        const resEmpresa = await fetch('/api/painel/config');
        const dadosEmpresa = await resEmpresa.json();
        if (!dadosEmpresa || !dadosEmpresa.id) { router.push('/novo-negocio'); return; }
        
        setCompanyId(dadosEmpresa.id);
        setVerificando(false);
    }
    verificarStatus();
  }, [router, user, isLoaded, setCompanyId]);

  useEffect(() => {
    if(isModalOpen && !verificando) {
        fetch('/api/painel/servicos').then(r => r.json()).then(setServices);
        fetch('/api/painel/profissionais').then(r => r.json()).then(setProfissionais);
    }
  }, [isModalOpen, verificando]);

  // FUNÇÃO CORRIGIDA
  async function salvarAgendamento() {
    if(!novo.date || !novo.time || !novo.serviceId || !novo.professionalId || !companyId) {
        toast.error("Preencha todos os campos obrigatórios.");
        return;
    }
    const dataFinal = new Date(`${novo.date}T${novo.time}`);
    
    const res = await fetch('/api/agendar', {
        method: 'POST',
        body: JSON.stringify({
            serviceId: novo.serviceId, 
            companyId: companyId, 
            professionalId: novo.professionalId,
            date: dataFinal, 
            name: novo.nome, 
            phone: novo.phone
        })
    });
    if(res.ok) {
        toast.success("Agendado com sucesso!");
        setIsModalOpen(false);
        setNovo({ nome: "", phone: "", date: new Date().toISOString().split('T')[0], time: "", serviceId: "", professionalId: "" });
        refreshAgenda();
    } else {
        toast.error("Erro ao agendar. O horário pode estar ocupado.");
    }
  }

  // (O resto do JSX do layout é igual, só colei o código completo por segurança)
  const menuItems = [ { name: "Agenda", path: "/painel", icon: <Calendar size={20}/> }, { name: "Equipe", path: "/painel/profissionais", icon: <Users size={20}/> }, { name: "Configurações", path: "/painel/config", icon: <Settings size={20}/> }];
  if (verificando) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="animate-spin text-blue-600"/></div>;
  return (<div className={`min-h-screen flex flex-col md:flex-row font-sans ${theme}`}>
      <aside className="w-full md:w-64 bg-white dark:bg-gray-950 border-r dark:border-gray-800 flex flex-col z-20">
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center"><Link href="/" className="flex items-center gap-2"><Image src="/nohud-logo.png" alt="NOHUD" width={32} height={32}/><span className="text-xl font-bold dark:text-white">NOHUD</span></Link></div>
        <nav className="flex-1 p-4 space-y-2">{menuItems.map(item => (<Link key={item.path} href={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${pathname === item.path ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>{item.icon} {item.name}</Link>))}</nav>
        <div className="p-4"><button onClick={() => setIsModalOpen(true)} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"><PlusCircle size={20}/> Novo</button></div>
        <div className="p-4 border-t dark:border-gray-800 hidden md:block"><div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg"><UserButton showName/></div></div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen relative bg-gray-100 dark:bg-gray-900">{children}{isModalOpen && (<div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50"><div className="bg-white dark:bg-gray-900 p-8 rounded-2xl w-full max-w-md relative dark:text-white"><button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4"><X/></button><h3 className="text-xl font-bold mb-6">Agendar</h3><div className="space-y-4"><input className="w-full border dark:border-gray-700 p-3 rounded-lg" placeholder="Nome" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})}/><input className="w-full border dark:border-gray-700 p-3 rounded-lg" placeholder="Telefone" value={novo.phone} onChange={e => setNovo({...novo, phone: e.target.value})}/><div className="grid grid-cols-2 gap-4"><input type="date" className="w-full border dark:border-gray-700 p-3 rounded-lg" value={novo.date} onChange={e => setNovo({...novo, date: e.target.value})}/><input type="time" className="w-full border dark:border-gray-700 p-3 rounded-lg" value={novo.time} onChange={e => setNovo({...novo, time: e.target.value})}/></div><select className="w-full border dark:border-gray-700 p-3 rounded-lg" value={novo.serviceId} onChange={e => setNovo({...novo, serviceId: e.target.value})}><option value="">Serviço...</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><select className="w-full border dark:border-gray-700 p-3 rounded-lg" value={novo.professionalId} onChange={e => setNovo({...novo, professionalId: e.target.value})}><option value="">Profissional...</option>{profissionais.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button onClick={salvarAgendamento} className="w-full bg-green-600 text-white p-3 rounded font-bold">Confirmar</button></div></div></div>)}</main>
    </div>
  );
}

// O componente principal que exportamos
export default function PainelLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AgendaProvider>
      <PainelConteudo>{children}</PainelConteudo>
    </AgendaProvider>
  );
}