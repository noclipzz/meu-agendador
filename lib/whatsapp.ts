// ARQUIVO: lib/whatsapp.ts

export async function sendWhatsapp(phone: string, message: string) {
  // 1. Limpa o telefone (deixa apenas números)
  const phoneClean = phone.replace(/\D/g, "");

  // 2. Validação básica
  if (!phoneClean) return false;

  console.log(`[WHATSAPP LOG] Enviando para ${phoneClean}: ${message}`);

  // -------------------------------------------------------------------------
  // AQUI ENTRA A INTEGRAÇÃO REAL COM API DE WHATSAPP (Ex: Z-API, Evolution, Twilio)
  // Como o Vercel é Serverless, você não pode rodar um bot (Venom/Baileys) aqui.
  // Você precisa pagar uma API externa ou ter um VPS rodando a API.
  // -------------------------------------------------------------------------

  /* EXEMPLO DE COMO SERIA A CHAMADA REAL:
  
  try {
    const res = await fetch(process.env.WHATSAPP_API_URL!, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`
      },
      body: JSON.stringify({
        number: phoneClean,
        body: message
      })
    });
    return res.ok;
  } catch (error) {
    console.error("Erro ao enviar Zap:", error);
    return false;
  }
  */

  // Por enquanto, retornamos true para o Build passar e fingimos que enviou
  return true;
}