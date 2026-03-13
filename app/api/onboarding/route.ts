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
        const { service, schedule, details, ownerProfessional, products, client, companyData } = body;

        // Recuperar a empresa do user logado
        const company = await db.company.findUnique({
            where: { ownerId: userId }
        });

        if (!company) {
            return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
        }

        // 1. Atualizar dados básicos da empresa (Nome e Slug se enviados)
        if (companyData) {
            await db.company.update({
                where: { id: company.id },
                data: {
                    name: companyData.name || company.name,
                    slug: companyData.slug || company.slug
                }
            });
        }

        // 2. Criar Profissional (Dono) se enviado
        if (ownerProfessional && ownerProfessional.name) {
            await db.professional.upsert({
                where: { userId: userId },
                update: {
                    name: ownerProfessional.name,
                    photoUrl: ownerProfessional.photoUrl,
                    phone: ownerProfessional.phone,
                },
                create: {
                    name: ownerProfessional.name,
                    photoUrl: ownerProfessional.photoUrl,
                    phone: ownerProfessional.phone,
                    userId: userId,
                    companyId: company.id,
                    status: "ATIVO"
                }
            });
        }

        // 3. Criar Serviço, se enviado
        if (service && service.name) {
            const dbService = await db.service.findFirst({
                where: { companyId: company.id, name: service.name }
            });
            
            if (!dbService) {
                await db.service.create({
                    data: {
                        name: service.name,
                        price: service.price,
                        duration: service.duration,
                        imageUrl: service.imageUrl,
                        companyId: company.id
                    }
                });
            }
        }

        // 4. Criar Produtos da Vitrine se enviado
        if (products && Array.isArray(products) && products.length > 0) {
            for (const prod of products) {
                if (!prod.name) continue;
                await db.product.create({
                    data: {
                        name: prod.name,
                        price: prod.price || 0,
                        imageUrl: prod.imageUrl,
                        companyId: company.id,
                        quantity: prod.quantity || 0
                    }
                });
            }
        }

        // 5. Criar Primeiro Cliente se enviado
        if (client && client.name) {
            await db.client.create({
                data: {
                    name: client.name,
                    phone: client.phone,
                    email: client.email,
                    companyId: company.id
                }
            });
        }

        // 6. Atualizar Empresa com dados finais do Onboarding
        await db.company.update({
            where: { id: company.id },
            data: {
                workDays: schedule?.workDays || company.workDays,
                customSchedule: schedule?.customSchedule || company.customSchedule,
                businessBranch: details?.businessBranch || company.businessBranch,
                siteColor: details?.siteColor || company.siteColor,
                logoUrl: details?.logoUrl || company.logoUrl,
                onboardingCompleted: true
            }
        });

        return NextResponse.json({ success: true, message: "Onboarding finalizado" });

    } catch (error: any) {
        console.error("[ONBOARDING API ERROR]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
