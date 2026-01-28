// src/lib/whatsapp.ts

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL; // Ex: https://api.suaempesa.com
const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE;
const API_KEY = process.env.WHATSAPP_API_KEY;

export async function enviarMensagemWhats(numero: string, texto: string) {
  if (!WHATSAPP_API_URL || !API_KEY) return;

  // Remove caracteres do telefone e garante o formato internacional
  const fone = numero.replace(/\D/g, "");
  const foneFinal = fone.startsWith("55") ? fone : `55${fone}`;

  try {
    await fetch(`${WHATSAPP_API_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY
      },
      body: JSON.stringify({
        number: foneFinal,
        text: texto,
        delay: 1200
      })
    });
  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
  }
}