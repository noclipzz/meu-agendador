import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const COLOR_THEMES = [
    { // 0 - Azul Premium
        bg: '#030712',
        orb1: 'rgba(37, 99, 235, 0.3)',
        orb2: 'rgba(99, 102, 241, 0.2)',
        accent: '#3b82f6',
        accentSecondary: '#6366f1',
        badgeBg: 'rgba(37, 99, 235, 0.15)',
        badgeBorder: 'rgba(99, 102, 241, 0.3)',
        badgeText: '#818cf8',
        subtitleColor: '#94a3b8',
        ctaFrom: '#2563eb',
        ctaTo: '#7c3aed',
    },
    { // 1 - Violeta Luxo
        bg: '#0c0015',
        orb1: 'rgba(139, 92, 246, 0.3)',
        orb2: 'rgba(236, 72, 153, 0.2)',
        accent: '#a78bfa',
        accentSecondary: '#ec4899',
        badgeBg: 'rgba(139, 92, 246, 0.15)',
        badgeBorder: 'rgba(168, 85, 247, 0.3)',
        badgeText: '#c4b5fd',
        subtitleColor: '#a1a1aa',
        ctaFrom: '#7c3aed',
        ctaTo: '#db2777',
    },
    { // 2 - Esmeralda Tech
        bg: '#001a0e',
        orb1: 'rgba(16, 185, 129, 0.3)',
        orb2: 'rgba(6, 182, 212, 0.2)',
        accent: '#34d399',
        accentSecondary: '#06b6d4',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeBorder: 'rgba(52, 211, 153, 0.3)',
        badgeText: '#6ee7b7',
        subtitleColor: '#94a3b8',
        ctaFrom: '#059669',
        ctaTo: '#0d9488',
    },
    { // 3 - Sunset Premium
        bg: '#0f0507',
        orb1: 'rgba(249, 115, 22, 0.25)',
        orb2: 'rgba(239, 68, 68, 0.2)',
        accent: '#fb923c',
        accentSecondary: '#ef4444',
        badgeBg: 'rgba(249, 115, 22, 0.15)',
        badgeBorder: 'rgba(251, 146, 60, 0.3)',
        badgeText: '#fdba74',
        subtitleColor: '#a8a29e',
        ctaFrom: '#ea580c',
        ctaTo: '#b91c1c',
    },
    { // 4 - Cyber Neon
        bg: '#020617',
        orb1: 'rgba(14, 165, 233, 0.3)',
        orb2: 'rgba(56, 189, 248, 0.2)',
        accent: '#38bdf8',
        accentSecondary: '#818cf8',
        badgeBg: 'rgba(14, 165, 233, 0.15)',
        badgeBorder: 'rgba(56, 189, 248, 0.3)',
        badgeText: '#7dd3fc',
        subtitleColor: '#94a3b8',
        ctaFrom: '#0284c7',
        ctaTo: '#4f46e5',
    },
];

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const title = searchParams.get('title') || 'Gestão Inteligente';
        const subtitle = searchParams.get('subtitle') || 'Organize sua agenda hoje';
        const feature = searchParams.get('feature') || 'WhatsApp Automático';
        const emoji = searchParams.get('emoji') || '';
        const themeIdx = parseInt(searchParams.get('theme') || '0') % COLOR_THEMES.length;
        const style = searchParams.get('style') || 'default';

        const theme = COLOR_THEMES[themeIdx];

        const stat1 = searchParams.get('stat1') || '97%';
        const stat1Label = searchParams.get('stat1Label') || 'Redução de No-Show';
        const stat2 = searchParams.get('stat2') || '3x';
        const stat2Label = searchParams.get('stat2Label') || 'Mais Produtividade';

        // Busca a logo
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
                        backgroundColor: theme.bg,
                        fontFamily: 'sans-serif',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Background Orb 1 */}
                    <div style={{
                        position: 'absolute',
                        top: '-250px',
                        right: '-150px',
                        width: '700px',
                        height: '700px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${theme.orb1} 0%, transparent 70%)`,
                        display: 'flex',
                    }} />
                    {/* Background Orb 2 */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-300px',
                        left: '-150px',
                        width: '650px',
                        height: '650px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${theme.orb2} 0%, transparent 70%)`,
                        display: 'flex',
                    }} />

                    {/* Top Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '60px 70px 0 70px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                            <img
                                src={logoBase64}
                                style={{ width: '58px', height: '58px', borderRadius: '14px' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '30px', fontWeight: 900, color: 'white', letterSpacing: '-1px', lineHeight: '1' }}>NOHUD</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: theme.accent, textTransform: 'uppercase' as const, letterSpacing: '3px', marginTop: '4px' }}>Gestão Inteligente</span>
                            </div>
                        </div>

                        {/* Feature Badge */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            backgroundColor: theme.badgeBg,
                            border: `1px solid ${theme.badgeBorder}`,
                            padding: '12px 24px',
                            borderRadius: '100px',
                        }}>
                            <div style={{ width: '10px', height: '10px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'flex' }} />
                            <span style={{ fontSize: '16px', fontWeight: 700, color: theme.badgeText, textTransform: 'uppercase' as const, letterSpacing: '2px' }}>{feature}</span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        justifyContent: 'center',
                        padding: '0 70px',
                    }}>
                        {/* Emoji + Accent Line */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                            {emoji && <span style={{ fontSize: '48px' }}>{emoji}</span>}
                            <div style={{
                                width: '80px',
                                height: '5px',
                                background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentSecondary})`,
                                borderRadius: '10px',
                                display: 'flex',
                            }} />
                        </div>

                        {/* Title */}
                        <div style={{
                            fontSize: '76px',
                            fontWeight: 900,
                            color: 'white',
                            lineHeight: 1.05,
                            marginBottom: '28px',
                            letterSpacing: '-3px',
                            maxWidth: '920px',
                            display: 'flex',
                        }}>
                            {title}
                        </div>

                        {/* Subtitle */}
                        <div style={{
                            fontSize: '30px',
                            color: theme.subtitleColor,
                            maxWidth: '750px',
                            fontWeight: 400,
                            lineHeight: 1.5,
                            display: 'flex',
                        }}>
                            {subtitle}
                        </div>

                        {/* Stats Row */}
                        {style === 'stats' && (
                            <div style={{
                                display: 'flex',
                                gap: '40px',
                                marginTop: '45px',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    padding: '24px 36px',
                                    borderRadius: '20px',
                                }}>
                                    <span style={{ fontSize: '44px', fontWeight: 900, color: theme.accent }}>{stat1}</span>
                                    <span style={{ fontSize: '16px', color: theme.subtitleColor, fontWeight: 500, marginTop: '4px' }}>{stat1Label}</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    padding: '24px 36px',
                                    borderRadius: '20px',
                                }}>
                                    <span style={{ fontSize: '44px', fontWeight: 900, color: theme.accent }}>{stat2}</span>
                                    <span style={{ fontSize: '16px', color: theme.subtitleColor, fontWeight: 500, marginTop: '4px' }}>{stat2Label}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 70px 60px 70px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '18px 32px',
                            borderRadius: '20px',
                        }}>
                            <span style={{ fontSize: '20px', color: '#64748b', fontWeight: 500 }}>Acesse</span>
                            <span style={{ fontSize: '24px', color: 'white', fontWeight: 800, letterSpacing: '-0.5px' }}>nohud.com.br</span>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: `linear-gradient(135deg, ${theme.ctaFrom}, ${theme.ctaTo})`,
                            padding: '18px 36px',
                            borderRadius: '20px',
                        }}>
                            <span style={{ fontSize: '20px', color: 'white', fontWeight: 700 }}>Teste 7 Dias Grátis</span>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1080,
                height: 1080,
            }
        );
    } catch (e: any) {
        console.log(`OG Image Error: ${e.message}`);
        return new Response(`Failed to generate the image: ${e.message}`, {
            status: 500,
        });
    }
}
