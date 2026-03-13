"use client";

import React from "react";
import { PlayCircle, MessageCircle, HelpCircle, ExternalLink } from "lucide-react";

const TUTORIALS = [
    {
        title: "Primeiros Passos",
        description: "Aprenda a configurar sua empresa, horários e equipe.",
        duration: "3:45",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder
        category: "Configurações"
    },
    {
        title: "Gestão de Agenda",
        description: "Como realizar agendamentos, encaixes e gerenciar cancelamentos.",
        duration: "5:20",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder
        category: "Agenda"
    },
    {
        title: "Financeiro Descomplicado",
        description: "Controle contas a pagar, receber e gere relatórios de DRE.",
        duration: "7:10",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder
        category: "Financeiro"
    },
    {
        title: "Vitrine e Vendas",
        description: "Como cadastrar produtos e receber pedidos pela sua vitrine.",
        duration: "4:30",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder
        category: "Vitrine"
    }
];

export default function SuportePage() {
    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <HelpCircle size={36} className="text-blue-600" /> Centro de Suporte
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
                        Tudo o que você precisa para dominar a plataforma NOHUD.
                    </p>
                </div>
                
                <a 
                    href="https://wa.me/5500000000000" // Substituir pelo número real
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-[2rem] font-black shadow-xl shadow-green-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <MessageCircle size={24} /> Falar com Atendente
                </a>
            </div>

            {/* Vídeos Tutoriais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {TUTORIALS.map((video, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-[2.5rem] overflow-hidden shadow-xl border dark:border-gray-700 group hover:shadow-2xl transition-all duration-300">
                        <div className="aspect-video w-full bg-gray-100 dark:bg-gray-900 relative">
                            <iframe 
                                className="w-full h-full"
                                src={video.videoUrl}
                                title={video.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                                    {video.category}
                                </span>
                                <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                    <PlayCircle size={14} /> {video.duration}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition">
                                {video.title}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed">
                                {video.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer de Contato */}
            <div className="bg-blue-600 rounded-[3rem] p-10 text-center text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                
                <h2 className="text-3xl font-black mb-4 relative z-10">Ainda com dúvidas?</h2>
                <p className="text-blue-100 font-medium mb-8 max-w-xl mx-auto relative z-10">
                    Nosso time de especialistas está pronto para te ajudar. Clique no botão abaixo para iniciar uma conversa no WhatsApp.
                </p>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 relative z-10">
                    <a 
                        href="https://wa.me/5500000000000" // Substituir pelo número real
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-blue-600 px-10 py-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-gray-50 transition-all flex items-center gap-3"
                    >
                        <MessageCircle size={22} /> Chamar no WhatsApp
                    </a>
                    <a 
                        href="#" 
                        className="text-white/80 hover:text-white font-bold flex items-center gap-2 transition"
                    >
                        Ver Documentação Completa <ExternalLink size={16} />
                    </a>
                </div>
            </div>
        </div>
    );
}
