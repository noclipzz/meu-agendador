'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Página de redirecionamento para manter compatibilidade
 * Antiga URL: /painel → agora redireciona para /painel/dashboard
 */
export default function PainelRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Preserva query params se houver
        const searchParams = new URLSearchParams(window.location.search);
        const queryString = searchParams.toString();
        const destination = queryString ? `/painel/dashboard?${queryString}` : '/painel/dashboard';

        router.replace(destination);
    }, [router]);

    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
                <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
                <p className="text-gray-500 font-bold">Redirecionando...</p>
            </div>
        </div>
    );
}
