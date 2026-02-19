import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                // Aqui você pode implementar lógica de autenticação se necessário
                return {
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
                    tokenPayload: JSON.stringify({
                        // payloads opcionais
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // Lógica após o upload ser concluído (ex: salvar no banco)
                console.log('Upload concluído:', blob);
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 },
        );
    }
}
