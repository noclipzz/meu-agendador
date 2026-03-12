"use client";

import React, { useState, useEffect } from "react";
import { 
    ShoppingBag, Package, Truck, CheckCircle2, Clock, XCircle, 
    Search, User, Phone, MapPin, Mail, Calendar, ExternalLink,
    ChevronDown, ChevronUp, Loader2, RefreshCw, MoreVertical,
    CheckCircle, AlertCircle, CreditCard
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const statusConfig: any = {
    PENDING: { label: "Pendente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock size={16} /> },
    PAID: { label: "Pago", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 size={16} /> },
    PREPARING: { label: "Preparando", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Package size={16} /> },
    SHIPPED: { label: "Enviado", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: <Truck size={16} /> },
    DELIVERED: { label: "Entregue", color: "bg-gray-100 text-gray-700 border-gray-200", icon: <CheckCircle size={16} /> },
    CANCELED: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle size={16} /> },
};

export default function PedidosVitrine() {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [filter, setFilter] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    const carregarPedidos = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            const res = await fetch("/api/painel/vitrine/pedidos");
            const data = await res.json();
            if (Array.isArray(data)) {
                setPedidos(data);
            }
        } catch (error) {
            console.error("Erro ao carregar pedidos:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        carregarPedidos();
        // Polling para "tempo real"
        const interval = setInterval(() => carregarPedidos(), 15000);
        return () => clearInterval(interval);
    }, []);

    const atualizarStatus = async (pedidoId: string, novoStatus: string) => {
        try {
            const res = await fetch("/api/painel/vitrine/pedidos", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: pedidoId, status: novoStatus })
            });

            if (res.ok) {
                toast.success(`Pedido atualizado para ${statusConfig[novoStatus].label}`);
                carregarPedidos();
            } else {
                toast.error("Erro ao atualizar status");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        }
    };

    const pedidosFiltrados = pedidos.filter(p => {
        const matchesFilter = filter === "ALL" || p.status === filter;
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
            p.customerName.toLowerCase().includes(search) || 
            p.id.toLowerCase().includes(search) ||
            p.customerPhone.includes(search);
        return matchesFilter && matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-gray-500 font-medium anim-pulse">Carregando pedidos da vitrine...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black dark:text-white flex items-center gap-3">
                        <ShoppingBag size={32} className="text-blue-600" />
                        Pedidos da Vitrine
                    </h1>
                    <p className="text-gray-500 font-medium">Gerencie as vendas realizadas pelo seu site</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => carregarPedidos(true)}
                        className={`p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm transition-all hover:bg-gray-50 ${refreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={20} className="text-blue-600" />
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por cliente ou ID..."
                            className="pl-10 pr-4 py-2.5 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 w-full md:w-64 font-medium transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {["ALL", "PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELED"].map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all border ${
                            filter === s 
                                ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        {s === "ALL" ? "Todos" : statusConfig[s].label}
                        <span className="ml-2 opacity-60">
                            ({s === "ALL" ? pedidos.length : pedidos.filter(p => p.status === s).length})
                        </span>
                    </button>
                ))}
            </div>

            {pedidosFiltrados.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black dark:text-white">Nenhum pedido encontrado</h3>
                    <p className="text-gray-500 mt-2">Aguarde por novas vendas ou ajuste seus filtros.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pedidosFiltrados.map((pedido) => (
                        <div 
                            key={pedido.id}
                            className={`bg-white dark:bg-gray-800 rounded-3xl border transition-all overflow-hidden ${
                                expandedOrder === pedido.id ? "shadow-xl border-blue-200 dark:border-blue-900 ring-1 ring-blue-100 dark:ring-blue-900/30" : "hover:shadow-md border-gray-100 dark:border-gray-800"
                            }`}
                        >
                            {/* Card Header (Visible) */}
                            <div 
                                className="p-5 md:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                                onClick={() => setExpandedOrder(expandedOrder === pedido.id ? null : pedido.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${statusConfig[pedido.status].color} opacity-80`}>
                                        {statusConfig[pedido.status].icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black dark:text-white text-lg">{pedido.customerName}</span>
                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded uppercase font-bold tracking-tighter">#{pedido.id.slice(-6)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {format(new Date(pedido.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                                            <span className="flex items-center gap-1"><Package size={12} /> {pedido.items.length} {pedido.items.length === 1 ? 'item' : 'itens'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-1">
                                    <span className="text-2xl font-black text-blue-600">
                                        R$ {Number(pedido.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border flex items-center gap-1.5 ${statusConfig[pedido.status].color}`}>
                                        {statusConfig[pedido.status].icon} {statusConfig[pedido.status].label}
                                    </div>
                                </div>
                                
                                <button className="hidden md:block p-2 text-gray-400">
                                    {expandedOrder === pedido.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                </button>
                            </div>

                            {/* Card Body (Expanded) */}
                            {expandedOrder === pedido.id && (
                                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-6 space-y-8 animate-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {/* Col 1: Cliente & Entrega */}
                                        <div className="space-y-4">
                                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <User size={14} /> Informações do Cliente
                                            </h4>
                                            <div className="space-y-2">
                                                <p className="flex items-center gap-3 text-sm font-bold dark:text-gray-200">
                                                    <Phone size={16} className="text-blue-500" /> {pedido.customerPhone}
                                                </p>
                                                {pedido.customerEmail && (
                                                    <p className="flex items-center gap-3 text-sm font-bold dark:text-gray-200">
                                                        <Mail size={16} className="text-blue-500" /> {pedido.customerEmail}
                                                    </p>
                                                )}
                                            </div>

                                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pt-2">
                                                <Truck size={14} /> Método de Entrega
                                            </h4>
                                            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-xl font-black text-sm uppercase">
                                                {pedido.deliveryMethod === "DELIVERY" ? "Entrega no Endereço" : "Retirada no Local"}
                                            </div>

                                            {pedido.deliveryMethod === "DELIVERY" && pedido.addressInfo && (
                                                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 text-sm">
                                                    <div className="flex items-start gap-3">
                                                        <MapPin size={18} className="text-red-500 shrink-0 mt-0.5" />
                                                        <div className="font-medium dark:text-gray-300">
                                                            <p className="font-black text-gray-900 dark:text-white">
                                                                {(pedido.addressInfo as any).street}, {(pedido.addressInfo as any).number}
                                                            </p>
                                                            <p>{(pedido.addressInfo as any).neighborhood}</p>
                                                            <p>{(pedido.addressInfo as any).city} - {(pedido.addressInfo as any).state}</p>
                                                            <p className="opacity-60 text-xs">CEP: {(pedido.addressInfo as any).zipCode}</p>
                                                            {(pedido.addressInfo as any).complement && (
                                                                <p className="mt-2 text-blue-600 dark:text-blue-400 italic">Comp: {(pedido.addressInfo as any).complement}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {pedido.paymentMethod && (
                                                <>
                                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pt-2">
                                                        <CreditCard size={14} /> Forma de Pagamento
                                                    </h4>
                                                    <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl font-black text-sm uppercase">
                                                        {pedido.paymentMethod.replace('_', ' ')}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Col 2: Itens do Pedido */}
                                        <div className="md:col-span-2 space-y-4">
                                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Package size={14} /> Itens do Pedido
                                            </h4>
                                            <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left font-black text-gray-400 uppercase text-[10px]">Produto</th>
                                                            <th className="px-4 py-3 text-center font-black text-gray-400 uppercase text-[10px]">Qtd</th>
                                                            <th className="px-4 py-3 text-right font-black text-gray-400 uppercase text-[10px]">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-700">
                                                        {pedido.items.map((item: any) => (
                                                            <tr key={item.id} className="dark:text-gray-200">
                                                                <td className="px-4 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        {item.vitrineProduct.imageUrl && (
                                                                            <img src={item.vitrineProduct.imageUrl} alt={item.vitrineProduct.name} className="w-10 h-10 rounded-lg object-cover" />
                                                                        )}
                                                                        <div>
                                                                            <p className="font-bold">{item.vitrineProduct.name}</p>
                                                                            {item.variation && (
                                                                                <p className="text-[10px] text-blue-600 font-bold uppercase">{item.variation}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 text-center font-black">
                                                                    {item.quantity}x
                                                                </td>
                                                                <td className="px-4 py-4 text-right font-black">
                                                                    R$ {(item.quantity * Number(item.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-50 dark:bg-gray-900/20 font-black">
                                                        <tr>
                                                            <td colSpan={2} className="px-4 py-3 text-right text-gray-400 uppercase text-[10px]">Total Geral</td>
                                                            <td className="px-4 py-3 text-right text-blue-600 text-lg">
                                                                R$ {Number(pedido.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>

                                            {/* Ações Rápidas */}
                                            <div className="pt-4 flex flex-wrap gap-3">
                                                <h4 className="w-full text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Ações do Pedido</h4>
                                                
                                                {pedido.status === "PENDING" && (
                                                    <button 
                                                        onClick={() => atualizarStatus(pedido.id, "PAID")}
                                                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-emerald-700 shadow-md transition-all active:scale-95"
                                                    >
                                                        <CheckCircle2 size={16} /> CONFIRMAR PAGAMENTO
                                                    </button>
                                                )}

                                                {(pedido.status === "PAID" || pedido.status === "PENDING") && (
                                                    <button 
                                                        onClick={() => atualizarStatus(pedido.id, "PREPARING")}
                                                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-blue-700 shadow-md transition-all active:scale-95"
                                                    >
                                                        <Package size={16} /> INICIAR PREPARO
                                                    </button>
                                                )}

                                                {pedido.status === "PREPARING" && (
                                                    <button 
                                                        onClick={() => atualizarStatus(pedido.id, "SHIPPED")}
                                                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                                                    >
                                                        <Truck size={16} /> MARCAR COMO ENVIADO
                                                    </button>
                                                )}

                                                {pedido.status === "SHIPPED" && (
                                                    <button 
                                                        onClick={() => atualizarStatus(pedido.id, "DELIVERED")}
                                                        className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-gray-800 shadow-md transition-all active:scale-95"
                                                    >
                                                        <CheckCircle size={16} /> CONFIRMAR ENTREGA
                                                    </button>
                                                )}

                                                {pedido.status !== "CANCELED" && (
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm("Deseja realmente cancelar este pedido?")) {
                                                                atualizarStatus(pedido.id, "CANCELED");
                                                            }
                                                        }}
                                                        className="flex items-center gap-2 bg-white dark:bg-gray-800 text-red-600 border border-red-200 dark:border-red-900 px-4 py-2 rounded-xl font-black text-xs hover:bg-red-50 dark:hover:bg-red-900/10 transition-all active:scale-95"
                                                    >
                                                        <XCircle size={16} /> CANCELAR PEDIDO
                                                    </button>
                                                )}

                                                <a 
                                                    href={`https://wa.me/55${pedido.customerPhone.replace(/\D/g, '')}?text=Olá ${pedido.customerName}, estou entrando em contato sobre o seu pedido #${pedido.id.slice(-6)}`}
                                                    target="_blank"
                                                    className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black text-xs hover:bg-emerald-100 transition-all"
                                                >
                                                    <Phone size={16} /> FALAR NO WHATSAPP
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
