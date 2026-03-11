import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { service, schedule, details } = body;

        // Recuperar a empresa do user logado
        const company = await db.company.findUnique({
            where: { ownerId: userId }
        });

        if (!company) {
            return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
        }

        // 1. Criar Serviço, se não houver um com esse nome (evitar duplicados caso reenvie)
        const dbService = await db.service.findFirst({
            where: { companyId: company.id, name: service.name }
        });
        
        if (!dbService) {
            await db.service.create({
                data: {
                    name: service.name,
                    price: service.price,
                    duration: service.duration,
                    companyId: company.id
                }
            });
        }

        // 2. Atualizar Empresa com dados do Onboarding
        await db.company.update({
            where: { id: company.id },
            data: {
                workDays: schedule.workDays,
                openTime: schedule.openTime,
                closeTime: schedule.closeTime,
                businessBranch: details.businessBranch,
                siteColor: details.siteColor,
                onboardingCompleted: true
            }
        });

        return NextResponse.json({ success: true, message: "Onboarding finalizado" });

    } catch (error: any) {
        console.error("[ONBOARDING API ERROR]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
