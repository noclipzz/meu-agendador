import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
    let status = "Verificando...";
    let error = null;

    try {
        // Tenta uma operação simples
        const test = await db.client.count();
        status = `✅ SUCESSO! Conexão estabelecida. Total de clientes encontrados: ${test}`;
    } catch (e: any) {
        status = "❌ FALHA na conexão";
        error = e.message;
        console.error(e);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md border border-gray-100">
                <h1 className="text-xl font-bold mb-4 text-gray-800">Status do Banco de Dados</h1>

                <div className={`p-4 rounded-md ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    <p className="font-medium">{status}</p>
                </div>

                {error && (
                    <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-2">Detalhes do erro:</p>
                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto border border-gray-200 text-gray-600">
                            {error}
                        </pre>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <a href="/" className="text-blue-600 hover:underline text-sm">Voltar para a Home</a>
                </div>
            </div>
        </div>
    );
}
