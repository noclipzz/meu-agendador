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
        // Se já tiver 55, usamos como está. Se não, adicionamos.
        let remoteJid = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;

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
                text: text,
                options: { delay: 1200, presence: "composing" },
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
