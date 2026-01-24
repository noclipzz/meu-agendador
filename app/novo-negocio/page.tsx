"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function NovoNegocio() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificandoPagamento, setVerificandoPagamento] = useState(true);

  // 1. VERIFICA SE PAGOU
  useEffect(() => {
    async function verificarAssinatura() {
        try {
            const res = await fetch('/api/checkout');
            const data = await res.json();
            
            if (!data.active) {
                // Se não pagou, manda para a loja
                router.push('/planos');
            } else {
                setVerificandoPagamento(false);
            }
        } catch (error) {
            console.error(error);
        }
    }
    if (isLoaded && user) verificarAssinatura();
  }, [isLoaded, user, router]);

  async function criarEmpresa() {
    if (!nome || !slug) return alert("Preencha tudo!");
    setLoading(true);

    try {
      const res = await fetch('/api/empresa', {
        method: 'POST',
        body: JSON.stringify({ 
            name: nome, 
            slug: slug, 
            ownerId: user?.id 
        })
      });

      if (res.ok) {
        alert("Negócio criado com sucesso!");
        router.push("/painel");
      } else {
        alert("Erro: Talvez esse link já exista.");
      }
    } catch (error) {
        alert("Erro de conexão");
    } finally {
        setLoading(false);
    }
  }

  if (verificandoPagamento) return <div className="h-screen flex items-center justify-center text-gray-500">Verificando sua assinatura...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md animate-in zoom-in">
        <h1 className="text-2xl font-bold mb-2">Bem-vindo, {user?.firstName}!</h1>
        <p className="text-gray-500 mb-6">Sua assinatura está ativa. Vamos configurar seu negócio.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Negócio</label>
            <input 
                className="w-full border p-3 rounded-lg" 
                placeholder="Ex: Consultório Dr. Yan"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Link Personalizado</label>
            <div className="flex items-center">
                <span className="bg-gray-200 p-3 border border-r-0 rounded-l-lg text-gray-500 text-sm">nodigital.app/</span>
                <input 
                    className="w-full border p-3 rounded-r-lg" 
                    placeholder="dr-yan"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s/g, '-'))}
                />
            </div>
          </div>

          <button 
            onClick={criarEmpresa}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? "Criando..." : "Criar Painel"}
          </button>
        </div>
      </div>
    </div>
  );
}