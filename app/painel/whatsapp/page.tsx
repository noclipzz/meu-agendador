"use client";

import { useState, useEffect } from "react";
import { MessageCircle, QrCode, LogOut, Loader2, Save, CheckCircle2, ShieldAlert, ChevronDown, ChevronUp, MessageSquare, CheckCircle, AlertTriangle, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAgenda } from "../../../contexts/AgendaContext";
import Image from "next/image";

export default function WhatsappPage() {
    const [loading, setLoading] = useState(true);
    const [configured, setConfigured] = useState(false);
    const [status, setStatus] = useState("DISCONNECTED");
    const [qrCode, setQrCode] = useState("");
    const [whatsappMessage, setWhatsappMessage] = useState("");
    const [whatsappConfirmMessage, setWhatsappConfirmMessage] = useState("");
    const [whatsappCancelPromptMessage, setWhatsappCancelPromptMessage] = useState("");
    const [whatsappCancelSuccessMessage, setWhatsappCancelSuccessMessage] = useState("");
    const [whatsappCancelRevertMessage, setWhatsappCancelRevertMessage] = useState("");

    const [activeDrawer, setActiveDrawer] = useState<string | null>("confirmacao");
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    // Polling automático para buscar o QR Code enquanto estiver conectando
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (status === "CONNECTING") {
            interval = setInterval(() => {
                fetchStatus();
            }, 2500); // 2.5s entre tentativas
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status, qrCode]);

    async function fetchStatus() {
        try {
            const res = await fetch('/api/painel/whatsapp');
            const data = await res.json();
            if (data.configured) {
                setConfigured(true);
                if (data.qrCode) setQrCode(data.qrCode);

                setStatus(data.status);
                setWhatsappMessage(data.whatsappMessage || "");
                setWhatsappConfirmMessage(data.whatsappConfirmMessage || "");
                setWhatsappCancelPromptMessage(data.whatsappCancelPromptMessage || "");
                setWhatsappCancelSuccessMessage(data.whatsappCancelSuccessMessage || "");
                setWhatsappCancelRevertMessage(data.whatsappCancelRevertMessage || "");
            } else {
                setConfigured(false);
            }
        } catch (error) {
            console.error("Erro ao carregar status:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleConnect() {
        setActionLoading(true);
        setQrCode("");
        try {
            const res = await fetch('/api/painel/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'CONNECT' })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.qrCode) setQrCode(data.qrCode);

                setStatus("CONNECTING");
                toast.info(data.message || "Iniciando conexão...");
            } else {
                toast.error(data.error || "Erro ao conectar com servidor.");
            }
        } catch (err) {
            toast.error("Erro ao processar conexão.");
        } finally {
            setActionLoading(false);
        }
    }

    async function handleDisconnect() {
        setActionLoading(true);
        try {
            const res = await fetch('/api/painel/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'DISCONNECT' })
            });
            if (res.ok) {
                setStatus("DISCONNECTED");
                setQrCode("");
                toast.success("WhatsApp desconectado.");
            }
        } catch (err) {
            toast.error("Erro ao desconectar.");
        } finally {
            setActionLoading(false);
        }
    }

    async function handleSaveMessage() {
        setSaving(true);
        try {
            const res = await fetch('/api/painel/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'SAVE_CONFIG',
                    whatsappMessage,
                    whatsappConfirmMessage,
                    whatsappCancelPromptMessage,
                    whatsappCancelSuccessMessage,
                    whatsappCancelRevertMessage
                })
            });
            if (res.ok) {
                toast.success("Mensagem padrão salva com sucesso!");
            }
        } catch (err) {
            toast.error("Erro ao salvar mensagem.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-green-500 mb-4" size={40} />
                <p className="text-gray-500 font-bold">Carregando módulo do WhatsApp...</p>
            </div>
        );
    }

    if (!configured) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <ShieldAlert size={60} className="text-gray-400 mb-4" />
                <h1 className="text-2xl font-black text-gray-800 dark:text-white text-center">Módulo Bloqueado</h1>
                <p className="text-gray-500 mt-2 text-center max-w-md">Sua conta ainda não possui acesso ou configuração para os envios automáticos de WhatsApp. Contate o suporte para ativar o módulo.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div>
                <h1 className="text-4xl font-black text-gray-800 dark:text-white">Automação de WhatsApp</h1>
                <p className="text-gray-500 mt-2 text-sm font-medium">Conecte o WhatsApp do seu estabelecimento para enviar mensagens automáticas de confirmação de agendamento.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Conexão */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border dark:border-gray-700 flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`p-4 rounded-2xl flex items-center justify-center ${status === 'CONNECTED' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                            <MessageCircle size={30} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black dark:text-white">Status da Conexão</h2>
                            <p className={`text-sm font-bold ${status === 'CONNECTED' ? 'text-green-500' : status === 'CONNECTING' ? 'text-amber-500' : 'text-gray-400'}`}>{status === 'CONNECTED' ? 'Conectado e Operante' : status === 'CONNECTING' ? 'Aguardando Leitura...' : 'Desconectado'}</p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border dark:border-gray-700">
                        {status === 'CONNECTED' ? (
                            <div className="flex flex-col items-center justify-center text-center">
                                <CheckCircle2 size={60} className="text-green-500 mb-4" />
                                <p className="font-bold text-gray-600 dark:text-gray-300">Seu WhatsApp está emparelhado!</p>
                                <p className="text-sm text-gray-400 mt-2">Mensagens estão sendo enviadas normalmente.</p>
                                <button
                                    onClick={handleDisconnect}
                                    disabled={actionLoading}
                                    className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold hover:bg-red-200 transition-colors"
                                >
                                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />} Desconectar
                                </button>
                            </div>
                        ) : status === 'CONNECTING' && qrCode ? (
                            <div className="flex flex-col items-center">
                                <p className="font-bold text-gray-600 dark:text-gray-300 mb-4 text-center">Escaneie o QR Code no seu WhatsApp (Aparelhos Conectados)</p>
                                <div className="bg-white p-2 rounded-2xl overflow-hidden shadow-sm inline-block">
                                    <Image src={qrCode} alt="QR Code" width={200} height={200} className="w-52 h-52 object-contain" />
                                </div>
                                <button
                                    onClick={fetchStatus}
                                    className="mt-6 font-bold text-sm text-blue-600 hover:text-blue-500 underline"
                                >
                                    Já li o código, verificar status
                                </button>
                            </div>
                        ) : status === 'CONNECTING' && !qrCode ? (
                            <div className="flex flex-col items-center text-center">
                                <Loader2 size={40} className="text-amber-500 mb-4 animate-spin" />
                                <p className="font-bold text-gray-600 dark:text-gray-300">Gerando seu QR Code...</p>
                                <p className="text-sm text-gray-400 mt-2">Isso pode levar alguns segundos. Por favor, aguarde.</p>
                                <div className="flex flex-col gap-2 mt-6">
                                    <button
                                        onClick={fetchStatus}
                                        className="font-bold text-sm text-blue-600 hover:text-blue-500 underline"
                                    >
                                        Verificar status manualmente
                                    </button>
                                    <button
                                        onClick={handleConnect}
                                        className="font-bold text-xs text-red-500/70 hover:text-red-500 underline"
                                    >
                                        Reiniciar tentativa
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <QrCode size={60} className="text-gray-300 dark:text-gray-600 mb-4" />
                                <p className="font-bold text-gray-600 dark:text-gray-300 text-center">Vincule seu dispositivo</p>
                                <button
                                    onClick={handleConnect}
                                    disabled={actionLoading}
                                    className="mt-6 flex items-center gap-2 px-8 py-4 rounded-xl bg-green-500 text-white font-black shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all active:scale-95"
                                >
                                    {actionLoading ? <Loader2 size={24} className="animate-spin" /> : <QrCode size={24} />} Gerar QR Code
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Configurações de Texto - GAVETAS PROFISSIONAIS */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border dark:border-gray-700 flex flex-col h-full">
                    <h2 className="text-lg font-black dark:text-white mb-2 uppercase tracking-tighter">🤖 Automação do Robô</h2>
                    <p className="text-sm font-medium text-gray-500 mb-6">Personalize todas as etapas da conversa do bot com seu cliente.</p>

                    <div className="flex-1 space-y-3">
                        {/* GAVETA 1: LEMBRETE INICIAL */}
                        <div className="border dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900/50">
                            <button
                                onClick={() => setActiveDrawer(activeDrawer === "confirmacao" ? null : "confirmacao")}
                                className="w-full flex items-center justify-between p-4 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400"><MessageSquare size={16} /></div>
                                    <h4 className="font-black text-gray-800 dark:text-white uppercase text-[10px] tracking-widest">1. Boas-vindas / Lembrete</h4>
                                </div>
                                {activeDrawer === "confirmacao" ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </button>
                            {activeDrawer === "confirmacao" && (
                                <div className="p-4 pt-0 animate-in slide-in-from-top-1 duration-200">
                                    <textarea
                                        rows={4}
                                        className="w-full p-4 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white text-xs outline-none focus:ring-2 ring-blue-500 resize-none font-medium"
                                        value={whatsappMessage}
                                        onChange={(e) => setWhatsappMessage(e.target.value)}
                                        placeholder="Olá {nome}, recebemos seu agendamento..."
                                    />
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {["{nome}", "{servico}", "{dia}", "{hora}"].map(tag => (
                                            <span key={tag} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[8px] font-black text-gray-500 dark:text-gray-400">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* GAVETA 2: CONFIRMAÇÃO DE SUCESSO */}
                        <div className="border dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900/50">
                            <button
                                onClick={() => setActiveDrawer(activeDrawer === "sucesso" ? null : "sucesso")}
                                className="w-full flex items-center justify-between p-4 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400"><CheckCircle size={16} /></div>
                                    <h4 className="font-black text-gray-800 dark:text-white uppercase text-[10px] tracking-widest">2. Sucesso (Responder 1)</h4>
                                </div>
                                {activeDrawer === "sucesso" ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </button>
                            {activeDrawer === "sucesso" && (
                                <div className="p-4 pt-0 animate-in slide-in-from-top-1 duration-200">
                                    <textarea
                                        rows={3}
                                        className="w-full p-4 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white text-xs outline-none focus:ring-2 ring-blue-500 resize-none font-medium"
                                        value={whatsappConfirmMessage}
                                        onChange={(e) => setWhatsappConfirmMessage(e.target.value)}
                                        placeholder="Ex: Confirmação realizada!..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* GAVETA 3: PERGUNTA CANCELAR */}
                        <div className="border dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900/50">
                            <button
                                onClick={() => setActiveDrawer(activeDrawer === "pergunta_cancelar" ? null : "pergunta_cancelar")}
                                className="w-full flex items-center justify-between p-4 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400"><AlertTriangle size={16} /></div>
                                    <h4 className="font-black text-gray-800 dark:text-white uppercase text-[10px] tracking-widest">3. Pergunta Cancelar</h4>
                                </div>
                                {activeDrawer === "pergunta_cancelar" ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </button>
                            {activeDrawer === "pergunta_cancelar" && (
                                <div className="p-4 pt-0 animate-in slide-in-from-top-1 duration-200">
                                    <textarea
                                        rows={3}
                                        className="w-full p-4 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white text-xs outline-none focus:ring-2 ring-blue-500 resize-none font-medium"
                                        value={whatsappCancelPromptMessage}
                                        onChange={(e) => setWhatsappCancelPromptMessage(e.target.value)}
                                        placeholder="Confirmar cancelamento?..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* GAVETA 4: CANCELADO */}
                        <div className="border dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900/50">
                            <button
                                onClick={() => setActiveDrawer(activeDrawer === "cancelado" ? null : "cancelado")}
                                className="w-full flex items-center justify-between p-4 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400"><XCircle size={16} /></div>
                                    <h4 className="font-black text-gray-800 dark:text-white uppercase text-[10px] tracking-widest">4. Cancelamento Concluído</h4>
                                </div>
                                {activeDrawer === "cancelado" ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </button>
                            {activeDrawer === "cancelado" && (
                                <div className="p-4 pt-0 animate-in slide-in-from-top-1 duration-200">
                                    <textarea
                                        rows={3}
                                        className="w-full p-4 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white text-xs outline-none focus:ring-2 ring-blue-500 resize-none font-medium"
                                        value={whatsappCancelSuccessMessage}
                                        onChange={(e) => setWhatsappCancelSuccessMessage(e.target.value)}
                                        placeholder="Agendamento cancelado..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* GAVETA 5: DESISTÊNCIA */}
                        <div className="border dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900/50">
                            <button
                                onClick={() => setActiveDrawer(activeDrawer === "reverter" ? null : "reverter")}
                                className="w-full flex items-center justify-between p-4 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400"><RotateCcw size={16} /></div>
                                    <h4 className="font-black text-gray-800 dark:text-white uppercase text-[10px] tracking-widest">5. Desistência (Responder Não)</h4>
                                </div>
                                {activeDrawer === "reverter" ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </button>
                            {activeDrawer === "reverter" && (
                                <div className="p-4 pt-0 animate-in slide-in-from-top-1 duration-200">
                                    <textarea
                                        rows={3}
                                        className="w-full p-4 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white text-xs outline-none focus:ring-2 ring-blue-500 resize-none font-medium"
                                        value={whatsappCancelRevertMessage}
                                        onChange={(e) => setWhatsappCancelRevertMessage(e.target.value)}
                                        placeholder="Entendido! Mantivemos seu agendamento..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleSaveMessage}
                        disabled={saving}
                        className="mt-6 flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-blue-600 text-white font-black shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95"
                    >
                        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Salvar Mensagens
                    </button>
                </div>
            </div>
        </div>
    );
}
