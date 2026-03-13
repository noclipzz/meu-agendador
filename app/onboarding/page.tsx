"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, CheckCircle2, ChevronRight, Upload } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [verificando, setVerificando] = useState(true);

    useEffect(() => {
        async function checkAccess() {
            try {
                const res = await fetch('/api/checkout');
                const data = await res.json();

                if (!data.active) {
                    toast.error("Você precisa de uma assinatura ativa para acessar o onboarding.");
                    router.push('/#planos');
                    return;
                }

                if (!data.companyId) {
                    router.push('/novo-negocio');
                    return;
                }

                if (data.onboardingCompleted) {
                    router.push('/painel/dashboard');
                    return;
                }

                setVerificando(false);
            } catch (error) {
                console.error("Erro ao verificar acesso:", error);
                router.push('/');
            }
        }
        checkAccess();
    }, [router]);

    // Step 1: Servico
    const [servicoName, setServicoName] = useState("");
    const [servicoDuracao, setServicoDuracao] = useState("60");
    const [servicoPreco, setServicoPreco] = useState("");

    // Step 2: Horarios
    const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]); // Seg a Sex
    const [horariosPorDia, setHorariosPorDia] = useState<Record<number, { openTime: string, closeTime: string }>>({
        0: { openTime: "08:00", closeTime: "17:00" },
        1: { openTime: "08:00", closeTime: "17:00" },
        2: { openTime: "08:00", closeTime: "17:00" },
        3: { openTime: "08:00", closeTime: "17:00" },
        4: { openTime: "08:00", closeTime: "17:00" },
        5: { openTime: "08:00", closeTime: "17:00" },
        6: { openTime: "08:00", closeTime: "17:00" },
    });
    const [editandoHorario, setEditandoHorario] = useState<number | null>(null);

    // Servico Imagem
    const [servicoImagemObj, setServicoImagemObj] = useState<File | null>(null);

    // Step 3: Detalhes
    const [ramo, setRamo] = useState("");
    const [cor, setCor] = useState("#2563eb"); // bg-blue-600 default
    const [logoObj, setLogoObj] = useState<File | null>(null);

    const toggleDia = (dia: number) => {
        if (dias.includes(dia)) setDias(dias.filter((d) => d !== dia));
        else setDias([...dias, dia]);
    };

    const handleNext = () => {
        if (step === 1) {
            if (!servicoName || !servicoPreco) return toast.error("Preencha o nome e valor do serviço.");
            setStep(2);
        } else if (step === 2) {
            if (dias.length === 0) return toast.error("Selecione pelo menos um dia de trabalho.");
            setStep(3);
        }
    };

    const handleFinish = async () => {
        if (!ramo) return toast.error("Selecione seu ramo de atuação.");

        setLoading(true);

        try {
            // First we can upload logo if exists (Optional - will be standard base64 or upload API)
            let uploadedServiceUrl = "";

            if (servicoImagemObj) {
                const formData = new FormData();
                formData.append("file", servicoImagemObj);
                try {
                    const uploadRes = await fetch(`/api/upload?filename=${encodeURIComponent(servicoImagemObj.name)}`, {
                        method: "POST",
                        body: servicoImagemObj,
                    });
                    if (uploadRes.ok) {
                        const uploadData = await uploadRes.json();
                        uploadedServiceUrl = uploadData.url;
                    }
                } catch (e) {
                    console.error("Subida da imagem falhou", e);
                }
            }

            const payload = {
                service: {
                    name: servicoName,
                    price: parseFloat(servicoPreco.replace(/\D/g, '')) / 100,
                    duration: parseInt(servicoDuracao, 10),
                    imageUrl: uploadedServiceUrl || undefined
                },
                schedule: {
                    workDays: dias.join(","),
                    customSchedule: horariosPorDia // Send the entire customized schedule object
                },
                details: {
                    businessBranch: ramo,
                    siteColor: cor
                }
            };

            const res = await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Configuração concluída com sucesso!");
                window.location.href = "/painel/dashboard"; // Force reload to apply layout context
            } else {
                toast.error("Erro ao salvar configurações.");
                setLoading(false);
            }

        } catch (error) {
            console.error("Erro no onboarding:", error);
            toast.error("Ocorreu um erro na requisição.");
            setLoading(false);
        }
    };

    const diasSemana = [
        { id: 1, name: "Segunda" },
        { id: 2, name: "Terça-feira" },
        { id: 3, name: "Quarta-feira" },
        { id: 4, name: "Quinta-feira" },
        { id: 5, name: "Sexta-feira" },
        { id: 6, name: "Sábado" },
        { id: 0, name: "Domingo" },
    ];

    const ramosOptions = [
        "Clínicas / Consultórios",
        "Café/Bebidas",
        "Estética",
        "Salão de Beleza / Barbearia",
        "Barbearia",
        "Spa / Terapias",
        "Personal Trainer",
        "Tatuagem",
        "Pet Shop",
        "Fotografia",
        "Restaurente/Alimentos",
        "Outros"
    ];

    if (verificando) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-gray-500 font-bold animate-pulse text-sm">Verificando seu acesso...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex w-full flex-col md:flex-row font-sans">
            {/* Esquerda - Formulários */}
            <div className="w-full md:w-1/2 flex flex-col justify-center px-6 md:px-16 py-8 min-h-screen overflow-y-auto">
                <div className="mb-6">
                    {/* Logo provisória ou ícone da marca */}
                    <Image src="/nohud-logo.png" alt="Logo" width={120} height={34} className="mb-8 dark:invert-0 brightness-0" />
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3].map((st) => (
                            <div key={st} className={`h-2 w-2 rounded-full ${step >= st ? `bg-[${cor}]` : 'bg-gray-200'} transition-all duration-300 ${step === st ? 'w-4' : ''}`} style={{ backgroundColor: step >= st ? cor : '#e5e7eb' }} />
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">Vamos começar!</h1>
                            <p className="text-gray-500 mb-6 font-medium text-sm">Adicione seu primeiro serviço</p>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Nome do serviço</label>
                                        <input
                                            className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 transition-colors font-medium text-gray-800 text-sm"
                                            placeholder="Ex: Digite o serviço"
                                            value={servicoName}
                                            onChange={(e) => setServicoName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Duração do serviço</label>
                                        <select
                                            className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 bg-white font-medium text-gray-800 text-sm"
                                            value={servicoDuracao}
                                            onChange={(e) => setServicoDuracao(e.target.value)}
                                        >
                                            <option value="15">15 Min</option>
                                            <option value="30">30 Min</option>
                                            <option value="45">45 Min</option>
                                            <option value="60">1 Hora</option>
                                            <option value="90">1 Hora e 30 Min</option>
                                            <option value="120">2 Horas</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 w-full md:w-1/2">
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Valor do serviço</label>
                                    <input
                                        className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 transition-colors font-medium text-gray-800 text-sm"
                                        placeholder="Ex: R$ 150,00"
                                        value={servicoPreco}
                                        onChange={(e) => {
                                            let v = e.target.value.replace(/\D/g, "");
                                            if (!v) {
                                                setServicoPreco("");
                                                return;
                                            }
                                            v = (parseInt(v, 10) / 100).toFixed(2);
                                            v = v.replace(".", ",");
                                            v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
                                            setServicoPreco(`R$ ${v}`);
                                        }}
                                    />
                                </div>

                                <div className="mt-4 border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition relative overflow-hidden">
                                    {servicoImagemObj ? (
                                        <div className="text-sm font-semibold text-blue-600 mb-2">{servicoImagemObj.name}</div>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-2">
                                                <Upload size={20} />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-500">Upload da imagem de serviço (Opcional)</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setServicoImagemObj(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={handleNext}
                                    style={{ backgroundColor: cor }}
                                    className="px-6 py-3 mt-4 rounded-xl font-bold text-white shadow-lg hover:opacity-90 transition-all flex items-center gap-2 text-sm"
                                >
                                    <CheckCircle2 size={18} /> Salvar serviço
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">Defina seu horário de trabalho</h1>
                            <p className="text-gray-500 mb-6 font-medium max-w-sm text-sm">
                                Estas serão suas horas de trabalho padrão. Você poderá personalizar por profissional no aplicativo.
                            </p>

                            <div className="space-y-1 mb-6 border-t border-b border-gray-100 py-3 max-h-[35vh] overflow-y-auto pr-4">
                                {diasSemana.map((dia) => {
                                    const isOn = dias.includes(dia.id);
                                    return (
                                        <div key={dia.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-xl transition">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => toggleDia(dia.id)}
                                                    className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${isOn ? 'bg-blue-600' : 'bg-gray-300'}`}
                                                    style={{ backgroundColor: isOn ? cor : '#d1d5db' }}
                                                >
                                                    <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                                <span className={`font-semibold ${isOn ? 'text-gray-800' : 'text-gray-400'}`}>{dia.name}</span>
                                            </div>
                                            {isOn && (
                                                <div className="flex items-center gap-2">
                                                    {editandoHorario === dia.id ? (
                                                        <div className="flex gap-1 items-center bg-gray-100 p-1 px-2 rounded-lg">
                                                            <input type="time" className="bg-transparent text-sm font-bold text-gray-800 outline-none w-20" value={horariosPorDia[dia.id].openTime} onChange={(e) => setHorariosPorDia({ ...horariosPorDia, [dia.id]: { ...horariosPorDia[dia.id], openTime: e.target.value } })} />
                                                            <span className="text-gray-400">-</span>
                                                            <input type="time" className="bg-transparent text-sm font-bold text-gray-800 outline-none w-20" value={horariosPorDia[dia.id].closeTime} onChange={(e) => setHorariosPorDia({ ...horariosPorDia, [dia.id]: { ...horariosPorDia[dia.id], closeTime: e.target.value } })} />
                                                            <button onClick={() => setEditandoHorario(null)} className="ml-2 text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded-md">OK</button>
                                                        </div>
                                                    ) : (
                                                        <div onClick={() => setEditandoHorario(dia.id)} className="flex items-center gap-2 text-sm font-semibold text-blue-600 cursor-pointer px-2 py-1 rounded-md hover:bg-blue-50 transition" style={{ color: cor }}>
                                                            {horariosPorDia[dia.id].openTime}-{horariosPorDia[dia.id].closeTime} <span className="text-xs">✏️</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                onClick={handleNext}
                                style={{ backgroundColor: cor }}
                                className="px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:opacity-90 transition-all flex items-center gap-2 text-sm"
                            >
                                Próximo <ChevronRight size={18} />
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">Detalhes finais</h1>
                            <p className="text-gray-500 mb-6 font-medium text-sm">Personalize a cara do seu agendador</p>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Qual é o seu ramo?</label>
                                        <select
                                            className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 bg-white font-medium text-gray-800 text-sm"
                                            value={ramo}
                                            onChange={(e) => setRamo(e.target.value)}
                                        >
                                            <option value="" disabled>Selecione seu ramo</option>
                                            {ramosOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Cor do seu site</label>
                                        <div className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 flex items-center gap-2 cursor-pointer focus-within:border-blue-500">
                                            <input
                                                type="color"
                                                className="w-8 h-8 rounded-full border-none cursor-pointer p-0 bg-transparent"
                                                value={cor}
                                                onChange={(e) => setCor(e.target.value)}
                                            />
                                            <span className="font-medium text-gray-800 uppercase text-sm">{cor}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 transition relative overflow-hidden">
                                    {logoObj ? (
                                        <div className="text-sm font-semibold text-blue-600 mb-2">{logoObj.name}</div>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-2">
                                                <Image src="/file.svg" alt="Upload" width={20} height={20} className="opacity-50" />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-500">Inserir Logotipo</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setLogoObj(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={handleFinish}
                                    disabled={loading}
                                    style={{ backgroundColor: cor }}
                                    className="w-full py-3.5 rounded-xl font-bold text-white shadow-xl hover:opacity-90 active:scale-95 transition-all text-base flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : "Finalizar Configuração"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Direita - Ilusão Decorativa */}
            <div className="hidden md:flex w-1/2 bg-gray-50 relative items-center justify-center overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 rounded-bl-[10rem] opacity-20 transform translate-x-10 -translate-y-10" style={{ backgroundColor: cor }} />

                {/* Elementos Decorativos Tipo o print enviado */}
                <div className="relative z-10 w-3/4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <Image src="/dashboard-preview.png" alt="Preview" width={800} height={800} className="rounded-3xl shadow-2xl drop-shadow-2xl" />
                </div>
            </div>
        </div>
    );
}
