"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NovoNegocio() {
    const [nome, setNome] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function criarEmpresa() {
        if (!nome) return toast.error("Digite o nome da sua empresa.");
        setLoading(true);

        try {
            console.log("Tentando criar empresa:", nome);

            const res = await fetch('/api/painel/config', {
                method: 'POST',
                // CORREÇÃO: Avisa o servidor que estamos enviando um JSON
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ name: nome })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Empresa configurada com sucesso!");
                // Pequeno delay para garantir que o banco salvou antes de redirecionar
                setTimeout(() => {
                    router.push('/painel');
                    // Força um recarregamento para o layout perceber a empresa nova
                    window.location.href = '/painel';
                }, 1000);
            } else {
                toast.error(data.error || "Este nome já está em uso.");
                setLoading(false);
            }
        } catch (e) {
            console.error("Erro no clique:", e);
            toast.error("Erro de conexão com o servidor.");
            setLoading(false);
        }
    }

    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 font-sans">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-2xl border dark:border-gray-800 text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-blue-500/20">
                    <Building2 size={40} />
                </div>
                <h1 className="text-3xl font-black mb-2 dark:text-white tracking-tight">Nome da Empresa</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm font-medium">Como seus clientes verão seu negócio no link de agendamento.</p>
                
                <div className="space-y-4">
                    <input 
                        className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 dark:text-white font-bold transition-all text-center"
                        placeholder="Ex: Studio VIP"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && criarEmpresa()}
                    />
                    <button 
                        onClick={criarEmpresa}
                        disabled={loading}
                        className={`w-full p-5 rounded-2xl font-black text-lg shadow-xl transition flex items-center justify-center gap-2 ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'}`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Criar meu Painel <ArrowRight size={20}/></>}
                    </button>
                </div>
            </div>
        </div>
    );
}