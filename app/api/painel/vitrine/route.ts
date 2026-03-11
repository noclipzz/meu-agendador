import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

// LISTAR PRODUTOS DA VITRINE
export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        // Identifica a empresa
        let companyId = null;
        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
        } else {
            const member = await prisma.teamMember.findFirst({
                where: { clerkUserId: userId },
                include: { company: true }
            });
            if (member) {
                companyId = member.companyId;
            } else {
                const prof = await prisma.professional.findFirst({
                    where: { userId },
                    include: { company: true }
                });
                if (prof) companyId = prof.companyId;
            }
        }

        if (!companyId) return new NextResponse("Empresa não encontrada", { status: 404 });

        const products = await prisma.product.findMany({
            where: { companyId },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json(products);
    } catch (error) {
        console.error("ERRO_GET_VITRINE:", error);
        return NextResponse.json({ error: "Erro ao buscar produtos da vitrine", debug: String(error) }, { status: 500 });
    }
}

// CRIAR PRODUTO DE VITRINE
export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const company = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (!company) return new NextResponse("Empresa não encontrada", { status: 404 });

        const body = await req.json();

        const product = await prisma.product.create({
            data: {
                name: body.name,
                description: body.description || null,
                price: body.price ? Number(body.price) : 0,
                unitValue: body.unitValue ? Number(body.unitValue) : 1,
                imageUrl: body.imageUrl || null,
                showInVitrine: body.showInVitrine ?? true,
                showStock: body.showStock ?? false,
                deliveryDeadline: body.deliveryDeadline || null,
                shippingCost: body.shippingCost ? Number(body.shippingCost) : 0,
                variations: body.variations || [],
                quantity: body.quantity ? Number(body.quantity) : 0,
                unit: body.unit || "UN",
                minStock: body.minStock ? Number(body.minStock) : 0,
                costPrice: body.costPrice ? Number(body.costPrice) : 0,
                companyId: company.id,
            }
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error("ERRO_CRIAR_PRODUTO_VITRINE:", error);
        return NextResponse.json({ error: "Erro ao criar produto", debug: String(error) }, { status: 500 });
    }
}

// ATUALIZAR PRODUTO
export async function PUT(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { id, ...data } = body;

        const updated = await prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description || null,
                price: data.price !== undefined ? Number(data.price) : undefined,
                unitValue: data.unitValue !== undefined ? Number(data.unitValue) : undefined,
                imageUrl: data.imageUrl || null,
                showInVitrine: data.showInVitrine,
                showStock: data.showStock,
                deliveryDeadline: data.deliveryDeadline,
                shippingCost: data.shippingCost !== undefined ? Number(data.shippingCost) : undefined,
                variations: data.variations,
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("ERRO_ATUALIZAR_VITRINE:", error);
        return NextResponse.json({ error: "Erro ao atualizar produto", debug: String(error) }, { status: 500 });
    }
}

// EXCLUIR PRODUTO
export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        await prisma.product.delete({ where: { id: body.id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("ERRO_EXCLUIR_VITRINE:", error);
        return NextResponse.json({ error: "Erro ao excluir produto" }, { status: 500 });
    }
}
