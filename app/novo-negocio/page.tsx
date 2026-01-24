"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NovoNegocio() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true); // Estado de carregamento inicial

  // VERIFICAÇÃO DE SEGURANÇA (Porteiro)
  useEffect(() => {
    async function verificarStatus() {
        if (!isLoaded || !user) return;

        try {
            // 1. Verifica se já tem empresa criada
            // Usamos a rota de config que busca pelo ID do dono
            const resEmpresa = await fetch('/api/painel/config');
            const dadosEmpresa = await resEmpresa.json();

            if (dadosEmpresa && dadosEmpresa.id) {
                // SE JÁ TEM EMPRESA -> MANDA PRO PAINEL
                router.push('/painel');
                return; 
            }

            // 2. Verifica se tem assinatura (Pagamento)
            const resPag = await fetch('/api/checkout');
            const dadosPag = await resPag.json();
            
            if (!dadosPag.active) {
                // SE NÃO PAGOU -> MANDA PROS PLANOS
                router.push('/planos');
            } else {
                // SE PASSOU NOS DOIS TESTES -> LIBERA A TELA
                setVerificando(false);
            }

        } catch (error) {
            console.error("Erro de verificação:", error);
        }
    }

    verificarStatus();
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

      const data = await res.json();

      if (res.ok) {
        alert("Negócio criado com sucesso!");
        router.push("/painel");
      } else {
        alert(data.error || "Erro ao criar.");
      }
    } catch (error) {
        alert("Erro de conexão");
    } finally {
        setLoading(false);
    }
  }

  // TELA DE CARREGAMENTO (Enquanto decide para onde mandar o usuário)
  if (verificando) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p>Verificando sua conta...</p>
        </div>
      );
  }

  // FORMULÁRIO DE CRIAÇÃO (Só aparece se não tiver empresa e tiver pago)
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md animate-in zoom-in">
        <h1 className="text-2xl font-bold mb-2">Bem-vindo, {user?.firstName}!</h1>
        <p className="text-gray-500 mb-6">Sua assinatura está ativa. Vamos configurar seu negócio.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Negócio</label>
            <input 
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
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
                    className="w-full border p-3 rounded-r-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                    placeholder="dr-yan"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, ''))}
                />
            </div>
            <p className="text-xs text-gray-400 mt-1">Apenas letras minúsculas e traços.</p>
          </div>

          <button 
            onClick={criarEmpresa}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex justify-center items-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            {loading ? "Criando..." : "Criar Painel"}
          </button>
        </div>
      </div>
    </div>
  );
}