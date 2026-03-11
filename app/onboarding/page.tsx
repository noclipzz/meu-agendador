"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, CheckCircle2, ChevronRight, Upload } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Servico
    const [servicoName, setServicoName] = useState("");
    const [servicoDuracao, setServicoDuracao] = useState("60");
    const [servicoPreco, setServicoPreco] = useState("");

    // Step 2: Horarios
    const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]); // Seg a Sex
    const [horaAbre, setHoraAbre] = useState("08:00");
    const [horaFecha, setHoraFecha] = useState("17:00");

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
            // Para simplicidade, assumindo que a API aceita JSON e fazemos o Logo num upload separado se precisar.
            
            const payload = {
                service: {
                    name: servicoName,
                    price: parseFloat(servicoPreco.replace(',', '.')),
                    duration: parseInt(servicoDuracao, 10)
                },
                schedule: {
                    workDays: dias.join(","),
                    openTime: horaAbre,
                    closeTime: horaFecha
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
        "Designer de Sobrancelha / Micropigmentação",
        "Esmalteria / Podólogo",
        "Bronzeamento",
        "Estética / Depilação",
        "Lashes / Cílios",
        "Cabeleireira / Trancista / Maquiagem",
        "Fisioterapia / Massagem / Massoterapia",
        "Barbearia",
        "Spa / Terapias",
        "Saúde / Médico / Dentista",
        "Tatuagem",
        "Pet Shop",
        "Fotografia",
        "Outros"
    ];

    return (
        <div className="min-h-screen bg-white flex w-full flex-col md:flex-row font-sans">
            {/* Esquerda - Formulários */}
            <div className="w-full md:w-1/2 flex flex-col justify-center px-10 md:px-24 py-12 h-screen overflow-y-auto">
                <div className="mb-10">
                    {/* Logo provisória ou ícone da marca */}
                    <Image src="/nohud-logo.png" alt="Logo" width={140} height={40} className="mb-12 dark:invert-0 brightness-0" />
                    <div className="flex gap-2 mb-8">
                        {[1, 2, 3].map((st) => (
                            <div key={st} className={`h-2 w-2 rounded-full ${step >= st ? `bg-[${cor}]` : 'bg-gray-200'} transition-all duration-300 ${step === st ? 'w-4' : ''}`} style={{ backgroundColor: step >= st ? cor : '#e5e7eb' }} />
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                            <h1 className="text-4xl font-bold mb-3 text-gray-900">Vamos começar!</h1>
                            <p className="text-gray-500 mb-8 font-medium">Adicione seu primeiro serviço</p>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Nome do serviço</label>
                                        <input
                                            className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-medium text-gray-800"
                                            placeholder="Ex: Dedetização"
                                            value={servicoName}
                                            onChange={(e) => setServicoName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Duração do serviço</label>
                                        <select
                                            className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 bg-white font-medium text-gray-800"
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
                                        className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-medium text-gray-800"
                                        placeholder="Ex: 150,00"
                                        value={servicoPreco}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9,]/g, '');
                                            setServicoPreco(val);
                                        }}
                                    />
                                </div>

                                <div className="mt-8 border-2 border-dashed border-gray-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition">
                                    <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3">
                                        <Upload size={20} />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-500">Upload da imagem de serviço (Opcional)</span>
                                </div>

                                <button
                                    onClick={handleNext}
                                    style={{ backgroundColor: cor }}
                                    className="px-8 py-3.5 mt-8 rounded-2xl font-bold text-white shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
                                >
                                    <CheckCircle2 size={20} /> Salvar serviço
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h1 className="text-4xl font-bold mb-3 text-gray-900">Defina seu horário de trabalho</h1>
                            <p className="text-gray-500 mb-8 font-medium max-w-sm">
                                Estas serão suas horas de trabalho padrão. Você poderá personalizar as horas de trabalho para cada profissional ou serviço no aplicativo.
                            </p>

                            <div className="space-y-2 mb-8 border-t border-b border-gray-100 py-4 max-h-[40vh] overflow-y-auto pr-4">
                                {diasSemana.map((dia) => {
                                    const isOn = dias.includes(dia.id);
                                    return (
                                        <div key={dia.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-xl transition">
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
                                                <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 cursor-pointer" style={{ color: cor }}>
                                                    {horaAbre}-{horaFecha} <span className="text-xs" title="Editar">✏️</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                onClick={handleNext}
                                style={{ backgroundColor: cor }}
                                className="px-8 py-3.5 rounded-2xl font-bold text-white shadow-lg  hover:opacity-90 transition-all flex items-center gap-2"
                            >
                                Próximo <ChevronRight size={20} />
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h1 className="text-4xl font-bold mb-3 text-gray-900">Detalhes finais</h1>
                            <p className="text-gray-500 mb-8 font-medium">Personalize a cara do seu agendador</p>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Qual é o seu ramo?</label>
                                        <select
                                            className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 bg-white font-medium text-gray-800"
                                            value={ramo}
                                            onChange={(e) => setRamo(e.target.value)}
                                        >
                                            <option value="" disabled>Selecione seu ramo</option>
                                            {ramosOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Cor do seu site</label>
                                        <div className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2 cursor-pointer focus-within:border-blue-500">
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

                                <div className="mt-8 border-2 border-dashed border-gray-200 rounded-3xl p-6 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 transition relative overflow-hidden">
                                     {logoObj ? (
                                        <div className="text-sm font-semibold text-blue-600 mb-2">{logoObj.name}</div>
                                     ): (
                                        <>
                                            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3">
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
                                    className="w-full py-4 rounded-2xl font-bold text-white shadow-xl hover:opacity-90 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
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
