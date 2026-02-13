import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { notifyAdminsOfCompany, notifyProfessional } from "@/lib/push-server";

const prisma = db;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get('phone')?.replace(/\D/g, "");
        const companyId = searchParams.get('companyId');

        if (!phone || !companyId) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        // Busca agendamentos PENDENTES ou CONFIRMADOS para este telefone nesta empresa
        const bookings = await prisma.booking.findMany({
            where: {
                companyId,
                customerPhone: { contains: phone },
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
            const dataFormatada = format(new Date(booking.date), "dd/MM 'às' HH:mm", { locale: ptBR });
            const titulo = "🚫 Agendamento Cancelado pelo Cliente";
            const corpo = `${booking.customerName} cancelou o horário de ${dataFormatada} (${booking.service?.name})`;

            // 1. Notifica Admin
            await notifyAdminsOfCompany(booking.companyId, titulo, corpo, "/painel/agenda");

            // 2. Notifica Profissional
            if (booking.professionalId) {
                await notifyProfessional(booking.professionalId, titulo, corpo, "/painel/agenda");
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao cancelar" }, { status: 500 });
    }
}
