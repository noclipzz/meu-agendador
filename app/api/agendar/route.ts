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
    const { 
        name, 
        phone, 
        email, 
        date, 
        serviceId, 
        professionalId, 
        companyId, 
        type, 
        location,
        clientId 
    } = body;

    // 1. Validações Básicas
    if (!date || !companyId) {
        return new NextResponse("Dados incompletos", { status: 400 });
    }

    // 2. Busca dados auxiliares
    const [service, professional, company] = await Promise.all([
        serviceId ? prisma.service.findUnique({ where: { id: serviceId } }) : null,
        professionalId ? prisma.professional.findUnique({ where: { id: professionalId } }) : null,
        prisma.company.findUnique({ where: { id: companyId } })
    ]);

    let finalClientId = clientId;

    // 3. Lógica de Cliente (Cria ou Atualiza se for público)
    if (!finalClientId) {
        const phoneClean = phone?.replace(/\D/g, "") || "";
        let existingClient = null;
        
        if (phoneClean) {
            existingClient = await prisma.client.findFirst({
                where: { companyId, phone: { contains: phoneClean } }
            });
        }

        if (existingClient) {
            finalClientId = existingClient.id;
            if (email && !existingClient.email) {
                await prisma.client.update({ where: { id: existingClient.id }, data: { email } });
            }
        } else {
            const newClient = await prisma.client.create({
                data: { name, phone, email, companyId }
            });
            finalClientId = newClient.id;
        }
    }

    // 4. Cria o Agendamento (AGORA COMO PENDENTE)
    const booking = await prisma.booking.create({
        data: {
            date: new Date(date),
            companyId,
            clientId: finalClientId,
            serviceId: serviceId || null,
            professionalId: professionalId || null,
            customerName: name,
            customerPhone: phone,
            type: type || "CLIENTE",
            location: location || null,
            
            // --- ALTERAÇÃO AQUI: STATUS INICIAL PENDENTE ---
            status: "PENDENTE" 
        }
    });

    // 5. ENVIO DE E-MAILS (RESEND)
    const dataFormatada = format(new Date(date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    const nomeServico = service?.name || "Atendimento";
    const nomeProfissional = professional?.name || "Profissional da Equipe";
    const nomeEmpresa = company?.name || "NOHUD Agenda";

    // A) E-mail para o CLIENTE (Avisando que está PENDENTE)
    if (email) {
        try {
            await resend.emails.send({
                from: `${nomeEmpresa} <nao-responda@nohud.com.br>`,
                to: email,
                subject: `⏳ Solicitação de Agendamento: ${dataFormatada}`, // Assunto mudou para Solicitação
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
                        <h2 style="color: #d97706;">Olá, ${name}!</h2>
                        <p>Recebemos sua solicitação de agendamento.</p>
                        <p><strong>Status atual:</strong> <span style="background: #fffbeb; color: #b45309; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Aguardando Confirmação</span></p>
                        
                        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>📅 Data:</strong> ${dataFormatada}</p>
                            <p><strong>💇 Serviço:</strong> ${nomeServico}</p>
                            <p><strong>👨‍⚕️ Profissional:</strong> ${nomeProfissional}</p>
                            <p><strong>📍 Local:</strong> ${company?.name}</p>
                        </div>
                        <p style="font-size: 12px; color: #666;">Você receberá uma nova notificação assim que confirmarmos.</p>
                    </div>
                `
            });
        } catch (error) {
            console.error("Erro ao enviar e-mail para cliente:", error);
        }
    }

    // B) E-mail para a EMPRESA/ADMIN (Alerta para APROVAR)
    if (company?.notificationEmail) {
        try {
            await resend.emails.send({
                from: `Sistema NOHUD <nao-responda@nohud.com.br>`,
                to: email,
                subject: `🔔 Novo Agendamento Pendente: ${name}`,
                html: `
                    <p>Você tem uma nova solicitação de agendamento!</p>
                    <p><strong>Cliente:</strong> ${name} (${phone})</p>
                    <p><strong>Serviço:</strong> ${nomeServico}</p>
                    <p><strong>Data:</strong> ${dataFormatada}</p>
                    <br/>
                    <a href="https://seu-sistema.vercel.app/painel" style="background:#2563eb; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Acessar Painel para Confirmar</a>
                `
            });
        } catch (error) {
            console.error("Erro ao enviar e-mail para admin:", error);
        }
    }

    return NextResponse.json(booking);

  } catch (error) {
    console.error("ERRO_AGENDAR:", error);
    return new NextResponse("Erro interno ao agendar", { status: 500 });
  }
}