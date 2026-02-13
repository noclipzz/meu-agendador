import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'NOHUD - Meu Agendador',
        short_name: 'NOHUD',
        description: 'Sistema Inteligente de Agendamento e Gestão',
        start_url: '/painel',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        icons: [
            {
                src: '/LOGOAPP.png',
                sizes: 'any',
                type: 'image/png',
            },
            {
                src: '/LOGOAPP.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/LOGOAPP.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
