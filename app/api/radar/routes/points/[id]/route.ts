import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { status } = body;

    const point = await db.routePoint.update({
      where: { id: params.id },
      data: { status },
      include: {
        route: true,
      }
    });

    // Se todos os pontos forem concluídos, atualiza a rota também?
    // Podemos fazer isso automaticamente.
    const allPoints = await db.routePoint.findMany({
        where: { routeId: point.routeId }
    });

    const allCompleted = allPoints.every(p => p.status === 'COMPLETED');
    
    if (allCompleted) {
        await db.route.update({
            where: { id: point.routeId },
            data: { status: 'COMPLETED' }
        });
    } else if (point.route.status === 'PENDING') {
        await db.route.update({
            where: { id: point.routeId },
            data: { status: 'IN_PROGRESS' }
        });
    }

    return NextResponse.json(point);
  } catch (error) {
    console.error("[RADAR_ROUTE_POINT_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
