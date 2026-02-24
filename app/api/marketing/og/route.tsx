import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Parâmetros dinâmicos para o post
        const title = searchParams.get('title') || 'Gestão Inteligente';
        const subtitle = searchParams.get('subtitle') || 'Organize sua agenda hoje';
        const feature = searchParams.get('feature') || 'WhatsApp Automático';

        // Busca a logo real do site (funciona server-to-server)
        const logoData = await fetch(new URL('/LOGOAPP.png', 'https://www.nohud.com.br')).then(
            (res) => res.arrayBuffer()
        );
        const logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`;

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#030712',
                        fontFamily: 'sans-serif',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Background Gradient Orbs */}
                    <div style={{
                        position: 'absolute',
                        top: '-200px',
                        right: '-100px',
                        width: '600px',
                        height: '600px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, transparent 70%)',
                        display: 'flex',
                    }} />
                    <div style={{
                        position: 'absolute',
                        bottom: '-200px',
                        left: '-100px',
                        width: '500px',
                        height: '500px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%)',
                        display: 'flex',
                    }} />

                    {/* Noise/Grid overlay for texture */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                        display: 'flex',
                    }} />

                    {/* Top Bar - Logo + Badge */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '70px 80px 0 80px',
                    }}>
                        {/* Logo Section */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <img
                                src={logoBase64}
                                style={{ width: '65px', height: '65px', borderRadius: '16px' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '34px', fontWeight: '900', color: 'white', letterSpacing: '-1px', lineHeight: '1' }}>NOHUD</span>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '3px', marginTop: '4px' }}>Gestão Inteligente</span>
                            </div>
                        </div>

                        {/* Feature Badge */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            backgroundColor: 'rgba(37, 99, 235, 0.12)',
                            border: '1px solid rgba(37, 99, 235, 0.25)',
                            padding: '12px 24px',
                            borderRadius: '100px',
                        }}>
                            <div style={{ width: '10px', height: '10px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'flex' }} />
                            <span style={{ fontSize: '18px', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px' }}>{feature}</span>
                        </div>
                    </div>

                    {/* Main Content - Centered */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        justifyContent: 'center',
                        padding: '0 80px',
                    }}>
                        {/* Accent Line */}
                        <div style={{
                            width: '80px',
                            height: '5px',
                            background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                            borderRadius: '10px',
                            marginBottom: '35px',
                            display: 'flex',
                        }} />

                        {/* Title */}
                        <h1 style={{
                            fontSize: '82px',
                            fontWeight: '900',
                            color: 'white',
                            lineHeight: '1.05',
                            margin: '0 0 30px 0',
                            letterSpacing: '-3px',
                            maxWidth: '920px',
                        }}>
                            {title}
                        </h1>

                        {/* Subtitle */}
                        <p style={{
                            fontSize: '32px',
                            color: '#94a3b8',
                            maxWidth: '750px',
                            fontWeight: '400',
                            lineHeight: '1.5',
                            margin: '0',
                        }}>
                            {subtitle}
                        </p>
                    </div>

                    {/* Bottom Bar - CTA */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 80px 70px 80px',
                    }}>
                        {/* Left: Website */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '20px 35px',
                            borderRadius: '20px',
                        }}>
                            <span style={{ fontSize: '22px', color: '#64748b', fontWeight: '500' }}>Acesse</span>
                            <span style={{ fontSize: '26px', color: 'white', fontWeight: '800', letterSpacing: '-0.5px' }}>nohud.com.br</span>
                        </div>

                        {/* Right: CTA Button */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                            padding: '20px 40px',
                            borderRadius: '20px',
                        }}>
                            <span style={{ fontSize: '22px', color: 'white', fontWeight: '700' }}>Teste Grátis →</span>
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
        console.log(`OG Image Error: ${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
