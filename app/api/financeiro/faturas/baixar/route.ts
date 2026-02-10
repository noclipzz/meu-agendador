import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const { id } = await req.json();

        // Atualiza para PAGO e define a data de pagamento como HOJE
        const updated = await prisma.invoice.update({
            where: { id },
            data: {
                status: "PAGO",
                paidAt: new Date()
            }
        });

        // Se tiver agendamento vinculado, também poderia atualizar, 
        // mas geralmente o agendamento já está CONCLUIDO desde que gerou a fatura.

        return NextResponse.json(updated);
    } catch (error) {
        return new NextResponse("Erro ao baixar", { status: 500 });
    }
}