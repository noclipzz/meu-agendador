import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Parâmetros dinâmicos para o post
        const title = searchParams.get('title') || 'Gestão Inteligente';
        const subtitle = searchParams.get('subtitle') || 'Organize sua agenda hoje';
        const feature = searchParams.get('feature') || 'WhatsApp Automático';

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
                        backgroundColor: '#09090b',
                        backgroundImage: 'radial-gradient(circle at top right, #1e40af 0%, transparent 40%), radial-gradient(circle at bottom left, #4c1d95 0%, transparent 40%)',
                        padding: '80px',
                        fontFamily: 'sans-serif',
                    }}
                >
                    {/* Logo / Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'absolute', top: '60px', left: '60px' }}>
                        <div style={{ width: '40px', height: '40px', backgroundColor: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '4px' }}></div>
                        </div>
                        <span style={{ fontSize: '28px', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>NOHUD</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        {/* Badge */}
                        <div style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            border: '1px solid rgba(37, 99, 235, 0.2)',
                            padding: '10px 25px',
                            borderRadius: '100px',
                            color: '#60a5fa',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            marginBottom: '40px',
                            textTransform: 'uppercase',
                            letterSpacing: '2px'
                        }}>
                            Dica Pro #01
                        </div>

                        {/* Main Content */}
                        <h1 style={{
                            fontSize: '85px',
                            fontWeight: '900',
                            color: 'white',
                            lineHeight: '1.1',
                            margin: '0',
                            letterSpacing: '-3px',
                            paddingBottom: '20px'
                        }}>
                            {title}
                        </h1>

                        <p style={{
                            fontSize: '34px',
                            color: '#94a3b8',
                            maxWidth: '800px',
                            fontWeight: '500',
                            lineHeight: '1.4',
                            marginTop: '20px'
                        }}>
                            {subtitle}
                        </p>
                    </div>

                    {/* Feature Card */}
                    <div style={{
                        marginTop: '60px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '30px 50px',
                        borderRadius: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px'
                    }}>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{feature}</span>
                    </div>

                    {/* Footer */}
                    <div style={{
                        position: 'absolute',
                        bottom: '60px',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ color: '#64748b', fontSize: '20px', fontWeight: 'bold' }}>Acesse agora em:</span>
                        <span style={{ color: 'white', fontSize: '24px', fontWeight: '900' }}>nohud.com.br</span>
                    </div>
                </div>
            ),
            {
                width: 1080,
                height: 1080,
            }
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
