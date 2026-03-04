/**
 * Utilitários para interação com a API do Instagram Graph
 */

const INSTAGRAM_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

interface PostToInstagramProps {
    imageUrl: string;
    caption: string;
}

/**
 * Tenta renovar o token do Facebook para um long-lived token.
 * Isso evita expiração do token a cada 60 dias.
 */
async function refreshFacebookToken(token: string): Promise<string> {
    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
        console.warn("⚠️ [INSTAGRAM] FACEBOOK_APP_ID ou FACEBOOK_APP_SECRET não configurados. Usando token atual sem renovar.");
        return token;
    }

    try {
        const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.access_token) {
            console.log("✅ [INSTAGRAM] Token renovado com sucesso (long-lived).");
            return data.access_token;
        } else {
            console.error("⚠️ [INSTAGRAM] Falha ao renovar token:", JSON.stringify(data));
            return token; // Fallback: usa token atual
        }
    } catch (e: any) {
        console.error("⚠️ [INSTAGRAM] Erro ao renovar token:", e.message);
        return token;
    }
}

export async function postImageToInstagram({ imageUrl, caption }: PostToInstagramProps) {
    if (!INSTAGRAM_BUSINESS_ID || !FACEBOOK_ACCESS_TOKEN) {
        throw new Error("Credenciais do Instagram não configuradas nas variáveis de ambiente.");
    }

    try {
        // Tenta renovar o token antes de usar
        const accessToken = await refreshFacebookToken(FACEBOOK_ACCESS_TOKEN);

        // LOG de diagnóstico
        console.log("📸 [INSTAGRAM] image_url enviada:", imageUrl);
        console.log("📸 [INSTAGRAM] caption (primeiros 50 chars):", caption.substring(0, 50));

        // 1. Criar o container de mídia usando POST body (não query params)
        const createUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ID}/media`;

        const formData = new URLSearchParams();
        formData.append('image_url', imageUrl);
        formData.append('caption', caption);
        formData.append('access_token', accessToken);

        const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
        });

        const createData = await createRes.json();
        console.log("📸 [INSTAGRAM] Resposta do container:", JSON.stringify(createData));

        if (createData.error) {
            console.error("❌ [INSTAGRAM] Erro ao criar container:", JSON.stringify(createData.error));
            throw new Error(`[Código ${createData.error.code}] ${createData.error.message}`);
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
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    creation_id: creationId,
                    access_token: accessToken,
                }).toString(),
            }
        );

        const publishData = await publishRes.json();

        if (publishData.error) {
            console.error("❌ [INSTAGRAM] Erro ao publicar:", JSON.stringify(publishData.error));
            throw new Error(`[Código ${publishData.error.code}] ${publishData.error.message}`);
        }

        console.log("✅ [INSTAGRAM] Post publicado com sucesso! ID:", publishData.id);
        return { success: true, postId: publishData.id };

    } catch (error: any) {
        console.error("Falha na automação do Instagram:", error);
        return { success: false, error: error.message };
    }
}
