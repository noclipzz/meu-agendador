import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    try {
        let companyId = null;

        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
        } else {
            const member = await prisma.teamMember.findUnique({
                where: { clerkUserId: userId }
            });
            if (member) {
                companyId = member.companyId;
            } else {
                const professional = await prisma.professional.findFirst({
                    where: { userId: userId }
                });
                if (professional) {
                    companyId = professional.companyId;
                }
            }
        }

        if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        if (id) {
            const supplier = await prisma.supplier.findUnique({
                where: { id, companyId },
                include: {
                    products: {
                        include: {
                            product: true
                        },
                        orderBy: { product: { name: 'asc' } }
                    },
                    expenses: {
                        take: 10,
                        orderBy: { dueDate: 'desc' }
                    },
                    batches: {
                        include: {
                            product: true
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 20
                    },
                    stockLogs: {
                        include: {
                            product: true
                        },
                        where: { type: 'ENTRADA' },
                        orderBy: { createdAt: 'desc' },
                        take: 20
                    }
                }
            });
            return NextResponse.json(supplier);
        }

        const suppliers = await prisma.supplier.findMany({
            where: { companyId },
            include: {
                _count: {
                    select: { products: true, expenses: true }
                }
            },
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
        let companyId = null;

        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
        } else {
            const member = await prisma.teamMember.findUnique({
                where: { clerkUserId: userId }
            });
            if (member) {
                companyId = member.companyId;
            }
        }

        if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const {
            name, corporateName, cnpj, phone, email,
            cep, address, number, complement, neighborhood,
            city, state, notes, status
        } = body;

        const supplier = await prisma.supplier.create({
            data: {
                name, corporateName, cnpj, phone, email,
                cep, address, number, complement, neighborhood,
                city, state, notes, status: status || "ATIVO",
                companyId
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

        let companyId = null;
        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
        } else {
            const member = await prisma.teamMember.findUnique({
                where: { clerkUserId: userId }
            });
            if (member) {
                companyId = member.companyId;
            }
        }

        if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const {
            id, name, corporateName, cnpj, phone, email,
            cep, address, number, complement, neighborhood,
            city, state, notes, status
        } = body;

        const supplier = await prisma.supplier.update({
            where: { id, companyId },
            data: {
                name, corporateName, cnpj, phone, email,
                cep, address, number, complement, neighborhood,
                city, state, notes, status
            }
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

        let companyId = null;
        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
        } else {
            const member = await prisma.teamMember.findUnique({
                where: { clerkUserId: userId }
            });
            if (member) {
                companyId = member.companyId;
            }
        }

        if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        await prisma.supplier.delete({
            where: { id, companyId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao excluir fornecedor" }, { status: 500 });
    }
}
