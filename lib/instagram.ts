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
        // LOG de diagnóstico
        console.log("📸 [INSTAGRAM] image_url enviada:", imageUrl);
        console.log("📸 [INSTAGRAM] caption (primeiros 50 chars):", caption.substring(0, 50));

        // 1. Criar o container de mídia usando POST body (não query params)
        //    Isso evita que URLs com caracteres especiais sejam corrompidas na query string.
        const createUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ID}/media`;

        const formData = new URLSearchParams();
        formData.append('image_url', imageUrl);
        formData.append('caption', caption);
        formData.append('access_token', FACEBOOK_ACCESS_TOKEN);

        const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const createData = await createRes.json();

        console.log("📸 [INSTAGRAM] Resposta do container:", JSON.stringify(createData));

        if (createData.error) {
            console.error("Erro ao criar container Instagram:", createData.error);
            throw new Error(createData.error.message);
        }

        const creationId = createData.id;
        console.log("📸 [INSTAGRAM] Container criado:", creationId);

        // 2. Aguardar o processamento da Meta (10s para garantir o download da imagem)
        await new Promise(resolve => setTimeout(resolve, 10000));

        // 3. Publicar a mídia
        const publishRes = await fetch(
            `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ID}/media_publish`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    creation_id: creationId,
                    access_token: FACEBOOK_ACCESS_TOKEN,
                }).toString(),
            }
        );

        const publishData = await publishRes.json();

        if (publishData.error) {
            console.error("Erro ao publicar no Instagram:", publishData.error);
            throw new Error(publishData.error.message);
        }

        console.log("✅ [INSTAGRAM] Post publicado com sucesso! ID:", publishData.id);
        return { success: true, postId: publishData.id };

    } catch (error: any) {
        console.error("Falha na automação do Instagram:", error);
        return { success: false, error: error.message };
    }
}
