import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Lista prontuários preenchidos de um cliente (query: ?clientId=xxx)
export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) return NextResponse.json({ error: "clientId obrigatório" }, { status: 400 });

        const entries = await db.formEntry.findMany({
            where: { clientId },
            include: { template: { select: { name: true, fields: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(entries);
    } catch (error) {
        console.error("Erro ao buscar prontuários:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

// POST: Cria ou Atualiza um prontuário preenchido
export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const company = await db.company.findFirst({
            where: {
                OR: [
                    { ownerId: userId },
                    { professionals: { some: { userId } } }
                ]
            }
        });

        if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const body = await req.json();
        const { id, templateId, clientId, data } = body;

        if (!templateId || !clientId || !data) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        let entry;

        if (id) {
            // Atualiza existente
            entry = await db.formEntry.update({
                where: { id },
                data: { data, filledBy: userId },
                include: { template: { select: { name: true, fields: true } } }
            });
        } else {
            // Cria novo
            entry = await db.formEntry.create({
                data: {
                    templateId,
                    clientId,
                    companyId: company.id,
                    data,
                    filledBy: userId
                },
                include: { template: { select: { name: true, fields: true } } }
            });
        }

        return NextResponse.json(entry);
    } catch (error) {
        console.error("Erro ao salvar prontuário:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

// DELETE: Remove um prontuário preenchido
export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const body = await req.json();
        const { id } = body;

        await db.formEntry.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erro ao excluir prontuário:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
