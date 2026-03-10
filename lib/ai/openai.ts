import OpenAI from "openai";
import { db } from "@/lib/db";
import { sendEvolutionMessage } from "@/lib/whatsapp";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function processIncomingMessage(
    company: any,
    remoteJid: string,
    messageBody: string
) {
    if (!company.aiEnabled) return;

    try {
        let session = await db.whatsAppChatSession.findFirst({
            where: {
                companyId: company.id,
                remoteJid,
                status: "ACTIVE"
            },
            include: { messages: { orderBy: { createdAt: "asc" } } }
        });

        if (!session) {
            session = await db.whatsAppChatSession.create({
                data: {
                    companyId: company.id,
                    remoteJid,
                    status: "ACTIVE",
                },
                include: { messages: true }
            });
        }

        // Add user message to DB
        await db.whatsAppChatMessage.create({
            data: {
                sessionId: session.id,
                role: "user",
                content: messageBody
            }
        });

        // Refetch to get updated list
        const updatedSession = await db.whatsAppChatSession.findUnique({
            where: { id: session.id },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                    take: 15 // Keep context window manageable (last 15 messages)
                }
            }
        });

        if (!updatedSession) return;

        // Build OpenAI context
        const sysPrompt = `Você é o assistente virtual da empresa/clínica. Seu nome é ${company.aiBotName || "Noclip"}.
Aqui estão as regras do seu comportamento e as informações do negócio:
${company.aiSystemPrompt || "Seja educado, prestativo e focado em solucionar as dúvidas do cliente."}

Regras Gerais:
- Responda de forma natural, humanóide e empática.
- Não use linguagem excessivamente formal de robôs, use emojis sutilmente.
- O formato do seu output será no WhatsApp. Então pode usar formatações do WhatsApp como *negrito*, _itálico_ etc.
- Caso o usuário pergunte algo fora do escopo do negócio, seja educado e volte o assunto.`;

        const openAiMessages: any[] = [
            { role: "system", content: sysPrompt }
        ];

        // Format historical messages
        updatedSession.messages.forEach(msg => {
            openAiMessages.push({ role: msg.role, content: msg.content });
        });

        // call OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: openAiMessages,
            temperature: 0.7,
            max_tokens: 500,
        });

        const reply = completion.choices[0]?.message?.content || "Desculpe, não entendi.";

        // Save reply to DB
        await db.whatsAppChatMessage.create({
            data: {
                sessionId: session.id,
                role: "assistant",
                content: reply
            }
        });

        // Send to WhatsApp
        if (company.evolutionServerUrl && company.evolutionApiKey && company.whatsappInstanceId) {
            await sendEvolutionMessage(
                company.evolutionServerUrl,
                company.evolutionApiKey,
                company.whatsappInstanceId,
                remoteJid,
                reply
            );
        }

    } catch (error) {
        console.error("[WHATSAPP AI] Error processing message:", error);
    }
}
