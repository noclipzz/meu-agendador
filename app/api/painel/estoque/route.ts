import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

// LISTAR
export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        // 1. Identifica a empresa (Dono ou Membro)
        let companyId = null;
        let ownerId = null;

        // Tenta como Dono
        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
            ownerId = userId;
        } else {
            // Tenta como Membro
            const member = await prisma.teamMember.findFirst({
                where: { clerkUserId: userId },
                include: { company: true }
            });
            if (member) {
                companyId = member.companyId;
                ownerId = member.company.ownerId;
            } else {
                const prof = await prisma.professional.findFirst({
                    where: { userId },
                    include: { company: true }
                });
                if (prof) {
                    companyId = prof.companyId;
                    ownerId = prof.company.ownerId;
                }
            }
        }

        if (!companyId || !ownerId) return new NextResponse("Empresa não encontrada", { status: 404 });

        // 2. VERIFICA SE O DONO TEM PLANO MASTER
        const sub = await prisma.subscription.findUnique({ where: { userId: ownerId } });
        if (!sub || sub.plan !== "MASTER") {
            return NextResponse.json({ error: "O Módulo de Estoque está disponível apenas para o plano MASTER." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const productId = searchParams.get('productId');

        // Se pedir logs
        if (searchParams.get('logs') === 'true' && productId) {
            const logs = await prisma.stockLog.findMany({
                where: { productId },
                orderBy: { createdAt: 'desc' },
                take: 50
            });
            return NextResponse.json(logs);
        }

        // Lista produtos com lotes ordenados por validade
        const products = await prisma.product.findMany({
            where: { companyId },
            orderBy: { name: 'asc' },
            include: {
                batches: {
                    orderBy: { expiryDate: 'asc' }
                }
            }
        });

        return NextResponse.json(products);
    } catch (error) {
        console.error("ERRO_GET_ESTOQUE:", error);
        return new NextResponse("Erro ao buscar estoque", { status: 500 });
    }
}

// CRIAR PRODUTO
export async function POST(req: Request) {
    try {
        const { userId } = await auth();

        // VERIFICA PLANO
        const sub = await prisma.subscription.findUnique({ where: { userId: userId || "" } });
        if (!sub || sub.plan !== "MASTER") {
            return NextResponse.json({ error: "O Módulo de Estoque está disponível apenas no plano MASTER." }, { status: 403 });
        }

        const company = await prisma.company.findUnique({ where: { ownerId: userId || "" } });

        if (!company) return new NextResponse("Empresa não encontrada", { status: 404 });

        const body = await req.json();

        const result = await prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    name: body.name,
                    quantity: body.quantity || 0,
                    unit: body.unit || "UN",
                    minStock: body.minStock || 5,
                    companyId: company.id,
                }
            });

            // Cria o lote inicial se houver quantidade
            if (Number(body.quantity) > 0) {
                await tx.productBatch.create({
                    data: {
                        productId: product.id,
                        quantity: body.quantity,
                        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null
                    }
                });

                await tx.stockLog.create({
                    data: {
                        productId: product.id,
                        quantity: body.quantity,
                        oldStock: 0,
                        newStock: body.quantity,
                        type: "ENTRADA",
                        reason: "Cadastro Inicial"
                    }
                });
            }

            return product;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("ERRO_CRIAR_PRODUTO:", error);
        return new NextResponse("Erro ao criar produto", { status: 500 });
    }
}

// ATUALIZAR (Adicionar Lote ou Remover Estoque)
export async function PUT(req: Request) {
    try {
        const { userId } = await auth();

        // VERIFICA PLANO
        const sub = await prisma.subscription.findUnique({ where: { userId: userId || "" } });
        if (!sub || sub.plan !== "MASTER") {
            return NextResponse.json({ error: "O Módulo de Estoque está disponível apenas no plano MASTER." }, { status: 403 });
        }

        const body = await req.json();
        const { id, operation, amountAdjustment, expiryDate, reason, name, minStock } = body;

        console.log("Recebendo PUT Estoque:", { id, operation, amountAdjustment, expiryDate });

        // 1. Edição Simples (Nome/Mínimo)
        if (!operation) {
            const updated = await prisma.product.update({
                where: { id },
                data: { name, minStock: Number(minStock) }
            });
            return NextResponse.json(updated);
        }

        // 2. Movimentação de Estoque
        const result = await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { id } });
            if (!product) throw new Error("Produto não encontrado");

            const currentTotal = Number(product.quantity);
            const amount = Number(amountAdjustment);
            let newTotal = currentTotal;

            if (operation === 'ADD') {
                // Tratamento de data seguro
                let validadeFinal = null;
                if (expiryDate && expiryDate !== "") {
                    validadeFinal = new Date(expiryDate);
                }

                // Cria novo lote
                await tx.productBatch.create({
                    data: {
                        productId: id,
                        quantity: amount,
                        expiryDate: validadeFinal
                    }
                });
                newTotal += amount;
            }
            else if (operation === 'REMOVE') {
                let remainingToRemove = amount;

                // Busca lotes: Primeiro os vencidos/com validade próxima, depois os mais antigos
                const batches = await tx.productBatch.findMany({
                    where: { productId: id, quantity: { gt: 0 } },
                    orderBy: [
                        { expiryDate: 'asc' },
                        { createdAt: 'asc' }
                    ]
                });

                for (const batch of batches) {
                    if (remainingToRemove <= 0) break;

                    const currentBatchQty = Number(batch.quantity);
                    const toTake = Math.min(currentBatchQty, remainingToRemove);

                    if (currentBatchQty - toTake <= 0) {
                        await tx.productBatch.delete({ where: { id: batch.id } });
                    } else {
                        await tx.productBatch.update({
                            where: { id: batch.id },
                            data: { quantity: currentBatchQty - toTake }
                        });
                    }

                    remainingToRemove -= toTake;
                }

                newTotal -= amount;
                if (newTotal < 0) newTotal = 0;
            }

            // Atualiza totalizador
            await tx.product.update({
                where: { id },
                data: { quantity: newTotal }
            });

            // Log
            await tx.stockLog.create({
                data: {
                    productId: id,
                    quantity: operation === 'ADD' ? amount : -amount,
                    oldStock: currentTotal,
                    newStock: newTotal,
                    type: operation === 'ADD' ? 'ENTRADA' : 'SAIDA',
                    reason: reason || (operation === 'ADD' ? 'Novo Lote' : 'Ajuste Manual')
                }
            });

            return { newTotal };
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error("ERRO_ATUALIZAR_ESTOQUE:", error);
        return new NextResponse("Erro ao atualizar estoque", { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();

        // VERIFICA PLANO
        const sub = await prisma.subscription.findUnique({ where: { userId: userId || "" } });
        if (!sub || sub.plan !== "MASTER") {
            return NextResponse.json({ error: "O Módulo de Estoque está disponível apenas no plano MASTER." }, { status: 403 });
        }

        const body = await req.json();
        await prisma.product.delete({ where: { id: body.id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return new NextResponse("Erro ao excluir", { status: 500 });
    }
}