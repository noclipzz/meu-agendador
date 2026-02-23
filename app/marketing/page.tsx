"use client";

import { Star, Zap, Smartphone, Check, ArrowRight, Calendar, BarChart3, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function MarketingPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-20 px-4">
            <div className="container mx-auto max-w-6xl">
                <div className="text-center mb-20">
                    <h1 className="text-4xl font-black text-gray-900 mb-4 uppercase tracking-tighter">Central de Ativos de Marketing</h1>
                    <p className="text-gray-500 font-medium">Use estes layouts para criar seus anúncios. Tire prints ou grave a tela!</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">

                    {/* CRIATIVO 01: FEED INSTAGRAM (TECH PREMIUM) */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest px-2">Anúncio Feed (1080x1080)</h3>
                        <div className="aspect-square bg-gray-900 rounded-[3rem] overflow-hidden relative shadow-2xl group flex flex-col justify-between p-12 text-white border-8 border-white/5">
                            {/* Overlay Decorativo */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] -z-10" />
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] -z-10" />

                            <div className="flex justify-between items-start z-10">
                                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
                                    <Zap size={18} className="text-blue-400 fill-blue-400" />
                                    <span className="text-xs font-black uppercase tracking-widest">NOHUD Gestão</span>
                                </div>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />)}
                                </div>
                            </div>

                            <div className="z-10 bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-[2rem] shadow-2xl">
                                <h2 className="text-4xl font-black leading-tight tracking-tight mb-4">
                                    A gestão que seu negócio <span className="text-blue-400">merece.</span>
                                </h2>
                                <div className="space-y-3">
                                    {[
                                        "Agenda Online 24h",
                                        "Lembretes Automáticos WhatsApp",
                                        "Financeiro & Comissões"
                                    ].map((f, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                <Check size={14} className="text-white" strokeWidth={3} />
                                            </div>
                                            <span className="text-base font-bold text-gray-200">{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center z-10">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Teste Grátis</span>
                                    <span className="text-lg font-black tracking-tighter">nohud.com.br</span>
                                </div>
                                <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-500/20">
                                    <ArrowRight size={28} />
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center select-none italic font-medium">Estilo sugerido: Moderno, confiável e tecnológico.</p>
                    </div>

                    {/* CRIATIVO 02: STORY (VERTICAL) */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest px-2">Anúncio Story (1080x1920)</h3>
                        <div className="aspect-[9/16] bg-blue-600 rounded-[3rem] overflow-hidden relative shadow-2xl flex flex-col justify-between p-10 text-white border-8 border-white/10">
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-900 -z-20" />
                            <div className="absolute top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-[80px] -z-10" />

                            <div className="text-center z-10 mt-10">
                                <div className="bg-white text-blue-600 inline-flex items-center gap-2 px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest mb-6">
                                    7 DIAS ZERO CUSTO
                                </div>
                                <h2 className="text-5xl font-black leading-[1.1] tracking-tight">Cansado de<br /> perder <br /><span className="text-blue-200">clientes?</span></h2>
                            </div>

                            <div className="z-10 bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-[2.5rem] space-y-4 mb-20">
                                {[
                                    { icon: MessageSquare, t: "Reduza faltas via WhatsApp", c: "bg-green-400" },
                                    { icon: Calendar, t: "Agenda organizada", c: "bg-blue-400" },
                                    { icon: BarChart3, t: "Aumente seu lucro", c: "bg-purple-400" }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${item.c}`}>
                                            <item.icon size={20} />
                                        </div>
                                        <span className="text-sm font-black">{item.t}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="z-10 text-center flex flex-col items-center gap-4">
                                <div className="flex flex-col animate-bounce">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto mb-1" />
                                    <div className="w-1.5 h-3 bg-white/50 rounded-full mx-auto" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-[0.4em]">Arraste para cima</span>
                                <div className="bg-white w-full py-5 rounded-2xl text-blue-700 font-extrabold text-xl shadow-2xl">
                                    Testar Gratuitamente
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center select-none italic font-medium">Estilo sugerido: Varejo, direto e focado em dor/solução.</p>
                    </div>

                    {/* CRIATIVO 03: BANNER GOOGLE / REDE DE DISPLAY */}
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest px-2">Banner Web / Google Display (Landscape)</h3>
                        <div className="w-full h-80 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl flex overflow-hidden relative group">
                            <div className="w-2/3 p-12 flex flex-col justify-center gap-4 relative z-10">
                                <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest">
                                    <div className="w-8 h-1 bg-blue-600 rounded-full" />
                                    NOHUD SISTEMAS
                                </div>
                                <h2 className="text-5xl font-black text-gray-900 tracking-tight leading-tight">
                                    Toda a sua gestão <br /> em um <span className="text-blue-600">só lugar.</span>
                                </h2>
                                <div className="flex gap-4 mt-2">
                                    <div className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-500/20">Começar Agora</div>
                                    <div className="bg-gray-100 text-gray-600 px-8 py-4 rounded-xl font-bold text-lg">Ver Planos</div>
                                </div>
                            </div>

                            <div className="w-1/3 bg-blue-50 relative flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-blue-600/5 -skew-x-12 translate-x-10" />
                                <Smartphone className="text-blue-600 opacity-20 relative z-10" size={300} strokeWidth={0.5} />
                                <Zap className="absolute bottom-10 right-10 text-blue-600 animate-pulse" size={60} />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center select-none italic font-medium">Estilo sugerido: Corporativo, limpo e profissional.</p>
                    </div>

                </div>

                <div className="mt-32 p-12 bg-blue-900 rounded-[3rem] text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                    <h2 className="text-3xl font-black mb-4 relative z-10">Dica: Use estes layouts para gravar a tela</h2>
                    <p className="text-blue-200 font-medium mb-8 max-w-2xl mx-auto relative z-10">Muitos criativos de sucesso hoje são apenas "screenshare" (gravação de tela) do software funcionando. Eles passam muito mais verdade do que artes estáticas.</p>
                    <div className="flex justify-center gap-4 relative z-10">
                        <Link href="/" className="bg-white text-blue-900 px-10 py-4 rounded-2xl font-black hover:scale-105 transition active:scale-95">Voltar para o Site</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
