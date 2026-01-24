"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Settings, Users, Home, PlusCircle, X, Loader2 } from "lucide-react";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Controle de Acesso e Modal
  const [verificando, setVerificando] = useState(true); // Começa carregando
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Dados para o Modal de Agendamento
  const [services, setServices] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [novo, setNovo] = useState({
    nome: "", phone: "", date: "", time: "", serviceId: "", professionalId: ""
  });

  // 1. O PORTEIRO: Verifica se o usuário tem empresa
  useEffect(() => {
    async function verificarEmpresa() {
        try {
            // Usa a rota de config para ver se tem empresa criada
            const res = await fetch('/api/painel/config');
            const data = await res.json();

            // Se não retornou ID de empresa, chuta para criar negócio
            if (!data || !data.id) {
                router.push('/novo-negocio');
            } else {
                // Se tem empresa, libera o acesso
                setVerificando(false);
            }
        } catch (error) {
            console.error("Erro ao verificar acesso");
        }
    }
    verificarEmpresa();
  }, [router]);

  // Carrega listas para o formulário (só se estiver liberado)
  useEffect(() => {
    if(isModalOpen && !verificando) {
        fetch('/api/painel/servicos').then(r => r.json()).then(setServices);
        fetch('/api/painel/profissionais').then(r => r.json()).then(setProfissionais);
    }
  }, [isModalOpen, verificando]);

  async function salvarAgendamento() {
    if(!novo.date || !novo.time || !novo.serviceId || !novo.professionalId) return alert("Preencha tudo!");
    
    const dataFinal = new Date(`${novo.date}T${novo.time}`);
    const companyId = services[0]?.companyId; 

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
        alert("Agendado!");
        setIsModalOpen(false);
        setNovo({ nome: "", phone: "", date: "", time: "", serviceId: "", professionalId: "" });
        window.location.reload(); 
    } else {
        alert("Erro ao agendar (Horário ocupado?)");
    }
  }

  const menuItems = [
    { name: "Agenda", path: "/painel", icon: <Calendar size={20} /> },
    { name: "Equipe", path: "/painel/profissionais", icon: <Users size={20} /> },
    { name: "Configurações", path: "/painel/config", icon: <Settings size={20} /> },
  ];

  // TELA DE CARREGAMENTO (Enquanto verifica se tem empresa)
  if (verificando) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-blue-600 gap-4">
              <Loader2 className="animate-spin" size={48} />
              <p className="text-gray-500 font-medium">Verificando seu negócio...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r shadow-sm flex flex-col z-20">
        <div className="p-6 border-b flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Home size={20} /> Gestão
          </h1>
          <div className="md:hidden"><UserButton /></div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const ativo = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium ${ativo ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                {item.icon} {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4">
            <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 flex justify-center items-center gap-2 shadow-lg hover:scale-105 transition"
            >
                <PlusCircle size={20} /> Novo Agendamento
            </button>
        </div>

        <div className="p-4 border-t hidden md:block">
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
            <UserButton showName />
            <div className="flex flex-col"><span className="text-xs font-bold text-gray-700">Sua Conta</span><span className="text-[10px] text-gray-400">Admin</span></div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen relative">
        {children}

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative animate-in zoom-in-95">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X /></button>
                    <h3 className="text-xl font-bold mb-6 text-gray-800">Agendar Manualmente</h3>
                    
                    <div className="space-y-4">
                        <input className="w-full border p-3 rounded-lg" placeholder="Nome do Cliente" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
                        <input className="w-full border p-3 rounded-lg" placeholder="Telefone (Opcional)" value={novo.phone} onChange={e => setNovo({...novo, phone: e.target.value})} />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <input type="date" className="border p-3 rounded-lg w-full" value={novo.date} onChange={e => setNovo({...novo, date: e.target.value})} />
                            <input type="time" className="border p-3 rounded-lg w-full" value={novo.time} onChange={e => setNovo({...novo, time: e.target.value})} />
                        </div>

                        <select className="w-full border p-3 rounded-lg bg-white" value={novo.serviceId} onChange={e => setNovo({...novo, serviceId: e.target.value})}>
                            <option value="">Selecione o Serviço...</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                        </select>

                        <select className="w-full border p-3 rounded-lg bg-white" value={novo.professionalId} onChange={e => setNovo({...novo, professionalId: e.target.value})}>
                            <option value="">Selecione o Profissional...</option>
                            {profissionais.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>

                        <button onClick={salvarAgendamento} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 shadow-lg mt-2">
                            Confirmar na Agenda
                        </button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}