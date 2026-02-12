import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    const dataFormatada = format(new Date(booking.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    const emailCliente = booking.client?.email;

    // A. E-mail para o Admin (Sempre que houver notificationEmail)
    if (booking.company.notificationEmail) {
      try {
        console.log("📨 [DEBUG] Enviando confirmação para ADMIN:", booking.company.notificationEmail);
        const { error } = await resend.emails.send({
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
        if (error) console.error("❌ [DEBUG] Erro Resend Admin:", error);
      } catch (e) {
        console.error("❌ [DEBUG] Erro fatal e-mail admin:", e);
      }
    }

    // B. E-mail para o Cliente (Somente se ele tiver e-mail)
    if (emailCliente) {
      try {
        console.log("📨 [DEBUG] Enviando confirmação para CLIENTE:", emailCliente);
        const { error } = await resend.emails.send({
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
        if (error) console.error("❌ [DEBUG] Erro Resend Cliente:", error);
      } catch (e) {
        console.error("❌ [DEBUG] Erro fatal e-mail cliente:", e);
      }
    } else {
      console.log("⚠️ [DEBUG] Cliente sem e-mail cadastrado, pulando notificação do cliente.");
    }

    return NextResponse.json(updated);

  } catch (error) {
    console.error("ERRO_CONFIRMAR:", error);
    return new NextResponse("Erro interno", { status: 500 });
  }
}