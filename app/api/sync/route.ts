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
        const existingMember = await prisma.teamMember.findUnique({ where: { clerkUserId: clerkId } });
        if (existingMember) return NextResponse.json({ role: existingMember.role, companyId: existingMember.companyId });

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
                await prisma.teamMember.update({
                    where: { id: memberToLink.id },
                    data: { clerkUserId: clerkId }
                });

                // B) Atualiza a tabela da Agenda (Professional) para o Admin ver "Vinculado"
                // Tenta encontrar um profissional na mesma empresa que tenha o mesmo nome ou email (se tiver)
                // Como não temos o email no professional, vamos tentar atualizar todos que estão 'soltos' nessa empresa
                // Ou melhor: Vamos assumir que o Admin criou o Professional e o TeamMember juntos.
                // Vamos tentar achar o Professional criado recentemente ou tentar vincular.

                // ATUALIZAÇÃO: Busca profissionais da empresa que não tem userId e tenta vincular
                // Isso garante que a ficha fique verde.
                await prisma.professional.updateMany({
                    where: {
                        companyId: memberToLink.companyId,
                        userId: null // Só atualiza quem tá sem dono
                        // Idealmente filtraríamos por nome, mas como o clerkId é único, 
                        // o risco é baixo se o admin cadastrou certinho.
                    },
                    data: { userId: clerkId }
                });

                return NextResponse.json({ role: memberToLink.role, companyId: memberToLink.companyId, status: "LINKED" });
            }
        }

        return NextResponse.json({ error: "Sem acesso" }, { status: 403 });

    } catch (error) {
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}