import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

// --- LISTAR PROFISSIONAIS ---
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json([], { status: 401 });

    let companyId = null;

    // 1. Tenta como Dono
    const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
    if (ownerCompany) {
        companyId = ownerCompany.id;
    } else {
        // 2. Tenta como Funcionário
        const member = await prisma.teamMember.findUnique({ where: { clerkUserId: userId } });
        if (member) companyId = member.companyId;
    }

    if (!companyId) return NextResponse.json([]);

    const profissionais = await prisma.professional.findMany({
      where: { companyId },
      include: { 
        bookings: {
          where: { status: "CONFIRMADO" },
          include: { service: true }
        }
      }
    });

    return NextResponse.json(profissionais);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar equipe" }, { status: 500 });
  }
}

// --- ADICIONAR PROFISSIONAL ---
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { name, email, phone, photoUrl, color } = body;
    
    const company = await prisma.company.findUnique({ 
      where: { ownerId: userId },
      include: { professionals: true }
    });
    
    if (!company) return NextResponse.json({ error: "Apenas o dono pode gerenciar a equipe." }, { status: 403 });

    const sub = await prisma.subscription.findUnique({ where: { userId } });
    const plano = sub?.plan || "INDIVIDUAL"; 

    const qtdAtual = company.professionals.length;

    if (plano === "INDIVIDUAL" && qtdAtual >= 1) {
       return NextResponse.json(
         { error: "Seu plano é INDIVIDUAL. Para adicionar outros funcionários, faça upgrade para PREMIUM ou MASTER." }, 
         { status: 403 }
       );
    }

    const limites = { "PREMIUM": 5, "MASTER": 15 };
    const limiteMaximo = limites[plano as keyof typeof limites] || 1;

    if (qtdAtual >= limiteMaximo) {
      return NextResponse.json({ error: `Limite do plano ${plano} atingido (${limiteMaximo} profissionais).` }, { status: 403 });
    }

    // TRANSAÇÃO: Cria Membro e depois vincula ao Profissional
    const result = await prisma.$transaction(async (tx) => {
        let teamMemberId = null;
        
        if (email) {
            const existingMember = await tx.teamMember.findUnique({ where: { email } });
            if (existingMember) {
                throw new Error("Este e-mail já está na equipe.");
            }

            const newMember = await tx.teamMember.create({
                data: {
                    email: email,
                    role: "PROFESSIONAL",
                    companyId: company.id,
                    clerkUserId: null 
                }
            });
            teamMemberId = newMember.id;
        }

        const professional = await tx.professional.create({
            data: {
                name,
                phone,
                photoUrl,
                color: color || "#3b82f6",
                companyId: company.id,
                teamMemberId: teamMemberId // Vínculo essencial para o DELETE funcionar depois
            }
        });

        return professional;
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("ERRO_CRIAR_PROFISSIONAL:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}

// --- DELETAR PROFISSIONAL ---
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const company = await prisma.company.findUnique({ where: { ownerId: userId } });
    if (!company) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

    // 1. Busca o profissional para verificar o TeamMember vinculado
    const professional = await prisma.professional.findUnique({
        where: { id: body.id, companyId: company.id }
    });

    if (!professional) {
        return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
    }

    // 2. Executa a deleção em transação
    await prisma.$transaction(async (tx) => {
        // Apaga o profissional da agenda
        await tx.professional.delete({ 
            where: { id: body.id } 
        });

        // Se houver um membro da equipe (login) vinculado, apaga também
        if (professional.teamMemberId) {
            await tx.teamMember.delete({
                where: { id: professional.teamMemberId }
            });
        }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO_AO_DELETAR:", error);
    // Erro comum: Restrição de chave estrangeira (se o profissional tiver agendamentos)
    return NextResponse.json({ 
        error: "Não foi possível deletar. Verifique se o profissional possui agendamentos ou faturas vinculadas." 
    }, { status: 500 });
  }
}

// --- ATUALIZAR PROFISSIONAL ---
export async function PUT(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        
        const body = await req.json();
        
        const updated = await prisma.professional.update({
            where: { id: body.id },
            data: {
                name: body.name,
                phone: body.phone,
                color: body.color
            }
        });
        
        return NextResponse.json(updated);
    } catch(e) {
        return NextResponse.json({error: "Erro ao atualizar"}, {status: 500});
    }
}