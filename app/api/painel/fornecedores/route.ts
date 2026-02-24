import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const member = await prisma.teamMember.findUnique({
            where: { clerkUserId: userId },
            select: { companyId: true, role: true }
        });

        if (!member) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const suppliers = await prisma.supplier.findMany({
            where: { companyId: member.companyId },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(suppliers);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao buscar fornecedores" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const body = await req.json();
        const member = await prisma.teamMember.findUnique({
            where: { clerkUserId: userId },
            select: { companyId: true }
        });

        if (!member) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const supplier = await prisma.supplier.create({
            data: {
                ...body,
                companyId: member.companyId
            }
        });

        return NextResponse.json(supplier);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao criar fornecedor" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const body = await req.json();
        const { id, ...data } = body;

        const member = await prisma.teamMember.findUnique({
            where: { clerkUserId: userId },
            select: { companyId: true }
        });

        if (!member) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const supplier = await prisma.supplier.update({
            where: { id, companyId: member.companyId },
            data
        });

        return NextResponse.json(supplier);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao atualizar fornecedor" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const { id } = await req.json();
        const member = await prisma.teamMember.findUnique({
            where: { clerkUserId: userId },
            select: { companyId: true, role: true }
        });

        if (!member || member.role !== 'ADMIN') {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        await prisma.supplier.delete({
            where: { id, companyId: member.companyId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao excluir fornecedor" }, { status: 500 });
    }
}
