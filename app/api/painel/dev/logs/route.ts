import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Ideally, check if the user is a super admin or if they own the company
        let targetCompanyId = null;

        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            targetCompanyId = ownerCompany.id;
        }

        // For this API, we might want to see ALL logs if they are a system admin.
        // But for now, let's limit to the company of the owner.
        // If no company, return 401.
        if (!targetCompanyId) {
            return new NextResponse("Unauthorized - Not a company owner", { status: 401 });
        }

        const logs = await prisma.integrationLog.findMany({
            where: {
                companyId: targetCompanyId
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100 // Limit to recent 100 logs
        });

        return NextResponse.json(logs);

    } catch (error) {
        console.error("ERRO_GET_LOGS:", error);
        return new NextResponse("Internal API Error", { status: 500 });
    }
}
