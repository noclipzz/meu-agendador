"use client";

import { useState, useEffect } from "react";
import { Bot, Save, Sparkles, CheckCircle2, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function AIConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [hasModule, setHasModule] = useState(false);

    // AI Form State
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiBotName, setAiBotName] = useState("Noclip");
    const [aiSystemPrompt, setAiSystemPrompt] = useState("");

    useEffect(() => {
        carregarConfiguracoes();
    }, []);

    async function carregarConfiguracoes() {
        try {
            const res = await fetch("/api/painel/config/ia");
            const data = await res.json();

            setHasModule(data.hasAiModule);
            if (data.config) {
                setAiEnabled(data.config.aiEnabled || false);
                setAiBotName(data.config.aiBotName || "Noclip");
                setAiSystemPrompt(data.config.aiSystemPrompt || "");
            }
        } catch (error) {
            toast.error("Erro ao carregar configurações de IA.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/painel/config/ia", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    aiEnabled,
                    aiBotName,
                    aiSystemPrompt
                })
            });

            if (res.ok) {
                toast.success("Configurações do robô salvas com sucesso!");
            } else {
                toast.error("Erro ao salvar regras. Tente novamente.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 opacity-50">
                <Bot className="animate-spin text-purple-600 mb-4" size={40} />
                <span className="font-bold text-gray-500 tracking-wider uppercase text-xs">Carregando IA...</span>
            </div>
        );
    }

    // TELA DE UPSELL (BLOQUEIO)
    if (!hasModule) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-8 font-sans pb-24">
                <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-black p-10 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Bot size={250} />
                    </div>
                    <div className="flex-1 relative z-10 space-y-6 text-center md:text-left">
                        <span className="bg-white/10 text-purple-200 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md inline-block">
                            <Sparkles size={12} className="inline mr-1" /> Addon Exclusivo
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
                            Atendimento Automático com Robô
                        </h1>
                        <p className="text-xl text-purple-200 font-medium max-w-xl leading-relaxed">
                            Contrate o robô humanizado para tirar dúvidas, checar a agenda e marcar horários sozinho <strong className="text-white">24 horas por dia</strong> no seu WhatsApp.
                        </p>

                        <div className="pt-4 flex flex-col md:flex-row items-center gap-4">
                            <button className="bg-white text-indigo-900 hover:bg-gray-100 px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-white/10 transition-transform active:scale-95 flex items-center justify-center gap-2 w-full md:w-auto">
                                <Lock size={20} /> Liberar por R$ 49,90/mês
                            </button>
                            <span className="text-sm font-bold text-gray-400">Cancelamento grátis a qualquer momento.</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                            <Bot size={24} />
                        </div>
                        <h3 className="font-black text-xl mb-3 dark:text-white">Atende seus Clientes</h3>
                        <p className="text-gray-500 font-medium">Ele lê suas regras e conversa natualmente. Se o cliente perguntar preço ou endereço, o robô responde instantaneamente.</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                            <CheckCircle2 size={24} />
                        </div>
                        <h3 className="font-black text-xl mb-3 dark:text-white">Marca Horários</h3>
                        <p className="text-gray-500 font-medium">Ele acessa o banco de dados do seu sistema, checa os horários livres e cria o agendamento real para sua clínica.</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                            <Sparkles size={24} />
                        </div>
                        <h3 className="font-black text-xl mb-3 dark:text-white">White Label</h3>
                        <p className="text-gray-500 font-medium">Você batiza o robô. Dê o nome que quiser e crie a personalidade da "Recepcionista Perfeita" do seu negócio.</p>
                    </div>
                </div>
            </div>
        );
    }

    // TELA DE CONFIGURAÇÃO (SE TIVER O MÓDULO PAGO MÓDULO LIVRE)
    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6 font-sans pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <Bot className="text-purple-600" /> Inteligência Artificial
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Configure a personalidade e as regras do seu assistente de WhatsApp.
                    </p>
                </div>
                <button
                    disabled={saving}
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-purple-500/30 transition-all w-full sm:w-auto justify-center"
                >
                    {saving ? <Bot className="animate-spin" size={20} /> : <Save size={20} />}
                    Salvar Regras
                </button>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm space-y-8">

                {/* LIGA/DESLIGA */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-purple-50 dark:bg-purple-900/10 border-2 border-purple-100 dark:border-purple-800/30 rounded-3xl">
                    <div className="flex items-start gap-4">
                        <div className={`p-4 rounded-2xl ${aiEnabled ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
                            <Bot size={28} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-gray-900 dark:text-white flex items-center gap-2">
                                Status do Robô
                            </h3>
                            <p className="text-gray-500 text-sm font-medium mt-1">
                                {aiEnabled ? "Ele responderá automaticamente as mensagens no WhatsApp." : "Ele está dormindo. Os clientes não receberão respostas de IA."}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAiEnabled(!aiEnabled)}
                        className={`w-14 h-8 rounded-full transition-colors relative flex items-center ${aiEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full shadow absolute transition-transform ${aiEnabled ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* NOME DO BOT */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="text-xs font-black uppercase text-gray-500 ml-2 tracking-wider">
                            Nome do Assistente / Robô
                        </label>
                        <input
                            type="text"
                            value={aiBotName}
                            onChange={(e) => setAiBotName(e.target.value)}
                            placeholder="Ex: Noclip, Ana, Roberto..."
                            className="w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 font-bold outline-none dark:text-white focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 transition-colors"
                        />
                        <p className="text-xs text-gray-400 ml-2 mt-1">O robô se identificará com este nome quando achar necessário.</p>
                    </div>

                    {/* PROMPT DE SISTEMA / REGRAS */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="text-xs font-black uppercase text-gray-500 ml-2 tracking-wider flex items-center gap-1.5">
                            Comportamento e Regras (Prompt Base)
                            <div className="group relative">
                                <ShieldAlert size={14} className="text-purple-500 cursor-help" />
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                                    É aqui que você ensina o cérebro dela. Escreva em parágrafos simples e diretos, dizendo como ela deve agir, tratar os clientes e tabelas de informações que ela deve saber.
                                </div>
                            </div>
                        </label>
                        <textarea
                            value={aiSystemPrompt}
                            onChange={(e) => setAiSystemPrompt(e.target.value)}
                            placeholder="Aja como uma recepcionista simpática da Barbearia X. Você é educada, usa emojis e foca em vender os agendamentos. Nossos preços são: Corte Normal R$ 40, Barba R$ 25... Se o cliente pedir o endereço, diga que ficamos na Rua X..."
                            className="w-full p-6 rounded-3xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 font-medium outline-none dark:text-white focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 transition-colors resize-none h-64 leading-relaxed"
                        />
                        <div className="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500 p-4 rounded-xl mt-4">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                <strong>Dica de Ouro:</strong> Além do texto acima, o robô automaticamente sabe quais são os serviços livres e os profissionais do sistema pelo banco de dados. Você só precisa dizer os detalhes específicos do seu negócio aqui!
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </form>
    );
}
