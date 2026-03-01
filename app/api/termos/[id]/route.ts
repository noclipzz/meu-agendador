import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const prisma = db;

// Busca o termo público
export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const termo = await prisma.consentTerm.findUnique({
            where: { id: params.id },
            include: {
                company: { select: { name: true, logoUrl: true } },
                client: { select: { name: true, cpf: true, rg: true } }
            }
        });

        if (!termo) {
            return new NextResponse("Termo não encontrado", { status: 404 });
        }

        return NextResponse.json(termo);
    } catch (error) {
        console.error("ERRO_GET_TERMO:", error);
        return new NextResponse("Erro ao buscar termo", { status: 500 });
    }
}

// Assina o termo
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();
        const { signatureUrl, clientIp, clientUserAgent } = body;

        if (!signatureUrl) {
            return new NextResponse("Assinatura obrigatória", { status: 400 });
        }

        const termo = await prisma.consentTerm.update({
            where: { id: params.id },
            data: {
                status: "ASSINADO",
                signatureUrl,
                clientIp,
                clientUserAgent,
                signedAt: new Date(),
            }
        });

        return NextResponse.json(termo);
    } catch (error) {
        console.error("ERRO_SIGN_TERMO:", error);
        return new NextResponse("Erro ao assinar termo", { status: 500 });
    }
}
