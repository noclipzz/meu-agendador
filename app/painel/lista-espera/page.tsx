"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow, format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Trash2, CheckCircle, MessageSquare, Clock, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAgenda } from "@/contexts/AgendaContext";
import { ConfirmationModal } from "@/app/components/ConfirmationModal";

export default function ListaEsperaPage() {
    const { companyId } = useAgenda();
    const [lista, setLista] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalConfirmacao, setModalConfirmacao] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });

    async function carregarLista() {
        setLoading(true);
        try {
            const res = await fetch('/api/painel/lista-espera');
            const data = await res.json();
            if (Array.isArray(data)) {
                setLista(data);
            }
        } catch (error) {
            toast.error("Erro ao carregar lista de espera.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregarLista();
    }, []);

    function solicitarAtendimento(id: string) {
        setModalConfirmacao({ isOpen: true, id });
    }

    async function confirmarAtendimento() {
        if (!modalConfirmacao.id) return;

        const id = modalConfirmacao.id;
        const optimisticLista = lista.filter(item => item.id !== id);
        setLista(optimisticLista);
        setModalConfirmacao({ isOpen: false, id: null });

        try {
            await fetch('/api/painel/lista-espera', {
                method: 'PATCH',
                body: JSON.stringify({ id, status: "ATENDIDO" })
            });
            toast.success("Marcado como atendido!");
        } catch (error) {
            carregarLista(); // Reverte em caso de erro
            toast.error("Erro ao atualizar status.");
        }
    }

    function gerarLinkWhatsapp(cliente: any) {
        if (!cliente.customerPhone) return "";
        const phone = cliente.customerPhone.replace(/\D/g, "");

        let dataTexto = "";
        if (cliente.desiredDate) {
            const dataDesejada = new Date(cliente.desiredDate);
            if (isToday(dataDesejada)) {
                dataTexto = "para hoje";
            } else {
                dataTexto = `para o dia ${format(dataDesejada, "dd 'de' MMMM", { locale: ptBR })}`;
            }
        } else {
            dataTexto = "para a data que você queria";
        }

        const texto = `Olá ${cliente.customerName}! 🌟\n\nTenho uma excelente notícia: surgiu uma vaga para o serviço que você queria (${cliente.service?.name || "atendimento"}) ${dataTexto}.\n\nVamos agendar? Responda agora para garantir o horário! ⏳`;
        return `https://wa.me/55${phone}?text=${encodeURIComponent(texto)}`;
    }

    return (
        <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <Clock className="text-blue-600" /> Lista de Espera Inteligente
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Gerencie os clientes que aguardam uma vaga e recupere faturamento.</p>
                </div>
                <button
                    onClick={carregarLista}
                    className="p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
                >
                    <Clock size={20} className={loading ? "animate-spin text-blue-600" : "text-gray-600 dark:text-gray-300"} />
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                    <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Buscando interessados...</p>
                </div>
            ) : lista.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <User size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sua lista está vazia!</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Quando seus horários estiverem cheios, seus clientes poderão entrar aqui. Divulgue seu link de agendamento!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lista.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                            {/* Barra lateral colorida baseada no tempo de espera */}
                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${new Date(item.createdAt).getTime() < Date.now() - 86400000 ? 'bg-red-500' : 'bg-blue-500'}`} />

                            <div className="pl-4">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white">{item.customerName}</h3>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.customerPhone}</p>
                                    </div>
                                    <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-3 py-1 rounded-full uppercase tracking-widest">
                                        {formatDistanceToNow(new Date(item.createdAt), { locale: ptBR, addSuffix: true })}
                                    </span>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex flex-wrap gap-2">
                                        {item.service && (
                                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                                <Calendar size={14} className="shrink-0" />
                                                <span className="truncate max-w-[150px]">{item.service.name}</span>
                                            </div>
                                        )}

                                        {item.desiredDate && (
                                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 rounded-lg border border-red-100 dark:border-red-800/50">
                                                <Clock size={14} className="shrink-0" />
                                                <span className="whitespace-nowrap">{format(new Date(item.desiredDate), "dd 'de' MMM", { locale: ptBR })}</span>
                                            </div>
                                        )}

                                        {item.professional && (
                                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-lg border border-amber-100 dark:border-amber-800/50">
                                                <User size={14} className="shrink-0" />
                                                <span className="truncate max-w-[150px]">{item.professional.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    {item.preferences && (
                                        <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-xl relative">
                                            <div className="absolute -top-2 left-2 px-1 bg-yellow-50 dark:bg-gray-800 text-[9px] font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest leading-none">
                                                Obs
                                            </div>
                                            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 italic line-clamp-2 leading-relaxed">"{item.preferences}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-auto">
                                    <a
                                        href={gerarLinkWhatsapp(item)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition active:scale-95"
                                    >
                                        <MessageSquare size={18} /> Chamar no Zap
                                    </a>
                                    <button
                                        onClick={() => solicitarAtendimento(item.id)}
                                        className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition"
                                        title="Marcar como atendido / Remover"
                                    >
                                        <CheckCircle size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <ConfirmationModal
                isOpen={modalConfirmacao.isOpen}
                onClose={() => setModalConfirmacao({ isOpen: false, id: null })}
                onConfirm={confirmarAtendimento}
                title="Marcar como Atendido?"
                description="Tem certeza que este cliente já foi atendido ou desistiu? Ele será removido da lista."
                confirmText="Sim, Concluir"
                cancelText="Cancelar"
                variant="success"
            />
        </div>
    );
}
