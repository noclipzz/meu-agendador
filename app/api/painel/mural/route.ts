import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth, clerkClient } from "@clerk/nextjs/server";

const prisma = db;

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        // Identifica a empresa do usuário
        let companyId = null;
        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
        } else {
            const member = await prisma.teamMember.findUnique({ where: { clerkUserId: userId } });
            if (member) companyId = member.companyId;
            else {
                const prof = await prisma.professional.findFirst({ where: { userId } });
                if (prof) companyId = prof.companyId;
            }
        }

        if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const posts = await prisma.organizationPost.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limite inicial
        });

        return NextResponse.json(posts);

    } catch (error) {
        console.error("ERRO_GET_MURAL:", error);
        return NextResponse.json({ error: "Erro ao buscar posts" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const body = await req.json();
        const { title, content, type, imageUrl } = body;

        if (!title || !content) return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });

        // Identifica a empresa do usuário
        let companyId = null;
        let authorName = "Colaborador";

        // Tenta pegar nome do Clerk
        try {
            const user = await clerkClient.users.getUser(userId);
            authorName = `${user.firstName} ${user.lastName || ''}`.trim() || "Usuário do Sistema";
        } catch (e) { console.error("Erro ao pegar nome do Clerk", e); }

        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
            // Se for dono, pode querer usar nome da empresa ou o próprio nome
        } else {
            const member = await prisma.teamMember.findUnique({ where: { clerkUserId: userId } });
            if (member) companyId = member.companyId;
            else {
                const prof = await prisma.professional.findFirst({ where: { userId } });
                if (prof) companyId = prof.companyId;
            }
        }

        if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const post = await prisma.organizationPost.create({
            data: {
                title,
                content,
                type: type || "AVISO",
                imageUrl,
                authorId: userId,
                authorName,
                companyId
            }
        });

        // --- NOTIFICAÇÃO PUSH PARA A EQUIPE ---
        try {
            // 1. Busca todos os usuários da empresa (Dono + Membros)
            const members = await prisma.teamMember.findMany({
                where: { companyId },
                select: { clerkUserId: true }
            });

            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { ownerId: true }
            });

            // Lista de IDs para notificar (evita notificar quem postou)
            const userIdsToNotify = new Set<string>();
            if (company?.ownerId && company.ownerId !== userId) userIdsToNotify.add(company.ownerId);
            members.forEach(m => {
                if (m.clerkUserId && m.clerkUserId !== userId) userIdsToNotify.add(m.clerkUserId);
            });

            // 2. Busca as inscrições Push desses usuários
            if (userIdsToNotify.size > 0) {
                const subscriptions = await prisma.pushSubscription.findMany({
                    where: { userId: { in: Array.from(userIdsToNotify) } }
                });

                // 3. Configura WebPush
                const webpush = require("web-push");
                const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
                const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();

                if (publicKey && privateKey) {
                    webpush.setVapidDetails("mailto:suporte@nohud.com.br", publicKey, privateKey);

                    const payload = JSON.stringify({
                        title: `📢 Mural: ${type || "Novo Aviso"}`,
                        body: `${authorName}: ${title}`,
                        url: "/painel/mural",
                    });

                    // 4. Dispara em paralelo
                    await Promise.allSettled(subscriptions.map(sub => {
                        return webpush.sendNotification({
                            endpoint: sub.endpoint,
                            keys: { auth: sub.auth, p256dh: sub.p256dh }
                        }, payload).catch((e: any) => {
                            if (e.statusCode === 410) {
                                // Inscrição inválida, remove do banco
                                prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => { });
                            }
                        });
                    }));
                }
            }
        } catch (error) {
            console.error("ERRO_PUSH_MURAL:", error);
            // Não deve falhar o request se o push falhar
        }

        return NextResponse.json(post);

    } catch (error) {
        console.error("ERRO_POST_MURAL:", error);
        return NextResponse.json({ error: "Erro ao criar post" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { id } = await req.json();

        // Verifica dono do post ou dono da empresa
        const post = await prisma.organizationPost.findUnique({
            where: { id },
            include: { company: true }
        });

        if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

        const isAuthor = post.authorId === userId;
        const isCompanyOwner = post.company.ownerId === userId;

        if (!isAuthor && !isCompanyOwner) {
            return NextResponse.json({ error: "Sem permissão para excluir" }, { status: 403 });
        }

        await prisma.organizationPost.delete({ where: { id } });

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
    }
}
