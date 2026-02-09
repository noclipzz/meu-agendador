"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';
import { Check, Star, Zap, Crown, Building2, Loader2, Edit, Calendar, Users, DollarSign, Menu, X, LogIn, LayoutDashboard, Copy } from 'lucide-react';
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { toast } from "sonner";

// --- BOTÃO INTELIGENTE CORRIGIDO ---
function AuthButton() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subStatus, setSubStatus] = useState({ active: false, plan: null });
  const [verificando, setVerificando] = useState(true);

  // Verifica a assinatura real no banco ao carregar
  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/checkout')
        .then(res => res.json())
        .then(data => setSubStatus(data))
        .finally(() => setVerificando(false));
    } else {
      setVerificando(false);
    }
  }, [isSignedIn]);

  async function handleAcessarPainel() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout');
      const data = await res.json();

      if (data.active) {
        router.push('/painel/dashboard');
      } else {
        // Se não tiver assinatura ativa, joga para a âncora de planos
        router.push('/#planos');
        toast.info("Escolha um plano para liberar seu acesso.");
      }
    } catch (error) {
      router.push('/#planos');
    } finally {
      setLoading(false);
    }
  }

  if (verificando) return <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>;

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-4">
        {/* Se tem assinatura ativa, mostra o botão de destaque */}
        {subStatus.active ? (
            <button 
                onClick={handleAcessarPainel} 
                disabled={loading}
                className="bg-blue-600 px-5 py-2.5 rounded-xl hover:bg-blue-700 transition flex items-center gap-2 text-sm font-black text-white shadow-lg"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <LayoutDashboard size={18} />} 
                Acessar Painel
            </button>
        ) : (
            /* Se NÃO tem assinatura ativa (Profissional ou Inativo), mostra o perfil com ID */
            <div className="flex items-center gap-2 bg-white/5 p-1 pr-3 rounded-2xl border border-white/10">
                <UserButton afterSignOutUrl="/">
                    <UserButton.MenuItems>
                        <UserButton.Action 
                            label="Copiar meu ID de Acesso" 
                            labelIcon={<Copy size={14}/>} 
                            onClick={() => {
                                navigator.clipboard.writeText(user?.id || "");
                                toast.success("ID copiado! Envie para o administrador.");
                            }} 
                        />
                    </UserButton.MenuItems>
                </UserButton>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Conectado</span>
                    <span className="text-sm font-bold text-white leading-none">{user?.firstName}</span>
                </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <Link href="/sign-in" className="bg-white text-blue-600 px-6 py-2.5 rounded-xl hover:bg-gray-100 transition text-sm font-black shadow-xl">
      Entrar
    </Link>
  );
}

// --- COMPONENTE INTERNO DE PLANOS CORRIGIDO ---
function PlanosSection() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [assinatura, setAssinatura] = useState({ active: false, plan: null as string | null, status: null as string | null });
    const [loading, setLoading] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoaded || !user) return; 
        async function verificarAssinatura() {
            try {
                const res = await fetch('/api/checkout');
                const data = await res.json();
                setAssinatura(data);
            } catch (error) {}
        }
        verificarAssinatura();
    }, [user, isLoaded]);

    async function assinar(plano: string) {
        if (!user) {
            return router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.origin)}`);
        }
        setLoading(plano);
        try {
            const res = await fetch('/api/checkout', { method: 'POST', body: JSON.stringify({ plan: plano }) });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else toast.error("Erro ao iniciar pagamento.");
        } catch (error) {
            toast.error("Erro de conexão.");
        } finally {
            setLoading(null);
        }
    }

    async function gerenciarAssinatura() {
        setLoading('gerenciar');
        try {
            const res = await fetch('/api/portal', { method: 'POST' });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else toast.error("Erro ao abrir portal.");
        } catch {
            toast.error("Erro de conexão.");
        } finally {
            setLoading(null);
        }
    }

    // Lógica para decidir qual botão mostrar em cada card
    const BotaoAcao = ({ plano, label, className }: any) => {
        // CORREÇÃO: Só mostra Gerenciar se a assinatura estiver ATIVA de verdade
        const estaAtivoNestePlano = assinatura.active && assinatura.plan === plano;

        if (estaAtivoNestePlano) {
            return (
                <button onClick={gerenciarAssinatura} disabled={!!loading} className="w-full py-3 rounded-xl font-black bg-green-600 text-white hover:bg-green-700 transition flex justify-center items-center gap-2">
                    {loading === 'gerenciar' ? <Loader2 className="animate-spin" /> : <><Edit size={16} /> Gerenciar Plano</>}
                </button>
            );
        }

        return (
            <button onClick={() => assinar(plano)} disabled={!!loading} className={`w-full py-3 rounded-xl font-black transition flex justify-center items-center gap-2 ${className}`}>
                {loading === plano ? <Loader2 className="animate-spin" /> : label}
            </button>
        );
    };

    return (
      <section id="planos" className="py-20 px-4 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="container mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Planos flexíveis para o seu sucesso</h2>
          <p className="text-gray-400 mt-4 font-medium">Escolha o plano que acompanha o seu crescimento.</p>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* INDIVIDUAL */}
            <div className={`bg-white text-gray-800 rounded-[2.5rem] p-8 flex flex-col shadow-xl relative transition-all duration-300 hover:scale-105 ${assinatura.active && assinatura.plan === 'INDIVIDUAL' ? 'ring-4 ring-green-500' : ''}`}>
                <div className="mb-4 bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><Star size={24} /></div>
                <h3 className="text-xl font-black text-gray-900">Individual</h3>
                <p className="text-gray-500 text-sm mt-2 font-medium">Para quem trabalha sozinho.</p>
                <div className="my-6"><span className="text-4xl font-black text-gray-900">R$ 35</span><span className="text-gray-400 text-sm font-bold">/mês</span></div>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex gap-2 text-sm text-gray-600 font-bold"><Check size={18} className="text-green-500"/> 1 Usuário</li></ul>
                <BotaoAcao plano="INDIVIDUAL" label="Escolher Plano" className="bg-gray-900 text-white hover:bg-black" />
            </div>

            {/* PREMIUM */}
            <div className={`bg-blue-600 text-white rounded-[2.5rem] p-8 flex flex-col transform md:-translate-y-4 shadow-2xl relative transition-all duration-300 hover:scale-105 ${assinatura.active && assinatura.plan === 'PREMIUM' ? 'ring-4 ring-yellow-400' : ''}`}>
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">Popular</div>
                <div className="mb-4 bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center"><Zap size={24} /></div>
                <h3 className="text-xl font-black">Premium</h3>
                <p className="text-blue-100 text-sm mt-2 font-medium">Pequenas equipes.</p>
                <div className="my-6"><span className="text-4xl font-black">R$ 65</span><span className="text-blue-200 text-sm font-bold">/mês</span></div>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex gap-2 text-sm text-white font-bold"><Check size={18} className="text-yellow-400"/> Até 5 Usuários</li></ul>
                <BotaoAcao plano="PREMIUM" label="Assinar Premium" className="bg-white text-blue-600 hover:bg-blue-50" />
            </div>

            {/* MASTER */}
            <div className={`bg-gray-900 text-white rounded-[2.5rem] p-8 flex flex-col shadow-xl relative transition-all duration-300 hover:scale-105 ${assinatura.active && assinatura.plan === 'MASTER' ? 'ring-4 ring-purple-500' : ''}`}>
                <div className="mb-4 bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center text-purple-400"><Crown size={24} /></div>
                <h3 className="text-xl font-black">Master</h3>
                <p className="text-gray-400 text-sm mt-2 font-medium">Clínicas em expansão.</p>
                <div className="my-6"><span className="text-4xl font-black">R$ 99</span><span className="text-gray-500 text-sm font-bold">/mês</span></div>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex gap-2 text-sm text-gray-300 font-bold"><Check size={18} className="text-purple-500"/> Até 15 Usuários</li></ul>
                <BotaoAcao plano="MASTER" label="Escolher Master" className="bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20" />
            </div>

            {/* ENTERPRISE */}
            <div className="bg-white/5 border border-white/10 text-white rounded-[2.5rem] p-8 flex flex-col shadow-xl transition-all duration-300 hover:scale-105">
                <div className="mb-4 bg-white/5 w-12 h-12 rounded-2xl flex items-center justify-center text-gray-400"><Building2 size={24} /></div>
                <h3 className="text-xl font-black">Enterprise</h3>
                <p className="text-gray-500 text-sm mt-2 font-medium">Redes e Franquias.</p>
                <div className="my-6"><span className="text-3xl font-black">Sob Medida</span></div>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex gap-2 text-sm text-gray-500 font-bold"><Check size={18} className="text-gray-600"/> Ilimitado</li></ul>
                <Link href="https://wa.me/..." target="_blank" className="w-full mt-auto py-4 rounded-xl font-black border-2 border-white/10 hover:bg-white hover:text-black transition text-center uppercase text-xs tracking-widest">Fale Conosco</Link>
            </div>
        </div>
      </section>
    );
}

// --- COMPONENTE PRINCIPAL DA LANDING PAGE ---
export default function LandingPage() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="bg-white text-gray-800 font-sans scroll-smooth">
      
      <header className="relative bg-gray-950 text-white px-4 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-gray-950 to-black opacity-90"></div>
        
        <nav className="container mx-auto flex justify-between items-center py-6 relative z-20">
            <Link href="/" className="flex items-center gap-3">
                <Image src="/nohud-logo.png" alt="NOHUD Logo" width={36} height={36} />
                <span className="text-2xl font-black tracking-tighter text-white">NOHUD</span>
            </Link>
            
            <div className="hidden md:flex gap-8 items-center">
                <a href="#funcionalidades" className="text-sm font-bold text-gray-400 hover:text-white transition">Funcionalidades</a>
                <a href="#planos" className="text-sm font-bold text-gray-400 hover:text-white transition">Preços</a>
                <AuthButton />
            </div>
            <button className="md:hidden p-2 bg-white/5 rounded-lg" onClick={() => setMenuAberto(!menuAberto)}>{menuAberto ? <X /> : <Menu />}</button>
        </nav>

        {menuAberto && (
            <div className="md:hidden bg-gray-900 border-b border-white/10 py-6 absolute left-0 right-0 z-50 animate-in fade-in slide-in-from-top-4 px-6">
                <a href="#funcionalidades" onClick={() => setMenuAberto(false)} className="block py-3 font-bold text-gray-400">Funcionalidades</a>
                <a href="#planos" onClick={() => setMenuAberto(false)} className="block py-3 font-bold text-gray-400">Preços</a>
                <div className="mt-4 pt-4 border-t border-white/5">
                    <AuthButton />
                </div>
            </div>
        )}

        <div className="container mx-auto text-center relative z-10 py-24 md:py-32">
          <h1 className="text-5xl md:text-7xl font-black leading-none mb-6 tracking-tighter">Seu software de gestão <span className="text-blue-500">completo.</span></h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 font-medium">Poupe tempo e esforço na gestão do seu negócio com a tecnologia da NOHUD.</p>
          <div className="flex justify-center"><Link href="#planos" className="bg-white text-blue-600 font-black px-12 py-5 rounded-[2rem] shadow-2xl hover:scale-105 transition active:scale-95 text-lg">Começar Agora</Link></div>
        </div>
      </header>

      <section id="funcionalidades" className="py-24 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-20"><h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Tudo em um só lugar</h2><p className="text-gray-500 mt-4 font-bold uppercase text-xs tracking-widest">Gestão moderna para profissionais exigentes</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="bg-gray-50 p-10 rounded-[3rem] border border-transparent hover:border-blue-500/20 transition-all hover:shadow-2xl group cursor-default">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-all duration-500 mb-6"><Calendar size={32} className="text-blue-600 group-hover:text-white transition-colors" /></div>
                <h3 className="font-black text-2xl text-gray-900">Agenda Inteligente</h3>
                <p className="text-gray-500 mt-3 font-medium">Controle total de horários, pausas e bloqueios automáticos.</p>
            </div>
            <div className="bg-gray-50 p-10 rounded-[3rem] border border-transparent hover:border-green-500/20 transition-all hover:shadow-2xl group cursor-default">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center group-hover:bg-green-600 transition-all duration-500 mb-6"><Users size={32} className="text-green-600 group-hover:text-white transition-colors" /></div>
                <h3 className="font-black text-2xl text-gray-900">Gestão de Equipe</h3>
                <p className="text-gray-500 mt-3 font-medium">Acesso restrito para funcionários e visualização por cores.</p>
            </div>
            <div className="bg-gray-50 p-10 rounded-[3rem] border border-transparent hover:border-yellow-500/20 transition-all hover:shadow-2xl group cursor-default">
                <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center group-hover:bg-yellow-600 transition-all duration-500 mb-6"><DollarSign size={32} className="text-yellow-600 group-hover:text-white transition-colors" /></div>
                <h3 className="font-black text-2xl text-gray-900">Painel Financeiro</h3>
                <p className="text-gray-500 mt-3 font-medium">Métricas de faturamento em tempo real e metas de crescimento.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gray-900 text-white relative overflow-hidden">
        <div className="container mx-auto text-center relative z-10">
            <h2 className="text-4xl font-black mb-16 tracking-tight">Liderando a nova era da gestão</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-gray-800/50 p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-sm shadow-2xl">
                    <p className="italic text-gray-300 font-medium">"O NOHUD transformou minha produtividade. O link de agendamento automático é um diferencial enorme."</p>
                    <h4 className="font-black mt-8 text-blue-400 text-sm uppercase tracking-widest">— Dra. Ana Costa</h4>
                </div>
                <div className="bg-gray-800/50 p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-sm shadow-2xl">
                    <p className="italic text-gray-300 font-medium">"Fácil de usar e extremamente bonito. Minha equipe se adaptou em menos de um dia."</p>
                    <h4 className="font-black mt-8 text-green-400 text-sm uppercase tracking-widest">— Ricardo Lima</h4>
                </div>
                <div className="bg-gray-800/50 p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-sm shadow-2xl">
                    <p className="italic text-gray-300 font-medium">"As notificações automáticas reduziram as faltas quase a zero. Vale cada centavo."</p>
                    <h4 className="font-black mt-8 text-purple-400 text-sm uppercase tracking-widest">— Joana S.</h4 >
                </div>
            </div>
        </div>
      </section>

      <PlanosSection />

      <footer className="py-16 px-4 bg-gray-950 text-gray-600 text-center text-xs font-black uppercase tracking-widest">
        <p>© 2026 NOHUD • Inteligência em Gestão.</p>
      </footer>
    </div>
  );
}