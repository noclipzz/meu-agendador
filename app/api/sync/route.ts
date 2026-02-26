import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

const prisma = db;

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Não logado" }, { status: 401 });

        const clerkId = user.id;
        const email = user.emailAddresses[0]?.emailAddress;

        // 1. É o Dono?
        const owner = await prisma.company.findUnique({ where: { ownerId: clerkId } });
        if (owner) return NextResponse.json({ role: "OWNER", companyId: owner.id });

        // 2. Já está vinculado?
        const existingMember = await prisma.teamMember.findUnique({
            where: { clerkUserId: clerkId },
            include: { company: true }
        });
        if (existingMember) {
            const ownerSub = await prisma.subscription.findUnique({ where: { userId: existingMember.company.ownerId } });
            return NextResponse.json({
                role: existingMember.role,
                companyId: existingMember.companyId,
                permissions: existingMember.permissions || { agenda: true, clientes: true },
                plan: ownerSub?.plan || "INDIVIDUAL",
                isOwner: false
            });
        }

        // 3. TENTA VINCULAR PELO E-MAIL (A MÁGICA ACONTECE AQUI)
        if (email) {
            // Procura na equipe alguém com esse e-mail (ignorando maiúsculas/minúsculas)
            const memberToLink = await prisma.teamMember.findFirst({
                where: {
                    email: { equals: email, mode: 'insensitive' },
                    clerkUserId: null // Só pega se ainda não tiver dono
                }
            });

            if (memberToLink) {
                // A) Atualiza a tabela de Login (TeamMember)
                const updatedMember = await prisma.teamMember.update({
                    where: { id: memberToLink.id },
                    data: { clerkUserId: clerkId }
                });

                // B) Atualiza a tabela da Agenda (Professional) para o Admin ver "Vinculado"
                await prisma.professional.updateMany({
                    where: {
                        companyId: memberToLink.companyId,
                        email: { equals: email, mode: 'insensitive' },
                        userId: null
                    },
                    data: { userId: clerkId }
                });

                // C) Busca o plano do dono da empresa para retornar ao layout
                const company = await prisma.company.findUnique({ where: { id: memberToLink.companyId } });
                let plan = "INDIVIDUAL";
                if (company) {
                    const ownerSub = await prisma.subscription.findUnique({ where: { userId: company.ownerId } });
                    plan = ownerSub?.plan || "INDIVIDUAL";
                }

                return NextResponse.json({
                    role: updatedMember.role,
                    companyId: memberToLink.companyId,
                    status: "LINKED",
                    permissions: updatedMember.permissions || { agenda: true, clientes: true },
                    plan,
                    isOwner: false
                });
            }
        }

        return NextResponse.json({ error: "Sem acesso" }, { status: 403 });

    } catch (error) {
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}