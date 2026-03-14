import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const professional = await db.professional.findUnique({
      where: { userId },
    });

    if (!professional) return new NextResponse("Professional not found", { status: 404 });

    const route = await db.route.findFirst({
      where: {
        professionalId: professional.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      include: {
        points: {
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!route) return NextResponse.json(null);

    return NextResponse.json(route);
  } catch (error) {
    console.error("[RADAR_ACTIVE_ROUTE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
