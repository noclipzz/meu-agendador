"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NovoNegocio() {
    const router = useRouter();

    useEffect(() => {
        router.push('/onboarding');
    }, [router]);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="text-gray-500 font-bold animate-pulse text-sm">Redirecionando para o onboarding...</p>
        </div>
    );
}