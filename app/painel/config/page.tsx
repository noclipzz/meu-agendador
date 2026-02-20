"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Loader2, UploadCloud, Moon, Building2, Mail, Instagram, Facebook, MessageSquare, X, MapPin, Search, CreditCard, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "../../../hooks/useTheme";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { useAgenda } from "../../../contexts/AgendaContext";

export default function Configuracoes() {
    const { theme, toggleTheme } = useTheme();
    const context = useAgenda();

    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const inputFileRef = useRef<HTMLInputElement>(null);

    // --- CAMPOS GERAIS ---
    const [name, setName] = useState("");
    const [notificationEmail, setNotificationEmail] = useState("");
    const [instagramUrl, setInstagramUrl] = useState("");
    const [facebookUrl, setFacebookUrl] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [openTime, setOpenTime] = useState("09:00");
    const [closeTime, setCloseTime] = useState("18:00");
    const [lunchStart, setLunchStart] = useState("12:00");
    const [lunchEnd, setLunchEnd] = useState("13:00");
    const [interval, setInterval] = useState(30);
    const [workDays, setWorkDays] = useState<string[]>([]);
    const [monthlyGoal, setMonthlyGoal] = useState("5000");
    const [clerkUserId, setClerkUserId] = useState("");
    const [whatsappMessage, setWhatsappMessage] = useState("Olá {nome}, recebemos seu agendamento para *{servico}* em {dia} às {hora}.\n\nDigite *1* para Confirmar ou *2* para Cancelar.");
    const [whatsappConfirmMessage, setWhatsappConfirmMessage] = useState("");
    const [whatsappCancelPromptMessage, setWhatsappCancelPromptMessage] = useState("");
    const [whatsappCancelSuccessMessage, setWhatsappCancelSuccessMessage] = useState("");
    const [whatsappCancelRevertMessage, setWhatsappCancelRevertMessage] = useState("");

    const [activeDrawer, setActiveDrawer] = useState<string | null>("confirmacao");

    // --- NOVOS CAMPOS: ENDEREÇO E CONTATO ---
    const [cnpj, setCnpj] = useState("");
    const [phone, setPhone] = useState("");
    const [cep, setCep] = useState("");
    const [address, setAddress] = useState("");
    const [number, setNumber] = useState("");
    const [complement, setComplement] = useState("");
    const [neighborhood, setNeighborhood] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");

    // --- CAMPOS FISCAIS (FOCUS NFe) ---
    const [inscricaoMunicipal, setInscricaoMunicipal] = useState("");
    const [regimeTributario, setRegimeTributario] = useState("1");
    const [naturezaOperacao, setNaturezaOperacao] = useState("1");
    const [codigoServico, setCodigoServico] = useState("");
    const [aliquotaServico, setAliquotaServico] = useState("");
    const [certificadoA1Url, setCertificadoA1Url] = useState("");
    const [certificadoSenha, setCertificadoSenha] = useState("");
    const [creditCardTax, setCreditCardTax] = useState("");
    const [debitCardTax, setDebitCardTax] = useState("");
    const inputCertRef = useRef<HTMLInputElement>(null);

    const [userRole, setUserRole] = useState<string>("PROFESSIONAL");

    const [modalWhatsappOpen, setModalWhatsappOpen] = useState(false);

    useEffect(() => { carregarTudo(); }, []);

    async function carregarTudo() {
        try {
            const [resConfig, resCheckout] = await Promise.all([
                fetch('/api/painel/config'),
                fetch('/api/checkout')
            ]);

            const dataConfig = await resConfig.json();
            const dataCheckout = await resCheckout.json();

            setUserRole(dataCheckout.role || "PROFESSIONAL");

            if (dataConfig && dataConfig.id) {
                setClerkUserId(dataConfig.ownerId || "");
                setName(dataConfig.name || "");
                setNotificationEmail(dataConfig.notificationEmail || "");
                setInstagramUrl(dataConfig.instagramUrl || "");
                setFacebookUrl(dataConfig.facebookUrl || "");
                setLogoUrl(dataConfig.logoUrl || "");
                setOpenTime(dataConfig.openTime || "09:00");
                setCloseTime(dataConfig.closeTime || "18:00");
                setLunchStart(dataConfig.lunchStart || "12:00");
                setLunchEnd(dataConfig.lunchEnd || "13:00");
                setInterval(dataConfig.interval || 30);
                setMonthlyGoal(dataConfig.monthlyGoal || "5000");
                if (dataConfig.workDays) setWorkDays(dataConfig.workDays.split(','));
                if (dataConfig.whatsappMessage) setWhatsappMessage(dataConfig.whatsappMessage);
                setWhatsappConfirmMessage(dataConfig.whatsappConfirmMessage || "");
                setWhatsappCancelPromptMessage(dataConfig.whatsappCancelPromptMessage || "");
                setWhatsappCancelSuccessMessage(dataConfig.whatsappCancelSuccessMessage || "");
                setWhatsappCancelRevertMessage(dataConfig.whatsappCancelRevertMessage || "");

                // Popula novos campos
                setCnpj(dataConfig.cnpj || "");
                setPhone(dataConfig.phone || "");
                setCep(dataConfig.cep || "");
                setAddress(dataConfig.address || "");
                setNumber(dataConfig.number || "");
                setComplement(dataConfig.complement || "");
                setNeighborhood(dataConfig.neighborhood || "");
                setCity(dataConfig.city || "");
                setState(dataConfig.state || "");

                // Popula campos fiscais
                setInscricaoMunicipal(dataConfig.inscricaoMunicipal || "");
                setRegimeTributario(String(dataConfig.regimeTributario || "1"));
                setNaturezaOperacao(String(dataConfig.naturezaOperacao || "1"));
                setCodigoServico(dataConfig.codigoServico || "");
                setAliquotaServico(String(dataConfig.aliquotaServico || ""));
                setCertificadoA1Url(dataConfig.certificadoA1Url || "");
                setCertificadoSenha(dataConfig.certificadoSenha || "");
                setCreditCardTax(String(dataConfig.creditCardTax || "0"));
                setDebitCardTax(String(dataConfig.debitCardTax || "0"));
            }
        } catch (e) { console.error(e) }
        finally { setLoading(false); }
    }

    async function handleCEPChange(v: string) {
        const raw = v.replace(/\D/g, "").slice(0, 8);
        setCep(raw.length === 8 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw);

        if (raw.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setAddress(data.logradouro);
                    setNeighborhood(data.bairro);
                    setCity(data.localidade);
                    setState(data.uf);
                }
            } catch { }
        }
    }

    async function handleLogoUpload() {
        if (!inputFileRef.current?.files?.[0]) return;
        const file = inputFileRef.current.files[0];
        setIsUploading(true);
        try {
            const newBlob = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/upload/token',
            });
            setLogoUrl(newBlob.url);
            toast.success("Imagem carregada com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Falha no upload.");
        }
        finally { setIsUploading(false); }
    }

    async function handleCertUpload() {
        if (!inputCertRef.current?.files?.[0]) return;
        const file = inputCertRef.current.files[0];
        setIsUploading(true);
        try {
            const newBlob = await upload(`cert_${file.name}`, file, {
                access: 'public',
                handleUploadUrl: '/api/upload/token',
            });
            setCertificadoA1Url(newBlob.url);
            toast.success("Certificado enviado com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Falha ao enviar certificado.");
        }
        finally { setIsUploading(false); }
    }

    async function salvarConfig() {
        try {
            const res = await fetch('/api/painel/config', {
                method: 'POST',
                body: JSON.stringify({
                    name, notificationEmail, instagramUrl, facebookUrl, openTime, closeTime, lunchStart, lunchEnd, logoUrl,
                    monthlyGoal: parseFloat(monthlyGoal), workDays: workDays.join(','), interval: Number(interval),
                    whatsappMessage, whatsappConfirmMessage, whatsappCancelPromptMessage,
                    whatsappCancelSuccessMessage, whatsappCancelRevertMessage,
                    cnpj, phone, cep, address, number, complement, neighborhood, city, state,
                    inscricaoMunicipal, regimeTributario: Number(regimeTributario), naturezaOperacao: Number(naturezaOperacao),
                    codigoServico, aliquotaServico: parseFloat(aliquotaServico || "0"), certificadoA1Url, certificadoSenha,
                    creditCardTax: parseFloat(creditCardTax || "0"), debitCardTax: parseFloat(debitCardTax || "0")
                })
            });

            if (res.ok) {
                toast.success("Configurações salvas!");
                if (context && typeof context.refreshAgenda === 'function') {
                    context.refreshAgenda();
                }
            } else {
                toast.error("Erro ao salvar. Verifique o banco de dados.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        }
    }

    async function salvarMensagemWhatsapp() {
        await salvarConfig();
        setModalWhatsappOpen(false);
    }

    const toggleDay = (day: string) => {
        if (workDays.includes(day)) setWorkDays(workDays.filter(d => d !== day));
        else setWorkDays([...workDays, day]);
    }

    const diasSemana = [{ id: "0", label: "Dom" }, { id: "1", label: "Seg" }, { id: "2", label: "Ter" }, { id: "3", label: "Qua" }, { id: "4", label: "Qui" }, { id: "5", label: "Sex" }, { id: "6", label: "Sáb" }];

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 font-sans">

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center text-sm dark:bg-gray-900/50 dark:border-gray-700">
                <div>
                    <span className="text-blue-800 font-bold dark:text-blue-200 uppercase text-[10px] tracking-widest">Clerk ID (Suporte Técnico)</span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Use este ID para suporte no painel administrativo</p>
                </div>
                <code className="bg-white px-3 py-2 rounded border text-gray-600 font-mono select-all dark:bg-gray-800 dark:text-gray-300 text-xs">{clerkUserId}</code>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border dark:border-gray-800">
                <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                    <Building2 className="text-blue-500" /> Dados do Negócio
                </h2>

                <div className="mb-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Nome da Empresa</label>
                            <input
                                className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                                placeholder="Ex: Minha Barbearia"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1 dark:text-gray-400">
                                <Mail size={14} /> E-mail para Avisos
                            </label>
                            <input
                                type="email"
                                className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                                placeholder="exemplo@gmail.com"
                                value={notificationEmail}
                                onChange={e => setNotificationEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">CNPJ (Opcional)</label>
                            <input
                                className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                                placeholder="00.000.000/0000-00"
                                value={cnpj}
                                onChange={e => setCnpj(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Telefone da Empresa</label>
                            <input
                                className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                                placeholder="(00) 00000-0000"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t dark:border-gray-700 space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 mb-4">
                            <MapPin size={14} /> Endereço Comercial
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-3">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 block mb-1">CEP</label>
                                <div className="relative">
                                    <input maxLength={9} className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 font-bold dark:text-white outline-none focus:border-blue-500" value={cep} onChange={e => handleCEPChange(e.target.value)} placeholder="00000-000" />
                                    <Search size={16} className="absolute right-3 top-3.5 text-gray-300" />
                                </div>
                            </div>
                            <div className="md:col-span-7">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 block mb-1">Rua / Avenida</label>
                                <input className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 font-bold dark:text-white outline-none focus:border-blue-500" value={address} onChange={e => setAddress(e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 block mb-1">Nº</label>
                                <input className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 font-bold dark:text-white outline-none focus:border-blue-500" value={number} onChange={e => setNumber(e.target.value)} />
                            </div>

                            <div className="md:col-span-4">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 block mb-1">Bairro</label>
                                <input className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 font-bold dark:text-white outline-none focus:border-blue-500" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
                            </div>
                            <div className="md:col-span-4">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 block mb-1">Complemento</label>
                                <input className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 font-bold dark:text-white outline-none focus:border-blue-500" value={complement} onChange={e => setComplement(e.target.value)} placeholder="Ex: Sala 2" />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 block mb-1">Cidade</label>
                                <input className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 font-bold dark:text-white outline-none focus:border-blue-500" value={city} onChange={e => setCity(e.target.value)} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 block mb-1">UF</label>
                                <input className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 font-bold dark:text-white outline-none focus:border-blue-500" value={state} onChange={e => setState(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1 dark:text-gray-400">
                                <Instagram size={14} className="text-pink-500" /> Link do Instagram
                            </label>
                            <input
                                className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                                placeholder="https://instagram.com/seu-perfil"
                                value={instagramUrl}
                                onChange={e => setInstagramUrl(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1 dark:text-gray-400">
                                <Facebook size={14} className="text-blue-600" /> Link do Facebook
                            </label>
                            <input
                                className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                                placeholder="https://facebook.com/suapagina"
                                value={facebookUrl}
                                onChange={e => setFacebookUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* --- SEÇÃO FISCAL (OCULTA POR ENQUANTO) --- */}
                    {/* 
                    <div className="pt-10 border-t dark:border-gray-700 space-y-6">
                        ... (conteúdo fiscal oculto) ...
                    </div>
                    */}

                    <div className="border-t dark:border-gray-700 pt-6">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-3 block dark:text-gray-400">Logo da Empresa</label>
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full border dark:border-gray-700 flex items-center justify-center overflow-hidden shadow-inner">
                                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <UploadCloud className="text-gray-400" size={32} />}
                            </div>
                            <div>
                                <input type="file" accept="image/*" ref={inputFileRef} onChange={handleLogoUpload} className="hidden" />
                                <button onClick={() => inputFileRef.current?.click()} disabled={isUploading} className="bg-gray-800 text-white px-5 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition text-sm shadow-md dark:bg-gray-700 dark:hover:bg-gray-600">
                                    {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud size={16} />} {isUploading ? "Enviando..." : "Trocar Imagem"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t dark:border-gray-700">
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Meta Mensal (R$)</label><input type="number" className="border dark:border-gray-700 p-4 rounded-2xl w-full bg-white dark:bg-gray-800 font-bold dark:text-white" value={monthlyGoal} onChange={e => setMonthlyGoal(e.target.value)} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Tempo Atendimento Padrão</label><select className="border dark:border-gray-700 p-4 rounded-2xl w-full text-sm bg-white dark:bg-gray-800 font-bold dark:text-white" value={interval} onChange={e => setInterval(Number(e.target.value))}><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>1 hora</option></select></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Abre às</label><input type="time" className="border dark:border-gray-700 p-4 rounded-2xl w-full bg-white dark:bg-gray-800 font-bold dark:text-white" value={openTime} onChange={e => setOpenTime(e.target.value)} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Fecha às</label><input type="time" className="border dark:border-gray-700 p-4 rounded-2xl w-full bg-white dark:bg-gray-800 font-bold dark:text-white" value={closeTime} onChange={e => setCloseTime(e.target.value)} /></div>
                    <div className="col-span-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-700"><p className="text-xs font-bold text-gray-500 uppercase mb-3 dark:text-gray-400">Horário de Pausa (Almoço)</p><div className="flex gap-4"><div className="flex-1"><label className="text-xs text-gray-400 mb-1 block dark:text-gray-300">Início</label><input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800 dark:text-white" value={lunchStart} onChange={e => setLunchStart(e.target.value)} /></div><div className="flex-1"><label className="text-xs text-gray-400 mb-1 block dark:text-gray-300">Fim</label><input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800 dark:text-white" value={lunchEnd} onChange={e => setLunchEnd(e.target.value)} /></div></div></div>
                </div>

                <div className="mt-6"><label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Dias de Funcionamento</label><div className="flex gap-2 flex-wrap">{diasSemana.map(dia => (<button key={dia.id} onClick={() => toggleDay(dia.id)} className={`w-10 h-10 rounded-full font-bold text-xs border transition ${workDays.includes(dia.id) ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105" : "bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 dark:text-gray-300"}`}>{dia.label}</button>))}</div></div>

                {userRole === "ADMIN" && (
                    <div className="mt-10 border-t dark:border-gray-700 pt-8">
                        <div className="mb-6">
                            <h3 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                                <MessageSquare className="text-green-500" /> Automação de WhatsApp
                            </h3>
                            <p className="text-sm text-gray-500 font-medium dark:text-gray-400">Personalize todas as etapas da conversa do bot com seu cliente.</p>
                        </div>

                        <div className="space-y-4">
                            {/* GAVETA 1: LEMBRETE INICIAL */}
                            <div className="border dark:border-gray-800 rounded-3xl overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
                                <button
                                    onClick={() => setActiveDrawer(activeDrawer === "confirmacao" ? null : "confirmacao")}
                                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400"><MessageSquare size={20} /></div>
                                        <div>
                                            <h4 className="font-black text-gray-800 dark:text-white uppercase text-xs tracking-widest">1. Mensagem de Boas-vindas / Lembrete</h4>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Enviada logo após o agendamento ser feito.</p>
                                        </div>
                                    </div>
                                    {activeDrawer === "confirmacao" ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                </button>
                                {activeDrawer === "confirmacao" && (
                                    <div className="p-6 pt-0 border-t dark:border-gray-800 animate-in slide-in-from-top-2 duration-200">
                                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 mb-4">
                                            <p className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase leading-relaxed">
                                                💡 Essa mensagem inicia a conversa. É importante dizer ao cliente que ele pode responder <span className="underline">"1" ou "Confirmar"</span> para garantir o horário, ou <span className="underline">"2" ou "Cancelar"</span> caso deseje desmarcar.
                                            </p>
                                        </div>
                                        <textarea
                                            rows={4}
                                            className="w-full p-4 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 ring-blue-500 outline-none resize-none font-medium"
                                            value={whatsappMessage}
                                            onChange={(e) => setWhatsappMessage(e.target.value)}
                                            placeholder="Digite a mensagem inicial..."
                                        />
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {["{nome}", "{servico}", "{dia}", "{hora}"].map(tag => (
                                                <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-black text-gray-600 dark:text-gray-400">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* GAVETA 2: CONFIRMAÇÃO DE SUCESSO */}
                            <div className="border dark:border-gray-800 rounded-3xl overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
                                <button
                                    onClick={() => setActiveDrawer(activeDrawer === "sucesso" ? null : "sucesso")}
                                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-2xl text-green-600 dark:text-green-400"><CheckCircle size={20} /></div>
                                        <div>
                                            <h4 className="font-black text-gray-800 dark:text-white uppercase text-xs tracking-widest">2. Confirmação de Sucesso</h4>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Enviada quando o cliente responde "SIM" ou "1".</p>
                                        </div>
                                    </div>
                                    {activeDrawer === "sucesso" ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                </button>
                                {activeDrawer === "sucesso" && (
                                    <div className="p-6 pt-0 border-t dark:border-gray-800 animate-in slide-in-from-top-2 duration-200">
                                        <textarea
                                            rows={3}
                                            className="w-full p-4 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 ring-blue-500 outline-none resize-none font-medium"
                                            value={whatsappConfirmMessage}
                                            onChange={(e) => setWhatsappConfirmMessage(e.target.value)}
                                            placeholder="Ex: ✅ Agendamento confirmado!..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* GAVETA 3: PROMPT DE CANCELAMENTO */}
                            <div className="border dark:border-gray-800 rounded-3xl overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
                                <button
                                    onClick={() => setActiveDrawer(activeDrawer === "pergunta_cancelar" ? null : "pergunta_cancelar")}
                                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-2xl text-orange-600 dark:text-orange-400"><AlertTriangle size={20} /></div>
                                        <div>
                                            <h4 className="font-black text-gray-800 dark:text-white uppercase text-xs tracking-widest">3. Pergunta de Segurança para Cancelar</h4>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Enviada quando o cliente diz que quer cancelar.</p>
                                        </div>
                                    </div>
                                    {activeDrawer === "pergunta_cancelar" ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                </button>
                                {activeDrawer === "pergunta_cancelar" && (
                                    <div className="p-6 pt-0 border-t dark:border-gray-800 animate-in slide-in-from-top-2 duration-200">
                                        <div className="bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 mb-4">
                                            <p className="text-[10px] font-black text-orange-800 dark:text-orange-300 uppercase leading-relaxed">
                                                🚨 Nesta etapa, o bot deve perguntar se ele <span className="underline">Deseja Realmente Cancelar</span>. O robô aguardará uma resposta "SIM" nesta fase para enfim cancelar.
                                            </p>
                                        </div>
                                        <textarea
                                            rows={3}
                                            className="w-full p-4 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 ring-blue-500 outline-none resize-none font-medium"
                                            value={whatsappCancelPromptMessage}
                                            onChange={(e) => setWhatsappCancelPromptMessage(e.target.value)}
                                            placeholder="Ex: Você deseja realmente cancelar seu horário?..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* GAVETA 4: CANCELAMENTO CONFIRMADO */}
                            <div className="border dark:border-gray-800 rounded-3xl overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
                                <button
                                    onClick={() => setActiveDrawer(activeDrawer === "cancelado" ? null : "cancelado")}
                                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-600 dark:text-red-400"><XCircle size={20} /></div>
                                        <div>
                                            <h4 className="font-black text-gray-800 dark:text-white uppercase text-xs tracking-widest">4. Cancelamento Concluído</h4>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Enviada após o cliente confirmar o cancelamento.</p>
                                        </div>
                                    </div>
                                    {activeDrawer === "cancelado" ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                </button>
                                {activeDrawer === "cancelado" && (
                                    <div className="p-6 pt-0 border-t dark:border-gray-800 animate-in slide-in-from-top-2 duration-200">
                                        <textarea
                                            rows={3}
                                            className="w-full p-4 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 ring-blue-500 outline-none resize-none font-medium"
                                            value={whatsappCancelSuccessMessage}
                                            onChange={(e) => setWhatsappCancelSuccessMessage(e.target.value)}
                                            placeholder="Ex: ❌ Seu agendamento foi cancelado..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* GAVETA 5: DESISTÊNCIA DE CANCELAMENTO */}
                            <div className="border dark:border-gray-800 rounded-3xl overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
                                <button
                                    onClick={() => setActiveDrawer(activeDrawer === "reverter" ? null : "reverter")}
                                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400"><RotateCcw size={20} /></div>
                                        <div>
                                            <h4 className="font-black text-gray-800 dark:text-white uppercase text-xs tracking-widest">5. Desistência de Cancelamento</h4>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Enviada se o cliente disser "Não" ao prompt de cancelamento.</p>
                                        </div>
                                    </div>
                                    {activeDrawer === "reverter" ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                </button>
                                {activeDrawer === "reverter" && (
                                    <div className="p-6 pt-0 border-t dark:border-gray-800 animate-in slide-in-from-top-2 duration-200">
                                        <textarea
                                            rows={3}
                                            className="w-full p-4 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 ring-blue-500 outline-none resize-none font-medium"
                                            value={whatsappCancelRevertMessage}
                                            onChange={(e) => setWhatsappCancelRevertMessage(e.target.value)}
                                            placeholder="Ex: Entendido! Mantivemos seu agendamento..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="border-t dark:border-gray-700 pt-8 mt-6">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                        <CreditCard className="text-blue-500" size={20} /> Financeiro e Taxas de Cartão
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-blue-50/50 dark:bg-gray-800/30 rounded-3xl border border-blue-100 dark:border-gray-800">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Taxa de Crédito (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                                placeholder="Ex: 3.5"
                                value={creditCardTax}
                                onChange={e => setCreditCardTax(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-400 mt-2 ml-1">Valor descontado automaticamente em pagamentos via CARTÃO CRÉDITO.</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Taxa de Débito (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                                placeholder="Ex: 1.5"
                                value={debitCardTax}
                                onChange={e => setDebitCardTax(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-400 mt-2 ml-1">Valor descontado automaticamente em pagamentos via CARTÃO DÉBITO.</p>
                        </div>
                    </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-6 mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Moon className="text-gray-500 dark:text-gray-400" />
                        <div><p className="font-bold text-gray-800 dark:text-white uppercase text-sm tracking-widest">Modo Noturno</p></div>
                    </div>
                    <button onClick={toggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                </div>

                <button onClick={salvarConfig} className="mt-8 bg-black dark:bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition active:scale-95 flex items-center justify-center gap-2"><Save size={18} /> Salvar Alterações</button>
            </div >

            {modalWhatsappOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] w-full max-w-md border dark:border-gray-800 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black flex items-center gap-2 dark:text-white"><MessageSquare size={20} className="text-green-500" /> Editar Mensagem</h2>
                            <button onClick={() => setModalWhatsappOpen(false)} className="text-gray-400 hover:text-red-500 transition"><X size={24} /></button>
                        </div>
                        <textarea rows={6} className="w-full mt-2 p-4 rounded-2xl border dark:border-gray-700 dark:bg-gray-950 dark:text-white text-sm outline-none focus:ring-2 ring-blue-500 resize-none font-medium" value={whatsappMessage} onChange={(e) => setWhatsappMessage(e.target.value)} />
                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <button onClick={() => setModalWhatsappOpen(false)} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl font-black uppercase text-xs text-gray-500 dark:text-gray-300">Cancelar</button>
                            <button onClick={salvarMensagemWhatsapp} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}