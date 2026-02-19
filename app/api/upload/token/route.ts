import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        console.log('Gerando token para:', body.type, body.payload);
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                console.log('onBeforeGenerateToken para:', pathname);
                return {
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/jpg'],
                    tokenPayload: JSON.stringify({
                        // payloads opcionais
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('Upload concluído com sucesso:', blob.url);
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        console.error('Erro no handleUpload:', error);
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 },
        );
    }
}
