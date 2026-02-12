import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

// PUT: Vincular ou desvincular um cliente de um agendamento
export async function PUT(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { bookingId, clientId } = body;

        // Validação: bookingId é obrigatório. clientId pode ser string (vincular) ou null (desvincular).
        if (!bookingId) {
            return NextResponse.json({ error: "bookingId é obrigatório" }, { status: 400 });
        }

        // Verifica se o agendamento existe e se o usuário tem permissão
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { company: true }
        });

        if (!booking) {
            return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
        }

        // Verifica permissão: deve ser o dono da empresa ou membro da equipe
        if (booking.company.ownerId !== userId) {
            const teamMember = await prisma.teamMember.findUnique({
                where: { clerkUserId: userId }
            });
            if (!teamMember || teamMember.companyId !== booking.companyId) {
                return new NextResponse("Sem permissão", { status: 403 });
            }
        }

        // Se clientId for fornecido, verifica se o cliente existe
        if (clientId) {
            const client = await prisma.client.findFirst({
                where: { id: clientId, companyId: booking.companyId }
            });

            if (!client) {
                return NextResponse.json({ error: "Cliente não encontrado nesta empresa" }, { status: 404 });
            }
        }

        // Atualiza o agendamento (com clientId novo ou null)
        const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: { clientId: clientId || null }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("ERRO_VINCULAR_CLIENTE:", error);
        return NextResponse.json({ error: "Erro ao vincular/desvincular cliente" }, { status: 500 });
    }
}
