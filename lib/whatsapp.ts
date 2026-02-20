
export async function sendEvolutionMessage(
    serverUrl: string,
    apiKey: string,
    instance: string,
    number: string,
    text: string
) {
    try {
        const cleanNumber = number.replace(/\D/g, "");
        if (!cleanNumber) return;

        // Formato exigido pela Evolution API (ex: 5511999999999)
        const remoteJid = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;
        const endpoint = `${serverUrl.replace(/\/$/, "")}/message/sendText/${instance}`;

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

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[WHATSAPP] Error from Evolution API:", response.status, errorData);
        }
    } catch (error) {
        console.error("[WHATSAPP] Failed to send message:", error);
    }
}
