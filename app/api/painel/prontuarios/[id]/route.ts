import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Busca um template específico
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { id } = await params;

        const template = await db.formTemplate.findUnique({
            where: { id },
            include: { entries: { include: { client: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } }
        });

        if (!template) return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });

        return NextResponse.json(template);
    } catch (error) {
        console.error("Erro ao buscar template:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

// PUT: Atualiza um template
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { id } = await params;
        const body = await req.json();
        const { name, description, fields } = body;

        const template = await db.formTemplate.update({
            where: { id },
            data: { name, description, fields }
        });

        return NextResponse.json(template);
    } catch (error) {
        console.error("Erro ao atualizar template:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

// DELETE: Remove um template
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { id } = await params;

        await db.formTemplate.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erro ao excluir template:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
