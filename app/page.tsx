"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';
import {
  Check, Star, Zap, Crown, Building2, Loader2, Edit, Calendar, Users,
  DollarSign, Menu, X, LogIn, LayoutDashboard, Copy, ArrowRight, ArrowDown,
  Smartphone, ShieldCheck, Clock, BarChart3, HelpCircle, ChevronDown, UserCircle,
  MessageSquare, CheckCircle, PlusCircle, MinusCircle
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

// --- MODAL DE TELEFONE ---
function PhoneModal({ isOpen, onClose, onConfirm, loading }: { isOpen: boolean, onClose: () => void, onConfirm: (phone: string) => void, loading: boolean }) {
  const [phone, setPhone] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone size={32} />
          </div>
          <h3 className="text-2xl font-black text-gray-900">Quase lá! 🚀</h3>
          <p className="text-gray-500 font-medium mt-2">Informe seu WhatsApp para recebermos você com um presente especial de boas-vindas.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Seu WhatsApp</label>
            <input
              type="tel"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full mt-1 px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-lg"
              autoFocus
            />
          </div>

          <button
            onClick={() => onConfirm(phone)}
            disabled={loading || !phone}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Ativar Meus 7 Dias Grátis <ArrowRight size={20} /></>}
          </button>

          <button onClick={onClose} className="w-full py-2 text-gray-400 font-bold hover:text-gray-600 transition text-sm">
            Depois eu informo
          </button>
        </div>
      </div>
    </div>
  );
}

// --- HERO CTA (BOTAO COMEÇAR) ---
function HeroCTA() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleStart = async (phone?: string) => {
    if (!isSignedIn) {
      router.push('/sign-up');
      return;
    }

    if (!phone && !showModal) {
      setShowModal(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/trial', {
        method: 'POST',
        body: JSON.stringify({ phone })
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Período de teste de 7 dias ativado! 🎉");
        router.push('/painel/dashboard');
      } else {
        if (data.code === "TRIAL_USED") {
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
      setShowModal(false);
    }
  };

  return (
    <>
      <button
        onClick={() => handleStart()}
        disabled={loading}
        className="bg-blue-600 text-white font-bold px-10 py-4 rounded-full shadow-xl shadow-blue-500/25 hover:bg-blue-700 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
      >
        {loading ? <Loader2 className="animate-spin" /> : <>Começar Gratuitamente <ArrowRight size={20} /></>}
      </button>

      <PhoneModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={(p) => handleStart(p)}
        loading={loading}
      />
    </>
  );
}

// --- SEÇÃO DE PLANOS ---
function PlanosSection({ billingCycle, setBillingCycle }: { billingCycle: 'month' | 'year', setBillingCycle: (cycle: 'month' | 'year') => void }) {
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
      const res = await fetch('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: plano, cycle: billingCycle })
      });
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

  const PlanCard = ({ title, price, description, features, planKey, popular = false, master = false, icon: Icon, badge, badgeColor, iconBg, iconColor, checkColor, originalPrice }: any) => {
    const isCurrentPlan = assinatura.active && assinatura.plan === planKey;
    const isDark = popular || master;

    return (
      <div className={`relative flex flex-col p-8 rounded-[2.5rem] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${master
        ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-amber-950 text-white ring-2 ring-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.2)] scale-[1.05] z-10'
        : popular
          ? 'bg-gray-900 text-white ring-4 ring-blue-500 shadow-2xl z-[5]'
          : 'bg-white text-gray-800 border border-gray-100 shadow-xl'
        }`}>

        {badge && <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg ${badgeColor || 'bg-blue-600'}`}>{badge}</div>}

        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${iconBg || (isDark ? 'bg-white/10' : 'bg-gray-50')} ${iconColor || (isDark ? 'text-blue-400' : 'text-gray-600')}`}>
            <Icon size={28} />
          </div>
          <h3 className={`text-2xl font-black tracking-tighter uppercase ${master ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500' : ''}`}>{title}</h3>
          <p className={`text-xs font-bold mt-2 h-10 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
        </div>

        <div className="my-8 text-center flex flex-col items-center">
          {billingCycle === 'year' && originalPrice && (
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black px-3 py-1 rounded-full mb-3 animate-pulse">
              Economize R$ {((originalPrice - price) * 12).toFixed(2).replace('.', ',')}
            </div>
          )}
          <div className="flex items-baseline gap-1">
            <span className={`text-5xl font-black ${master ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400' : ''}`}>R$ {price}</span>
            <span className={`text-xs font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/mês</span>
          </div>
        </div>

        <ul className="space-y-4 mb-8 flex-1">
          {features.map((feat: string, i: number) => (
            <li key={i} className="flex gap-3 text-xs font-bold items-start text-left">
              <Check size={18} className={`flex-shrink-0 ${checkColor || (master ? 'text-amber-400' : popular ? 'text-blue-500' : 'text-emerald-500')}`} strokeWidth={3} />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{feat}</span>
            </li>
          ))}
        </ul>

        {isCurrentPlan ? (
          <button onClick={gerenciarAssinatura} disabled={!!loading} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95">
            {loading === 'gerenciar' ? <Loader2 size={16} className="animate-spin" /> : <><Edit size={16} /> Meu Plano Atual</>}
          </button>
        ) : (
          <button
            onClick={() => assinar(planKey)}
            disabled={!!loading}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition flex justify-center items-center gap-2 active:scale-95 shadow-lg ${master
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900 shadow-amber-500/25'
              : popular
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                : 'bg-gray-900 hover:bg-black text-white'
              }`}
          >
            {loading === planKey ? <Loader2 size={16} className="animate-spin" /> : (master ? '🚀 Assinar Agora' : 'Assinar Agora')}
          </button>
        )}
      </div>
    );
  };

  return (
    <section id="planos" className="py-24 px-4 bg-gray-50 relative overflow-hidden">
      <div className="container mx-auto relative z-10 text-center">
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">Escolha seu Plano</h2>
          <p className="text-lg text-gray-500 font-bold mb-10">Economize até 35% no plano anual.</p>

          <div className="inline-flex p-1.5 bg-gray-200 dark:bg-gray-800 rounded-2xl mb-8 relative">
            <button
              onClick={() => setBillingCycle('year')}
              className={`relative px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10 ${billingCycle === 'year' ? 'text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-2 py-0.5 rounded-lg text-[8px] font-black">-35%</div>
              Anual
            </button>
            <button
              onClick={() => setBillingCycle('month')}
              className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10 ${billingCycle === 'month' ? 'text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Mensal
            </button>
            <div
              className="absolute top-1.5 bottom-1.5 transition-all duration-300 bg-gray-900 rounded-xl shadow-lg"
              style={{
                left: billingCycle === 'year' ? '6px' : '50%',
                width: 'calc(50% - 6px)'
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          <PlanCard
            title="Individual"
            price={billingCycle === 'year' ? 62 : 95}
            originalPrice={95}
            description="Ideal para profissionais autônomos."
            planKey="INDIVIDUAL"
            icon={Star}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            features={["1 Profissional", "Agenda Online", "Link de Agendamento", "Lembretes Automáticos", "Gestão Financeira Básica"]}
          />
          <PlanCard
            title="Premium"
            price={billingCycle === 'year' ? 90 : 139}
            originalPrice={139}
            description="Perfeito para pequenas equipes e clínicas."
            planKey="PREMIUM"
            popular={true}
            icon={Zap}
            badge="Mais Escolhido"
            features={["Até 5 Profissionais", "Controle de Comissões", "Fluxo de Caixa", "Gestão de Estoque", "Suporte Prioritário"]}
          />
          <PlanCard
            title="Master"
            price={billingCycle === 'year' ? 155 : 239}
            originalPrice={239}
            description="Solução completa para grandes negócios."
            planKey="MASTER"
            master={true}
            icon={Crown}
            badge="Mais Completo"
            badgeColor="bg-gradient-to-r from-amber-500 to-yellow-500"
            features={["Até 15 Profissionais", "WhatsApp Automático", "Bot de Atendimento", "Múltiplas Unidades", "Relatórios Avançados", "Consultoria Estratégica"]}
          />
        </div>

        <div className="mt-20 flex flex-col items-center">
          <p className="text-gray-500 font-medium text-lg mb-8 max-w-xl">
            Ainda na dúvida? Comece agora seu teste grátis.
          </p>
          <HeroCTA />
          <p className="text-sm text-gray-400 mt-4 font-medium">Sem cartão de crédito necessário.</p>
        </div>
      </div>
    </section>
  );
}

// --- TABELA DE COMPARAÇÃO ---
function ComparacaoPlanos({ billingCycle }: { billingCycle: 'month' | 'year' }) {
  const categories = [
    {
      name: "Gestão & Equipe",
      features: [
        { name: "Profissionais", individual: "1 (Você)", premium: "Até 5", master: "Até 15" },
        { name: "Agenda Online 24h", individual: true, premium: true, master: true },
        { name: "Link de Agendamento", individual: true, premium: true, master: true },
        { name: "Gestão de Equipe", individual: false, premium: true, master: true },
        { name: "App no Celular", individual: true, premium: true, master: true },
      ]
    },
    {
      name: "Financeiro & Vendas",
      features: [
        { name: "Gestão Financeira", individual: "Básica", premium: "Completa", master: "Avançada" },
        { name: "Controle de Comissões", individual: false, premium: true, master: true },
        { name: "Fluxo de Caixa", individual: false, premium: true, master: true },
        { name: "Gestão de Estoque", individual: false, premium: false, master: true },
        { name: "Taxas de Cartão", individual: false, premium: true, master: true },
      ]
    },
    {
      name: "Comunicação & Clientes",
      features: [
        { name: "Lembretes E-mail", individual: true, premium: true, master: true },
        { name: "WhatsApp Automático", individual: false, premium: false, master: true },
        { name: "Fichas & Evolução", individual: false, premium: false, master: true },
        { name: "Suporte Técnico", individual: "Padrão", premium: "Padrão", master: "Prioritário" },
      ]
    }
  ];

  const plans = [
    { name: "Individual", price: billingCycle === 'year' ? "62" : "95", key: "INDIVIDUAL" },
    { name: "Premium", price: billingCycle === 'year' ? "90" : "139", key: "PREMIUM", popular: true },
    { name: "Master", price: billingCycle === 'year' ? "155" : "239", key: "MASTER", master: true },
  ];

  return (
    <section className="py-24 px-4 bg-white overflow-hidden hidden md:block border-t border-gray-100">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Compare e escolha</h2>
          <p className="text-gray-500 font-medium">Veja em detalhes qual plano se encaixa no seu momento.</p>
        </div>

        <div className="relative">
          <div className="grid grid-cols-12 gap-1 pb-10 sticky top-16 bg-white/95 backdrop-blur-md z-30 border-b border-gray-100 pt-6">
            <div className="col-span-3 lg:col-span-3 flex items-end pb-2">
              <span className="text-xl font-black text-gray-900 tracking-tight">Recursos</span>
            </div>
            {plans.map((plan) => (
              <div key={plan.key} className="col-span-3 text-center flex flex-col items-center">
                <div className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-3 ${plan.master ? 'bg-amber-100 text-amber-700' : plan.popular ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {plan.name}
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900 leading-none">R$ {plan.price}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">/mês</span>
                  </div>
                  <Link href="#planos" className={`mt-4 w-[110px] py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition shadow-sm hover:shadow-md hover:scale-105 active:scale-95 ${plan.master ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900' : plan.popular ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white'}`}>
                    Escolher
                  </Link>
                </div>
              </div>
            ))}
          </div>

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
                      <div className="col-span-3 text-center flex justify-center">
                        {typeof feat.individual === 'boolean' ? (
                          feat.individual ? <Check className="text-blue-500/60" size={18} /> : <span className="w-4 h-px bg-gray-100" />
                        ) : (
                          <span className="text-[11px] font-bold text-gray-500 tracking-tight">{feat.individual}</span>
                        )}
                      </div>
                      <div className="col-span-3 text-center flex justify-center py-2 relative">
                        <div className="absolute inset-y-1 inset-x-2 bg-blue-50/30 rounded-xl -z-10 group-hover:bg-blue-50/50 transition-colors" />
                        {typeof feat.premium === 'boolean' ? (
                          feat.premium ? <Check className="text-blue-600" size={20} strokeWidth={3} /> : <span className="w-4 h-px bg-gray-200" />
                        ) : (
                          <span className="text-[11px] font-black text-blue-700 tracking-tight">{feat.premium}</span>
                        )}
                      </div>
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

// --- FAQ SECTION ---
function FAQSection() {
  const faqs = [
    { q: "Preciso instalar algo no computador?", a: "Não! O NOHUD é 100% online. Você acessa pelo navegador de onde estiver." },
    { q: "Os lembretes são enviados automaticamente?", a: "Sim. Assim que você confirma um agendamento, seu cliente recebe um e-mail automático." },
    { q: "Posso cancelar quando quiser?", a: "Com certeza. Sem fidelidade, sem multas. Você tem total liberdade." },
    { q: "Consigo gerenciar as comissões da equipe?", a: "Sim! O NOHUD calcula automaticamente as comissões com base nos serviços realizados." }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 px-4 bg-gray-50">
      <div className="container mx-auto max-w-3xl text-center">
        <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-16">Perguntas Frequentes</h2>
        <div className="space-y-4 text-left">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <button
                className="flex justify-between items-center w-full text-left font-bold text-lg text-gray-900"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                {faq.q}
                {openIndex === index ? <MinusCircle size={20} className="text-blue-600" /> : <PlusCircle size={20} className="text-gray-400" />}
              </button>
              {openIndex === index && (
                <p className="mt-4 text-gray-600 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- BALÃO FLUTUANTE ---
function FloatingCTA() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[40] animate-in slide-in-from-bottom-10 fade-in duration-700">
      <Link href="#planos" className="group relative flex items-center gap-3 bg-white p-2 pr-6 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-blue-50 hover:scale-105 transition-all active:scale-95">
        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:rotate-12 transition-transform">
          <Zap size={24} fill="currentColor" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Teste Grátis</span>
          <span className="text-sm font-black text-gray-900 leading-none">Liberar 7 dias agora! 🚀</span>
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-bounce" />
      </Link>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function LandingPage() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('year');

  return (
    <div className="bg-white text-gray-800 font-sans scroll-smooth selection:bg-blue-100 selection:text-blue-900">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <nav className="container mx-auto flex justify-between items-center py-4 px-4">
          <div className="flex items-center gap-8">
            <Link href="/"><LogoNohud /></Link>
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
        {menuAberto && (
          <div className="md:hidden bg-white border-b border-gray-100 absolute left-0 right-0 top-full p-6 shadow-xl flex flex-col gap-4 animate-in slide-in-from-top-2">
            <a href="#funcionalidades" onClick={() => setMenuAberto(false)} className="font-bold text-gray-600 py-2">Funcionalidades</a>
            <a href="#planos" onClick={() => setMenuAberto(false)} className="font-bold text-gray-600 py-2">Preços</a>
            <a href="#depoimentos" onClick={() => setMenuAberto(false)} className="font-bold text-gray-600 py-2">Clientes</a>
          </div>
        )}
      </header>

      <section className="pt-40 pb-20 px-4 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-100/50 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none"></div>
        <div className="container mx-auto text-center relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8">
            <Star size={12} className="fill-blue-700" />
            Sistema de Gestão Inteligente
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-[1.1] mb-8 tracking-tight text-gray-900">
            Sua agenda sob <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">controle total.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
            Reduza faltas, gerencie sua equipe e controle seu financeiro em um só lugar.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <HeroCTA />
            <Link href="#funcionalidades" className="bg-white text-gray-700 border border-gray-200 font-bold px-10 py-4 rounded-full hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center text-lg">
              Ver Recursos
            </Link>
          </div>
        </div>
      </section>

      <div id="funcionalidades" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              { icon: Calendar, title: "Agenda Online", desc: "Link personalizado para seus clientes agendarem 24h por dia.", color: "bg-blue-100 text-blue-600" },
              { icon: Smartphone, title: "Lembretes", desc: "Envio automático de lembretes para reduzir o não comparecimento.", color: "bg-green-100 text-green-600" },
              { icon: BarChart3, title: "Financeiro", desc: "Controle entradas, saídas e comissões de forma simples.", color: "bg-purple-100 text-purple-600" },
              { icon: Users, title: "Equipe", desc: "Gerencie permissões e horários de cada colaborador.", color: "bg-orange-100 text-orange-600" },
              { icon: ShieldCheck, title: "Segurança", desc: "Dados criptografados e backup automático na nuvem.", color: "bg-cyan-100 text-cyan-600" },
              { icon: UserCircle, title: "CRM", desc: "Histórico completo de atendimentos e preferências dos clientes.", color: "bg-pink-100 text-pink-600" }
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50 hover:-translate-y-1 transition duration-300">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${f.color}`}><f.icon size={28} /></div>
                <h3 className="font-black text-xl text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section id="depoimentos" className="py-24 px-4 bg-gray-900 text-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Quem usa, aprova!</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { quote: "O sistema pagou por si só no primeiro mês reduzindo as faltas.", author: "Dr. Marcelo Lima", role: "Clínica Integrada", color: "text-blue-400" },
              { quote: "Meus clientes amam a facilidade de agendar pelo Instagram.", author: "Carla Silveira", role: "Studio Lash", color: "text-pink-400" },
              { quote: "Controle financeiro impecável. Sei exatamente meu lucro real.", author: "Felipe Bronze", role: "Barbearia Vip", color: "text-orange-400" }
            ].map((t, i) => (
              <div key={i} className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10">
                <p className="text-gray-300 font-medium text-lg leading-relaxed mb-8 italic">"{t.quote}"</p>
                <h4 className="font-black text-white text-lg">{t.author}</h4>
                <span className={`text-sm font-bold uppercase tracking-widest ${t.color}`}>{t.role}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PlanosSection billingCycle={billingCycle} setBillingCycle={setBillingCycle} />
      <ComparacaoPlanos billingCycle={billingCycle} />
      <FAQSection />

      <section className="py-24 px-4 bg-blue-600 text-white text-center">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-8">Modernize seu negócio hoje.</h2>
          <HeroCTA />
        </div>
      </section>

      <footer className="py-16 px-4 bg-white border-t border-gray-100">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <LogoNohud />
          <div className="text-gray-500 text-sm font-medium">© 2026 NOHUD Sistemas.</div>
        </div>
      </footer>
      <FloatingCTA />
    </div>
  );
}