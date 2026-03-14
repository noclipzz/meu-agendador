"use client";

import { useState, useEffect } from "react";
import { 
    MapPin, Navigation, CheckCircle2, Clock, 
    ChevronRight, ExternalLink, Map as MapIcon,
    AlertCircle, RefreshCw, Loader2, Play
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export default function ProfessionalRoutePage() {
    const [route, setRoute] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updatingPoint, setUpdatingPoint] = useState<string | null>(null);

    useEffect(() => {
        carregarRotaAtiva();
    }, []);

    const carregarRotaAtiva = async () => {
        try {
            const res = await fetch("/api/radar/routes/active");
            if (res.ok) {
                const data = await res.json();
                setRoute(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const atualizarStatusPonto = async (pointId: string, status: string) => {
        setUpdatingPoint(pointId);
        try {
            const res = await fetch(`/api/radar/routes/points/${pointId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                toast.success(status === 'COMPLETED' ? "Parada finalizada!" : "Status atualizado");
                carregarRotaAtiva();
            }
        } catch (e) {
            toast.error("Erro ao atualizar parada");
        } finally {
            setUpdatingPoint(null);
        }
    };

    const iniciarNavegação = (address: string) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
        window.open(url, "_blank");
    };

    if (loading) return (
        <div className="p-10 text-center space-y-4">
            <Loader2 className="animate-spin mx-auto text-indigo-500" size={32} />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs italic">Sincronizando logistica...</p>
        </div>
    );

    if (!route) return (
        <div className="max-w-md mx-auto p-8 text-center space-y-6 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
                <Navigation size={40} />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Sem Rotas Ativas</h1>
                <p className="text-gray-500 font-medium text-sm italic">Você não possui rotas pendentes para hoje. Aguarde o envio pelo painel.</p>
            </div>
            <Link href="/painel/dashboard" className="block w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition uppercase text-xs">
                Voltar ao Início
            </Link>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-6 duration-500 pb-24">
            {/* CABEÇALHO DA ROTA */}
            <header className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                <div className="relative z-10">
                    <span className="bg-indigo-500/50 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                        {route.status === 'PENDING' ? 'Rota Iniciada' : 'Em Trânsito'}
                    </span>
                    <h1 className="text-3xl font-black uppercase tracking-tighter mb-1 truncate">{route.name}</h1>
                    <p className="text-indigo-100 font-medium text-sm flex items-center gap-2">
                        <MapPin size={14} /> {route.points.filter((p: any) => p.status === 'COMPLETED').length} de {route.points.length} paradas finalizadas
                    </p>
                </div>
                <Navigation className="absolute -bottom-4 -right-4 text-white/10" size={140} />
            </header>

            {/* LISTA DE PARADAS */}
            <div className="space-y-4">
                <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] px-4 flex justify-between">
                    <span>Lista de Paradas</span>
                    <span>Progresso Logístico</span>
                </h2>

                <div className="space-y-3">
                    {route.points.map((point: any, idx: number) => {
                        const isNext = route.points.find((p: any) => p.status === 'PENDING')?.id === point.id;
                        
                        return (
                            <div 
                                key={point.id} 
                                className={`p-6 rounded-[2rem] border-2 transition-all duration-500 relative overflow-hidden group ${
                                    point.status === 'COMPLETED' 
                                    ? 'bg-gray-50 dark:bg-gray-800/50 border-transparent opacity-60' 
                                    : isNext
                                    ? 'bg-white dark:bg-gray-900 border-indigo-400 shadow-xl shadow-indigo-500/10'
                                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                                }`}
                            >
                                <div className="flex items-start gap-5 relative z-10">
                                    <div className={`w-12 h-12 rounded-2xl shrink-0 flex flex-col items-center justify-center transition-colors ${
                                        point.status === 'COMPLETED' ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 font-black'
                                    }`}>
                                        <span className="text-xs leading-none">0{idx + 1}</span>
                                        {point.status === 'COMPLETED' && <CheckCircle2 size={16} className="mt-1" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`font-black uppercase tracking-tight text-sm ${point.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                                {point.label}
                                            </h3>
                                            {isNext && <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-black animate-pulse">PRÓXIMO</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mb-4">{point.address}</p>
                                        
                                        {point.status === 'PENDING' && (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => iniciarNavegação(point.address)}
                                                    className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 font-black py-3 rounded-xl text-[10px] uppercase flex items-center justify-center gap-2 transition active:scale-95"
                                                >
                                                    <MapIcon size={14} className="text-indigo-500" /> Abrir no GPS
                                                </button>
                                                <button 
                                                    disabled={updatingPoint === point.id}
                                                    onClick={() => atualizarStatusPonto(point.id, 'COMPLETED')}
                                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
                                                >
                                                    {updatingPoint === point.id ? <Loader2 size={14} className="animate-spin" /> : <>Finalizar <ChevronRight size={14} /></>}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {isNext && <div className="absolute top-0 right-0 p-4 opacity-[0.03] select-none pointer-events-none"><Navigation size={100} /></div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* BOTÃO FINALIZAR ROTA COMPLETA SE TODOS ESTIVEREM OK */}
            {route.points.every((p: any) => p.status === 'COMPLETED') && (
                <div className="animate-bounce">
                    <button className="w-full bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-2xl flex items-center justify-center gap-3 uppercase text-sm tracking-tighter">
                        <CheckCircle2 size={24} /> Concluir Missão Logística
                    </button>
                </div>
            )}
        </div>
    );
}
