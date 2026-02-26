import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        console.log('Gerando token para:', body.type);
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            console.error('ERRO: BLOB_READ_WRITE_TOKEN não configurado no servidor.');
        }

        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                return {
                    allowedContentTypes: [
                        'image/jpeg',
                        'image/png',
                        'image/webp',
                        'application/pdf',
                        'image/jpg',
                        'application/x-pkcs12',
                        'application/octet-stream',
                        'application/x-x509-ca-cert',
                        'application/x-pem-file',
                        'text/plain',
                        'application/vnd.apple.keynote'
                    ],
                    addRandomSuffix: true,
                    tokenPayload: JSON.stringify({
                        customer: 'nohud',
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('Upload concluído:', blob.url);
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
