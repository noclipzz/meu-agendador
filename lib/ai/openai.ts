import OpenAI from "openai";
import { db } from "@/lib/db";
import { sendEvolutionMessage } from "@/lib/whatsapp";
import { aiTools, executeAiFunction } from "./functions";

export async function processIncomingMessage(
    company: any,
    remoteJid: string,
    messageBody: string
) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || "dummy",
    });
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
- NUNCA assuma qual serviço o cliente quer. Caso o cliente seja vago (ex: "quero agendar"), chame obrigatoriamente a ferramenta 'buscar_servicos' para ver o cardápio real em vez de sugerir um aleatório.
- Responda de forma natural, humanóide e empática.
- Não use linguagem excessivamente formal de robôs, use emojis sutilmente.
- O formato do seu output será no WhatsApp. Então pode usar formatações do WhatsApp como *negrito*, _itálico_ etc.
- Caso o usuário pergunte algo fora do escopo do negócio, seja educado e volte o assunto.`;

        const openAiMessages: any[] = [
            { role: "system", content: sysPrompt }
        ];

        // Format historical messages
        updatedSession.messages.forEach((msg: any) => {
            const msgObj: any = { role: msg.role as any, content: msg.content };

            if (msg.role === "assistant" && msg.toolCalls) {
                // Se o JSON for vazio ou inválido, ignora a parte de tool_calls
                const calls = msg.toolCalls as any[];
                if (calls && calls.length > 0) {
                    msgObj.tool_calls = calls;
                    if (!msgObj.content) msgObj.content = null;
                } else {
                    // Se era um role assistant mas sem conteúdo nem ferramentas (bug), ignora a mensagem inteira
                    if (!msg.content) return;
                }
            }

            if (msg.role === "tool") {
                // NUNCA enviar um role 'tool' sem o ID, pois a OpenAI rejeita a requisição inteira
                if (!msg.toolCallId) return;
                msgObj.tool_call_id = msg.toolCallId;
            }

            openAiMessages.push(msgObj);
        });

        // Caso a última mensagem no histórico seja um 'assistant' com ferramentas mas sem a 'tool' correspondente
        // (ex: timeout no meio da execução), a OpenAI daria erro. Removemos ela para limpar o contexto.
        const lastMsg = openAiMessages[openAiMessages.length - 1];
        if (lastMsg && lastMsg.role === "assistant" && lastMsg.tool_calls) {
            openAiMessages.pop();
        }

        // call OpenAI (First Pass)
        let completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: openAiMessages,
            temperature: 0.7,
            max_tokens: 500,
            tools: aiTools,
            tool_choice: "auto"
        });

        let responseMessage = completion.choices[0]?.message;

        // Loop para lidar com múltiplos Tool Calls em sequência (se houver)
        let hasToolCalls = !!responseMessage?.tool_calls?.length;

        while (hasToolCalls) {
            // Salvar a requisição da Tool como Assistant (Conforme exigido pela OpenAI)
            openAiMessages.push(responseMessage);

            // Salvar a requisição da Tool como Assistant (MUITO IMPORTANTE para a memória da IA)
            await db.whatsAppChatMessage.create({
                data: {
                    sessionId: session.id,
                    role: "assistant",
                    content: responseMessage.content || "",
                    toolCalls: responseMessage.tool_calls as any
                }
            });

            const toolCalls = responseMessage.tool_calls || [];

            for (const toolCall of toolCalls) {
                const functionName = (toolCall as any).function.name;
                const functionArgs = JSON.parse((toolCall as any).function.arguments);

                // Executar a logica pesada real no backend
                const functionResponse = await executeAiFunction(functionName, functionArgs, company.id);

                // Adicionar a resposta da ferramenta no contexto
                openAiMessages.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: functionName,
                    content: functionResponse
                });

                // Salvar a resposta da ferramenta para manter o contexto na próxima mensagem
                await db.whatsAppChatMessage.create({
                    data: {
                        sessionId: session.id,
                        role: "tool",
                        content: functionResponse,
                        toolCallId: toolCall.id
                    }
                });
            }

            // Segunda Chamada para pedir a resposta final ao cliente, agora que ele tem os dados
            completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: openAiMessages,
                temperature: 0.7,
                max_tokens: 500,
                tools: aiTools,
                tool_choice: "auto"
            });

            responseMessage = completion.choices[0]?.message;
            hasToolCalls = !!responseMessage?.tool_calls?.length;
        }

        const reply = responseMessage?.content || "Desculpe, esbarrei numa dificuldade técnica.";

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
