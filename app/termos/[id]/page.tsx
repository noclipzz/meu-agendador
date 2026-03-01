"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Loader2, CheckCircle2, ShieldAlert } from "lucide-react";

export default function AssinarTermoPage() {
    const { id } = useParams();
    const [termo, setTermo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [signed, setSigned] = useState(false);
    const [error, setError] = useState("");

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        async function fetchTermo() {
            try {
                const res = await fetch(`/api/termos/${id}`);
                if (!res.ok) throw new Error("Termo não encontrado.");
                const data = await res.json();
                setTermo(data);
                if (data.status === "ASSINADO") setSigned(true);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchTermo();
    }, [id]);

    // Funções do Canvas para assinatura
    const getCoordinates = (e: any, canvas: HTMLCanvasElement) => {
        const bcr = canvas.getBoundingClientRect();
        const scaleX = canvas.width / bcr.width;
        const scaleY = canvas.height / bcr.height;
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX || e.nativeEvent.clientX;
            clientY = e.clientY || e.nativeEvent.clientY;
        }
        return {
            x: (clientX - bcr.left) * scaleX,
            y: (clientY - bcr.top) * scaleY
        };
    };

    const startDrawing = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { x, y } = getCoordinates(e, canvas);

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Evitar scroll nativo ao assinar no touch
        if (e.cancelable) e.preventDefault();

        const { x, y } = getCoordinates(e, canvas);

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.closePath();
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleAssinar = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Verifica se a tela está "em branco"
        const isBlank = () => {
            const pixelBuffer = new Uint32Array(
                canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data.buffer
            );
            return !pixelBuffer.some(color => color !== 0);
        };

        if (isBlank()) {
            alert("Por favor, faça sua assinatura antes de confirmar.");
            return;
        }

        setSigning(true);
        try {
            // Pega dados do SO para rastreabilidade básica (no client)
            const userAgent = window.navigator.userAgent;

            const resIp = await fetch("https://api.ipify.org?format=json").catch(() => null);
            let ip = "Desconhecido";
            if (resIp) {
                const ipData = await resIp.json();
                ip = ipData.ip;
            }

            // Converte imagem do canvas para base64
            const signatureDataUrl = canvas.toDataURL("image/png");

            const res = await fetch(`/api/termos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    signatureUrl: signatureDataUrl,
                    clientIp: ip,
                    clientUserAgent: userAgent,
                }),
            });

            if (!res.ok) throw new Error("Falha ao salvar assinatura");

            const updatedTermo = await res.json();
            setTermo(updatedTermo);
            setSigned(true);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSigning(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm text-center">Carregando Termo de Consentimento...</p>
            </div>
        );
    }

    if (error || !termo) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <ShieldAlert className="text-red-500 mb-4" size={60} />
                <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">Ops! Ocorreu um erro</h1>
                <p className="text-gray-500 font-medium text-center">{error || "Termo não encontrado ou indisponível."}</p>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gray-100 flex flex-col py-8 px-4 font-sans">
            <div className="max-w-2xl w-full mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">

                {/* Cabeçalho do Termo */}
                <div className="p-6 md:p-10 bg-gray-50 border-b border-gray-200 text-center">
                    {termo.company?.logoUrl && (
                        <img src={termo.company.logoUrl} alt="Logo" className="h-16 mx-auto mb-6 object-contain" />
                    )}
                    <h1 className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-tight mb-2">{termo.title}</h1>
                    <p className="text-blue-600 font-bold text-sm uppercase tracking-widest">{termo.company?.name || "Clínica"}</p>
                </div>

                {/* Corpo Textual */}
                <div className="p-6 md:p-10 border-b border-gray-200 max-h-[40vh] overflow-y-auto custom-scrollbar">
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {termo.content}
                    </div>
                </div>

                {/* Área de Signatário */}
                <div className={`p-6 md:p-10 ${signed ? 'bg-green-50/50' : 'bg-blue-50/50'}`}>
                    {signed && (
                        <div className="mb-8 flex items-center gap-3 bg-green-100/50 text-green-800 p-4 rounded-2xl border border-green-200/50">
                            <CheckCircle2 size={24} className="text-green-600 shrink-0" />
                            <div>
                                <p className="text-sm font-black uppercase tracking-wide">Assinado com Sucesso</p>
                                <p className="text-xs font-bold opacity-80 mt-0.5">Este termo eletrônico possui validade jurídica e IP registrado.</p>
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Signatário(a)</h3>
                        <p className="font-bold text-lg text-gray-800 truncate">{termo.client?.name}</p>
                        {(termo.client?.cpf || termo.client?.rg) && (
                            <p className="text-xs text-gray-500 mt-1 uppercase">Doc: {termo.client?.cpf || termo.client?.rg}</p>
                        )}
                    </div>

                    {signed ? (
                        <div className="mb-4 animate-in fade-in duration-500">
                            <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Assinatura Eletrônica Registrada</h3>
                            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden w-full max-w-[500px] h-[200px] flex items-center justify-center p-4">
                                {termo.signatureUrl ? (
                                    <img src={termo.signatureUrl} alt="Assinatura" className="max-w-full max-h-full object-contain pointer-events-none mix-blend-multiply" />
                                ) : (
                                    <span className="text-gray-400 italic font-medium">Assinatura não disponível.</span>
                                )}
                            </div>

                            <div className="mt-6 flex flex-col gap-2 bg-white/50 p-4 shrink-0 overflow-hidden rounded-2xl border border-gray-200/50">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Registros de Auditoria</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                    <div className="min-w-0">
                                        <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Data e Hora</p>
                                        <p className="text-xs font-bold text-gray-700">{format(new Date(termo.signedAt || new Date()), "dd/MM/yyyy HH:mm:ss")}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Endereço IP</p>
                                        <p className="text-xs font-bold text-gray-700">{termo.clientIp || "Não registrado"}</p>
                                    </div>
                                    <div className="md:col-span-2 min-w-0">
                                        <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Dispositivo (User Agent)</p>
                                        <p className="text-xs font-bold text-gray-700 truncate" title={termo.clientUserAgent}>{termo.clientUserAgent || "Não registrado"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 animate-in fade-in duration-500">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Sua Assinatura</label>
                                <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden w-full max-w-[500px] h-[200px] touch-none shadow-inner mx-auto relative group">
                                    <canvas
                                        ref={canvasRef}
                                        width={500}
                                        height={200}
                                        className="w-full h-full cursor-crosshair"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                    <button
                                        onClick={clearCanvas}
                                        className="absolute top-2 right-2 text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
                                    >
                                        Limpar
                                    </button>
                                </div>
                            </div>

                            <div className="text-center animate-in fade-in duration-500 delay-100">
                                <p className="text-[10px] text-gray-400 font-bold mb-6 max-w-md mx-auto leading-relaxed">
                                    Ao assinar e confirmar, você reconhece que leu e concorda integralmente com os termos descritos acima. O seu IP e informações de acesso serão registrados para fins de segurança jurídica.
                                </p>

                                <button
                                    onClick={handleAssinar}
                                    disabled={signing}
                                    className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mx-auto"
                                >
                                    {signing ? <Loader2 className="animate-spin" size={18} /> : null}
                                    {signing ? "Confirmando..." : "Assinar e Confirmar Termos"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
