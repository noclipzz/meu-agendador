import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const prisma = db;

// Busca a ficha pública preenchida
export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const fichaRaw = await prisma.formEntry.findUnique({
            where: { id: params.id },
            include: {
                template: true,
                client: { select: { name: true, cpf: true, rg: true } }
            }
        });

        if (!fichaRaw) {
            return new NextResponse("Ficha não encontrada", { status: 404 });
        }

        const company = await prisma.company.findUnique({
            where: { id: fichaRaw.companyId },
            select: { name: true, logoUrl: true }
        });

        const ficha = {
            ...fichaRaw,
            company
        };

        return NextResponse.json(ficha);
    } catch (error) {
        console.error("ERRO_GET_FICHA:", error);
        return new NextResponse("Erro ao buscar ficha", { status: 500 });
    }
}

// Assina a ficha
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();
        const { signatureUrl, clientIp, clientUserAgent } = body;

        if (!signatureUrl) {
            return new NextResponse("Assinatura obrigatória", { status: 400 });
        }

        const ficha = await prisma.formEntry.update({
            where: { id: params.id },
            data: {
                status: "ASSINADO",
                signatureUrl,
                clientIp,
                clientUserAgent,
                signedAt: new Date(),
            }
        });

        return NextResponse.json(ficha);
    } catch (error) {
        console.error("ERRO_SIGN_FICHA:", error);
        return new NextResponse("Erro ao assinar ficha", { status: 500 });
    }
}
