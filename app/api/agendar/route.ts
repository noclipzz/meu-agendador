import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientId, serviceId, professionalId, companyId, date, name, phone } = body;

    // 1. Cria o agendamento no banco
    const newBooking = await prisma.booking.create({
      data: {
        date: new Date(date),
        customerName: name,
        customerPhone: phone,
        serviceId: serviceId,
        professionalId: professionalId,
        companyId: companyId,
        clientId: clientId || null 
      },
      include: {
        service: true,
        professional: true,
        company: true
      }
    });

    // 2. Tenta enviar a notificação por e-mail para o dono da empresa
    const emailDestino = newBooking.company.notificationEmail || "seu-email-padrao@gmail.com"; // Fallback
    
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'Agendamentos <onboarding@resend.dev>', // No plano grátis use este remetente
          to: emailDestino,
          subject: `🔔 Novo Agendamento: ${name}`,
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #2563eb;">Novo Agendamento Recebido!</h2>
              <p>Um novo serviço foi marcado através da sua página pública.</p>
              <hr style="border: 0; border-top: 1px solid #eee;" />
              <p><strong>Cliente:</strong> ${name}</p>
              <p><strong>Telefone:</strong> ${phone || 'Não informado'}</p>
              <p><strong>Serviço:</strong> ${newBooking.service.name}</p>
              <p><strong>Profissional:</strong> ${newBooking.professional?.name || 'Não definido'}</p>
              <p><strong>Data:</strong> ${format(new Date(date), "dd/MM/yyyy 'às' HH:mm'h'", { locale: ptBR })}</p>
              <hr style="border: 0; border-top: 1px solid #eee;" />
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/painel" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Ver na Agenda</a>
            </div>
          `
        });
      } catch (e) {
        console.error("Falha ao enviar e-mail:", e);
      }
    }

    return NextResponse.json(newBooking);
  } catch (error) {
    console.error("ERRO_AGENDAR:", error);
    return new NextResponse("Erro ao processar agendamento", { status: 500 });
  }
}