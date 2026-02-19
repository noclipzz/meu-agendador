"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';
import {
  Check, Star, Zap, Crown, Building2, Loader2, Edit, Calendar, Users,
  DollarSign, Menu, X, LogIn, LayoutDashboard, Copy, ArrowRight, ArrowDown,
  Smartphone, ShieldCheck, Clock, BarChart3, HelpCircle, ChevronDown, UserCircle
} from 'lucide-react';
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { LogoNohud } from "./components/LogoNohud";
import { toast } from "sonner";

// --- BOTÃO INTELIGENTE (AUTH) ---
function AuthButton() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subStatus, setSubStatus] = useState({ active: false, plan: null });
  const [verificando, setVerificando] = useState(true);

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
      <div className="flex items-center gap-2 md:gap-4">
        {subStatus.active ? (
          <button
            onClick={handleAcessarPainel}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-full transition flex items-center gap-2 text-xs md:text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LayoutDashboard size={18} />}
            <span className="hidden sm:inline">Acessar Painel</span>
            <span className="sm:hidden">Painel</span>
          </button>
        ) : (
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Olá, {user?.firstName}</span>
          </div>
        )}

        <div className="flex items-center gap-2 p-1 rounded-full">
          <UserButton afterSignOutUrl="/">
            <UserButton.MenuItems>
              <UserButton.Action
                label="Copiar ID do Usuário"
                labelIcon={<Copy size={14} />}
                onClick={() => {
                  if (user?.id) {
                    navigator.clipboard.writeText(user.id);
                    toast.success("ID copiado para a área de transferência!");
                  }
                }}
              />
            </UserButton.MenuItems>
          </UserButton>
        </div>
      </div>
    );
  }

  return (
    <Link href="/sign-in" className="bg-gray-900 text-white px-5 py-2 md:px-6 md:py-2.5 rounded-full hover:bg-gray-800 transition text-sm font-bold shadow-xl active:scale-95">
      Entrar
    </Link>
  );
}

// --- SEÇÃO DE PLANOS ---
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
      } catch (error) { }
    }
    verificarAssinatura();
  }, [user, isLoaded]);

  async function assinar(plano: string) {
    if (!user) {
      return router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.origin + '/#planos')}`);
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

  const PlanCard = ({ title, price, description, features, planKey, popular = false, master = false, icon: Icon, colorClass, btnColor, badge, badgeColor, iconBg, iconColor, checkColor, textMuted, priceMuted }: any) => {
    const isCurrentPlan = assinatura.active && assinatura.plan === planKey;
    const isDark = popular || master;

    return (
      <div className={`relative flex flex-col p-6 rounded-[1.5rem] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${master
        ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-amber-950 text-white ring-2 ring-amber-400/60 shadow-[0_0_30px_rgba(251,191,36,0.15)] scale-[1.03] z-10'
        : popular
          ? 'bg-gray-900 text-white ring-3 ring-blue-500 shadow-xl z-[5]'
          : 'bg-white text-gray-800 border border-gray-100 shadow-lg'
        }`}>
        {/* Shimmer effect for Master */}
        {master && <div className="absolute inset-0 rounded-[1.5rem] overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent animate-pulse" /></div>}

        {badge && <div className={`absolute top-0 right-0 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl rounded-tr-[1.5rem] uppercase tracking-widest ${badgeColor || 'bg-blue-500'}`}>{badge}</div>}

        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${iconBg || (isDark ? 'bg-white/10' : 'bg-gray-50')} ${iconColor || (isDark ? 'text-blue-400' : 'text-gray-600')}`}>
          <Icon size={22} />
        </div>

        <h3 className={`text-lg font-black tracking-tight ${master ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500' : ''}`}>{title}</h3>
        <p className={`text-xs font-medium mt-1 ${textMuted || (isDark ? 'text-gray-400' : 'text-gray-500')}`}>{description}</p>

        <div className="my-5">
          <span className={`text-3xl font-black ${master ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400' : ''}`}>R$ {price}</span>
          <span className={`text-xs font-bold ml-1 ${priceMuted || (isDark ? 'text-gray-500' : 'text-gray-400')}`}>/mês</span>
        </div>

        <ul className="space-y-3 mb-6 flex-1">
          {features.map((feat: string, i: number) => (
            <li key={i} className="flex gap-2 text-xs font-medium items-start">
              <Check size={15} className={`flex-shrink-0 mt-0.5 ${checkColor || (master ? 'text-amber-400' : popular ? 'text-blue-500' : 'text-green-500')}`} />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{feat}</span>
            </li>
          ))}
        </ul>

        {isCurrentPlan ? (
          <button onClick={gerenciarAssinatura} disabled={!!loading} className="w-full py-3 rounded-xl font-bold text-sm bg-green-500 text-white hover:bg-green-600 transition flex justify-center items-center gap-2">
            {loading === 'gerenciar' ? <Loader2 size={16} className="animate-spin" /> : <><Edit size={14} /> Gerenciar Assinatura</>}
          </button>
        ) : (
          <button
            onClick={() => assinar(planKey)}
            disabled={!!loading}
            className={`w-full py-3 rounded-xl font-bold text-sm transition flex justify-center items-center gap-2 ${btnColor || (master
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900 shadow-lg shadow-amber-500/25'
              : popular
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-900 hover:bg-black text-white')
              }`}
          >
            {loading === planKey ? <Loader2 size={16} className="animate-spin" /> : (master ? '🚀 Começar Agora' : 'Começar Agora')}
          </button>
        )}
      </div>
    )
  };

  return (
    <section id="planos" className="py-16 px-4 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-3">Investimento que se paga</h2>
          <p className="text-base text-gray-500 font-medium">Escolha o plano ideal para o tamanho do seu negócio. Cancele a qualquer momento.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto items-start">
          <PlanCard
            title="Individual"
            price="35"
            description="Perfeito para profissionais autônomos."
            planKey="INDIVIDUAL"
            icon={Star}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            checkColor="text-blue-500"
            features={["1 Usuário (Você)", "Agenda Ilimitada", "Link Automático", "Lembretes por E-mail"]}
          />

          <PlanCard
            title="Premium"
            price="65"
            description="Para pequenas clínicas e estúdios."
            planKey="PREMIUM"
            popular={true}
            icon={Zap}
            badge="Mais Escolhido"
            badgeColor="bg-blue-500"
            iconBg="bg-white/10"
            iconColor="text-blue-400"
            features={["Até 5 Profissionais", "Gestão Financeira", "Controle de Comissão", "Relatórios Básicos", "Tudo do Individual"]}
          />

          <PlanCard
            title="Master"
            price="99"
            description="O plano definitivo para seu negócio."
            planKey="MASTER"
            master={true}
            icon={Crown}
            badge="Mais Completo"
            badgeColor="bg-gradient-to-r from-amber-500 to-yellow-500"
            iconBg="bg-amber-500/10"
            iconColor="text-amber-400"
            features={["Até 15 Profissionais", "Múltiplas Agendas", "Relatórios Avançados", "Suporte Prioritário", "Gestão de Estoque", "Prontuários"]}
          />

          <div className="relative flex flex-col p-6 rounded-[1.5rem] bg-white text-gray-800 border border-gray-100 shadow-lg transition-all hover:shadow-xl">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-gray-50 text-gray-400"><Building2 size={22} /></div>
            <h3 className="text-lg font-black tracking-tight">Enterprise</h3>
            <p className="text-xs font-medium mt-1 text-gray-500">Para franquias e grandes redes.</p>
            <div className="my-5"><span className="text-xl font-black">Sob Medida</span></div>
            <ul className="space-y-3 mb-6 flex-1">
              <li className="flex gap-2 text-xs font-medium items-start"><Check size={15} className="text-gray-400 flex-shrink-0 mt-0.5" /><span className="text-gray-600">API Dedicada</span></li>
              <li className="flex gap-2 text-xs font-medium items-start"><Check size={15} className="text-gray-400 flex-shrink-0 mt-0.5" /><span className="text-gray-600">Gerente de Conta</span></li>
              <li className="flex gap-2 text-xs font-medium items-start"><Check size={15} className="text-gray-400 flex-shrink-0 mt-0.5" /><span className="text-gray-600">Whitelabel (Sua Marca)</span></li>
            </ul>
            <Link href="https://wa.me/5511999999999" target="_blank" className="w-full py-3 rounded-xl font-bold text-sm border-2 border-gray-100 hover:border-gray-200 text-gray-600 transition flex justify-center items-center">Fale Conosco</Link>
          </div>
        </div>

        <div className="mt-20 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <p className="text-gray-500 font-medium text-lg mb-8 max-w-xl">
            Ainda na dúvida? Você não precisa pagar nada agora.
            <br className="hidden md:block" /> Libere seu acesso completo e decida depois.
          </p>
          <HeroCTA />
          <p className="text-sm text-gray-400 mt-4 font-medium">Não pedimos cartão de crédito para iniciar.</p>
        </div>
      </div>
    </section>
  );
}

// --- FAQ ---
function FAQSection() {
  const items = [
    { q: "Preciso instalar algo no computador?", a: "Não! O NOHUD é 100% online. Você acessa pelo navegador do seu computador, tablet ou celular, de onde estiver." },
    { q: "Os lembretes são enviados automaticamente?", a: "Sim. Assim que você confirma um agendamento, seu cliente recebe um e-mail com todos os detalhes. Você não precisa fazer nada manual." },
    { q: "Posso cancelar quando quiser?", a: "Com certeza. Sem fidelidade, sem multas. Você tem total liberdade sobre sua assinatura." },
    { q: "Consigo gerenciar as comissões da equipe?", a: "Sim! O NOHUD calcula automaticamente as comissões com base nos serviços realizados por cada profissional." }
  ];

  return (
    <section className="py-24 px-4 bg-white">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Perguntas Frequentes</h2>
          <p className="text-gray-500">Tire suas dúvidas e veja como é simples começar.</p>
        </div>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="border border-gray-100 rounded-2xl p-6 hover:bg-gray-50 transition">
              <h3 className="font-bold text-lg text-gray-900 flex gap-2 items-center"><HelpCircle size={18} className="text-blue-500" /> {item.q}</h3>
              <p className="text-gray-600 mt-2 ml-7 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- TABELA DE COMPARAÇÃO ---
function ComparacaoPlanos() {
  const categories = [
    {
      name: "Gestão & Equipe",
      features: [
        { name: "Profissionais", individual: "1 (Você)", premium: "Até 5", master: "Até 15" },
        { name: "Agenda Online 24h", individual: true, premium: true, master: true },
        { name: "Link de Agendamento", individual: true, premium: true, master: true },
        { name: "Múltiplas Unidades", individual: false, premium: false, master: true },
        { name: "Gestão de Equipe", individual: false, premium: true, master: true },
        { name: "App para Profissionais", individual: false, premium: true, master: true },
      ]
    },
    {
      name: "Financeiro & Vendas",
      features: [
        { name: "Gestão Financeira", individual: "Básica", premium: "Completa", master: "Avançada" },
        { name: "Controle de Comissões", individual: false, premium: true, master: true },
        { name: "Metas de Faturamento", individual: true, premium: true, master: true },
        { name: "Fluxo de Caixa", individual: false, premium: true, master: true },
        { name: "Gestão de Estoque", individual: false, premium: false, master: true },
        { name: "Taxas de Cartão", individual: false, premium: true, master: true },
      ]
    },
    {
      name: "Comunicação & Clientes",
      features: [
        { name: "Lembretes E-mail", individual: true, premium: true, master: true },
        { name: "Prontuário Master", individual: false, premium: false, master: true },
        { name: "Histórico do Cliente", individual: true, premium: true, master: true },
        { name: "Suporte Técnico", individual: "Padrão", premium: "Padrão", master: "Prioritário" },
        { name: "Lembrete WhatsApp", individual: false, premium: "Em breve", master: "Sim (Oficial)" },
      ]
    }
  ];

  const plans = [
    { name: "Individual", price: "35", key: "INDIVIDUAL" },
    { name: "Premium", price: "65", key: "PREMIUM", popular: true },
    { name: "Master", price: "99", key: "MASTER", master: true },
  ];

  return (
    <section className="py-24 px-4 bg-white overflow-hidden hidden md:block border-t border-gray-100">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Compare e escolha</h2>
          <p className="text-gray-500 font-medium">Veja em detalhes qual plano se encaixa no seu momento.</p>
        </div>

        <div className="relative">
          {/* Header da Tabela */}
          <div className="grid grid-cols-12 gap-1 pb-10 sticky top-16 bg-white/95 backdrop-blur-md z-30 border-b border-gray-100 pt-6">
            <div className="col-span-3 flex items-end pb-2">
              <span className="text-xl font-black text-gray-900 tracking-tight">Recursos</span>
            </div>
            {plans.map((plan) => (
              <div key={plan.key} className="col-span-3 text-center flex flex-col items-center">
                <div className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-3 ${plan.master ? 'bg-amber-100 text-amber-700' : plan.popular ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                  {plan.name}
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900 leading-none">R$ {plan.price}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">/mês</span>
                  </div>
                  <a href="#planos" className={`mt-4 w-[110px] py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition shadow-sm hover:shadow-md hover:scale-105 active:scale-95 ${plan.master ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900' : plan.popular ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white'
                    }`}>
                    Escolher
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Conteúdo da Tabela */}
          <div className="mt-4 space-y-16">
            {categories.map((cat, i) => (
              <div key={i}>
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 py-2 flex items-center gap-3">
                  <div className="h-0.5 w-8 bg-blue-100 rounded-full" />
                  {cat.name}
                  <div className="h-0.5 flex-1 bg-blue-50/50 rounded-full" />
                </h3>
                <div className="divide-y divide-gray-50/50">
                  {cat.features.map((feat, fi) => (
                    <div key={fi} className="grid grid-cols-12 gap-1 py-4 hover:bg-gray-50/80 transition-all duration-200 items-center rounded-2xl group">
                      <div className="col-span-3 lg:col-span-3 pl-4 flex items-center gap-2 group/help">
                        <span className="text-[13px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors">{feat.name}</span>
                        <HelpCircle size={14} className="text-gray-200 group-hover/help:text-blue-400 transition-colors cursor-help shrink-0" />
                      </div>

                      {/* Individual */}
                      <div className="col-span-3 text-center flex justify-center">
                        {typeof feat.individual === 'boolean' ? (
                          feat.individual ? <Check className="text-blue-500/60" size={18} /> : <span className="w-4 h-px bg-gray-100" />
                        ) : (
                          <span className="text-[11px] font-bold text-gray-500 tracking-tight">{feat.individual}</span>
                        )}
                      </div>

                      {/* Premium */}
                      <div className="col-span-3 text-center flex justify-center py-2 relative">
                        <div className="absolute inset-y-1 inset-x-2 bg-blue-50/30 rounded-xl -z-10 group-hover:bg-blue-50/50 transition-colors" />
                        {typeof feat.premium === 'boolean' ? (
                          feat.premium ? <Check className="text-blue-600" size={20} strokeWidth={3} /> : <span className="w-4 h-px bg-gray-200" />
                        ) : (
                          <span className="text-[11px] font-black text-blue-700 tracking-tight">{feat.premium}</span>
                        )}
                      </div>

                      {/* Master */}
                      <div className="col-span-3 text-center flex justify-center">
                        {typeof feat.master === 'boolean' ? (
                          feat.master ? <Check className="text-amber-500" size={20} strokeWidth={2.5} /> : <span className="w-4 h-px bg-gray-100" />
                        ) : (
                          <span className="text-[11px] font-black text-amber-600 tracking-tight">{feat.master}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// --- HERO CTA (BOTAO COMEÇAR) ---
function HeroCTA() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!isSignedIn) {
      router.push('/sign-up');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/trial', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        toast.success("Período de teste de 7 dias ativado! 🎉");
        router.push('/painel/dashboard');
      } else {
        // Se já usou trial ou tem assinatura
        if (data.code === "TRIAL_USED") {
          // Tenta ir para o dashboard. Se estiver inativo, o layout vai redirecionar para planos.
          router.push('/painel/dashboard');
        } else {
          toast.info(data.message || "Redirecionando...");
          router.push('/#planos');
        }
      }
    } catch (error) {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className="bg-blue-600 text-white font-bold px-10 py-4 rounded-full shadow-xl shadow-blue-500/25 hover:bg-blue-700 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
    >
      {loading ? <Loader2 className="animate-spin" /> : <>Começar Gratuitamente <ArrowRight size={20} /></>}
    </button>
  );
}

// ...

// --- COMPONENTE PRINCIPAL ---
export default function LandingPage() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="bg-white text-gray-800 font-sans scroll-smooth selection:bg-blue-100 selection:text-blue-900">

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <nav className="container mx-auto flex justify-between items-center py-4 px-4">
          <div className="flex items-center gap-8">
            <Link href="/">
              <LogoNohud />
            </Link>

            <div className="hidden md:flex gap-6 items-center">
              <a href="#funcionalidades" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition">Funcionalidades</a>
              <a href="#depoimentos" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition">Clientes</a>
              <a href="#planos" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition">Preços</a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AuthButton />
            <button className="md:hidden p-2 text-gray-600" onClick={() => setMenuAberto(!menuAberto)}>
              {menuAberto ? <X /> : <Menu />}
            </button>
          </div>
        </nav>
        {/* MENU MOBILE */}
        {menuAberto && (
          <div className="md:hidden bg-white border-b border-gray-100 absolute left-0 right-0 top-full p-6 shadow-xl flex flex-col gap-4 animate-in slide-in-from-top-2">
            <a href="#funcionalidades" onClick={() => setMenuAberto(false)} className="font-bold text-gray-600 py-2">Funcionalidades</a>
            <a href="#planos" onClick={() => setMenuAberto(false)} className="font-bold text-gray-600 py-2">Preços</a>
            <a href="#depoimentos" onClick={() => setMenuAberto(false)} className="font-bold text-gray-600 py-2">Clientes</a>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-4 bg-white relative overflow-hidden">
        {/* Background Element */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-100/50 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none"></div>

        <div className="container mx-auto text-center relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Star size={12} className="fill-blue-700" />
            Mais de 1.000 agendamentos realizados
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-[1.1] mb-8 tracking-tight text-gray-900 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            A gestão da sua empresa <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">simples e inteligente.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Deixe as planilhas de lado. O NOHUD organiza sua agenda, controla seu financeiro e envia lembretes automáticos para seus clientes.
          </p>

          <div className="flex flex-col md:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
            <Link href="#planos" className="bg-blue-600 text-white font-bold px-10 py-4 rounded-full shadow-xl shadow-blue-500/25 hover:bg-blue-700 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg">
              Conhecer os Planos <ArrowDown size={20} />
            </Link>
            <Link href="#funcionalidades" className="bg-white text-gray-700 border border-gray-200 font-bold px-10 py-4 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 flex items-center justify-center text-lg">
              Ver Funcionalidades
            </Link>
          </div>


          {/* FEATURES INTEGRADAS NO HERO */}
          <div id="funcionalidades" className="mt-32 relative z-10">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Domine sua gestão com um clique</h2>
              <p className="text-gray-500 font-medium text-lg">Tudo o que você precisa para crescer organizado em uma única interface inteligente.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {[
                { icon: Calendar, title: "Agenda Inteligente", desc: "Visualize horários, evite conflitos e organize o dia com facilidade.", color: "bg-blue-100 text-blue-600" },
                { icon: Smartphone, title: "Notificações", desc: "Reduza faltas com lembretes automáticos por e-mail para seus clientes.", color: "bg-green-100 text-green-600" },
                { icon: BarChart3, title: "Financeiro & Metas", desc: "Acompanhe seu faturamento em tempo real e saiba exatamente quanto lucra.", color: "bg-purple-100 text-purple-600" },
                { icon: Users, title: "Gestão de Equipe", desc: "Controle comissões, horários e permissões de acesso para colaboradores.", color: "bg-orange-100 text-orange-600" },
                { icon: ShieldCheck, title: "Acesso Seguro", desc: "Seus dados protegidos na nuvem com backups automáticos e segurança total.", color: "bg-cyan-100 text-cyan-600" },
                { icon: UserCircle, title: "Gestão de Clientes", desc: "Prontuários, histórico de atendimentos e preferências de cada cliente.", color: "bg-pink-100 text-pink-600" }
              ].map((f, i) => (
                <div key={i} className="bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all border border-white/20 group hover:-translate-y-1 duration-300">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-500 ${f.color}`}><f.icon size={28} strokeWidth={2.5} /></div>
                  <h3 className="font-black text-xl text-gray-900 mb-3">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section id="depoimentos" className="py-24 px-4 bg-gray-900 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-4">Quem usa, recomenda</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">Junte-se a centenas de empresas que modernizaram sua gestão.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { quote: "O NOHUD transformou minha produtividade. O link de agendamento automático é um diferencial enorme para meus pacientes.", author: "Dra. Ana Costa", role: "Fisioterapeuta", color: "text-blue-400" },
              { quote: "Fácil de usar e extremamente bonito. Minha equipe se adaptou em menos de um dia. O suporte é excelente.", author: "Ricardo Lima", role: "Dono de Barbearia", color: "text-green-400" },
              { quote: "As notificações automáticas reduziram as faltas quase a zero. Vale cada centavo investido. Recomendo demais!", author: "Joana Santos", role: "Esteticista", color: "text-purple-400" }
            ].map((testimonial, i) => (
              <div key={i} className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10 backdrop-blur-sm shadow-2xl relative">
                <div className="absolute top-8 right-8 text-6xl font-serif text-white/10 leading-none">"</div>
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} className="fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-gray-300 font-medium text-lg leading-relaxed mb-8 relative z-10">{testimonial.quote}</p>
                <div>
                  <h4 className="font-black text-white text-lg">{testimonial.author}</h4>
                  <span className={`text-sm font-bold uppercase tracking-widest ${testimonial.color}`}>{testimonial.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PlanosSection />
      <ComparacaoPlanos />
      <FAQSection />

      {/* CTA FINAL */}
      <section className="py-24 px-4 bg-blue-600 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
        <div className="container mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-8 tracking-tight">Pronto para transformar seu negócio?</h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10">Crie sua conta agora e tenha acesso imediato a todas as ferramentas.</p>
          <Link href="#planos" className="inline-flex bg-white text-blue-600 font-black px-12 py-5 rounded-full shadow-2xl hover:scale-105 transition active:scale-95 text-xl items-center gap-3">
            Começar Agora <ArrowRight size={24} />
          </Link>
          <p className="mt-8 text-sm text-blue-200 font-medium">Sem cartão de crédito necessário para cadastro.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-4 bg-white border-t border-gray-100">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <LogoNohud />

          <div className="text-gray-500 text-sm font-medium">
            © 2026 NOHUD Sistemas. Todos os direitos reservados.
          </div>

          <div className="flex gap-6">
            <a href="https://www.instagram.com/nohudsistemas" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition"><span className="sr-only">Instagram</span><svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg></a>
          </div>
        </div>
      </footer>
    </div>
  );
}