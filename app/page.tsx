"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';
import { Check, Star, Zap, Crown, Building2, Loader2, Edit, Calendar, Users, DollarSign, Menu, X, LogIn, LayoutDashboard } from 'lucide-react';
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

// --- BOTÃO INTELIGENTE CORRIGIDO ---
function AuthButton() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAcessarPainel() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout');
      const data = await res.json();

      if (data.active) {
        router.push('/painel');
      } else {
        // Se não tiver assinatura, joga para a seção de planos
        router.push('/#planos');
        toast.info("Escolha um plano para acessar o painel.");
      }
    } catch (error) {
      router.push('/#planos');
    } finally {
      setLoading(false);
    }
  }

  if (isSignedIn) {
    return (
      <button 
        onClick={handleAcessarPainel} 
        disabled={loading}
        className="bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition flex items-center gap-2 text-sm font-medium text-white"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <LayoutDashboard size={16} />} 
        Acessar Painel
      </button>
    );
  }

  return (
    <Link href="/sign-in" className="bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition flex items-center gap-2 text-sm font-medium text-white">
      <LogIn size={16} /> Entrar
    </Link>
  );
}

// --- COMPONENTE INTERNO DE PLANOS CORRIGIDO ---
function PlanosSection() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [assinatura, setAssinatura] = useState({ active: false, plan: null as string | null, status: null as string | null });
    const [verificando, setVerificando] = useState(true);
    const [loading, setLoading] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoaded) return; 
        async function verificarAssinatura() {
            if(!user) { setVerificando(false); return; }
            try {
                const res = await fetch('/api/checkout');
                const data = await res.json();
                setAssinatura(data);
            } catch (error) {}
            finally { setVerificando(false); }
        }
        verificarAssinatura();
    }, [user, isLoaded]);

    async function assinar(plano: string) {
        if (!user) {
            const redirectUrl = `${window.location.origin}/`;
            return router.push(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`);
        }
        setLoading(plano);
        try {
            const res = await fetch('/api/checkout', { method: 'POST', body: JSON.stringify({ plan: plano }) });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else alert("Erro ao iniciar pagamento.");
        } catch (error) {
            alert("Erro de conexão.");
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
            else alert("Erro ao abrir portal.");
        } catch {
            alert("Erro de conexão.");
        } finally {
            setLoading(null);
        }
    }

    const BotaoPlanos = ({ plano, label, className }: any) => {
        // CORREÇÃO: Só mostra Gerenciar se estiver ATIVO de verdade
        const estaAtivoNestePlano = assinatura.active && assinatura.plan === plano;

        if (estaAtivoNestePlano) {
            return (
                <button onClick={gerenciarAssinatura} disabled={!!loading} className="w-full py-3 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700 transition flex justify-center items-center gap-2">
                    {loading === 'gerenciar' ? <Loader2 className="animate-spin" /> : <><Edit size={16} /> Gerenciar</>}
                </button>
            );
        }

        return (
            <button onClick={() => assinar(plano)} disabled={!!loading} className={`w-full py-3 rounded-xl font-bold transition flex justify-center items-center gap-2 ${className}`}>
                {loading === plano ? <Loader2 className="animate-spin" /> : label}
            </button>
        );
    };

    return (
      <section id="planos" className="py-20 px-4 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="container mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white">Planos flexíveis para o seu sucesso</h2>
          <p className="text-gray-400 mt-4">Escolha o plano que acompanha o seu crescimento.</p>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* PLANO INDIVIDUAL */}
            <div className={`bg-gray-100 text-gray-800 rounded-2xl p-8 flex flex-col shadow-xl relative transition-all duration-300 hover:scale-105 group ${assinatura.active && assinatura.plan === 'INDIVIDUAL' ? 'border-4 border-green-500 scale-105' : 'border-4 border-transparent'}`}>
                <div className="mb-4 bg-white w-12 h-12 rounded-lg flex items-center justify-center text-gray-700 shadow-sm"><Star size={24} /></div>
                <h3 className="text-xl font-bold text-gray-800">Individual</h3>
                <p className="text-gray-500 text-sm mt-2">Para quem trabalha sozinho.</p>
                <div className="my-6"><span className="text-4xl font-extrabold text-gray-900">R$ 35</span><span className="text-gray-400 text-sm font-medium">/mês</span></div>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex gap-2 text-sm text-gray-600"><Check size={18} className="text-green-500"/> 1 Usuário</li></ul>
                <BotaoPlanos plano="INDIVIDUAL" label="Escolher" className="border-2 border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white" />
            </div>

            {/* PLANO PREMIUM */}
            <div className={`bg-blue-600 text-white rounded-2xl p-8 flex flex-col transform md:-translate-y-4 shadow-2xl relative transition-all duration-300 hover:scale-105 ${assinatura.active && assinatura.plan === 'PREMIUM' ? 'border-4 border-yellow-400 scale-105' : 'border-4 border-transparent'}`}>
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
                <div className="mb-4 bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center"><Zap size={24} /></div>
                <h3 className="text-xl font-bold">Premium</h3>
                <p className="text-blue-100 text-sm mt-2">Pequenas equipes.</p>
                <div className="my-6"><span className="text-4xl font-extrabold">R$ 65</span><span className="text-blue-200 text-sm font-medium">/mês</span></div>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex gap-2 text-sm text-white"><Check size={18} className="text-yellow-400"/> Até 5 Usuários</li></ul>
                <BotaoPlanos plano="PREMIUM" label="Assinar Premium" className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg" />
            </div>

            {/* PLANO MASTER */}
            <div className={`bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl p-8 flex flex-col shadow-xl relative transition-all duration-300 hover:scale-105 group ${assinatura.active && assinatura.plan === 'MASTER' ? 'border-4 border-green-500 scale-105' : 'border-4 border-transparent'}`}>
                <div className="mb-4 bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center"><Crown size={24} /></div>
                <h3 className="text-xl font-bold text-white">Master</h3>
                <p className="text-purple-100 text-sm mt-2">Clínicas em expansão.</p>
                <div className="my-6"><span className="text-4xl font-extrabold">R$ 99</span><span className="text-purple-200 text-sm font-medium">/mês</span></div>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex gap-2 text-sm text-white"><Check size={18} className="text-purple-200"/> Até 15 Usuários</li></ul>
                <BotaoPlanos plano="MASTER" label="Escolher Master" className="bg-white text-purple-600 font-bold hover:bg-purple-50" />
            </div>

            {/* ENTERPRISE */}
            <div className="bg-gray-800 text-white rounded-2xl p-8 flex flex-col shadow-xl transition-all duration-300 hover:scale-105 border-4 border-transparent">
                <div className="mb-4 bg-gray-700 w-12 h-12 rounded-lg flex items-center justify-center text-gray-300"><Building2 size={24} /></div>
                <h3 className="text-xl font-bold">Enterprise</h3>
                <p className="text-gray-400 text-sm mt-2">Redes e Franquias.</p>
                <div className="my-6"><span className="text-3xl font-bold">Sob Medida</span></div>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex gap-2 text-sm text-gray-400"><Check size={18} className="text-gray-500"/> Ilimitado</li></ul>
                <a href="https://wa.me/..." target="_blank" className="w-full mt-auto py-3 rounded-xl font-bold border border-gray-600 hover:bg-white hover:text-black transition text-center">Fale Conosco</a>
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
      
      <header className="relative bg-gray-900 text-white px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-gray-900 to-black opacity-90"></div>
        
        <nav className="container mx-auto flex justify-between items-center py-6 relative z-20">
            <Link href="/" className="flex items-center gap-3">
                <Image src="/nohud-logo.png" alt="NOHUD Logo" width={36} height={36} />
                <span className="text-2xl font-bold tracking-wider text-white">NOHUD</span>
            </Link>
            
            <div className="hidden md:flex gap-6 items-center">
                <a href="#funcionalidades" className="hover:text-blue-300 transition">Funcionalidades</a>
                <a href="#planos" className="hover:text-blue-300 transition">Preços</a>
                <AuthButton />
            </div>
            <button className="md:hidden" onClick={() => setMenuAberto(!menuAberto)}>{menuAberto ? <X /> : <Menu />}</button>
        </nav>

        {menuAberto && (
            <div className="md:hidden bg-gray-800 py-4 absolute left-0 right-0 z-10 animate-in fade-in slide-in-from-top-4">
                <a href="#funcionalidades" onClick={() => setMenuAberto(false)} className="block text-center py-2">Funcionalidades</a>
                <a href="#planos" onClick={() => setMenuAberto(false)} className="block text-center py-2">Preços</a>
                <div className="flex justify-center mt-2">
                    <AuthButton />
                </div>
            </div>
        )}

        <div className="container mx-auto text-center relative z-10 py-20 md:py-32">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4 tracking-tight">Seu software de gestão completo.</h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8 font-medium">Nós entendemos que seu tempo é valioso, na NOHUD você poupa tempo e esforço.</p>
          <div className="flex justify-center"><Link href="#planos" className="bg-white text-blue-600 font-black px-10 py-4 rounded-2xl shadow-lg hover:bg-gray-200 transition transform hover:scale-105 active:scale-95">Quero conhecer agora</Link></div>
        </div>
      </header>

      <section id="funcionalidades" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16"><h2 className="text-4xl font-black text-gray-900">Tudo que você precisa em um só lugar</h2><p className="text-gray-500 mt-2 font-medium">Uma plataforma completa para gestão moderna.</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-[2rem] border border-transparent hover:border-blue-500 transition-all space-y-3 hover:shadow-2xl group"><div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-colors"><Calendar size={32} className="text-blue-600 group-hover:text-white" /></div><h3 className="font-black text-xl pt-2">Agenda Inteligente</h3><p className="text-gray-600 text-sm">Configure seus horários, pausas e dias de folga com um clique.</p></div>
            <div className="bg-gray-50 p-8 rounded-[2rem] border border-transparent hover:border-green-500 transition-all space-y-3 hover:shadow-2xl group"><div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center group-hover:bg-green-600 transition-colors"><Users size={32} className="text-green-600 group-hover:text-white" /></div><h3 className="font-black text-xl pt-2">Gestão de Equipe</h3><p className="text-gray-600 text-sm">Adicione múltiplos profissionais, cada um com sua agenda e cores.</p></div>
            <div className="bg-gray-50 p-8 rounded-[2rem] border border-transparent hover:border-yellow-500 transition-all space-y-3 hover:shadow-2xl group"><div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center group-hover:bg-yellow-600 transition-colors"><DollarSign size={32} className="text-yellow-600 group-hover:text-white" /></div><h3 className="font-black text-xl pt-2">Painel Financeiro</h3><p className="text-gray-600 text-sm">Acompanhe o faturamento bruto e metas de crescimento mensais.</p></div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-900 text-white">
        <div className="container mx-auto text-center"><h2 className="text-3xl font-black mb-12">Profissionais que confiam em nós</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-8"><div className="bg-gray-800 p-10 rounded-[2.5rem] border border-gray-700 shadow-xl"><p className="italic text-gray-300">"O NOHUD mudou meu consultório. Meus clientes adoram a facilidade de agendar pelo link."</p><h4 className="font-black mt-6 text-blue-400">- Dra. Ana Costa</h4></div><div className="bg-gray-800 p-10 rounded-[2.5rem] border border-gray-700 shadow-xl"><p className="italic text-gray-300">"A melhor parte é o controle da equipe e a visualização das cores por barbeiro."</p><h4 className="font-black mt-6 text-green-400">- Ricardo Lima</h4></div><div className="bg-gray-800 p-10 rounded-[2.5rem] border border-gray-700 shadow-xl"><p className="italic text-gray-300">"Simples, bonito e funciona. Reduziu os cancelamentos em 90% com os lembretes."</p><h4 className="font-black mt-6 text-purple-400">- Joana S.</h4></div></div></div>
      </section>

      <PlanosSection />

      <footer className="py-12 px-4 bg-gray-950 text-gray-500 text-center text-sm font-bold"><p>© 2026 NOHUD Agendamentos • O Futuro da Gestão.</p></footer>
    </div>
  );
}