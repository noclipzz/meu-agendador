"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Loader2, UploadCloud, Moon, Building2, Mail, Instagram, Facebook, X, MapPin, Search, Clock, PenTool } from "lucide-react";
import { useTheme } from "../../../../hooks/useTheme";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { useAgenda } from "../../../../contexts/AgendaContext";

const formatarCpfCnpj = (value: string) => {
    const raw = value.replace(/\D/g, "");
    if (raw.length <= 11) {
        let v = raw;
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        return v;
    } else {
        let v = raw.slice(0, 14);
        v = v.replace(/^(\d{2})(\d)/, "$1.$2");
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
        return v;
    }
};

export default function ConfigGerais() {
    const { theme, toggleTheme } = useTheme();
    const context = useAgenda();

    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const inputFileRef = useRef<HTMLInputElement>(null);
    const inputSignatureRef = useRef<HTMLInputElement>(null);

    // --- CAMPOS GERAIS ---
    const [name, setName] = useState("");
    const [corporateName, setCorporateName] = useState("");
    const [notificationEmail, setNotificationEmail] = useState("");
    const [instagramUrl, setInstagramUrl] = useState("");
    const [facebookUrl, setFacebookUrl] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [signatureUrl, setSignatureUrl] = useState("");
    const [openTime, setOpenTime] = useState("09:00");
    const [closeTime, setCloseTime] = useState("18:00");
    const [lunchStart, setLunchStart] = useState("12:00");
    const [lunchEnd, setLunchEnd] = useState("13:00");
    const [interval, setInterval] = useState(30);
    const [workDays, setWorkDays] = useState<string[]>([]);
    const [monthlyGoal, setMonthlyGoal] = useState("5000");
    const [clerkUserId, setClerkUserId] = useState("");

    // --- ENDEREÇO E CONTATO ---
    const [cnpj, setCnpj] = useState("");
    const [phone, setPhone] = useState("");
    const [cep, setCep] = useState("");
    const [address, setAddress] = useState("");
    const [number, setNumber] = useState("");
    const [complement, setComplement] = useState("");
    const [neighborhood, setNeighborhood] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");

    const [userRole, setUserRole] = useState<string>("PROFESSIONAL");

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
                setCorporateName(dataConfig.corporateName || "");
                setNotificationEmail(dataConfig.notificationEmail || "");
                setInstagramUrl(dataConfig.instagramUrl || "");
                setFacebookUrl(dataConfig.facebookUrl || "");
                setLogoUrl(dataConfig.logoUrl || "");
                setSignatureUrl(dataConfig.signatureUrl || "");
                setOpenTime(dataConfig.openTime || "09:00");
                setCloseTime(dataConfig.closeTime || "18:00");
                setLunchStart(dataConfig.lunchStart || "12:00");
                setLunchEnd(dataConfig.lunchEnd || "13:00");
                setInterval(dataConfig.interval || 30);
                setMonthlyGoal(dataConfig.monthlyGoal || "5000");
                if (dataConfig.workDays) setWorkDays(dataConfig.workDays.split(','));

                setCnpj(dataConfig.cnpj || "");
                setPhone(dataConfig.phone || "");
                setCep(dataConfig.cep || "");
                setAddress(dataConfig.address || "");
                setNumber(dataConfig.number || "");
                setComplement(dataConfig.complement || "");
                setNeighborhood(dataConfig.neighborhood || "");
                setCity(dataConfig.city || "");
                setState(dataConfig.state || "");
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

    async function handleCNPJChange(v: string) {
        const formatado = formatarCpfCnpj(v);
        setCnpj(formatado);

        const raw = v.replace(/\D/g, "");
        if (raw.length === 14) {
            toast.loading("Buscando dados da Receita Federal...", { id: "cnpjSearch" });
            try {
                const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.razao_social) setCorporateName(data.razao_social);
                    if (data.nome_fantasia) setName(data.nome_fantasia || data.razao_social);
                    if (data.email && !notificationEmail) setNotificationEmail(data.email);
                    if (data.ddd_telefone_1 && !phone) setPhone(data.ddd_telefone_1);
                    if (data.cep) {
                        const rawCep = String(data.cep).replace(/\D/g, "");
                        setCep(rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5)}` : rawCep);
                    }
                    if (data.logradouro) setAddress(data.logradouro);
                    if (data.numero) setNumber(String(data.numero));
                    if (data.complemento) setComplement(data.complemento);
                    if (data.bairro) setNeighborhood(data.bairro);
                    if (data.municipio) setCity(data.municipio);
                    if (data.uf) setState(data.uf);
                    toast.success("Dados da empresa auto-preenchidos!", { id: "cnpjSearch" });
                } else {
                    toast.error("CNPJ não localizado na Receita.", { id: "cnpjSearch" });
                }
            } catch (err) {
                toast.error("Erro ao puxar dados do CNPJ.", { id: "cnpjSearch" });
            }
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

    async function handleSignatureUpload() {
        if (!inputSignatureRef.current?.files?.[0]) return;
        const file = inputSignatureRef.current.files[0];
        setIsUploading(true);
        try {
            const newBlob = await upload(`signature-company.png`, file, {
                access: 'public',
                handleUploadUrl: '/api/upload/token',
            });
            setSignatureUrl(newBlob.url);
            toast.success("Assinatura da empresa carregada!");
        } catch (error) {
            console.error(error);
            toast.error("Falha no upload da assinatura.");
        }
        finally { setIsUploading(false); }
    }

    async function salvarConfig() {
        try {
            const res = await fetch('/api/painel/config', {
                method: 'POST',
                body: JSON.stringify({
                    name, corporateName, notificationEmail, instagramUrl, facebookUrl, openTime, closeTime, lunchStart, lunchEnd, logoUrl, signatureUrl,
                    monthlyGoal: parseFloat(monthlyGoal), workDays: workDays.join(','), interval: Number(interval),
                    cnpj, phone, cep, address, number, complement, neighborhood, city, state
                })
            });

            if (res.ok) {
                toast.success("Configurações salvas!");
                if (context && typeof context.refreshAgenda === 'function') {
                    context.refreshAgenda();
                }
            } else {
                toast.error("Erro ao salvar.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        }
    }

    const toggleDay = (day: string) => {
        if (workDays.includes(day)) setWorkDays(workDays.filter(d => d !== day));
        else setWorkDays([...workDays, day]);
    }

    const diasSemana = [{ id: "0", label: "Dom" }, { id: "1", label: "Seg" }, { id: "2", label: "Ter" }, { id: "3", label: "Qua" }, { id: "4", label: "Qui" }, { id: "5", label: "Sex" }, { id: "6", label: "Sáb" }];

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 font-sans animate-in fade-in duration-500">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Configurações Gerais</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Dados da empresa, horários e aparência.</p>
            </header>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl flex justify-between items-center text-sm dark:bg-gray-900/50 dark:border-gray-800">
                <div>
                    <span className="text-blue-800 font-bold dark:text-blue-200 uppercase text-[10px] tracking-widest">Suporte Técnico</span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">ID da sua conta para atendimento.</p>
                </div>
                <code className="bg-white px-3 py-2 rounded-xl border text-gray-600 font-mono select-all dark:bg-gray-800 dark:text-gray-300 text-xs">{clerkUserId}</code>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border dark:border-gray-800">
                <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                    <Building2 className="text-blue-500" /> Dados do Negócio
                </h2>

                <fieldset disabled={userRole !== "ADMIN"} className="border-none p-0 m-0 min-w-0 opacity-100 disabled:opacity-80">
                    <div className="mb-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50 dark:bg-blue-900/10 dark:border-blue-900/30">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1 dark:text-gray-400">
                                    <Search size={14} className="text-blue-500" /> CPF ou CNPJ (Consulta Automática)
                                </label>
                                <input
                                    maxLength={18}
                                    className="w-full border-2 border-blue-100 dark:border-blue-800 p-4 rounded-2xl bg-white dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 focus:border-transparent font-bold dark:text-white transition"
                                    placeholder="CPF ou CNPJ..."
                                    value={cnpj}
                                    onChange={e => handleCNPJChange(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Nome Fantasia</label>
                                <input
                                    className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1 dark:text-gray-400">
                                    <Mail size={14} /> E-mail de Notificações
                                </label>
                                <input
                                    type="email"
                                    className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                                    value={notificationEmail}
                                    onChange={e => setNotificationEmail(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Razão Social</label>
                                <input
                                    className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                                    value={corporateName}
                                    onChange={e => setCorporateName(e.target.value)}
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
                                    <input maxLength={9} className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 font-bold dark:text-white outline-none focus:border-blue-500" value={cep} onChange={e => handleCEPChange(e.target.value)} />
                                </div>
                                <div className="md:col-span-7">
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 block mb-1">Logradouro</label>
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
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 block mb-1">Cidade</label>
                                    <input className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 font-bold dark:text-white outline-none focus:border-blue-500" value={city} onChange={e => setCity(e.target.value)} />
                                </div>
                                <div className="md:col-span-4">
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 block mb-1">Estado (UF)</label>
                                    <input className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 font-bold dark:text-white outline-none focus:border-blue-500" value={state} onChange={e => setState(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1 dark:text-gray-400">
                                    <Instagram size={14} className="text-pink-500" /> Instagram
                                </label>
                                <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold dark:text-white" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1 dark:text-gray-400">
                                    <Facebook size={14} className="text-blue-600" /> Facebook
                                </label>
                                <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold dark:text-white" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} />
                            </div>
                        </div>

                        <div className="border-t dark:border-gray-700 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block dark:text-gray-400">Logotipo</label>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-3xl border dark:border-gray-700 flex items-center justify-center overflow-hidden shadow-inner">
                                        {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <UploadCloud className="text-gray-400" size={32} />}
                                    </div>
                                    <div>
                                        <input type="file" accept="image/*" ref={inputFileRef} onChange={handleLogoUpload} className="hidden" />
                                        <button onClick={() => inputFileRef.current?.click()} disabled={isUploading} className="bg-gray-800 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition text-sm dark:bg-gray-700">
                                            {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud size={16} />} Alterar Imagem
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block dark:text-gray-400">Assinatura Digital da Empresa</label>
                                <div className="flex items-center gap-6">
                                    <div className="w-48 h-24 bg-white dark:bg-gray-950 rounded-3xl border-2 border-dashed dark:border-gray-800 flex items-center justify-center overflow-hidden">
                                        {signatureUrl ? <img src={signatureUrl} alt="Assinatura" className="h-full object-contain mix-blend-multiply" /> : <PenTool className="text-gray-300" size={32} />}
                                    </div>
                                    <div>
                                        <input type="file" accept="image/*" ref={inputSignatureRef} onChange={handleSignatureUpload} className="hidden" />
                                        <button onClick={() => inputSignatureRef.current?.click()} disabled={isUploading} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition text-sm">
                                            {isUploading ? <Loader2 className="animate-spin" /> : <PenTool size={16} />} Carregar Assinatura
                                        </button>
                                        <p className="text-[9px] text-gray-400 mt-2">Use um arquivo PNG transparente.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t dark:border-gray-700">
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Meta Faturamento (R$)</label><input type="number" className="border dark:border-gray-700 p-4 rounded-2xl w-full bg-white dark:bg-gray-800 font-bold dark:text-white" value={monthlyGoal} onChange={e => setMonthlyGoal(e.target.value)} /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Intervalo Agendamentos</label><select className="border dark:border-gray-700 p-4 rounded-2xl w-full bg-white dark:bg-gray-800 font-bold dark:text-white" value={interval} onChange={e => setInterval(Number(e.target.value))}><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>1 hora</option></select></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Abertura</label><input type="time" className="border dark:border-gray-700 p-4 rounded-2xl w-full bg-white dark:bg-gray-800 font-bold dark:text-white" value={openTime} onChange={e => setOpenTime(e.target.value)} /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Fechamento</label><input type="time" className="border dark:border-gray-700 p-4 rounded-2xl w-full bg-white dark:bg-gray-800 font-bold dark:text-white" value={closeTime} onChange={e => setCloseTime(e.target.value)} /></div>
                    </div>

                    <div className="mt-6">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Dias de Funcionamento</label>
                        <div className="flex gap-2 flex-wrap">
                            {diasSemana.map(dia => (
                                <button key={dia.id} onClick={() => toggleDay(dia.id)} className={`w-10 h-10 rounded-xl font-bold text-xs border transition ${workDays.includes(dia.id) ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700"}`}>
                                    {dia.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </fieldset>

                <div className="border-t dark:border-gray-700 pt-6 mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Moon className="text-gray-500 dark:text-gray-400" />
                        <div><p className="font-bold text-gray-800 dark:text-white uppercase text-sm tracking-widest">Modo Noturno</p></div>
                    </div>
                    <button onClick={toggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                {userRole === "ADMIN" && (
                    <button onClick={salvarConfig} className="mt-8 bg-black dark:bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-xl hover:scale-[1.02] transition active:scale-95 flex items-center justify-center gap-2">
                        <Save size={18} /> Salvar Alterações
                    </button>
                )}
            </div>
        </div>
    );
}
