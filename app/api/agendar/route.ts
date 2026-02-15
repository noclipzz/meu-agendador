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

        // 3. Lógica de Cliente (Somente busca, NÃO CRIA)
        const phoneClean = phone?.replace(/\D/g, "") || "";
        if (!finalClientId && phoneClean) {
            const existingClient = await prisma.client.findFirst({
                where: {
                    companyId,
                    OR: [
                        { phone: { contains: phone } },      // Com máscara original
                        { phone: { contains: phoneClean } }, // Só números
                        { phone: { contains: phoneClean.slice(-8) } } // Últimos 8 dígitos (fallback)
                    ]
                }
            });

            if (existingClient) {
                finalClientId = existingClient.id;
                // Opcional: Atualiza o e-mail se o cliente atual não tiver, mas já existir no banco
                if (email && !existingClient.email) {
                    await prisma.client.update({ where: { id: existingClient.id }, data: { email } });
                }
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

        // 6. ENVIO DE NOTIFICAÇÕES (E-MAIL E PUSH)
        const dataFormatada = formatarDataCompleta(new Date(date));
        const nomeServico = service?.name || (type === "EVENTO" ? "Evento" : "Atendimento");
        const isEvento = type === "EVENTO";

        // A) E-mail para a EMPRESA/ADMIN
        if (company?.notificationEmail) {
            try {
                const subject = isEvento
                    ? `📅 Novo Evento Adicionado: ${name}`
                    : `🔔 Novo Agendamento Pendente: ${name}`;

                const introText = isEvento
                    ? `Um novo evento interno foi adicionado à sua agenda.`
                    : `Você tem uma nova solicitação de agendamento de cliente!`;

                const warningHtml = warnings.length > 0
                    ? `<div style="background:#fff7ed; border-left:4px solid #f97316; padding:15px; margin:20px 0;">
                       <p style="color:#c2410c; margin:0; font-weight:bold;">Avisos de Estoque:</p>
                       <ul style="color:#c2410c; margin:5px 0 0 20px; padding:0;">
                         ${warnings.map(w => `<li>${w}</li>`).join('')}
                       </ul>
                     </div>`
                    : '';

                await resend.emails.send({
                    from: `NOHUD App <nao-responda@nohud.com.br>`,
                    to: company.notificationEmail,
                    subject,
                    html: `
                    <p>${introText}</p>
                    <p><strong>${isEvento ? 'Título' : 'Cliente'}:</strong> ${name} ${phone ? `(${phone})` : ''}</p>
                    ${!isEvento ? `<p><strong>Serviço:</strong> ${nomeServico}</p>` : ''}
                    <p><strong>Data:</strong> ${dataFormatada}</p>
                    ${location ? `<p><strong>Local:</strong> ${location}</p>` : ''}
                    ${warningHtml}
                    <br/>
                    <a href="https://meu-agendador-kappa.vercel.app/painel" style="background:#2563eb; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Acessar Painel</a>
                `
                });
            } catch (error) {
                console.error("❌ Erro e-mail:", error);
            }
        }

        // B) NOTIFICAÇÃO PUSH (ADMIN E PROFISSIONAL)
        try {
            const pushTitle = isEvento ? "📅 Novo Evento!" : "🔔 Novo Agendamento!";
            const pushBody = isEvento
                ? `Evento: "${name}" para ${dataFormatada}`
                : `${name} solicitou ${nomeServico} para ${dataFormatada}`;

            await notifyAdminsOfCompany(companyId, pushTitle, pushBody, "/painel/agenda");

            if (professionalId) {
                const proPushTitle = isEvento ? "📅 Novo Evento na sua Agenda!" : "📅 Você tem um novo agendamento!";
                const proPushBody = isEvento
                    ? `Você tem um evento: "${name}" às ${formatarHorario(new Date(date))}`
                    : `${name} agendou ${nomeServico} para as ${formatarHorario(new Date(date))}`;
                await notifyProfessional(professionalId, proPushTitle, proPushBody, "/painel/agenda");
            }
        } catch (pushErr) {
            console.error("Erro push:", pushErr);
        }

        return NextResponse.json({ ...booking, warnings });

    } catch (error) {
        console.error("ERRO_AGENDAR:", error);
        return new NextResponse("Erro interno ao agendar", { status: 500 });
    }
}