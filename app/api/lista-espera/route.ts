import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const prisma = db;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            name,
            phone,
            preferences,
            serviceId,
            professionalId,
            companyId
        } = body;

        if (!name || !phone || !companyId) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        const entry = await prisma.waitingList.create({
            data: {
                customerName: name,
                customerPhone: phone,
                preferences: preferences || "",
                serviceId: serviceId || null,
                professionalId: professionalId || null,
                companyId: companyId,
                status: "ATIVO"
            }
        });

        return NextResponse.json(entry);
    } catch (error) {
        console.error("ERRO_LISTA_ESPERA:", error);
        return NextResponse.json({ error: "Erro interno ao entrar na lista" }, { status: 500 });
    }
}
