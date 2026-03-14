import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const company = await db.company.findUnique({
      where: { ownerId: userId },
    });

    if (!company) return new NextResponse("Company not found", { status: 404 });

    const url = new URL(req.url);
    const professionalId = url.searchParams.get("professionalId");

    const routes = await db.route.findMany({
      where: {
        companyId: company.id,
        ...(professionalId ? { professionalId } : {}),
      },
      include: {
        points: {
          orderBy: { orderIndex: "asc" },
          include: {
            order: true,
            client: true,
          }
        },
        professional: {
          select: { name: true, photoUrl: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(routes);
  } catch (error) {
    console.error("[RADAR_ROUTES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const company = await db.company.findUnique({
      where: { ownerId: userId },
    });

    if (!company) return new NextResponse("Company not found", { status: 404 });

    const body = await req.json();
    const { professionalId, name, points } = body;

    if (!professionalId || !points || points.length === 0) {
      return new NextResponse("Missing data", { status: 400 });
    }

    const route = await db.route.create({
      data: {
        name: name || "Nova Rota",
        professionalId,
        companyId: company.id,
        status: "PENDING",
        points: {
          create: points.map((p: any, index: number) => ({
            label: p.label,
            address: p.address,
            orderId: p.orderId || null,
            clientId: p.clientId || null,
            orderIndex: index,
            status: "PENDING",
          })),
        },
      },
      include: {
        points: true,
        professional: true,
      }
    });

    // TODO: Enviar notificação push para o colaborador aqui

    return NextResponse.json(route);
  } catch (error) {
    console.error("[RADAR_ROUTES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
