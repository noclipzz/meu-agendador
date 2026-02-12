import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

// PUT: Vincular um cliente cadastrado a um agendamento existente
export async function PUT(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { bookingId, clientId } = body;

        if (!bookingId || !clientId) {
            return NextResponse.json({ error: "bookingId e clientId são obrigatórios" }, { status: 400 });
        }

        // Verifica se o agendamento existe e se o usuário tem permissão
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { company: true }
        });

        if (!booking) {
            return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
        }

        // Verifica permissão: deve ser o dono da empresa
        if (booking.company.ownerId !== userId) {
            // Ou pode ser um membro da equipe
            const teamMember = await prisma.teamMember.findUnique({
                where: { clerkUserId: userId }
            });
            if (!teamMember || teamMember.companyId !== booking.companyId) {
                return new NextResponse("Sem permissão", { status: 403 });
            }
        }

        // Verifica se o cliente existe e pertence à mesma empresa
        const client = await prisma.client.findFirst({
            where: { id: clientId, companyId: booking.companyId }
        });

        if (!client) {
            return NextResponse.json({ error: "Cliente não encontrado nesta empresa" }, { status: 404 });
        }

        // Atualiza o agendamento com o clientId
        const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: { clientId }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("ERRO_VINCULAR_CLIENTE:", error);
        return NextResponse.json({ error: "Erro ao vincular cliente" }, { status: 500 });
    }
}
