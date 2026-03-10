"use client";

import { useState, useEffect } from "react";
import { MessageCircle, QrCode, LogOut, Loader2, Save, CheckCircle2, ShieldAlert, ChevronDown, ChevronUp, MessageSquare, CheckCircle, AlertTriangle, XCircle, RotateCcw, Clock, DollarSign, Bot, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useAgenda } from "../../../contexts/AgendaContext";
import Image from "next/image";

export default function WhatsappPage() {
    const [loading, setLoading] = useState(true);
    const [configured, setConfigured] = useState(false);
    const [status, setStatus] = useState("DISCONNECTED");
    const [qrCode, setQrCode] = useState("");
    
    // Configurações da Inteligência Artificial
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiBotName, setAiBotName] = useState("Noclip");
    const [aiSystemPrompt, setAiSystemPrompt] = useState("");
    const [aiFaq, setAiFaq] = useState("");

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
                setAiEnabled(data.aiEnabled || false);
                setAiBotName(data.aiBotName || "Noclip");
                setAiSystemPrompt(data.aiSystemPrompt || "");
                setAiFaq(data.aiFaq || "");
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
                    aiEnabled,
                    aiBotName,
                    aiSystemPrompt,
                    aiFaq
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

                {/* Configurações da IA - O Robô agora faz tudo sozinho */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border dark:border-gray-700 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white shadow-md shadow-purple-500/20">
                            <Bot size={24} />
                        </div>
                        <h2 className="text-lg font-black dark:text-white uppercase tracking-tighter">Inteligência Artificial</h2>
                    </div>
                    <p className="text-sm font-medium text-gray-500 mb-6">O robô é responsável por todo o atendimento, desde tirar dúvidas até agendar os horários sozinho.</p>

                    <div className="flex-1 space-y-5">
                        <div className="p-4 bg-gray-50 border dark:border-gray-700 dark:bg-gray-900/50 rounded-2xl flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-sm">Bot de Inteligência Artificial</h3>
                                <p className="text-xs text-gray-500 font-medium">Ativa ou desativa a IA para ler e responder conversas automaticamente.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        {aiEnabled && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="block text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Qual nome o cliente deve ver? (opcional)</label>
                                    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl px-4 py-3 focus-within:ring-2 ring-purple-500 transition-all">
                                        <Bot size={18} className="text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Ex: Ana Clara, Noclip, Recepcionista"
                                            value={aiBotName}
                                            onChange={(e) => setAiBotName(e.target.value)}
                                            className="bg-transparent border-none outline-none w-full text-sm font-bold text-gray-800 dark:text-white"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 font-medium">Este nome vai aparecer no painel e orientar a IA a como se identificar.</p>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                                        Como a IA deve conversar? <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 px-2 flex items-center gap-1 py-0.5 rounded-full text-[9px]"><Wand2 size={10} /> Opcional</span>
                                    </label>
                                    <textarea
                                        rows={4}
                                        placeholder="Ex: Você é a Ana, uma atendente da Padaria Premier. Seja super simpática, use emojis felizes, mas seja direta e tente sempre marcar para amanhã..."
                                        value={aiSystemPrompt}
                                        onChange={(e) => setAiSystemPrompt(e.target.value)}
                                        className="w-full bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 text-sm outline-none focus:ring-2 ring-purple-500 transition-all resize-none shadow-sm font-medium"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Use isso para dar uma "personalidade" ou instrução única que quebra a regra geral (Ex: Cobre 50% de sinal antes).</p>
                                </div>

                                <div className="p-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-md">
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-500">
                                            <Sparkles size={60} />
                                        </div>
                                        <label className="block text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 uppercase tracking-wider mb-2">
                                            Base de Conhecimento (FAQ)
                                        </label>
                                        <p className="text-[10px] text-gray-500 font-medium mb-3 relative z-10 w-4/5">Alimente a inteligência com regras, preços base ou como chegar. Ela usará isso para responder clientes.</p>
                                        <textarea
                                            rows={6}
                                            placeholder="Ex: O endereço é Rua XV de Novembro, 123. Nós não atendemos convênio. Valores variam entre R$50 e R$150."
                                            value={aiFaq}
                                            onChange={(e) => setAiFaq(e.target.value)}
                                            className="w-full relative z-10 bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-700/50 rounded-lg p-3 text-xs outline-none focus:ring-2 ring-purple-500 transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSaveMessage}
                        disabled={saving}
                        className="mt-6 flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-purple-600 text-white font-black shadow-lg shadow-purple-600/30 hover:bg-purple-700 transition-all active:scale-95 border border-purple-500"
                    >
                        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Salvar Inteligência
                    </button>
                </div>
            </div>
        </div>
    );
}
