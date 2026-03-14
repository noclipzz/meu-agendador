import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { notifyProfessional, notifyAdminsOfCompany } from "@/lib/push-server";
import { formatarDataCompleta } from "@/app/utils/formatters";

const prisma = db;
const resend = new Resend(process.env.RESEND_API_KEY);

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    const { id } = body;

    if (!id) return new NextResponse("ID faltando", { status: 400 });

    // 1. Busca os dados COMPLETOS do agendamento para o e-mail
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        service: true,
        professional: true,
        company: true,
        client: true // Precisamos do email do cliente
      }
    });

    if (!booking) return new NextResponse("Agendamento não encontrado", { status: 404 });

    // 2. Atualiza o status no banco de dados
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CONFIRMADO" }
    });

    // 3. ENVIA OS E-MAILS
    const dataFormatada = formatarDataCompleta(new Date(booking.date));
    const emailCliente = booking.client?.email;

    // A. E-mail para o Admin (Sempre que houver notificationEmail e configuração permitir)
    const notifSettings = (booking.company.notificationSettings as any) || {};
    const adminPrefKey = 'admin_confirm_email'; // This is a staff preference, but we check company-wide if not specified per user

    if (booking.company.notificationEmail) {
      try {
        console.log("📨 [DEBUG] Enviando confirmação para ADMIN:", booking.company.notificationEmail);
        await resend.emails.send({
          from: `NOHUD App <nao-responda@nohud.com.br>`,
          to: booking.company.notificationEmail,
          subject: `🗓️ Agendamento CONFIRMADO: ${booking.customerName}`,
          html: `
                    <p>O agendamento foi confirmado com sucesso no painel.</p>
                    <p><strong>Cliente:</strong> ${booking.customerName}</p>
                    <p><strong>Data:</strong> ${dataFormatada}</p>
                    <p><strong>Profissional:</strong> ${booking.professional?.name || "N/A"}</p>
                `
        });
      } catch (e) {
        console.error("❌ [DEBUG] Erro e-mail admin:", e);
      }
    }

    // B. E-mail para o Cliente (Somente se ativado e ele tiver e-mail)
    const sendEmailToClient = notifSettings.client_confirm_email !== false;
    if (sendEmailToClient && emailCliente) {
      try {
        console.log("📨 [DEBUG] Enviando confirmação para CLIENTE:", emailCliente);
        await resend.emails.send({
          from: `NOHUD App <nao-responda@nohud.com.br>`,
          to: emailCliente,
          subject: `✅ Agendamento Confirmado: ${dataFormatada}`,
          html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
                    <h2 style="color: #16a34a;">Olá, ${booking.customerName}!</h2>
                    <p>Ótima notícia! Seu agendamento foi <strong>CONFIRMADO</strong>.</p>
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #dcfce7;">
                        <p><strong>📅 Data:</strong> ${dataFormatada}</p>
                        <p><strong>💇 Serviço:</strong> ${booking.service?.name || "Atendimento"}</p>
                        <p><strong>👨‍⚕️ Profissional:</strong> ${booking.professional?.name || "Profissional da Equipe"}</p>
                        <p><strong>📍 Local:</strong> ${booking.company.name}</p>
                    </div>
                    <p>Estamos te esperando!</p>
                </div>
            `
        });
      } catch (e) {
        console.error("❌ [DEBUG] Erro e-mail cliente:", e);
      }
    }

    // C. WhatsApp para o Cliente (Se ativado)
    const sendWhatsappToClient = notifSettings.client_confirm_whatsapp !== false;
    if (sendWhatsappToClient && booking.company.whatsappStatus === 'CONNECTED' && booking.company.evolutionServerUrl && booking.customerPhone) {
      const { sendEvolutionMessage } = await import("@/lib/whatsapp");
      const { formatarHorario, formatarDiaExtenso } = await import("@/app/utils/formatters");
      const timeStr = formatarHorario(new Date(booking.date));
      const dateStr = formatarDiaExtenso(new Date(booking.date));
      const message = (booking.company.whatsappConfirmMessage || `✅ *Agendamento Confirmado!*\n\n{nome}, seu horário para *{servico}* está garantido. Até lá!`)
        .replace(/\\n/g, '\n')
        .replace("{nome}", booking.customerName || "")
        .replace("{servico}", booking.service?.name || "atendimento")
        .replace("{dia}", dateStr)
        .replace("{hora}", timeStr);

      await sendEvolutionMessage(
        booking.company.evolutionServerUrl,
        booking.company.evolutionApiKey!,
        booking.company.whatsappInstanceId!,
        booking.customerPhone,
        message
      ).catch(e => console.error("Erro zap confirmação:", e));
    }

    // C. Notificação Push para o Profissional e Admins
    if (booking.professionalId) {
      try {
        await notifyProfessional(
          booking.professionalId,
          "✅ Agendamento Confirmado!",
          `${booking.customerName} confirmado para ${dataFormatada}`,
          "/painel/agenda"
        );
      } catch (e) {
        console.error("❌ Erro ao enviar push de confirmação profissional:", e);
      }
    }

    // Notifica também os Admins
    try {
      await notifyAdminsOfCompany(
        booking.companyId,
        "✅ Agendamento Confirmado!",
        `O horário de ${booking.customerName} (${dataFormatada}) foi confirmado.`,
        "/painel/agenda"
      );
    } catch (e) {
      console.error("❌ Erro ao enviar push de confirmação admin:", e);
    }

    return NextResponse.json(updated);

  } catch (error) {
    console.error("ERRO_CONFIRMAR:", error);
    return new NextResponse("Erro interno", { status: 500 });
  }
}