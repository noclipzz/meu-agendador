"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
    Loader2, ArrowRight, CheckCircle2, ChevronRight, Upload, 
    Smartphone, Scissors, Sparkles, Building2, Store, 
    User, Users, MapPin, Globe, Palette, Check, X, Camera, Plus, Trash2, ShoppingBag, Clock
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { upload } from "@vercel/blob/client";

// --- TEMPLATES POR RAMO ---
const SERVICE_TEMPLATES: Record<string, { name: string, price: string, duration: string }[]> = {
    "Salão de Beleza / Barbearia": [
        { name: "Corte Masculino", price: "40.00", duration: "30" },
        { name: "Corte Feminino", price: "80.00", duration: "60" },
        { name: "Escova", price: "50.00", duration: "45" },
    ],
    "Barbearia": [
        { name: "Corte Social", price: "35.00", duration: "30" },
        { name: "Barba", price: "25.00", duration: "30" },
        { name: "Corte + Barba", price: "55.00", duration: "60" },
    ],
    "Estética": [
        { name: "Limpeza de Pele", price: "120.00", duration: "60" },
        { name: "Design de Sobrancelhas", price: "45.00", duration: "30" },
        { name: "Massagem Relaxante", price: "100.00", duration: "60" },
    ],
    "Clínicas / Consultórios": [
        { name: "Consulta de Avaliação", price: "150.00", duration: "30" },
        { name: "Retorno", price: "0.00", duration: "20" },
    ],
    "Pet Shop": [
        { name: "Banho Porte Médio", price: "60.00", duration: "60" },
        { name: "Tosa Higiênica", price: "30.00", duration: "30" },
    ]
};
const PRODUCT_TEMPLATES: Record<string, { name: string, price: string }[]> = {
    "Salão de Beleza / Barbearia": [
        { name: "Shampoo Profissional", price: "75.00" },
        { name: "Máscara de Hidratação", price: "120.00" },
    ],
    "Barbearia": [
        { name: "Pomada Modeladora", price: "45.00" },
        { name: "Óleo para Barba", price: "35.00" },
    ],
    "Estética": [
        { name: "Sérum Facial", price: "85.00" },
        { name: "Protetor Solar FPS 50", price: "95.00" },
    ],
    "Clínicas / Consultórios": [
        { name: "Suplemento Vitamínico", price: "60.00" },
    ],
    "Pet Shop": [
        { name: "Ração Premium 1kg", price: "45.00" },
        { name: "Brinquedo Mordedor", price: "25.00" },
    ]
};

const SERVICE_PLACEHOLDERS: Record<string, string> = {
    "Salão de Beleza / Barbearia": "Ex: Corte de Cabelo",
    "Barbearia": "Ex: Corte Social",
    "Estética": "Ex: Limpeza de Pele",
    "Clínicas / Consultórios": "Ex: Consulta Médica",
    "Pet Shop": "Ex: Banho e Tosa",
    "Outros": "Ex: Meu Serviço"
};

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [verificando, setVerificando] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [companyId, setCompanyId] = useState("");
    const [plan, setPlan] = useState("FREE");

    // --- ESTADO GERAL ---
    const [companyName, setCompanyName] = useState("");
    const [slug, setSlug] = useState("");
    const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [ramo, setRamo] = useState("Salão de Beleza / Barbearia");
    
    // Perfil (Passo 2)
    const [ownerName, setOwnerName] = useState("");
    const [ownerPhone, setOwnerPhone] = useState("");
    const [ownerPhoto, setOwnerPhoto] = useState("");
    const [ownerFile, setOwnerFile] = useState<File | null>(null);

    // Serviço (Passo 3)
    const [servicoName, setServicoName] = useState("");
    const [servicoDuracao, setServicoDuracao] = useState("60");
    const [servicoPreco, setServicoPreco] = useState("");
    const [servicoImagem, setServicoImagem] = useState("");
    const [servicoFile, setServicoFile] = useState<File | null>(null);

    // Vitrine (Passo 4)
    const [products, setProducts] = useState<{ name: string, price: string, id: number }[]>([]);
    
    // Cliente (Passo 5)
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");

    // Agenda (Passo 6)
    const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
    const [horariosPorDia, setHorariosPorDia] = useState<Record<number, { openTime: string, closeTime: string }>>({
        0: { openTime: "08:00", closeTime: "17:00" },
        1: { openTime: "08:00", closeTime: "17:00" },
        2: { openTime: "08:00", closeTime: "17:00" },
        3: { openTime: "08:00", closeTime: "17:00" },
        4: { openTime: "08:00", closeTime: "17:00" },
        5: { openTime: "08:00", closeTime: "17:00" },
        6: { openTime: "08:00", closeTime: "17:00" },
    });

    // Design (Passo 7)
    const [cor, setCor] = useState("#2563eb");
    const [logoUrl, setLogoUrl] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [editandoHorario, setEditandoHorario] = useState<number | null>(null);
    
    const logoRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function checkAccess() {
            try {
                const res = await fetch('/api/checkout');
                const data = await res.json();

                if (!data.active) {
                    router.push('/#planos');
                    return;
                }

                if (data.onboardingCompleted) {
                    router.push('/painel/dashboard');
                    return;
                }

                setIsAdmin(data.role === "ADMIN");
                setCompanyId(data.companyId || "");
                setCompanyName(data.companyName || "");
                setSlug(data.slug || "");
                setPlan(data.plan || "FREE");
                setOwnerName(data.userName || ""); // Clerk name if available
                setVerificando(false);
            } catch (error) {
                console.error("Erro ao verificar acesso:", error);
                router.push('/');
            }
        }
        checkAccess();
    }, [router]);

    useEffect(() => {
        if (!slug || slug.length < 3) {
            setIsSlugAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setCheckingSlug(true);
            try {
                // We use the existing config API to check if the slug is available
                // If it's the current company's slug, it's fine.
                const res = await fetch(`/api/painel/config/check-slug?slug=${slug}&companyId=${companyId}`);
                const data = await res.json();
                setIsSlugAvailable(data.available);
            } catch (e) {
                console.error("Erro check slug", e);
            } finally {
                setCheckingSlug(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [slug, companyId]);

    // --- HANDLERS ---
    const handleNext = async (forceSkip = false) => {
        if (step === 1) {
            if (!companyName || !slug) return toast.error("Preencha o nome e escolha seu link.");
            if (isSlugAvailable === false) return toast.error("Este link já está sendo usado.");
            
            // Se não tem empresa ainda, cria agora
            if (!companyId) {
                setLoading(true);
                try {
                    const res = await fetch('/api/painel/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: companyName, slug: slug })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setCompanyId(data.id);
                        setStep(2);
                    } else {
                        toast.error(data.error || "Erro ao criar empresa.");
                    }
                } catch (e) {
                    toast.error("Erro de conexão.");
                } finally {
                    setLoading(false);
                }
            } else {
                setStep(2);
            }
        } else if (step === 2) {
            setStep(3);
        } else if (step === 3) {
            if (!forceSkip && (!servicoName || !servicoPreco)) {
                return toast.error("Preencha o nome e valor do primeiro serviço.");
            }
            // Pula vitrine se não for premium
            if (plan === "INDIVIDUAL" || plan === "FREE") {
                setStep(5);
            } else {
                setStep(4);
            }
        } else if (step === 4) {
            setStep(5);
        } else if (step === 5) {
            setStep(6);
        } else if (step === 6) {
            setStep(7);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            if (step === 5 && (plan === "INDIVIDUAL" || plan === "FREE")) {
                setStep(3);
            } else {
                setStep(step - 1);
            }
        }
    };

    async function uploadFile(file: File, prefix: string) {
        try {
            const newBlob = await upload(`${prefix}_${Date.now()}_${file.name}`, file, {
                access: 'public',
                handleUploadUrl: '/api/upload/token',
            });
            return newBlob.url;
        } catch (e) {
            console.error("Upload failed", e);
            return "";
        }
    }

    const handleFinish = async () => {
        setLoading(true);
        try {
            let finalLogo = logoUrl;
            let finalPhoto = ownerPhoto;
            let finalServiceImg = servicoImagem;

            if (logoFile) finalLogo = await uploadFile(logoFile, "logo");
            if (ownerFile) finalPhoto = await uploadFile(ownerFile, "owner");
            if (servicoFile) finalServiceImg = await uploadFile(servicoFile, "service");

            const payload = {
                companyData: { name: companyName, slug: slug },
                ownerProfessional: { name: ownerName, phone: ownerPhone, photoUrl: finalPhoto },
                service: servicoName ? { 
                    name: servicoName, 
                    price: parseFloat(servicoPreco.replace(/[^\d]/g, "") || "0") / 100, 
                    duration: parseInt(servicoDuracao), 
                    imageUrl: finalServiceImg 
                } : null,
                products: products.map(p => ({
                    name: p.name,
                    price: parseFloat(p.price.replace(/[^\d]/g, "")) / 100,
                    quantity: 10
                })),
                client: clientName ? { name: clientName, phone: clientPhone } : null,
                schedule: { workDays: dias.join(","), customSchedule: horariosPorDia },
                details: { businessBranch: ramo, siteColor: cor, logoUrl: finalLogo }
            };

            const res = await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Tudo pronto! Bem-vindo ao Nohud.");
                window.location.href = "/painel/dashboard";
            } else {
                toast.error("Erro ao salvar sua configuração.");
                setLoading(false);
            }
        } catch (error) {
            toast.error("Erro de conexão.");
            setLoading(false);
        }
    };

    const applyTemplate = (name: string, price: string, duration: string) => {
        setServicoName(name);
        setServicoPreco(`R$ ${price.replace(".", ",")}`);
        setServicoDuracao(duration);
    };

    const addProduct = (name: string, price: string) => {
        setProducts([...products, { name, price: `R$ ${price.replace(".", ",")}`, id: Date.now() }]);
    };

    // --- UI HELPERS ---
    const ramosOptions = Object.keys(SERVICE_TEMPLATES).concat("Outros");
    const steps = ["Identidade", "Perfil", "Serviços", "Vitrine", "Clientes", "Agenda", "Design"];
    const currentStepTitle = steps[step - 1];

    if (verificando) return <div className="h-screen flex flex-col items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600 mb-4" size={40} /><p className="text-gray-500 font-bold animate-pulse">Carregando...</p></div>;

    return (
        <div className="min-h-screen bg-white flex w-full flex-col lg:flex-row font-sans overflow-hidden">
            {/* --- ESQUERDA: FORMULÁRIO --- */}
            <div className="w-full lg:w-[60%] flex flex-col px-6 md:px-16 py-12 h-screen overflow-y-auto custom-scrollbar">
                
                {/* Header Onboarding */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-8">
                        <Image src="/nohud-logo.png" alt="Logo" width={100} height={30} className="brightness-0" />
                        <div className="h-6 w-px bg-gray-200 hidden md:block" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest hidden md:block">Configuração Inicial</span>
                    </div>

                    <div className="flex gap-1.5 mb-2">
                        {steps.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step > i ? 'bg-blue-600' : 'bg-gray-100'}`}
                                style={{ backgroundColor: step > i ? cor : '#f3f4f6' }}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Passo {step} de {steps.length}</p>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter" style={{ color: cor }}>{currentStepTitle}</p>
                    </div>
                </div>

                {/* --- PASSO 1: IDENTIDADE --- */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Qual o nome do seu negócio?</h1>
                            <p className="text-gray-500 font-medium">Isso será exibido no topo do seu link de agendamento.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Nome Fantasia</label>
                                <input 
                                    className="w-full text-2xl font-black border-b-4 border-gray-100 focus:border-blue-500 outline-none pb-2 transition-all"
                                    placeholder="Ex: Studio VIP"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Seu link de agendamento</label>
                                <div className="flex items-end gap-2 text-xl font-bold bg-gray-50 p-4 rounded-3xl border border-dashed border-gray-200">
                                    <input 
                                        className="bg-transparent border-b-2 border-blue-200 text-blue-600 outline-none w-full lowercase"
                                        placeholder="meu-negocio"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''))}
                                    />
                                    <span className="text-gray-400 whitespace-nowrap">.nohud.com.br</span>
                                    {checkingSlug ? <Loader2 size={16} className="animate-spin text-gray-400" /> : isSlugAvailable === true ? <Check size={16} className="text-green-500" /> : isSlugAvailable === false ? <X size={16} className="text-red-500" /> : null}
                                </div>
                                <p className="text-[10px] text-gray-400 italic">
                                    {isSlugAvailable === false ? "❌ Este link já está em uso." : "💡 Escolha um nome curto e fácil de lembrar."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PASSO 2: PERFIL --- */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div className="space-y-2 text-center md:text-left">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Quem é você?</h1>
                            <p className="text-gray-500 font-medium">Seu nome aparecerá para os clientes na hora de escolher quem vai atendê-los.</p>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-10 bg-blue-50/50 p-8 rounded-[3rem] border border-blue-100/50">
                            <div className="relative group cursor-pointer">
                                <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center overflow-hidden border-4 border-white group-hover:scale-105 transition">
                                    {ownerFile ? (
                                        <img src={URL.createObjectURL(ownerFile)} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={64} className="text-blue-200" />
                                    )}
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white">
                                    <Camera size={20} />
                                </div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && setOwnerFile(e.target.files[0])} />
                            </div>

                            <div className="flex-1 space-y-6 w-full">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Seu Nome Profissional</label>
                                    <input 
                                        className="w-full bg-transparent border-b-2 border-blue-200 text-xl font-bold outline-none pb-1"
                                        placeholder="Ex: João da Silva"
                                        value={ownerName}
                                        onChange={e => setOwnerName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Seu WhatsApp</label>
                                    <input 
                                        className="w-full bg-transparent border-b-2 border-blue-200 text-xl font-bold outline-none pb-1"
                                        placeholder="(00) 00000-0000"
                                        value={ownerPhone}
                                        onChange={e => setOwnerPhone(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PASSO 3: SERVIÇOS --- */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">O que você oferece?</h1>
                            <p className="text-gray-500 font-medium text-sm">Cadastre o seu principal serviço agora. Você poderá adicionar outros depois.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Ramo do Negócio</label>
                                    <select className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm" value={ramo} onChange={e => setRamo(e.target.value)}>
                                        {ramosOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-4 pt-2 border-t border-gray-100">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sugestões Rápidas:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(SERVICE_TEMPLATES[ramo] || []).map(t => (
                                            <button 
                                                key={t.name}
                                                onClick={() => applyTemplate(t.name, t.price, t.duration)}
                                                className="px-4 py-3 bg-blue-50 text-blue-700 rounded-2xl font-bold text-xs hover:bg-blue-600 hover:text-white transition shadow-sm border border-blue-100"
                                            >
                                                + {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition">
                                    <Sparkles size={80} />
                                </div>
                                <div className="space-y-6 relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase">Nome do Serviço</label>
                                        <input className="w-full bg-transparent border-b border-gray-700 text-xl font-bold outline-none py-1 placeholder:text-gray-700" placeholder={SERVICE_PLACEHOLDERS[ramo] || "Ex: Meu Serviço"} value={servicoName} onChange={e => setServicoName(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase">Preço</label>
                                            <input className="w-full bg-transparent border-b border-gray-700 text-xl font-bold outline-none py-1 placeholder:text-gray-700" placeholder="R$ 0,00" value={servicoPreco} 
                                                onChange={e => {
                                                    let v = e.target.value.replace(/\D/g, "");
                                                    if (!v) { setServicoPreco(""); return; }
                                                    v = (parseInt(v, 10)/100).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
                                                    setServicoPreco(`R$ ${v}`);
                                                }} 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase">Duração (min)</label>
                                            <select className="w-full bg-transparent border-b border-gray-700 text-xl font-bold outline-none py-1 cursor-pointer" value={servicoDuracao} onChange={e => setServicoDuracao(e.target.value)}>
                                                <option value="15" className="text-black">15 min</option>
                                                <option value="30" className="text-black">30 min</option>
                                                <option value="45" className="text-black">45 min</option>
                                                <option value="60" className="text-black">1h</option>
                                                <option value="90" className="text-black">1h 30m</option>
                                                <option value="120" className="text-black">2h</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PASSO 4: VITRINE (PREMIUM) --- */}
                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Venda Produtos</h1>
                                <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md">PREMIUM</span>
                            </div>
                            <p className="text-gray-500 font-medium text-sm">Transforme seu agendador em uma loja completa. Seus clientes podem reservar produtos online.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-2 pb-4 overflow-x-auto custom-scrollbar">
                                {(PRODUCT_TEMPLATES[ramo] || []).map(p => (
                                    <button 
                                        key={p.name}
                                        onClick={() => addProduct(p.name, p.price)}
                                        className="flex-shrink-0 bg-amber-50 border border-amber-200 p-4 rounded-3xl flex flex-col items-center gap-2 hover:bg-amber-100 transition"
                                    >
                                        <ShoppingBag className="text-amber-600" size={24} />
                                        <div className="text-center">
                                            <p className="text-xs font-black text-amber-900">{p.name}</p>
                                            <p className="text-[10px] font-bold text-amber-600">R$ {p.price.replace(".", ",")}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="bg-gray-50 rounded-[2.5rem] p-6 border-2 border-dashed border-gray-200">
                                {products.length === 0 ? (
                                    <div className="py-10 text-center space-y-2">
                                        <Store className="text-gray-300 mx-auto" size={48} />
                                        <p className="text-gray-400 font-bold text-sm">Nenhum produto adicionado ainda.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {products.map(p => (
                                            <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center animate-in zoom-in-95">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                                        <Check size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm">{p.name}</p>
                                                        <p className="text-xs font-bold text-blue-600" style={{ color: cor }}>{p.price}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setProducts(products.filter(item => item.id !== p.id))} className="p-2 text-gray-300 hover:text-red-500 transition">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PASSO 5: CLIENTES --- */}
                {step === 5 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Seu primeiro cliente</h1>
                            <p className="text-gray-500 font-medium">Já tem algum cliente em mente? Adicione-o agora para já ver o sistema funcionando.</p>
                        </div>

                        <div className="bg-gray-50 p-8 rounded-[3rem] space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Nome do Cliente</label>
                                    <input className="w-full p-4 rounded-2xl bg-white border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm transition" placeholder="Ex: Maria Oliveira" value={clientName} onChange={e => setClientName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Telefone / WhatsApp</label>
                                    <input className="w-full p-4 rounded-2xl bg-white border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm transition" placeholder="(00) 00000-0000" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PASSO 6: AGENDA --- */}
                {step === 6 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Seus Horários</h1>
                            <p className="text-gray-500 font-medium text-sm">Selecione os dias em que você atende seus clientes.</p>
                        </div>

                        <div className="space-y-2 bg-gray-50 p-6 rounded-[2.5rem] max-h-[40vh] overflow-y-auto custom-scrollbar">
                            {[1, 2, 3, 4, 5, 6, 0].map(id => {
                                const diaName = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][id];
                                const isOn = dias.includes(id);
                                return (
                                    <div key={id} className={`flex items-center justify-between p-4 rounded-2xl transition ${isOn ? 'bg-white shadow-sm ring-1 ring-blue-100' : 'opacity-40'}`}>
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={() => isOn ? setDias(dias.filter(d => d !== id)) : setDias([...dias, id])}
                                                className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${isOn ? 'bg-blue-600' : 'bg-gray-300'}`}
                                                style={{ backgroundColor: isOn ? cor : '#d1d5db' }}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                            <span className="font-black text-sm">{diaName}</span>
                                        </div>
                                        {isOn && (
                                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setEditandoHorario(id)}>
                                                <span className="text-xs font-black text-blue-600" style={{ color: cor }}>{horariosPorDia[id].openTime} - {horariosPorDia[id].closeTime}</span>
                                                <ChevronRight size={14} className="text-gray-300" />
                                            </div>
                                        )}
                                        {editandoHorario === id && (
                                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                                                <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-xs space-y-6">
                                                   <h3 className="font-black text-xl text-center">Horário de {diaName}</h3>
                                                   <div className="grid grid-cols-1 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase">Abertura</label>
                                                            <input type="time" className="w-full p-4 rounded-2xl bg-gray-50 font-bold" value={horariosPorDia[id].openTime} onChange={e => setHorariosPorDia({...horariosPorDia, [id]: {...horariosPorDia[id], openTime: e.target.value}})} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase">Fechamento</label>
                                                            <input type="time" className="w-full p-4 rounded-2xl bg-gray-50 font-bold" value={horariosPorDia[id].closeTime} onChange={e => setHorariosPorDia({...horariosPorDia, [id]: {...horariosPorDia[id], closeTime: e.target.value}})} />
                                                        </div>
                                                   </div>
                                                   <button onClick={() => setEditandoHorario(null)} className="w-full p-4 bg-black text-white rounded-2xl font-black shadow-lg">Confirmar</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- PASSO 7: DESIGN --- */}
                {step === 7 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Finalização Visual</h1>
                            <p className="text-gray-500 font-medium">Sua marca, suas cores. Deixe o agendador com a sua cara.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Cor Principal</label>
                                    <div className="flex flex-wrap gap-3">
                                        {["#2563eb", "#db2777", "#059669", "#7c3aed", "#ea580c", "#111827"].map(c => (
                                            <button 
                                                key={c} 
                                                onClick={() => setCor(c)}
                                                className={`w-10 h-10 rounded-2xl transition shadow-lg ${cor === c ? 'scale-110 ring-4 ring-offset-2 ring-blue-100' : 'hover:scale-105'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                        <div className="relative">
                                            <input type="color" className="w-10 h-10 rounded-2xl border-none p-0 cursor-pointer overflow-hidden shadow-lg" value={cor} onChange={e => setCor(e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-dashed border-gray-200 text-center space-y-4">
                                    <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg border-2 border-white overflow-hidden">
                                        {logoFile ? <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-cover" /> : logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <Upload className="text-gray-300" />}
                                    </div>
                                    <button onClick={() => logoRef.current?.click()} className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-white px-4 py-2 rounded-xl shadow-sm border">Subir Logotipo</button>
                                    <input type="file" ref={logoRef} className="hidden" onChange={e => e.target.files?.[0] && setLogoFile(e.target.files[0])} />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[3rem] text-white flex flex-col justify-center text-center space-y-4 shadow-2xl">
                                <h3 className="text-2xl font-black">Pronto para começar?</h3>
                                <p className="text-gray-400 text-sm">Ao finalizar, seu painel será liberado e seu link de agendamento já estará no ar!</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Navegação */}
                <div className="mt-auto pt-12 pb-6 flex items-center justify-between">
                    <button 
                        onClick={handleBack}
                        className={`text-gray-400 font-bold flex items-center gap-1 transition ${step === 1 ? 'opacity-0 pointer-events-none' : 'hover:text-gray-900'}`}
                    >
                        Voltar
                    </button>

                    <div className="flex items-center gap-4">
                        {(step === 2 || step === 3 || step === 4 || step === 5) && (
                            <button onClick={() => handleNext(true)} className="text-gray-500 font-bold text-sm hover:text-gray-900 transition px-4 py-2 rounded-xl hover:bg-gray-100">
                                Pular
                            </button>
                        )}
                        
                        {step < steps.length ? (
                            <button 
                                onClick={() => handleNext()} 
                                disabled={loading}
                                className="bg-black text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group disabled:bg-gray-400"
                                style={{ backgroundColor: cor }}
                            >
                                {loading && step === 1 ? <Loader2 className="animate-spin text-white" /> : "Próximo"} <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <button 
                                onClick={handleFinish} 
                                disabled={loading}
                                className="bg-green-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:bg-gray-400"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />} Finalizar Configuração
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* --- DIREITA: LIVE PREVIEW --- */}
            <div className="hidden lg:flex w-[40%] bg-gray-50 items-center justify-center p-12 relative overflow-hidden">
                {/* Efeito Decorativo */}
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-[100px] pointer-events-none" style={{ backgroundColor: cor }} />
                <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10 blur-[80px] pointer-events-none" style={{ backgroundColor: cor }} />

                <div className="relative z-10 w-full max-w-[320px] h-[650px] bg-black rounded-[3.5rem] p-3 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[8px] border-gray-900 scale-[0.9] xl:scale-100 transition-transform duration-700 hover:rotate-1">
                    {/* Speaker/Camera notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-20" />
                    
                    {/* Conteúdo da Tela */}
                    <div className="w-full h-full bg-white rounded-[2.8rem] overflow-hidden flex flex-col relative transition-all duration-500">
                        {/* Status Bar Faker */}
                        <div className="h-6 w-full flex justify-between px-6 pt-1 text-[10px] font-bold text-gray-400">
                            <span>15:42</span>
                            <div className="flex gap-1 items-center">
                                <div className="w-3 h-2 bg-gray-200 rounded-sm" />
                                <div className="w-4 h-2 bg-gray-300 rounded-sm" />
                            </div>
                        </div>

                        {/* Top Profile / Logo */}
                        <div className="p-6 text-center space-y-4">
                            <div className="w-20 h-20 mx-auto rounded-3xl shadow-lg border-2 border-white overflow-hidden flex items-center justify-center bg-gray-50">
                                {logoFile ? <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-cover" /> : logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <div className="text-2xl font-black text-gray-200">{companyName?.[0] || "?"}</div>}
                            </div>
                            <h3 className="font-black text-lg text-gray-900 leading-tight">{companyName || "Seu Negócio"}</h3>
                            <div className="flex gap-1 justify-center">
                                {[1,2,3,4,5].map(i => <Sparkles key={i} size={10} className="text-amber-400 fill-amber-400" />)}
                            </div>
                        </div>

                        {/* Body - Progressive View */}
                        <div className="flex-1 overflow-y-auto px-4 space-y-4 custom-scrollbar pb-10">
                            {/* Card Profissional */}
                            {ownerName && (
                                <div className="bg-gray-50 p-4 rounded-3xl flex items-center justify-between border border-gray-100 animate-in slide-in-from-right-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm overflow-hidden flex items-center justify-center">
                                            {ownerFile ? <img src={URL.createObjectURL(ownerFile)} className="w-full h-full object-cover" /> : <User className="text-gray-200" size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase">Profissional</p>
                                            <p className="text-xs font-bold text-gray-900">{ownerName}</p>
                                        </div>
                                    </div>
                                    <CheckCircle2 size={16} className="text-blue-600" style={{ color: cor }} />
                                </div>
                            )}

                            {/* Card Serviços */}
                            {servicoName && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase px-1">Serviços</p>
                                    <div className="bg-white p-4 rounded-[2rem] shadow-sm border-2 animate-in zoom-in-95" style={{ borderColor: `${cor}20` }}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-black text-xs text-gray-900">{servicoName}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Clock size={10} className="text-gray-400" />
                                                    <span className="text-[10px] font-bold text-gray-400">{servicoDuracao} min</span>
                                                </div>
                                            </div>
                                            <span className="font-black text-xs text-blue-600" style={{ color: cor }}>{servicoPreco || "R$ 0,00"}</span>
                                        </div>
                                        <button className="w-full mt-4 py-2 rounded-xl text-white font-black text-[10px] shadow-lg shadow-blue-500/20" style={{ backgroundColor: cor }}>AGENDAR</button>
                                    </div>
                                </div>
                            )}

                            {/* Vitrine */}
                            {products.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase px-1">Vitrine</p>
                                    <div className="flex gap-2 overflow-x-hidden pb-1">
                                        {products.slice(0,2).map(p => (
                                            <div key={p.id} className="w-1/2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                                <div className="w-full h-20 bg-white rounded-xl mb-2 flex items-center justify-center">
                                                    <ShoppingBag size={20} className="text-gray-200" />
                                                </div>
                                                <p className="text-[9px] font-black truncate">{p.name}</p>
                                                <p className="text-[9px] font-bold text-blue-600" style={{ color: cor }}>{p.price}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Banner */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 text-center">
                            <div className="bg-gray-900/5 backdrop-blur-md px-4 py-2 rounded-full inline-flex items-center gap-2">
                                <Globe size={10} className="text-gray-400" />
                                <span className="text-[8px] font-black text-gray-400 tracking-tighter uppercase">
                                    {slug ? `${slug}.nohud.com.br` : "seu-link.nohud.com.br"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Texto Auxiliar Lateral */}
                <div className="absolute bottom-10 text-center space-y-1">
                    <p className="text-gray-400 font-black text-[10px] uppercase tracking-[.3em]">Live Preview</p>
                    <p className="text-gray-300 text-[10px] italic">Veja como seu agendador fica no celular</p>
                </div>
            </div>

            {/* Overlay Mobile para previes (Opcional) */}
            <div className="lg:hidden fixed bottom-6 right-6 z-[100]">
                <button className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-2xl relative animate-bounce">
                    <Smartphone size={24} />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                </button>
            </div>
        </div>
    );
}
