import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processIncomingMessage } from "@/lib/ai/openai";
import { logIntegration } from "@/lib/integration-logger";

const prisma = db;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Identifica a Instância da Evolution API
    const instanceName = body.instance;
    if (!instanceName) return NextResponse.json({ ok: true });

    // 2. Busca a Empresa vinculada a essa Instância
    const company = await (prisma as any).company.findFirst({
      where: { whatsappInstanceId: instanceName }
    });

    if (!company) {
      console.warn(`[WHATSAPP WEBHOOK] Nenhuma empresa encontrada para instância: ${instanceName}`);
      return NextResponse.json({ ok: true });
    }

    // 3. Captura a mensagem e o remetente
    const data = body.data;
    if (!data || data.key?.fromMe) return NextResponse.json({ ok: true });

    const remoteJid = data.key?.remoteJid;
    const messageBody = data.message?.conversation || data.message?.extendedTextMessage?.text || data.content;
    
    if (!remoteJid || !messageBody) return NextResponse.json({ ok: true });

    const telefoneRemetente = remoteJid.replace("@s.whatsapp.net", "");

    // 4. LÓGICA DE CONFIRMAÇÃO RÁPIDA (LEGACY)
    const lowerMsg = messageBody.toLowerCase().trim();
    if (lowerMsg === "1" || lowerMsg === "sim" || lowerMsg === "confirmo") {
      const ag = await (prisma as any).booking.findFirst({
        where: { 
          customerPhone: { contains: telefoneRemetente.slice(-8) }, 
          status: "PENDENTE",
          companyId: company.id
        },
        orderBy: { date: 'asc' }
      });

      if (ag) {
        await (prisma as any).booking.update({
          where: { id: ag.id },
          data: { status: "CONFIRMADO" }
        });
        // Se a confirmação foi processada, opcionalmente podemos parar por aqui ou deixar a IA responder algo amigável
      }
    }

    // 5. LÓGICA DE INTELIGÊNCIA ARTIFICIAL
    if (company.aiEnabled) {
      console.log(`[WHATSAPP AI] Processando mensagem para ${company.name}: "${messageBody}"`);
      
      // Log do Webhook Recebido
      await logIntegration({
        companyId: company.id,
        service: "EVOLUTION",
        type: "WEBHOOK",
        status: "SUCCESS",
        endpoint: "/api/webhooks/whatsapp",
        identifier: telefoneRemetente,
        payload: { instanceName, messageBody, remoteJid }
      });

      // Não damos await aqui para responder rápido ao webhook da Evolution
      processIncomingMessage(company, remoteJid, messageBody).catch(e => {
        console.error("[WHATSAPP AI ERROR]", e);
        logIntegration({
          companyId: company.id,
          service: "EVOLUTION",
          type: "WEBHOOK",
          status: "ERROR",
          endpoint: "/api/webhooks/whatsapp",
          errorMessage: e.message || "Erro desconhecido no processamento da IA"
        });
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WHATSAPP WEBHOOK ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}