import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

// LISTAR SERVIÇOS (COM OS PRODUTOS QUE CONSOME)
export async function GET() {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // 1. Identifica a empresa (Dono ou Membro)
    let companyId = null;

    // Tenta como Dono
    const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
    if (ownerCompany) {
        companyId = ownerCompany.id;
    } else {
        // Tenta como Membro
        const member = await prisma.teamMember.findFirst({ where: { clerkUserId: userId } });
        if (member) {
            companyId = member.companyId;
        } else {
            // Tenta como Profissional
            const prof = await prisma.professional.findFirst({ where: { userId } });
            if (prof) companyId = prof.companyId;
        }
    }

    if (!companyId) return new NextResponse("Empresa não encontrada", { status: 404 });

    const services = await prisma.service.findMany({
        where: { companyId },
        orderBy: { name: 'asc' },
        include: {
            products: {
                include: { product: true } // Inclui os detalhes do produto (nome, unidade)
            }
        }
    });

    return NextResponse.json(services);
}

// CRIAR/ATUALIZAR SERVIÇO
export async function POST(req: Request) {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // 1. Identifica a empresa (Dono ou Membro)
    let companyId = null;

    // Tenta como Dono
    const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
    if (ownerCompany) {
        companyId = ownerCompany.id;
    } else {
        // Tenta como Membro
        const member = await prisma.teamMember.findUnique({ where: { clerkUserId: userId } });
        if (member) companyId = member.companyId;
    }

    if (!companyId) return new NextResponse("Empresa não encontrada", { status: 404 });

    const body = await req.json();

    const { id, name, price, duration, commission, products } = body;

    // Prepara os dados dos produtos vinculados
    // products deve ser um array: [{ productId: "...", amount: 50 }, ...]
    const productLinks = products?.map((p: any) => ({
        product: { connect: { id: p.productId } },
        amount: Number(p.amount)
    })) || [];

    if (id) {
        // ATUALIZAR
        // Primeiro removemos os vínculos antigos para recriar (mais simples que atualizar um a um)
        await prisma.serviceProduct.deleteMany({ where: { serviceId: id } });

        const updated = await prisma.service.update({
            where: { id },
            data: {
                name,
                price: Number(price),
                duration: Number(duration),
                commission: Number(commission),
                products: {
                    create: productLinks.map((p: any) => ({
                        productId: p.product.connect.id,
                        amount: p.amount
                    }))
                }
            }
        });
        return NextResponse.json(updated);
    } else {
        // CRIAR
        const created = await prisma.service.create({
            data: {
                name,
                price: Number(price),
                duration: Number(duration),
                commission: Number(commission),
                companyId: companyId,
                products: {
                    create: productLinks.map((p: any) => ({
                        productId: p.product.connect.id,
                        amount: p.amount
                    }))
                }
            }
        });
        return NextResponse.json(created);
    }
}

export async function DELETE(req: Request) {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();

    // 1. Identifica a empresa (Dono ou Membro)
    let companyId = null;

    // Tenta como Dono
    const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
    if (ownerCompany) {
        companyId = ownerCompany.id;
    } else {
        // Tenta como Membro
        const member = await prisma.teamMember.findUnique({ where: { clerkUserId: userId } });
        if (member) companyId = member.companyId;
    }

    if (!companyId) return new NextResponse("Empresa não encontrada", { status: 404 });

    // VERIFICA SE O SERVIÇO PERTENCE À EMPRESA
    const service = await prisma.service.findUnique({ where: { id: body.id } });
    if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

    if (service.companyId !== companyId) {
        return NextResponse.json({ error: "Acesso negado. Este serviço não pertence à sua empresa." }, { status: 403 });
    }

    await prisma.service.delete({ where: { id: body.id } });

    return NextResponse.json({ success: true });
}