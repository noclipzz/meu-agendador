import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Meu Agendador',
        short_name: 'Agendador',
        description: 'Seu assistente de agendamentos e gestão.',
        start_url: '/painel',
        display: 'standalone',
        background_color: '#09090b', // zinc-950
        theme_color: '#09090b',
        orientation: 'portrait',
        scope: '/',
        icons: [
            {
                src: '/LOGOAPP.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
            },
            {
                src: '/LOGOAPP.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            },
            {
                src: '/LOGOAPP.png',
                sizes: 'any',
                type: 'image/png',
            }
        ],
    }
}
