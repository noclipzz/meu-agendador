"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Loader2, CheckCircle2, ShieldAlert } from "lucide-react";

export default function AssinarFichaPage() {
    const { id } = useParams();
    const [ficha, setFicha] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [signed, setSigned] = useState(false);
    const [error, setError] = useState("");

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        async function fetchFicha() {
            try {
                const res = await fetch(`/api/fichas/${id}`);
                if (!res.ok) throw new Error("Ficha não encontrada.");
                const data = await res.json();
                setFicha(data);
                if (data.status === "ASSINADO") setSigned(true);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchFicha();
    }, [id]);

    // Funções do Canvas para assinatura
    const startDrawing = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let offsetX, offsetY;
        if (e.touches && e.touches.length > 0) {
            const bcr = canvas.getBoundingClientRect();
            offsetX = e.touches[0].clientX - bcr.left;
            offsetY = e.touches[0].clientY - bcr.top;
        } else {
            offsetX = e.nativeEvent.offsetX;
            offsetY = e.nativeEvent.offsetY;
        }

        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (e.cancelable) e.preventDefault();

        let offsetX, offsetY;
        if (e.touches && e.touches.length > 0) {
            const bcr = canvas.getBoundingClientRect();
            offsetX = e.touches[0].clientX - bcr.left;
            offsetY = e.touches[0].clientY - bcr.top;
        } else {
            offsetX = e.nativeEvent.offsetX;
            offsetY = e.nativeEvent.offsetY;
        }

        ctx.lineTo(offsetX, offsetY);
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
            const userAgent = window.navigator.userAgent;

            const resIp = await fetch("https://api.ipify.org?format=json").catch(() => null);
            let ip = "Desconhecido";
            if (resIp) {
                const ipData = await resIp.json();
                ip = ipData.ip;
            }

            const signatureDataUrl = canvas.toDataURL("image/png");

            const res = await fetch(`/api/fichas/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    signatureUrl: signatureDataUrl,
                    clientIp: ip,
                    clientUserAgent: userAgent,
                }),
            });

            if (!res.ok) throw new Error("Falha ao salvar assinatura");

            const updatedFicha = await res.json();
            setFicha(updatedFicha);
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
                <Loader2 className="animate-spin text-teal-600 mb-4" size={40} />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm text-center">Carregando Ficha Técnica...</p>
            </div>
        );
    }

    if (error || !ficha) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <ShieldAlert className="text-red-500 mb-4" size={60} />
                <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">Ops! Ocorreu um erro</h1>
                <p className="text-gray-500 font-medium text-center">{error || "Ficha não encontrada ou indisponível."}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col py-8 px-4 font-sans">
            <div className="max-w-2xl w-full mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">

                {/* Cabeçalho da Ficha */}
                <div className="p-6 md:p-10 bg-gray-50 border-b border-gray-200 text-center">
                    {ficha.company?.logoUrl && (
                        <img src={ficha.company.logoUrl} alt="Logo" className="h-16 mx-auto mb-6 object-contain" />
                    )}
                    <h1 className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-tight mb-2">{ficha.template?.name || "Ficha Técnica"}</h1>
                    <p className="text-teal-600 font-bold text-sm uppercase tracking-widest">{ficha.company?.name || "Clínica"}</p>
                </div>

                {/* Corpo (Campos da Ficha Preenchidos) */}
                <div className="p-6 md:p-10 border-b border-gray-200">
                    <div className="space-y-4">
                        {(ficha.template?.fields as any[])?.map((field: any) => {
                            const valor = (ficha.data as any)?.[field.id];
                            if (field.type === 'header') return <h4 key={field.id} className="text-sm font-black text-gray-500 uppercase tracking-widest pt-4 border-t border-gray-100 mt-4">{field.label}</h4>;
                            return (
                                <div key={field.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b border-gray-100">
                                    {field.type === 'table' ? (
                                        <div className="col-span-1 sm:col-span-3">
                                            <p className="text-[10px] sm:text-xs font-black sm:font-bold text-gray-400 sm:text-gray-500 uppercase sm:normal-case mb-2">{field.label}</p>
                                            <div className="overflow-x-auto w-full border border-gray-200 rounded-xl">
                                                <table className="w-full text-left border-collapse text-xs table-fixed">
                                                    <thead>
                                                        <tr className="bg-gray-50">
                                                            {(field.options as string[] || []).map((col: string, i: number) => (
                                                                <th key={i} className="border-b border-gray-200 p-2 px-3 font-bold text-gray-500 uppercase">{col}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {Array.isArray(valor) && valor.map((row: string[], ri: number) => (
                                                            <tr key={ri} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                                {(field.options as string[] || []).map((_, ci: number) => (
                                                                    <td key={ci} className="border-r border-gray-100 last:border-0 p-2 px-3 text-gray-700 font-medium break-words overflow-hidden break-all">{row[ci] || ''}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-[10px] sm:text-xs font-black sm:font-bold text-gray-400 sm:text-gray-500 uppercase sm:normal-case">{field.label}</p>
                                            <p className="text-sm font-bold text-gray-800 sm:col-span-2">
                                                {field.type === 'checkbox' ? (
                                                    <span>
                                                        {valor ? '✅ Sim' : '❌ Não'}
                                                        {valor && (ficha.data as any)?.[field.id + "_details"] && (
                                                            <span className="text-gray-500 font-normal ml-2 italic">
                                                                ({field.detailsLabel || 'Justificativa'}: {(ficha.data as any)[field.id + "_details"]})
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : field.type === 'checkboxGroup' ? (
                                                    Array.isArray(valor) ? valor.join(', ') : '---'
                                                ) : (
                                                    valor || '---'
                                                )}
                                            </p>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Área de Signatário */}
                <div className={`p-6 md:p-10 ${signed ? 'bg-green-50/50' : 'bg-teal-50/50'}`}>
                    {signed && (
                        <div className="mb-8 flex items-center gap-3 bg-green-100/50 text-green-800 p-4 rounded-2xl border border-green-200/50">
                            <CheckCircle2 size={24} className="text-green-600 shrink-0" />
                            <div>
                                <p className="text-sm font-black uppercase tracking-wide">Ficha Assinada com Sucesso</p>
                                <p className="text-xs font-bold opacity-80 mt-0.5">Esta assinatura possui validade jurídica e IP registrado.</p>
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Signatário(a)</h3>
                        <p className="font-bold text-lg text-gray-800 truncate">{ficha.client?.name}</p>
                        {(ficha.client?.cpf || ficha.client?.rg) && (
                            <p className="text-xs text-gray-500 mt-1 uppercase">Doc: {ficha.client?.cpf || ficha.client?.rg}</p>
                        )}
                    </div>

                    {signed ? (
                        <div className="mb-4 animate-in fade-in duration-500">
                            <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Assinatura Eletrônica Registrada</h3>
                            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden w-full max-w-[500px] h-[200px] flex items-center justify-center p-4">
                                {ficha.signatureUrl ? (
                                    <img src={ficha.signatureUrl} alt="Assinatura" className="max-w-full max-h-full object-contain pointer-events-none mix-blend-multiply" />
                                ) : (
                                    <span className="text-gray-400 italic font-medium">Assinatura não disponível.</span>
                                )}
                            </div>

                            <div className="mt-6 flex flex-col gap-2 bg-white/50 p-4 shrink-0 overflow-hidden rounded-2xl border border-gray-200/50">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Registros de Auditoria</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                    <div className="min-w-0">
                                        <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Data e Hora</p>
                                        <p className="text-xs font-bold text-gray-700">{format(new Date(ficha.signedAt || new Date()), "dd/MM/yyyy HH:mm:ss")}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Endereço IP</p>
                                        <p className="text-xs font-bold text-gray-700">{ficha.clientIp || "Não registrado"}</p>
                                    </div>
                                    <div className="md:col-span-2 min-w-0">
                                        <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Dispositivo (User Agent)</p>
                                        <p className="text-xs font-bold text-gray-700 truncate" title={ficha.clientUserAgent}>{ficha.clientUserAgent || "Não registrado"}</p>
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
                                    Ao assinar e confirmar, você reconhece que confere todos os dados inseridos nesta Ficha Técnica. O seu IP e informações de acesso serão registrados para fins de segurança jurídica.
                                </p>

                                <button
                                    onClick={handleAssinar}
                                    disabled={signing}
                                    className="w-full sm:w-auto px-10 py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-teal-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mx-auto"
                                >
                                    {signing ? <Loader2 className="animate-spin" size={18} /> : null}
                                    {signing ? "Confirmando..." : "Assinar Ficha Técnica"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
