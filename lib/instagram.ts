/**
 * Utilitários para interação com a API do Instagram Graph
 */

const INSTAGRAM_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

interface PostToInstagramProps {
    imageUrl: string;
    caption: string;
}

export async function postImageToInstagram({ imageUrl, caption }: PostToInstagramProps) {
    if (!INSTAGRAM_BUSINESS_ID || !FACEBOOK_ACCESS_TOKEN) {
        throw new Error("Credenciais do Instagram não configuradas nas variáveis de ambiente.");
    }

    try {
        // 1. Criar o container de mídia
        const createRes = await fetch(
            `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ID}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${FACEBOOK_ACCESS_TOKEN}`,
            { method: 'POST' }
        );

        const createData = await createRes.json();

        if (createData.error) {
            console.error("Erro ao criar container Instagram:", createData.error);
            throw new Error(createData.error.message);
        }

        const creationId = createData.id;

        // 2. Aguardar o processamento da Meta (Aumentado para 10s para garantir o download da OG Image)
        await new Promise(resolve => setTimeout(resolve, 10000));

        // 3. Publicar a mídia
        const publishRes = await fetch(
            `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ID}/media_publish?creation_id=${creationId}&access_token=${FACEBOOK_ACCESS_TOKEN}`,
            { method: 'POST' }
        );

        const publishData = await publishRes.json();

        if (publishData.error) {
            console.error("Erro ao publicar no Instagram:", publishData.error);
            throw new Error(publishData.error.message);
        }

        return { success: true, postId: publishData.id };

    } catch (error: any) {
        console.error("Falha na automação do Instagram:", error);
        return { success: false, error: error.message };
    }
}
