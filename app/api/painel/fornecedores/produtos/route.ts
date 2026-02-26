import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db as prisma } from '@/lib/db';

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const body = await req.json();
        const { supplierId, productId, price, sku, notes } = body;

        if (!supplierId || !productId) {
            return NextResponse.json({ error: "Fornecedor e Produto são obrigatórios" }, { status: 400 });
        }

        // Upsert: se já existe, atualiza o preço/sku. Se não, cria.
        const supplierProduct = await prisma.supplierProduct.upsert({
            where: {
                supplierId_productId: {
                    supplierId,
                    productId
                }
            },
            update: {
                price: Number(price) || 0,
                sku,
                notes
            },
            create: {
                supplierId,
                productId,
                price: Number(price) || 0,
                sku,
                notes
            }
        });

        return NextResponse.json(supplierProduct);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao vincular produto" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

        await prisma.supplierProduct.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao remover vínculo" }, { status: 500 });
    }
}
