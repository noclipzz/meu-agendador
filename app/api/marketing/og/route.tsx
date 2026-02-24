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
                        backgroundColor: '#030712', // Deep dark
                        backgroundImage: 'radial-gradient(circle at 0% 0%, #1e3a8a 0%, transparent 40%), radial-gradient(circle at 100% 100%, #4c1d95 0%, transparent 40%), radial-gradient(circle at 50% 50%, #0f172a 0%, #030712 100%)',
                        padding: '60px',
                        fontFamily: 'sans-serif',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Background Abstract Element */}
                    <div style={{
                        position: 'absolute',
                        top: '-10%',
                        right: '-10%',
                        width: '500px',
                        height: '500px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, transparent 80%)',
                        filter: 'blur(60px)',
                    }} />

                    {/* Header with Logo */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        position: 'absolute',
                        top: '80px',
                        left: '80px'
                    }}>
                        <img
                            src={logoUrl}
                            style={{ width: '60px', height: '60px', borderRadius: '15px', objectFit: 'cover' }}
                            alt="Logo"
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '32px', fontWeight: '900', color: 'white', letterSpacing: '-1.5px', lineHeight: '1' }}>NOHUD</span>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>Gestão Inteligente</span>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        marginTop: '80px',
                        width: '100%'
                    }}>
                        {/* Status/Category Badge */}
                        <div style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            border: '1px solid rgba(37, 99, 235, 0.3)',
                            padding: '12px 28px',
                            borderRadius: '100px',
                            color: '#60a5fa',
                            fontSize: '22px',
                            fontWeight: '800',
                            marginBottom: '45px',
                            textTransform: 'uppercase',
                            letterSpacing: '3px',
                            backdropFilter: 'blur(10px)'
                        }}>
                            {feature}
                        </div>

                        {/* Heading */}
                        <h1 style={{
                            fontSize: '95px',
                            fontWeight: '950',
                            color: 'white',
                            lineHeight: '0.95',
                            margin: '0',
                            letterSpacing: '-5px',
                            maxWidth: '960px',
                            textShadow: '0 20px 40px rgba(0,0,0,0.5)'
                        }}>
                            {title}
                        </h1>

                        {/* Highlight line */}
                        <div style={{
                            width: '120px',
                            height: '8px',
                            background: 'linear-gradient(to right, #2563eb, #7c3aed)',
                            borderRadius: '10px',
                            margin: '40px 0'
                        }} />

                        {/* Subheading */}
                        <p style={{
                            fontSize: '38px',
                            color: '#cbd5e1',
                            maxWidth: '850px',
                            fontWeight: '500',
                            lineHeight: '1.4',
                            margin: '0',
                        }}>
                            {subtitle}
                        </p>
                    </div>

                    {/* Floating Info card (Glassmorphism) */}
                    <div style={{
                        position: 'absolute',
                        bottom: '80px',
                        left: '80px',
                        right: '80px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '35px 50px',
                        borderRadius: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backdropFilter: 'blur(20px)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ width: '45px', height: '45px', backgroundColor: 'rgba(34, 197, 94, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '15px', height: '15px', backgroundColor: '#22c55e', borderRadius: '50%' }}></div>
                            </div>
                            <span style={{ fontSize: '26px', fontWeight: 'bold', color: 'white' }}>Sistema Ativo 24h</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '24px' }}>Comece em:</span>
                            <span style={{ color: 'white', fontSize: '30px', fontWeight: '900', letterSpacing: '-1px' }}>nohud.com.br</span>
                        </div>
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
