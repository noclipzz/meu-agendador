import OpenAI from "openai";
import { db } from "@/lib/db";
import { sendEvolutionMessage } from "@/lib/whatsapp";
import { aiTools, executeAiFunction } from "./functions";
import { logIntegration } from "@/lib/integration-logger";

export async function processIncomingMessage(
    company: any,
    remoteJid: string,
    messageBody: string
) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || "dummy",
    });
    if (!company.aiEnabled) {
        console.log(`[AI IGNORED] IA desativada para empresa ${company.name}`);
        return;
    }

    console.log(`[AI PROCESSING] Iniciando para ${remoteJid}: "${messageBody}"`);

    try {
        let session = await db.whatsAppChatSession.findFirst({
            where: {
                companyId: company.id,
                remoteJid,
                status: { in: ["ACTIVE", "PAUSED"] }
            },
            orderBy: { createdAt: "desc" },
            include: { messages: { orderBy: { createdAt: "asc" } } }
        });

        // Se a sessão está pausada (esperando humano), a IA não responde mais neste número por um tempo
        // (A menos que um botão no painel "retomar_ia" volte o status para ACTIVE futuramente,
        // mas por hora, bloqueamos a execução para ela ficar muda)
        if (session && session.status === "PAUSED") {
            const horasPausada = (new Date().getTime() - session.updatedAt.getTime()) / (1000 * 60 * 60);
            if (horasPausada < 12) {
                console.log(`[AI IGNORED] Sessão de ${remoteJid} está pausada aguardando humano.`);
                return;
            } else {
                // Passou 12h, libera nova sessão
                session = null;
            }
        }

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

        // Refetch to get updated list - fetching the LAST 15 messages
        const updatedSession = await db.whatsAppChatSession.findUnique({
            where: { id: session.id }
        });

        if (!updatedSession) return;

        const recentMessages = await db.whatsAppChatMessage.findMany({
            where: { sessionId: session.id },
            orderBy: { createdAt: "desc" },
            take: 20 // Keep context window manageable (last 20 messages)
        });
        
        // Reverse to get them in chronological (asc) order for OpenAI
        let chronologicalMessages = recentMessages.reverse();

        // --- FIX: Limpa mensagens 'tool' órfãs no início do histórico ---
        // A OpenAI exige que toda mensagem 'tool' seja precedida pelo 'assistant' com 'tool_calls'.
        // Se o nosso 'take: 20' cortou no meio de uma sequência (ficando c/ o tool mas s/ o assistant original),
        // removemos os órfãos do início para evitar erro 400.
        while (chronologicalMessages.length > 0 && (chronologicalMessages[0] as any).role === "tool") {
            chronologicalMessages.shift();
        }

        const now = new Date();
        const dataHoje = now.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const horaAtu = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        let telefoneCliente = remoteJid.split('@')[0];
        // Tratamento para números brasileiros de WhatsApp sem o 9 (ex: 553188357138 -> 5531988357138)
        if (telefoneCliente.startsWith("55") && telefoneCliente.length === 12) {
            telefoneCliente = `55${telefoneCliente.substring(2, 4)}9${telefoneCliente.substring(4)}`;
        }

        // Build OpenAI context
        const sysPrompt = `Você é o assistente virtual da empresa/clínica. Seu nome é ${company.aiBotName || "Noclip"}.
Data de Hoje: ${dataHoje}
Horário Atual: ${horaAtu}
Telefone do Cliente: ${telefoneCliente}
ATENÇÃO: Estamos no ano de 2026. NUNCA use o ano de 2023 ou qualquer outro.

Aqui estão as regras do seu comportamento e as informações do negócio:
${company.aiSystemPrompt || "Seja educado, prestativo e focado em solucionar as dúvidas do cliente."}

${company.aiFaq ? `BASE DE CONHECIMENTO DA EMPRESA (FAQ):\n${company.aiFaq}\n` : ""}

Regras Gerais:
- NUNCA assuma qual serviço o cliente quer. Caso o cliente seja vago, chame a ferramenta 'buscar_servicos'.
- Se o cliente escolher um horário (ex: "15:00") e um serviço, certifique-se de ter o nome do cliente. Se não tiver o nome do cliente, PERGUNTE o nome dele ANTES de chamar a ferramenta 'marcar_horario'.
- Quando você tiver todas as informações (horário, serviço selecionado e nome do cliente), chame IMEDIATAMENTE a ferramenta 'marcar_horario', usando a data exata no formato ISO (ex: 2026-03-10T15:00:00-03:00) e o telefone do cliente (${telefoneCliente}).
- ATENÇÃO MÁXIMA PARA IDs: Os parâmetros \`serviceId\` e \`professionalId\` DEVEM obrigatóriamente ser o código ID longo (ex: cmkv7l...) retornado pela ferramenta \`buscar_servicos\`. JAMAIS passe o nome (como "Teste" ou "1") nestes campos. IMPORTANTE: JAMAIS exiba ou cite esses IDs (código longo) nas mensagens para o cliente. O cliente só precisa ler o NOME do serviço ou do profissional. Mantenha os IDs ocultos apenas para o uso interno nas ferramentas.
- Após chamar 'marcar_horario' e receber SUCESSO, você DEVE confirmar detalhadamente para o cliente (serviço, dia, hora e profissional) e encerrar a marcação. NÃO mostre a lista de horários livres de novo após agendar.
- CONFIRMAÇÃO AUTOMÁTICA ONLINE: Se houver uma mensagem no histórico onde foi perguntado ao cliente se ele "confirma esse horário", ou se o cliente apenas mandar uma afirmação solta como ("sim", "s", "ss", "ok", "pode confirmar", "confirmo", "beleza", "jóia", "yep", "claro", "isso", "uhum", "ta bom", "blz"), você DEVE IMEDIATAMENTE e obrigatoriamente usar a ferramenta 'alterar_status_agendamento' com a acao='CONFIRMAR'. Não presuma que a conversa encerrou, o "ok" ou "sim" é para confirmar o agendamento! NUNCA confirme apenas com palavras sem chamar a ferramenta.
- CONSULTAR AGENDAMENTOS: Se o cliente perguntar se tem agendamento amanhã, que dia é o agendamento dele, "quais os meus horários" ou algo similar, use a ferramenta 'consultar_agendamentos_cliente' passando o telefone dele para verificar a lista de agendamentos reais dele e responda com base nisso. Nunca diga que você não tem acesso à agenda do cliente.
- CANCELAMENTO SOLICITADO PELO CLIENTE: Se o cliente pedir para cancelar ou soltar negações como ("não", "nao", "cancelar", "cancela", "não poderei", "n"), você DEVE pedir confirmação ("Certeza que deseja cancelar?") ou, se ele já estiver confirmando o cancelamento, usar IMEDIATAMENTE a ferramenta 'alterar_status_agendamento' com acao='CANCELAR'.
- NEUTRALIDADE DE NICHO ABSOLUTA: Você atende agendamentos genéricos. Você é terminantemente PROIBIDA de enviar emojis de cabelo, barba, tesoura, salão, médicos ou dentes (como 💇‍♀️, 💅, 💈, ✂️, ✂, 🦷, 👨‍⚕️) em QUALQUER situação, a menos que o prompt do lojista tenha te instruído a usá-los. Se o cliente falar "Quero cortar", não mande tesoura. Use APENAS emojis neutros e corporativos (✅, 📅, 😊, ✨, 🙌, 💼).
- DÉBITOS E FATURAS: Se o cliente perguntar "O que eu estou devendo?", "Tenho alguma fatura em aberto?", "Meus débitos" ou algo similar, use a ferramenta 'consultar_debitos_cliente' passando o telefone dele para verificar se há faturas pendentes ou vencidas. Apenas liste os débitos de forma informativa. Você não tem permissão para gerar cobranças ativas ou mandar lembretes automaticamente, apenas responda à dúvida do cliente caso ele pergunte.
- Responda de forma natural, humanóide e empática.
- O formato do seu output será no WhatsApp. Então pode usar formatações do WhatsApp como *negrito*, _itálico_ etc.`;

        const openAiMessages: any[] = [
            { role: "system", content: sysPrompt }
        ];

        // Format historical messages
        chronologicalMessages.forEach((msg: any) => {
            // Skip messages with no content and no tool info - they are useless
            if (!msg.content && !msg.toolCalls && !msg.toolCallId && msg.role !== "assistant") return;

            if (msg.role === "user") {
                // User messages MUST have content as string, OpenAI rejects null
                if (!msg.content) return; // skip empty user messages
                openAiMessages.push({ role: "user", content: String(msg.content) });
                return;
            }

            if (msg.role === "assistant") {
                if (msg.toolCalls) {
                    const calls = msg.toolCalls as any[];
                    if (calls && calls.length > 0) {
                        openAiMessages.push({
                            role: "assistant",
                            content: msg.content || null,
                            tool_calls: calls
                        });
                    } else if (msg.content) {
                        openAiMessages.push({ role: "assistant", content: String(msg.content) });
                    }
                    // If no content AND no valid tool_calls, skip entirely
                } else if (msg.content) {
                    openAiMessages.push({ role: "assistant", content: String(msg.content) });
                }
                // Skip assistant messages with no content and no tool_calls
                return;
            }

            if (msg.role === "tool") {
                if (!msg.toolCallId || !msg.content) return; // skip invalid tool messages
                openAiMessages.push({
                    role: "tool",
                    tool_call_id: msg.toolCallId,
                    content: String(msg.content)
                });
                return;
            }
        });

        // --- SANITIZATION PASS ---
        // 1. Remove orphaned 'tool' messages at the start (no preceding assistant with tool_calls)
        while (openAiMessages.length > 1 && openAiMessages[1]?.role === "tool") {
            openAiMessages.splice(1, 1);
        }

        // 2. Remove any 'tool' message that doesn't have a matching assistant tool_call before it
        for (let i = openAiMessages.length - 1; i >= 1; i--) {
            if (openAiMessages[i].role === "tool") {
                const toolCallId = openAiMessages[i].tool_call_id;
                // Find the nearest preceding assistant with matching tool_call
                let foundMatch = false;
                for (let j = i - 1; j >= 0; j--) {
                    if (openAiMessages[j].role === "assistant" && openAiMessages[j].tool_calls) {
                        const hasMatch = openAiMessages[j].tool_calls.some((tc: any) => tc.id === toolCallId);
                        if (hasMatch) { foundMatch = true; break; }
                    }
                }
                if (!foundMatch) {
                    openAiMessages.splice(i, 1);
                }
            }
        }

        // 3. Remove trailing assistant messages with tool_calls that have no tool response following them
        while (openAiMessages.length > 0) {
            const lastMsg = openAiMessages[openAiMessages.length - 1];
            if (lastMsg && lastMsg.role === "assistant" && lastMsg.tool_calls) {
                openAiMessages.pop();
            } else {
                break;
            }
        }

        // 4. Remove any assistant with tool_calls whose tool responses are missing (mid-history)
        for (let i = openAiMessages.length - 1; i >= 0; i--) {
            if (openAiMessages[i].role === "assistant" && openAiMessages[i].tool_calls) {
                const expectedIds = openAiMessages[i].tool_calls.map((tc: any) => tc.id);
                const allFound = expectedIds.every((id: string) => {
                    for (let j = i + 1; j < openAiMessages.length; j++) {
                        if (openAiMessages[j].role === "tool" && openAiMessages[j].tool_call_id === id) return true;
                        if (openAiMessages[j].role !== "tool") break;
                    }
                    return false;
                });
                if (!allFound) {
                    // Remove the assistant + any orphaned tool messages after it
                    let removeCount = 1;
                    while (i + removeCount < openAiMessages.length && openAiMessages[i + removeCount].role === "tool") {
                        removeCount++;
                    }
                    openAiMessages.splice(i, removeCount);
                }
            }
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
            await db.whatsAppChatSession.update({
                where: { id: session.id },
                data: { updatedAt: new Date() }
            });

            await db.whatsAppChatMessage.create({
                data: {
                    sessionId: session.id,
                    role: "assistant",
                    content: responseMessage.content || null,
                    toolCalls: responseMessage.tool_calls as any
                }
            });

            const toolCalls = responseMessage.tool_calls || [];

            for (const toolCall of toolCalls) {
                const functionName = (toolCall as any).function.name;
                const functionArgs = JSON.parse((toolCall as any).function.arguments);

                // Executar a logica pesada real no backend
                const functionResponse = await executeAiFunction(functionName, functionArgs, company.id, session.id);

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

        let reply = responseMessage?.content || "Desculpe, esbarrei numa dificuldade técnica.";

        // Força a conversão do bold Markdown (**) nativo da OpenAI para o bold Whatsapp (*)
        // E remove barras invertidas (\) que a IA usa pra tentar escapar a "formatação"
        reply = reply
            .replace(/\\\*/g, '*')
            .replace(/\\_/g, '_')
            .replace(/\*\*(.*?)\*\*/g, '*$1*');

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

    } catch (error: any) {
        console.error("[WHATSAPP AI] Error processing message:", error);
        await logIntegration({
            companyId: company.id,
            service: "EVOLUTION",
            type: "WEBHOOK",
            status: "ERROR",
            errorMessage: error.message || "Erro fatal no processamento da IA"
        });
    }
}
