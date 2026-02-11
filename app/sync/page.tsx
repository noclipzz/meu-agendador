'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSync = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/sync-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (response.ok) {
                setResult(data);
                setTimeout(() => {
                    router.push('/painel/dashboard');
                }, 2000);
            } else {
                setError(data.error || 'Erro desconhecido');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao sincronizar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                    🔄 Sincronizar Assinatura
                </h1>

                <p className="text-gray-600 mb-6 text-center">
                    Se você já completou o pagamento mas não consegue acessar o painel,
                    clique no botão abaixo para sincronizar sua assinatura.
                </p>

                <button
                    onClick={handleSync}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? '⏳ Sincronizando...' : '🔄 Sincronizar Agora'}
                </button>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 font-medium">❌ Erro:</p>
                        <p className="text-red-500 text-sm mt-1">{error}</p>
                        <p className="text-gray-600 text-xs mt-2">
                            Se o erro persistir, complete o checkout primeiro.
                        </p>
                    </div>
                )}

                {result && result.success && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-600 font-medium">✅ Sucesso!</p>
                        <p className="text-green-700 text-sm mt-1">{result.message}</p>
                        <div className="mt-3 text-sm text-gray-700">
                            <p><strong>Plano:</strong> {result.subscription?.plan}</p>
                            <p><strong>Status:</strong> {result.subscription?.status}</p>
                            <p><strong>Expira em:</strong> {new Date(result.subscription?.expiresAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <p className="text-gray-500 text-xs mt-3">
                            Redirecionando para o painel...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
