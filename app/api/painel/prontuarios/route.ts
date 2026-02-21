import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Lista todos os templates da empresa
export async function GET() {
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
            return NextResponse.json({ error: "O recurso Prontuários é exclusivo do plano MASTER." }, { status: 403 });
        }

        const templates = await db.formTemplate.findMany({
            where: { companyId: company.id },
            include: { _count: { select: { entries: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(templates);
    } catch (error) {
        console.error("Erro ao buscar templates:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

// POST: Cria um novo template
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
            return NextResponse.json({ error: "O recurso Prontuários é exclusivo do plano MASTER." }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, fields } = body;

        if (!name || !fields || !Array.isArray(fields)) {
            return NextResponse.json({ error: "Nome e campos são obrigatórios" }, { status: 400 });
        }

        const template = await db.formTemplate.create({
            data: {
                name,
                description: description || null,
                fields,
                companyId: company.id
            }
        });

        return NextResponse.json(template);
    } catch (error) {
        console.error("Erro ao criar template:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
