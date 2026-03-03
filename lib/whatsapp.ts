export async function sendEvolutionMessage(
    serverUrl: string,
    apiKey: string,
    instance: string,
    number: string,
    text: string
) {
    if (!serverUrl || !apiKey || !instance || !number) {
        console.error("[WHATSAPP] Missing required parameters for sending message");
        return;
    }

    try {
        const cleanNumber = number.replace(/\D/g, "");
        if (!cleanNumber) return;

        // Formato exigido pela Evolution API (ex: 5511999999999)
        // Se o número tiver 11 ou menos dígitos, ele não tem código de país (55)
        let remoteJid = cleanNumber;

        if (cleanNumber.length <= 11) {
            remoteJid = `55${cleanNumber}`;
        } else if (!cleanNumber.startsWith("55")) {
            // Caso raríssimo de número internacional mal formatado
            remoteJid = `55${cleanNumber}`;
        }

        // Se for um JID completo (vindo do webhook por exemplo), mantemos
        if (number.includes("@s.whatsapp.net")) {
            remoteJid = number.split(":")[0];
        }

        const endpoint = `${serverUrl.replace(/\/$/, "")}/message/sendText/${instance}`;

        console.log(`[WHATSAPP] Sending message to ${remoteJid} via ${instance}...`);

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                apikey: apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                number: remoteJid,
                text: text
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error("[WHATSAPP] Error from Evolution API:", response.status, data);
        } else {
            console.log("[WHATSAPP] Message sent successfully:", data.key?.id || "OK");
        }
    } catch (error) {
        console.error("[WHATSAPP] Failed to send message:", error);
    }
}

/**
 * Envia um documento/imagem via WhatsApp usando a Evolution API.
 * Suporta: document (PDF, boleto), image, video, audio
 */
export async function sendEvolutionMedia(
    serverUrl: string,
    apiKey: string,
    instance: string,
    number: string,
    mediaUrl: string,
    options: {
        mediatype?: 'document' | 'image' | 'video' | 'audio';
        caption?: string;
        fileName?: string;
    } = {}
) {
    if (!serverUrl || !apiKey || !instance || !number || !mediaUrl) {
        console.error("[WHATSAPP] Missing required parameters for sending media");
        return;
    }

    try {
        const cleanNumber = number.replace(/\D/g, "");
        if (!cleanNumber) return;

        let remoteJid = cleanNumber;
        if (cleanNumber.length <= 11) {
            remoteJid = `55${cleanNumber}`;
        } else if (!cleanNumber.startsWith("55")) {
            remoteJid = `55${cleanNumber}`;
        }

        if (number.includes("@s.whatsapp.net")) {
            remoteJid = number.split(":")[0];
        }

        const endpoint = `${serverUrl.replace(/\/$/, "")}/message/sendMedia/${instance}`;

        console.log(`[WHATSAPP] Sending media (${options.mediatype || 'document'}) to ${remoteJid}...`);

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                apikey: apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                number: remoteJid,
                mediatype: options.mediatype || 'document',
                media: mediaUrl,
                caption: options.caption || '',
                fileName: options.fileName || 'boleto.pdf',
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error("[WHATSAPP] Error sending media:", response.status, data);
        } else {
            console.log("[WHATSAPP] Media sent successfully:", data.key?.id || "OK");
        }
    } catch (error) {
        console.error("[WHATSAPP] Failed to send media:", error);
    }
}
