import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://nohud.com.br'; // Substitua pelo seu domínio

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 1,
        },
        // Você pode adicionar outras rotas públicas aqui se houver
    ]
}
