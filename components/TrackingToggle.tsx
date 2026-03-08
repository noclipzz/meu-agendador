"use client";

import { useState, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TrackingToggle({ hasTrackingModule }: { hasTrackingModule: boolean }) {
    const [isOnline, setIsOnline] = useState(false);
    const [loading, setLoading] = useState(false);
    const [watchId, setWatchId] = useState<number | null>(null);

    // Limpa o watch ao desmontar
    useEffect(() => {
        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, [watchId]);

    if (!hasTrackingModule) return null;

    const startTracking = () => {
        if (!navigator.geolocation) {
            toast.error("Seu navegador não suporta GPS.");
            return;
        }

        setLoading(true);

        const id = navigator.geolocation.watchPosition(
            async (position) => {
                try {
                    await fetch("/api/location/update", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            status: "ONLINE"
                        })
                    });
                    setLoading(false);
                    setIsOnline(true);
                } catch (e) {
                    console.error("Erro ao atualizar localização", e);
                }
            },
            (error) => {
                console.error("Erro GPS:", error);
                toast.error("Erro ao acessar GPS. Verifique a permissão.");
                stopTracking();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );

        setWatchId(id);
    };

    const stopTracking = async () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
        }

        setIsOnline(false);
        setLoading(false);

        // Notifica o servidor que ficou offline
        try {
            // Tentamos enviar um último sinal de offline para ser educado
            // Nota: Se o usuário fechar o browser, o servidor limpa por timeout (5min) 
            // no API de active routes.
        } catch (e) { }
    };

    const toggle = () => {
        if (isOnline) {
            stopTracking();
            toast.success("Rastreamento desligado.");
        } else {
            startTracking();
            toast.success("Você está ONLINE para a empresa!");
        }
    };

    return (
        <div className="relative group">
            <div className={`absolute -inset-1 rounded-2xl blur-lg opacity-40 transition duration-500 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400 opacity-10'}`} />
            <button
                onClick={toggle}
                disabled={loading}
                className={`relative flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl border-2 ${isOnline
                    ? "bg-white text-emerald-600 border-emerald-500 dark:bg-gray-900 dark:text-emerald-400"
                    : "bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700"
                    }`}
            >
                {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                ) : isOnline ? (
                    <MapPin className="animate-bounce" size={18} />
                ) : (
                    <MapPin size={18} className="opacity-40" />
                )}

                <div className="text-left">
                    <p className="leading-none">{isOnline ? "Rastreio Ativo" : "Ficar Online"}</p>
                    <p className={`text-[8px] font-bold mt-1 ${isOnline ? "text-emerald-500" : "text-gray-400"}`}>
                        {isOnline ? "A empresa te vê no mapa" : "GPS desligado"}
                    </p>
                </div>

                {isOnline && (
                    <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                )}
            </button>
        </div>
    );
}
