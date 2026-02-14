import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";
import { notifyAdminsOfCompany, notifyProfessional } from "@/lib/push-server";
import { formatarDataCompleta, formatarHorario } from "@/app/utils/formatters";
const prisma = db;
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
            clientId,
            autoCreateClient = true // Default: cria cliente automaticamente (comportamento padrão para agendamento público)
        } = body;

        // 1. Validações Básicas
        if (!date || !companyId) {
            return new NextResponse("Dados incompletos", { status: 400 });
        }

        const dataAgendamento = new Date(date);
        const agora = new Date();

        // Se a data for anterior ao momento atual (com margem de 1 minuto)
        if (dataAgendamento < new Date(agora.getTime() - 60000)) {
            return new NextResponse("Não é possível agendar um horário que já passou.", { status: 400 });
        }

        // 2. Busca dados auxiliares
        const [service, professional, company] = await Promise.all([
            serviceId ? prisma.service.findUnique({ where: { id: serviceId } }) : null,
            professionalId ? prisma.professional.findUnique({ where: { id: professionalId } }) : null,
            prisma.company.findUnique({ where: { id: companyId } })
        ]);

        console.log("🔍 [DEBUG] Empresa encontrada:", company?.name, "| Email de Notificação:", company?.notificationEmail);

        let finalClientId = clientId;

        // 3. Lógica de Cliente (Cria ou Atualiza SE solicitado)
        if (!finalClientId && autoCreateClient) {
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

        // 5. VERIFICAÇÃO DE ESTOQUE CRÍTICO
        const warnings: string[] = [];
        if (serviceId) {
            const serviceWithProducts = await prisma.service.findUnique({
                where: { id: serviceId },
                include: { products: { include: { product: true } } }
            });

            if (serviceWithProducts?.products) {
                for (const sp of serviceWithProducts.products) {
                    const p = sp.product;
                    // Se o estoque atual for menor ou igual ao mínimo
                    if (Number(p.quantity) <= Number(p.minStock)) {
                        warnings.push(`⚠️ Atenção: O produto "${p.name}" está com estoque baixo (${Number(p.quantity)} ${p.unit}).`);
                    }
                }
            }
        }

        // 6. ENVIO DE E-MAILS (RESEND)
        const dataFormatada = formatarDataCompleta(new Date(date));
        const nomeServico = service?.name || "Atendimento";
        const nomeProfissional = professional?.name || "Profissional da Equipe";
        const nomeEmpresa = company?.name || "NOHUD Agenda";

        // A) E-mail para a EMPRESA/ADMIN (Alerta para APROVAR)
        if (company?.notificationEmail) {
            try {
                console.log("📨 [DEBUG] Tentando enviar e-mail para admin:", company.notificationEmail);

                const warningHtml = warnings.length > 0
                    ? `<div style="background:#fff7ed; border-left:4px solid #f97316; padding:15px; margin:20px 0;">
                       <p style="color:#c2410c; margin:0; font-weight:bold;">Avisos de Estoque:</p>
                       <ul style="color:#c2410c; margin:5px 0 0 20px; padding:0;">
                         ${warnings.map(w => `<li>${w}</li>`).join('')}
                       </ul>
                     </div>`
                    : '';

                const { data, error } = await resend.emails.send({
                    from: `NOHUD App <nao-responda@nohud.com.br>`,
                    to: company.notificationEmail,
                    subject: `🔔 Novo Agendamento Pendente: ${name}`,
                    html: `
                    <p>Você tem uma nova solicitação de agendamento!</p>
                    <p><strong>Cliente:</strong> ${name} (${phone})</p>
                    <p><strong>Serviço:</strong> ${nomeServico}</p>
                    <p><strong>Data:</strong> ${dataFormatada}</p>
                    
                    ${warningHtml}

                    <br/>
                    <a href="https://meu-agendador-kappa.vercel.app/painel" style="background:#2563eb; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Acessar Painel</a>
                `
                });

                if (error) {
                    console.error("❌ [DEBUG] Erro Resend:", error);
                } else {
                    console.log("✅ [DEBUG] E-mail enviado! ID:", data?.id);
                }
            } catch (error) {
                console.error("❌ [DEBUG] Erro fatal no envio:", error);
            }
        } else {
            console.log("⚠️ [DEBUG] Empresa não possui email de notificação configurado.");
        }

        // 5. NOTIFICAÇÃO PUSH (ADMIN E PROFISSIONAL)
        try {
            // Notifica os Admins
            await notifyAdminsOfCompany(
                companyId,
                "🔔 Novo Agendamento!",
                `${name} solicitou ${nomeServico} para ${dataFormatada}`,
                "/painel/agenda"
            );

            // Notifica o Profissional designado (se houver)
            if (professionalId) {
                await notifyProfessional(
                    professionalId,
                    "📅 Você tem um novo agendamento!",
                    `${name} agendou ${nomeServico} para as ${formatarHorario(new Date(date))}`,
                    "/painel/agenda"
                );
            }
        } catch (pushErr) {
            console.error("Erro ao enviar push:", pushErr);
        }

        return NextResponse.json({ ...booking, warnings });

    } catch (error) {
        console.error("ERRO_AGENDAR:", error);
        return new NextResponse("Erro interno ao agendar", { status: 500 });
    }
}