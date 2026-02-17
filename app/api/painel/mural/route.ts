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
