"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function NovoNegocio() {
    const [nome, setNome] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function criarEmpresa() {
        if (!nome) return toast.error("Digite o nome da sua empresa.");
        setLoading(true);

        try {
            const res = await fetch('/api/painel/config', {
                method: 'POST',
                body: JSON.stringify({ name: nome })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Empresa configurada com sucesso!");
                router.push('/painel');
            } else {
                // EXIBE O ERRO DE NOME JÁ EM USO
                toast.error(data.error || "Erro ao criar empresa.");
            }
        } catch (e) {
            toast.error("Erro de conexão.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl border dark:border-gray-800 text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
                    <Building2 size={40} />
                </div>
                <h1 className="text-3xl font-black mb-2 dark:text-white tracking-tight">Seu Negócio</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Este nome será usado para criar o seu link de agendamento exclusivo.</p>
                
                <div className="space-y-4">
                    <div className="text-left space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nome da Empresa</label>
                        <input 
                            className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 dark:text-white font-bold transition-all"
                            placeholder="Ex: Studio VIP"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={criarEmpresa}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Criar meu Painel <ArrowRight size={20}/></>}
                    </button>
                </div>
            </div>
        </div>
    );
}