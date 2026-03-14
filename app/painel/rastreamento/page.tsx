"use client";

import { useState, useEffect } from "react";
import {
    MapPin, Map as MapIcon, Users, RefreshCw,
    MoreHorizontal, Smartphone, Signal, Info, AlertCircle,
    Route as RouteIcon, Plus, Trash2, Search, ChevronRight,
    MapPinned, Store, User as UserIcon, Navigation, Loader2, X
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

    // Route Creation States
    const [isCreatingRoute, setIsCreatingRoute] = useState(false);
    const [routePoints, setRoutePoints] = useState<any[]>([]);
    const [routeName, setRouteName] = useState("Nova Rota de Entrega");
    const [orders, setOrders] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [isSavingRoute, setIsSavingRoute] = useState(false);
    const [historyRoutes, setHistoryRoutes] = useState<any[]>([]);

    useEffect(() => {
        carregarDados();
        const interval = setInterval(carregarDados, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isCreatingRoute) {
            carregarAuxiliares();
        }
    }, [isCreatingRoute]);

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

    const carregarAuxiliares = async () => {
        try {
            const [ordersRes, clientsRes, routesRes] = await Promise.all([
                fetch("/api/painel/vitrine/pedidos"),
                fetch("/api/clientes"),
                fetch("/api/radar/routes" + (selectedLocation ? `?professionalId=${selectedLocation.professionalId}` : ""))
            ]);

            const ordersData = await ordersRes.json();
            const clientsData = await clientsRes.json();
            const routesData = await routesRes.json();

            setOrders(Array.isArray(ordersData) ? ordersData.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELED') : []);
            setClients(Array.isArray(clientsData) ? clientsData : []);
            setHistoryRoutes(Array.isArray(routesData) ? routesData : []);
        } catch (e) {
            console.error(e);
        }
    };

    const addPoint = (point: any) => {
        setRoutePoints(prev => [...prev, {
            ...point,
            id: Math.random().toString(36).substr(2, 9),
            status: "PENDING"
        }]);
        toast.success("Parada adicionada!");
    };

    const removePoint = (id: string) => {
        setRoutePoints(prev => prev.filter(p => p.id !== id));
    };

    const saveRoute = async () => {
        if (routePoints.length === 0) return toast.error("Adicione pelo menos uma parada!");
        setIsSavingRoute(true);
        try {
            const res = await fetch("/api/radar/routes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    professionalId: selectedLocation.professionalId,
                    name: routeName,
                    points: routePoints
                })
            });

            if (res.ok) {
                toast.success("Rota enviada com sucesso!");
                setIsCreatingRoute(false);
                setRoutePoints([]);
                carregarAuxiliares();
            } else {
                toast.error("Erro ao salvar rota");
            }
        } catch (e) {
            toast.error("Erro de conexão");
        } finally {
            setIsSavingRoute(false);
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

                    {selectedLocation && (
                        <button
                            onClick={() => setIsCreatingRoute(true)}
                            className="w-full bg-white dark:bg-gray-900 p-4 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900 text-indigo-600 font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition shadow-sm"
                        >
                            <RouteIcon size={18} /> Criar Rota para {selectedLocation.professional?.name.split(' ')[0]}
                        </button>
                    )}

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

                    {/* HISTÓRICO DE ROTAS RECENTES */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] border dark:border-gray-800 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Rotas Recentes</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase">Acompanhe o status das entregas</p>
                            </div>
                            <Navigation className="text-gray-200 dark:text-gray-800" size={32} />
                        </div>

                        {historyRoutes.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 font-bold uppercase text-[10px] italic">Nenhuma rota criada recentemente</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {historyRoutes.map((route) => (
                                    <div key={route.id} className="p-5 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-indigo-200 dark:hover:border-indigo-900 transition group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center text-indigo-600 shadow-sm">
                                                <MapPinned size={20} />
                                            </div>
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${route.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : route.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {route.status === 'COMPLETED' ? 'Finalizada' : route.status === 'IN_PROGRESS' ? 'Em Curso' : 'Pendente'}
                                            </span>
                                        </div>
                                        <p className="font-black text-sm text-gray-800 dark:text-white mb-1">{route.name}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-4 flex items-center gap-1">
                                            <Users size={12} /> {route.professional?.name.split(' ')[0]} • {route.points?.length || 0} paradas
                                        </p>
                                        
                                        <div className="space-y-2 mb-4">
                                            {route.points?.slice(0, 2).map((pt: any) => (
                                                <div key={pt.id} className="flex items-center gap-2 text-[10px] text-gray-600 dark:text-gray-400 font-medium">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${pt.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                    <span className="truncate">{pt.label}</span>
                                                </div>
                                            ))}
                                            {route.points?.length > 2 && <p className="text-[9px] text-indigo-500 font-bold ml-3">+ {route.points.length - 2} paradas</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL / SLIDE-OVER DE CRIAÇÃO DE ROTA */}
            {isCreatingRoute && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreatingRoute(false)} />
                    <div className="relative w-full max-w-xl h-full bg-slate-50 dark:bg-gray-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
                        {/* HEADER MODAL */}
                        <div className="p-8 bg-indigo-600 text-white shrink-0 relative">
                            <button onClick={() => setIsCreatingRoute(false)} className="absolute top-8 right-8 p-2 hover:bg-white/20 rounded-xl transition">
                                <X size={24} />
                            </button>
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Planejar Rota</h2>
                            <p className="text-indigo-100 font-medium text-sm flex items-center gap-2 uppercase tracking-wide">
                                Designer de Logística para <span className="font-black text-white px-2 py-0.5 bg-indigo-500 rounded-lg">{selectedLocation.professional?.name}</span>
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                            {/* NOME DA ROTA */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Signal size={12} /> Nome de Referência
                                </label>
                                <input 
                                    value={routeName}
                                    onChange={e => setRouteName(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl border-2 border-transparent focus:border-indigo-400 outline-none font-black text-slate-800 dark:text-white shadow-sm transition-all"
                                    placeholder="Ex: Entregas Manhã"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                {/* BUSCAR PEDIDOS VITRINE */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Store size={14} className="text-indigo-500"/> Pedidos Vitrine
                                    </h3>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {orders.length === 0 ? (
                                            <p className="text-[10px] text-slate-400 font-bold uppercase italic p-4 text-center border-2 border-dashed rounded-2xl">Vazio</p>
                                        ) : (
                                            orders.map(order => (
                                                <button 
                                                    key={order.id}
                                                    onClick={() => addPoint({
                                                        label: `Pedido #${order.id.slice(-4).toUpperCase()}`,
                                                        address: order.addressInfo?.address ? `${order.addressInfo.address}, ${order.addressInfo.number} - ${order.addressInfo.neighborhood}` : "Retirada",
                                                        orderId: order.id
                                                    })}
                                                    className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition group shadow-sm"
                                                >
                                                    <p className="font-black text-[11px] text-slate-800 dark:text-white uppercase truncate">#{order.id.slice(-6).toUpperCase()} • {order.customerName}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold truncate mt-1">{order.addressInfo?.address || 'Sem endereço'}</p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* BUSCAR CLIENTES */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <UserIcon size={14} className="text-indigo-500"/> Clientes
                                    </h3>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {clients.length === 0 ? (
                                            <p className="text-[10px] text-slate-400 font-bold uppercase italic p-4 text-center border-2 border-dashed rounded-2xl">Vazio</p>
                                        ) : (
                                            clients.map(client => (
                                                <button 
                                                    key={client.id}
                                                    onClick={() => addPoint({
                                                        label: `${client.name}`,
                                                        address: `${client.address}, ${client.number} - ${client.neighborhood}`,
                                                        clientId: client.id
                                                    })}
                                                    className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition group shadow-sm"
                                                >
                                                    <p className="font-black text-[11px] text-slate-800 dark:text-white uppercase truncate">{client.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold truncate mt-1">{client.address || 'Sem endereço'}</p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* LISTA DE PARADAS DA ROTA */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                                    <span>Paradas na Rota ({routePoints.length})</span>
                                    {routePoints.length > 0 && <button onClick={() => setRoutePoints([])} className="text-rose-500 hover:underline">Limpar</button>}
                                </h3>
                                
                                <div className="space-y-3">
                                    {routePoints.length === 0 ? (
                                        <div className="p-10 border-4 border-dashed border-slate-200 dark:border-gray-800 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                                            <Plus size={32} />
                                            <p className="text-[10px] font-black uppercase mt-2">Nenhuma parada adicionada</p>
                                        </div>
                                    ) : (
                                        routePoints.map((point, idx) => (
                                            <div key={point.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-slate-100 dark:border-gray-800 flex items-center gap-4 group hover:border-indigo-400 transition shadow-sm">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-gray-700 flex items-center justify-center text-xs font-black text-slate-600 dark:text-gray-300">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-xs text-slate-800 dark:text-white uppercase truncate">{point.label}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold truncate">{point.address}</p>
                                                </div>
                                                <button onClick={() => removePoint(point.id)} className="p-2 text-slate-300 hover:text-rose-500 transition">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* BOTÃO FINALIZAR */}
                        <div className="p-8 bg-white dark:bg-gray-900 border-t dark:border-gray-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                            <button 
                                onClick={saveRoute}
                                disabled={isSavingRoute || routePoints.length === 0}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 uppercase tracking-tighter text-sm transition transition-all active:scale-95"
                            >
                                {isSavingRoute ? <Loader2 className="animate-spin" /> : <><Navigation size={20} /> Publicar Rota</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
