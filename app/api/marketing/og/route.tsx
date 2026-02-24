import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userAgent = req.headers.get('user-agent') || 'desconhecido';
        console.log(`🖼️ [OG_IMAGE] Requisição recebida de: ${userAgent}`);

        // Parâmetros dinâmicos para o post
        const title = searchParams.get('title') || 'Gestão Inteligente';
        const subtitle = searchParams.get('subtitle') || 'Organize sua agenda hoje';
        const feature = searchParams.get('feature') || 'WhatsApp Automático';

        const design = searchParams.get('design') || '1';
        const logoUrl = `https://www.nohud.com.br/LOGOAPP.png`;

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#030712',
                        backgroundImage: 'radial-gradient(circle at 20% 20%, #1e40af 0%, transparent 40%), radial-gradient(circle at 80% 80%, #4c1d95 0%, transparent 40%)',
                        padding: '80px',
                        fontFamily: 'sans-serif',
                        position: 'relative',
                    }}
                >
                    {/* Header com Logo em Texto/CSS para velocidade máxima */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        position: 'absolute',
                        top: '80px',
                        left: '80px'
                    }}>
                        <div style={{ width: '60px', height: '60px', backgroundColor: '#2563eb', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'white', fontSize: '35px' }}>N</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '36px', fontWeight: '900', color: 'white', letterSpacing: '-1.5px', lineHeight: '1' }}>NOHUD</span>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>Gestão Inteligente</span>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        width: '100%'
                    }}>
                        {/* Status/Category Badge */}
                        <div style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.15)',
                            border: '1px solid rgba(37, 99, 235, 0.3)',
                            padding: '12px 30px',
                            borderRadius: '100px',
                            color: '#60a5fa',
                            fontSize: '24px',
                            fontWeight: '800',
                            marginBottom: '50px',
                            textTransform: 'uppercase',
                            letterSpacing: '3px',
                        }}>
                            {feature}
                        </div>

                        {/* Heading */}
                        <h1 style={{
                            fontSize: '100px',
                            fontWeight: '900',
                            color: 'white',
                            lineHeight: '1',
                            margin: '0',
                            letterSpacing: '-5px',
                            maxWidth: '900px',
                            textShadow: '0 10px 20px rgba(0,0,0,0.3)'
                        }}>
                            {title}
                        </h1>

                        {/* Line */}
                        <div style={{
                            width: '120px',
                            height: '8px',
                            background: '#2563eb',
                            borderRadius: '10px',
                            margin: '40px 0'
                        }} />

                        {/* Subtitle */}
                        <p style={{
                            fontSize: '40px',
                            color: '#cbd5e1',
                            maxWidth: '850px',
                            fontWeight: '500',
                            lineHeight: '1.4',
                            margin: '0',
                        }}>
                            {subtitle}
                        </p>
                    </div>

                    {/* Footer Card */}
                    <div style={{
                        position: 'absolute',
                        bottom: '80px',
                        left: '80px',
                        right: '80px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '40px 50px',
                        borderRadius: '35px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ width: '15px', height: '15px', backgroundColor: '#22c55e', borderRadius: '50%' }}></div>
                            <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>nohud.com.br</span>
                        </div>
                        <span style={{ color: '#60a5fa', fontSize: '26px', fontWeight: 'bold' }}>Sua Agenda Inteligente</span>
                    </div>
                </div>
            ),
            {
                width: 1080,
                height: 1080,
                headers: {
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            }
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
