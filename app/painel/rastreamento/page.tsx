"use client";

import { useState, useEffect } from "react";
import {
    MapPin, Map as MapIcon, Users, RefreshCw,
    MoreHorizontal, Smartphone, Signal, Info, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AddonPaywall } from "@/components/AddonPaywall";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center animate-pulse">Carregando mapa...</div>
});

export default function TrackingPage() {
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasModule, setHasModule] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [selectedLocation, setSelectedLocation] = useState<any>(null);

    useEffect(() => {
        carregarDados();
        const interval = setInterval(carregarDados, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    const carregarDados = async () => {
        try {
            const res = await fetch('/api/location/active');
            const data = await res.json();

            if (res.status === 403) {
                setHasModule(false);
                setLoading(false);
                return;
            }

            if (data.success) {
                setLocations(data.locations);
                setHasModule(true);
                setLastRefresh(new Date());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="p-10 text-center space-y-4">
            <RefreshCw className="animate-spin mx-auto text-blue-500" size={32} />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sincronizando satélites...</p>
        </div>
    );

    if (!hasModule) {
        return (
            <AddonPaywall
                title="Rastreamento em Tempo Real"
                description="Monitore sua equipe de campo e entregas em tempo real com GPS. Aumente a transparência e a eficiência logística."
                benefits={[
                    "Mapa ao vivo no painel administrativo",
                    "Status Online/Offline da equipe",
                    "Relatório de última localização",
                    "Integração com rotas de entrega",
                    "Aumente a segurança dos colaboradores"
                ]}
                icon={<MapPin size={32} />}
                color="indigo"
            />
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-700 pb-20">
            {/* CABEÇALHO ESTATÍSTICO */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/30">
                            <MapPin className="text-white" size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Radar de Equipe</h1>
                    </div>
                    <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
                        Profissionais ativos no mapa atualizado às {format(lastRefresh, 'HH:mm:ss')}
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" title="Sinal Ativo" />
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-1.5 rounded-2xl border dark:border-gray-800 shadow-sm">
                    <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Online</p>
                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 leading-none">{locations.length}</p>
                    </div>
                    <button
                        onClick={carregarDados}
                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500 active:rotate-180 duration-500"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* LISTA DE ATIVOS LADO ESQUERDO */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border dark:border-gray-800 overflow-hidden shadow-sm">
                        <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between">
                            <h2 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
                                <Users size={18} className="text-indigo-500" /> Profissionais Ativos
                            </h2>
                        </div>
                        <div className="p-2 space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {locations.length === 0 ? (
                                <div className="p-8 text-center space-y-2">
                                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-gray-300">
                                        <AlertCircle size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 uppercase italic">Ninguém online agora</p>
                                </div>
                            ) : (
                                locations.map((loc) => (
                                    <div
                                        key={loc.id}
                                        onClick={() => setSelectedLocation(loc)}
                                        className={`flex items-center gap-3 p-3 rounded-2xl transition cursor-pointer group border-2 ${selectedLocation?.id === loc.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent'}`}
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-900 overflow-hidden shadow-sm">
                                                {loc.professional?.photoUrl ? (
                                                    <img src={loc.professional.photoUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400 uppercase">
                                                        {loc.professional?.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-xs text-gray-800 dark:text-gray-200 truncate leading-none mb-1">
                                                {loc.professional?.name}
                                            </p>
                                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Ativo agora</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                        <div className="flex gap-4">
                            <Info className="text-amber-600 shrink-0" size={20} />
                            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed uppercase italic">
                                O rastreamento exige que o profissional ative o modo 'Online' em seu dashboard PWA.
                            </p>
                        </div>
                    </div>
                </div>

                {/* VISUALIZAÇÃO DO MAPA REAL */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-gray-900 h-[600px] rounded-[3rem] border-8 border-white dark:border-gray-800 shadow-2xl relative overflow-hidden group z-0">
                        <MapView locations={locations} selectedLocation={selectedLocation} />

                        {/* UI Overlay no Mapa */}
                        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-1.5 rounded-2xl border dark:border-gray-800 shadow-xl flex flex-col gap-1">
                                <button className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 font-black rounded-xl border dark:border-gray-700 shadow-sm">+</button>
                                <button className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 font-black rounded-xl border dark:border-gray-700 shadow-sm">-</button>
                            </div>
                            <button className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-500/30 transition active:scale-95">
                                <Smartphone size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
