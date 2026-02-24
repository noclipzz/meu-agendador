import { NextRequest } from 'next/server';

// IMPORTANTE: Node.js runtime (não Edge!) para compatibilidade com o crawler do Facebook
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const title = url.searchParams.get('title') || 'Gestão Inteligente';
        const subtitle = url.searchParams.get('subtitle') || 'Organize sua agenda hoje';
        const feature = url.searchParams.get('feature') || 'WhatsApp Automático';

        // Monta a URL da rota OG (Edge) para buscar internamente
        const ogUrl = new URL('/api/marketing/og', 'https://www.nohud.com.br');
        ogUrl.searchParams.set('title', title);
        ogUrl.searchParams.set('subtitle', subtitle);
        ogUrl.searchParams.set('feature', feature);

        console.log('🖼️ [IMAGE_PROXY] Buscando OG image de:', ogUrl.toString());

        // Busca a imagem server-to-server (funciona mesmo que o crawler não consiga acessar a Edge diretamente)
        const ogResponse = await fetch(ogUrl.toString(), {
            headers: {
                'User-Agent': 'NohudImageProxy/1.0',
            },
        });

        if (!ogResponse.ok) {
            console.error('🖼️ [IMAGE_PROXY] Erro ao buscar OG:', ogResponse.status, ogResponse.statusText);
            return new Response('Erro ao gerar imagem', { status: 500 });
        }

        const imageBuffer = Buffer.from(await ogResponse.arrayBuffer());

        console.log('🖼️ [IMAGE_PROXY] Imagem gerada com sucesso:', imageBuffer.length, 'bytes');

        // Retorna o PNG puro com headers explícitos que o Facebook espera
        return new Response(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Content-Length': imageBuffer.length.toString(),
                'Cache-Control': 'public, max-age=86400, s-maxage=86400',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error: any) {
        console.error('🖼️ [IMAGE_PROXY] Erro fatal:', error.message);
        return new Response('Erro interno', { status: 500 });
    }
}
