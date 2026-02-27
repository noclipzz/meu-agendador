"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConfigPage() {
    const router = useRouter();

    useEffect(() => {
        router.push("/painel/config/gerais");
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
}