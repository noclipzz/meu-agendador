"use client";

import { useState } from "react";
import { Check, Star, Zap, Crown, Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function Planos() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null); // Guarda qual plano está carregando

  async function assinar(plano: string) {
    // 1. Força login se não tiver usuário
    if (!user) {
        // Redireciona para a página de login do Clerk e volta pra cá depois
        return router.push('/sign-in?redirect_url=/planos');
    }
    
    setLoading(plano);

    try {
        // 2. Chama a API para criar o Checkout do Stripe
        const res = await fetch('/api/checkout', {
            method: 'POST',
            body: JSON.stringify({ plan: plano })
        });

        const data = await res.json();

        if (data.url) {
            // 3. Manda o usuário para o site seguro do Stripe
            window.location.href = data.url;
        } else {
            alert("Erro ao iniciar pagamento. Tente novamente.");
            setLoading(null);
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
        setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-20 px-4 font-sans">
      
      {/* CABEÇALHO */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white">
          Escolha o plano ideal para o <span className="text-blue-500">seu negócio</span>
        </h1>
        <p className="text-gray-400 text-lg">
          Comece pequeno e cresça com a gente. Cancele quando quiser.
        </p>
      </div>

      {/* GRID DE PLANOS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        
        {/* PLANO 1: INDIVIDUAL */}
        <div className="bg-white rounded-2xl p-8 flex flex-col hover:scale-105 transition duration-300 shadow-xl relative overflow-hidden group">
            <div className="mb-4 bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center text-gray-700 group-hover:bg-gray-200 transition">
                <Star size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Individual</h3>
            <p className="text-gray-500 text-sm mt-2">Para quem trabalha sozinho.</p>
            <div className="my-6">
                <span className="text-4xl font-extrabold text-gray-900">R$ 35</span>
                <span className="text-gray-400 text-sm font-medium">/mês</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
                <li className="flex gap-2 text-sm text-gray-600"><Check size={18} className="text-green-500"/> 1 Usuário (Admin)</li>
                <li className="flex gap-2 text-sm text-gray-600"><Check size={18} className="text-green-500"/> Agenda Ilimitada</li>
                <li className="flex gap-2 text-sm text-gray-600"><Check size={18} className="text-green-500"/> Link Personalizado</li>
            </ul>
            <button 
                onClick={() => assinar("INDIVIDUAL")} 
                disabled={loading === "INDIVIDUAL"} 
                className="w-full py-3 rounded-xl font-bold border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition flex justify-center items-center gap-2"
            >
                {loading === "INDIVIDUAL" ? <Loader2 className="animate-spin" /> : "Escolher Individual"}
            </button>
        </div>

        {/* PLANO 2: PREMIUM (DESTAQUE) */}
        <div className="bg-blue-600 rounded-2xl p-8 flex flex-col transform md:-translate-y-4 hover:scale-105 transition duration-300 shadow-2xl relative border-4 border-blue-500/50">
            <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
            <div className="mb-4 bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center text-white">
                <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Premium</h3>
            <p className="text-blue-100 text-sm mt-2">Pequenas equipes.</p>
            <div className="my-6 text-white">
                <span className="text-4xl font-extrabold">R$ 65</span>
                <span className="text-blue-200 text-sm font-medium">/mês</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
                <li className="flex gap-2 text-sm text-white"><Check size={18} className="text-yellow-400"/> Até 5 Usuários</li>
                <li className="flex gap-2 text-sm text-white"><Check size={18} className="text-yellow-400"/> Tudo do Individual</li>
                <li className="flex gap-2 text-sm text-white"><Check size={18} className="text-yellow-400"/> Suporte Prioritário</li>
            </ul>
            <button 
                onClick={() => assinar("PREMIUM")} 
                disabled={loading === "PREMIUM"} 
                className="w-full py-3 rounded-xl font-bold bg-white text-blue-600 hover:bg-blue-50 transition shadow-lg flex justify-center items-center gap-2"
            >
                {loading === "PREMIUM" ? <Loader2 className="animate-spin" /> : "Assinar Premium"}
            </button>
        </div>

        {/* PLANO 3: MASTER */}
        <div className="bg-white rounded-2xl p-8 flex flex-col hover:scale-105 transition duration-300 shadow-xl">
            <div className="mb-4 bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center text-purple-600">
                <Crown size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Master</h3>
            <p className="text-gray-500 text-sm mt-2">Clínicas em expansão.</p>
            <div className="my-6">
                <span className="text-4xl font-extrabold text-gray-900">R$ 99</span>
                <span className="text-gray-400 text-sm font-medium">/mês</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
                <li className="flex gap-2 text-sm text-gray-600"><Check size={18} className="text-green-500"/> Até 15 Usuários</li>
                <li className="flex gap-2 text-sm text-gray-600"><Check size={18} className="text-green-500"/> Relatórios Avançados</li>
                <li className="flex gap-2 text-sm text-gray-600"><Check size={18} className="text-green-500"/> Gestão Financeira</li>
            </ul>
            <button 
                onClick={() => assinar("MASTER")} 
                disabled={loading === "MASTER"} 
                className="w-full py-3 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-700 transition flex justify-center items-center gap-2"
            >
                {loading === "MASTER" ? <Loader2 className="animate-spin" /> : "Escolher Master"}
            </button>
        </div>

        {/* PLANO 4: ENTERPRISE */}
        <div className="bg-gray-800 rounded-2xl p-8 flex flex-col hover:scale-105 transition duration-300 shadow-xl border border-gray-700">
            <div className="mb-4 bg-gray-700 w-12 h-12 rounded-lg flex items-center justify-center text-gray-300">
                <Building2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Enterprise</h3>
            <p className="text-gray-400 text-sm mt-2">Redes e Franquias.</p>
            <div className="my-6 text-white">
                <span className="text-3xl font-bold">Sob Medida</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
                <li className="flex gap-2 text-sm text-gray-400"><Check size={18} className="text-gray-500"/> Usuários Ilimitados</li>
                <li className="flex gap-2 text-sm text-gray-400"><Check size={18} className="text-gray-500"/> API Dedicada</li>
                <li className="flex gap-2 text-sm text-gray-400"><Check size={18} className="text-gray-500"/> Gerente de Conta</li>
            </ul>
            <a href="https://wa.me/553197289584" target="_blank" className="w-full py-3 rounded-xl font-bold border border-gray-600 text-white hover:bg-white hover:text-black transition text-center block">
                Fale com nossa equipe
            </a>
        </div>

      </div>
    </div>
  );
}