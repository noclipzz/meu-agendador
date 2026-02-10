import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const prisma = db;

export async function POST(req: Request) {
    const body = await req.json();
    const { serviceId, productId, amount } = body;

    const link = await prisma.serviceProduct.create({
        data: {
            serviceId,
            productId,
            amount: Number(amount)
        }
    });

    return NextResponse.json(link);
}

// Buscar o consumo de um serviço
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) return new NextResponse("ID faltando", { status: 400 });

    const items = await prisma.serviceProduct.findMany({
        where: { serviceId },
        include: { product: true }
    });

    return NextResponse.json(items);
}

export async function DELETE(req: Request) {
    const body = await req.json();
    await prisma.serviceProduct.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
}