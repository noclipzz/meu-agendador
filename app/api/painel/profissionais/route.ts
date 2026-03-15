import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

const prisma = db;

// Força renderização dinâmica (necessário para usar auth() no Vercel)
export const dynamic = 'force-dynamic';

// --- LISTAR PROFISSIONAIS ---
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    // Busca empresa do dono OU a empresa onde o usuário é funcionário
    let companyId = null;

    // 1. Tenta como Dono
    const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
    if (ownerCompany) {
      companyId = ownerCompany.id;
    } else {
      // 2. Tenta como Funcionário
      const member = await prisma.teamMember.findFirst({ where: { clerkUserId: userId } });
      if (member) {
        companyId = member.companyId;
      } else {
        const prof = await prisma.professional.findFirst({ where: { userId } });
        if (prof) companyId = prof.companyId;
      }
    }

    if (!companyId) return NextResponse.json([]);

    const [profissionais, teamMembers] = await Promise.all([
      (prisma.professional as any).findMany({
        where: { companyId },
        include: {
          bookings: {
            where: { status: { in: ["CONFIRMADO", "CONCLUIDO"] } },
            include: { service: true },
            take: 10 // Limite para evitar resposta muito grande
          },
          services: true
          // attachments: true
        }
      }),
      prisma.teamMember.findMany({ where: { companyId } })
    ]);

    // Anexa as permissões do TeamMember ao objeto do Profissional
    const profissionaisComPermissoes = profissionais.map((p: any) => {
      const member = teamMembers.find(m =>
        (p.email && m.email === p.email) ||
        (p.userId && m.clerkUserId === p.userId)
      );
      return {
        ...p,
        role: member?.role || "PROFESSIONAL", // ✅ Agora retorna o cargo real (ADMIN ou PROFESSIONAL)
        permissions: member?.permissions || {
          dashboard: false,
          agenda: true,
          listaEspera: false,
          clientes: true,
          financeiro: false,
          estoque: false,
          'fichas-tecnicas': false,
          servicos: false,
          profissionais: false,
          config: false,
          mural: true
        }
      };
    });

    return NextResponse.json(profissionaisComPermissoes);
  } catch (error: any) {
    console.error("ERRO_BUSCAR_EQUIPE:", error);
    return NextResponse.json({ error: "Erro ao buscar equipe", details: error.message }, { status: 500 });
  }
}

// --- ADICIONAR PROFISSIONAL ---
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { 
      name, email, phone, photoUrl, color, cpf, rg, birthDate, cep, address, 
      number, complement, neighborhood, city, state, notes, status, 
      certificadoA1Url, certificadoSenha,
      isTechnicalResponsible, councilName, councilNumber
    } = body;

    // 1. Apenas o dono pode adicionar equipe
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      include: { professionals: true }
    });

    if (!company) return NextResponse.json({ error: "Apenas o dono pode gerenciar a equipe." }, { status: 403 });

    // 2. BUSCA O PLANO ATUAL
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    const plano = sub?.plan || "INDIVIDUAL"; // Se não achar, assume Individual

    // 3. REGRAS DE LIMITES
    const qtdAtual = company.professionals.length;

    // REGRA DO PLANO INDIVIDUAL:
    // Se for Individual e já tiver 1 (que deve ser o dono), bloqueia tudo.
    if (plano === "INDIVIDUAL" && qtdAtual >= 1) {
      return NextResponse.json(
        { error: "Seu plano é INDIVIDUAL. Para adicionar outros funcionários, faça upgrade para PREMIUM ou MASTER." },
        { status: 403 }
      );
    }

    // Regras dos outros planos
    const limites = { "PREMIUM": 5, "MASTER": 15 };
    const limiteMaximo = limites[plano as keyof typeof limites] || 1; // Default 1

    if (qtdAtual >= limiteMaximo) {
      return NextResponse.json({ error: `Limite do plano ${plano} atingido (${limiteMaximo} profissionais).` }, { status: 403 });
    }

    // 4. TRANSAÇÃO: Cria Membro e Profissional
    const result = await prisma.$transaction(async (tx) => {

      // Se informou E-mail, cria o acesso no TeamMember (Login)
      // PLANO INDIVIDUAL não pode criar TeamMember com login
      if (email) {
        if (plano === "INDIVIDUAL") {
          throw new Error("O plano INDIVIDUAL não permite criar profissionais com acesso ao sistema. Faça upgrade para PREMIUM.");
        }

        const existingMember = await tx.teamMember.findUnique({ where: { email } });
        if (existingMember) {
          throw new Error("Este e-mail já está na equipe.");
        }

        await tx.teamMember.create({
          data: {
            email: email,
            role: body.role || "PROFESSIONAL",
            companyId: company.id,
            clerkUserId: null,
            permissions: body.permissions || { agenda: true, clientes: true }
          }
        });
      }

      // Cria o Profissional na Agenda
      const professional = await (tx.professional as any).create({
        data: {
          name,
          phone,
          email, // Salva o email agora!
          photoUrl,
          signatureUrl: body.signatureUrl || null,
          color: color || "#3b82f6",
          companyId: company.id,
          cpf, rg, birthDate, cep, address, number, complement, neighborhood, city, state, notes, maritalStatus: body.maritalStatus,          status: status || "ATIVO",
          certificadoA1Url,
          certificadoSenha,
          isTechnicalResponsible: isTechnicalResponsible || false,
          councilName,
          councilNumber,
          services: {
            connect: body.serviceIds?.map((id: string) => ({ id })) || []
          }
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

// --- DELETAR ---
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    const company = await prisma.company.findUnique({
      where: { ownerId: userId || "" },
      include: { teamMembers: true }
    });

    if (!company) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

    const body = await req.json();

    // 1. Busca o profissional para obter e-mails/vínculos se houver
    const profissional = await prisma.professional.findUnique({
      where: { id: body.id, companyId: company.id }
    });

    if (!profissional) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });

    // 2. Tenta encontrar e deletar o TeamMember associado
    // Verifica por userId (se já logou) OU por email (se foi convidado mas não logou)

    // Deleta se tiver userId vinculado
    if (profissional.userId) {
      await prisma.teamMember.deleteMany({
        where: { clerkUserId: profissional.userId, companyId: company.id }
      });
    }

    // Deleta se tiver email vinculado (mesmo sem userId)
    if (profissional.email) {
      await prisma.teamMember.deleteMany({
        where: { email: profissional.email, companyId: company.id }
      });
    }

    // 3. Deleta o Profissional
    await prisma.professional.delete({
      where: { id: body.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar:", error);
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();

    // 1. Busca dados atuais para referência (e-mail antigo)
    const oldProfessional = await prisma.professional.findUnique({
      where: { id: body.id }
    });

    // 2. Atualiza dados do profissional
    const updated = await (prisma.professional as any).update({
      where: { id: body.id },
      data: {
        name: body.name,
        phone: body.phone,
        color: body.color,
        photoUrl: body.photoUrl,
        signatureUrl: body.signatureUrl,
        cpf: body.cpf,
        rg: body.rg,
        birthDate: body.birthDate,
        cep: body.cep,
        address: body.address,
        number: body.number,
        complement: body.complement,
        neighborhood: body.neighborhood,
        city: body.city,
        state: body.state,
        notes: body.notes,
        maritalStatus: body.maritalStatus,
        status: body.status,
        certificadoA1Url: body.certificadoA1Url,
        certificadoSenha: body.certificadoSenha,
        isTechnicalResponsible: body.isTechnicalResponsible,
        councilName: body.councilName,
        councilNumber: body.councilNumber,
        services: {
          set: body.serviceIds ? body.serviceIds.map((id: string) => ({ id })) : []
        }
      }
    });

    // 3. Sincroniza com TeamMember (Acesso ao Sistema)
    const targetEmail = body.email || updated.email || oldProfessional?.email;

    if (targetEmail) {
      // Tenta encontrar por e-mail (atual ou antigo) ou clerkUserId
      const member = await prisma.teamMember.findFirst({
        where: {
          OR: [
            { email: targetEmail },
            { email: oldProfessional?.email || undefined },
            { clerkUserId: updated.userId || undefined }
          ],
          companyId: updated.companyId
        }
      });

      if (member) {
        // Atualiza membro existente
        await prisma.teamMember.update({
          where: { id: member.id },
          data: {
            email: body.email || member.email,
            role: body.role || "PROFESSIONAL",
            permissions: body.permissions || member.permissions
          }
        });
      } else if (body.email) {
        // Cria novo registro de acesso se o funcionário agora tem e-mail
        await prisma.teamMember.create({
          data: {
            email: body.email,
            role: body.role || "PROFESSIONAL",
            companyId: updated.companyId,
            permissions: body.permissions || { agenda: true, clientes: true }
          }
        });
      }
    }

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}