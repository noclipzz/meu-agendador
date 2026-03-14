import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyAdminsOfCompany, notifyProfessional } from "@/lib/push-server";
import { formatarDataCurta } from "@/app/utils/formatters";
import { checkWaitingList } from "@/lib/waiting-list";

const prisma = db;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const phoneRaw = searchParams.get('phone') || "";
        const phoneClean = phoneRaw.replace(/\D/g, "");
        const companyId = searchParams.get('companyId');

        if (!phoneClean || !companyId) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        // Busca agendamentos PENDENTES ou CONFIRMADOS para este telefone nesta empresa
        // Tenta achar tanto com máscara quanto sem
        const bookings = await prisma.booking.findMany({
            where: {
                companyId,
                OR: [
                    { customerPhone: { contains: phoneRaw } },
                    { customerPhone: { contains: phoneClean } },
                    // Fallback para caso o DD esteja faltando ou algo assim
                    { customerPhone: { contains: phoneClean.slice(-8) } }
                ],
                status: { in: ["PENDENTE", "CONFIRMADO"] },
                date: { gte: new Date() } // Somente futuros
            },
            include: {
                service: true,
                professional: true
            },
            orderBy: { date: 'asc' }
        });

        return NextResponse.json(bookings);
    } catch (error) {
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, action } = body;

        if (action === "CANCELAR") {
            const booking = await prisma.booking.findUnique({
                where: { id },
                include: { service: true, professional: true, company: true }
            });

            if (!booking) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

            const updated = await prisma.booking.update({
                where: { id },
                data: { status: "CANCELADO" }
            });

            // Notificações
            const dataFormatada = formatarDataCurta(new Date(booking.date));
            const titulo = "🚫 Agendamento Cancelado pelo Cliente";
            const corpo = `${booking.customerName} cancelou o horário de ${dataFormatada} (${booking.service?.name})`;

            // 1. Notifica Admin (Push e Email)
            await notifyAdminsOfCompany(booking.companyId, titulo, corpo, "/painel/agenda", "booking_cancellation_push");
            
            const notifSettings = (booking.company.notificationSettings as any) || {};

            if (notifSettings.booking_cancellation_email !== false && booking.company.notificationEmail) {
                const { Resend } = await import("resend");
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                    from: "NOHUD App <nao-responda@nohud.com.br>",
                    to: booking.company.notificationEmail,
                    subject: `❌ Cancelamento: ${booking.customerName}`,
                    html: `<p>${corpo}</p><p>Data: ${dataFormatada}</p>`
                }).catch(e => console.error("Erro email cancelamento staff:", e));
            }

            // 2. Notifica Profissional
            if (booking.professionalId) {
                await notifyProfessional(booking.professionalId, titulo, corpo, "/painel/agenda", "booking_cancellation_push");
            }

            // 3. Notifica Cliente (WhatsApp e Email)
            const sendWhatsappToClient = notifSettings.client_cancel_whatsapp !== false;
            const sendEmailToClient = notifSettings.client_cancel_email !== false;

            // WhatsApp
            if (sendWhatsappToClient && booking.company.whatsappStatus === 'CONNECTED' && booking.company.evolutionServerUrl && booking.customerPhone) {
                const { sendEvolutionMessage } = await import("@/lib/whatsapp");
                const { formatarHorario, formatarDiaExtenso } = await import("@/app/utils/formatters");
                const timeStr = formatarHorario(new Date(booking.date));
                const dateStr = formatarDiaExtenso(new Date(booking.date));
                const message = (booking.company.whatsappCancelSuccessMessage || `❌ *Agendamento Cancelado*\n\nSeu agendamento foi cancelado com sucesso.`)
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
                ).catch(e => console.error("Erro zap cancelamento client:", e));
            }

            // Email Cliente
            const { booking: bookingWithClient } = await import("@/lib/db").then(m => m.db);
            const fullBooking = await bookingWithClient.findUnique({
                where: { id: booking.id },
                include: { client: true }
            });

            if (sendEmailToClient && fullBooking?.client?.email) {
                const { Resend } = await import("resend");
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                    from: `${booking.company.name} <nao-responda@nohud.com.br>`,
                    to: fullBooking.client.email,
                    subject: `❌ Agendamento Cancelado: ${dataFormatada}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h2>Olá, ${booking.customerName}!</h2>
                            <p>Confirmamos o cancelamento do seu agendamento para <strong>${booking.service?.name}</strong> em <strong>${dataFormatada}</strong>.</p>
                            <p>Caso tenha sido um engano, você pode agendar um novo horário em nosso site.</p>
                        </div>
                    `
                }).catch(e => console.error("Erro email cancelamento client:", e));
            }

            // 4. Notifica se houver LISTA DE ESPERA
            await checkWaitingList(booking);

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao cancelar" }, { status: 500 });
    }
}
