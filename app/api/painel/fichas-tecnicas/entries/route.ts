import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Lista fichas técnicas preenchidas de um cliente (query: ?clientId=xxx)
export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        let company = await db.company.findUnique({ where: { ownerId: userId } });
        if (!company) {
            const prof = await db.professional.findFirst({ where: { userId }, include: { company: true } });
            if (prof && prof.company) company = prof.company;
        }

        if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        // VERIFICA PLANO VIA OWNER DA EMPRESA
        const sub = await db.subscription.findUnique({ where: { userId: company.ownerId } });
        if (!sub || sub.plan !== "MASTER") {
            return NextResponse.json({ error: "O recurso Fichas Técnicas é exclusivo do plano MASTER." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const search = searchParams.get('search'); // Nome do cliente

        const where: any = { companyId: company.id };

        if (clientId) where.clientId = clientId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }
        if (search) {
            where.client = {
                name: { contains: search, mode: 'insensitive' }
            };
        }

        const entries = await db.formEntry.findMany({
            where,
            include: {
                template: { select: { name: true, fields: true, requireSignature: true } },
                client: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Buscar profissionais dos preenchedores
        const userIds = entries.map(e => e.filledBy).filter(Boolean) as string[];
        const uniqueUserIds = Array.from(new Set(userIds));

        const professionals = await db.professional.findMany({
            where: { userId: { in: uniqueUserIds } },
            select: { userId: true, name: true, signatureUrl: true }
        });

        const entriesWithInfo = entries.map(e => ({
            ...e,
            professional: professionals.find(p => p.userId === e.filledBy) || null
        }));

        return NextResponse.json(entriesWithInfo);
    } catch (error) {
        console.error("Erro ao buscar fichas técnicas:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

// POST: Cria ou Atualiza uma ficha técnica preenchida
export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        let company = await db.company.findUnique({ where: { ownerId: userId } });
        if (!company) {
            const prof = await db.professional.findFirst({ where: { userId }, include: { company: true } });
            if (prof && prof.company) company = prof.company;
        }

        if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        // VERIFICA PLANO VIA OWNER DA EMPRESA
        const sub = await db.subscription.findUnique({ where: { userId: company.ownerId } });
        if (!sub || sub.plan !== "MASTER") {
            return NextResponse.json({ error: "O recurso Fichas Técnicas é exclusivo do plano MASTER." }, { status: 403 });
        }

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
                include: { template: { select: { name: true, fields: true, requireSignature: true } } }
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
                include: { template: { select: { name: true, fields: true, requireSignature: true } } }
            });
        }

        return NextResponse.json(entry);
    } catch (error) {
        console.error("Erro ao salvar ficha técnica:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

// DELETE: Remove uma ficha técnica preenchida
export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const body = await req.json();
        const { id } = body;

        await db.formEntry.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erro ao excluir ficha técnica:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
