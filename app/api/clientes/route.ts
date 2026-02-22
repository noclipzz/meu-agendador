import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { validateCPF, validateEmail } from "@/lib/validators";

const prisma = db;
export const dynamic = "force-dynamic";

// FUNÇÃO AUXILIAR: Descobre o ID da empresa (seja Dono ou Funcionário)
async function getCompanyId(userId: string) {
  // 1. Tenta achar como DONO
  const companyOwner = await prisma.company.findUnique({
    where: { ownerId: userId },
    select: { id: true }
  });
  if (companyOwner) return companyOwner.id;

  // 2. Se não for dono, tenta achar como MEMBRO DA EQUIPE
  const teamMember = await prisma.teamMember.findFirst({
    where: { clerkUserId: userId },
    select: { companyId: true }
  });
  if (teamMember) return teamMember.companyId;

  // 3. Tenta achar como PROFISSIONAL
  const professional = await prisma.professional.findFirst({
    where: { userId },
    select: { companyId: true }
  });
  if (professional) return professional.companyId;

  return null;
}

// GET: LISTAR CLIENTES (Admin + Profissionais)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return NextResponse.json([]); // Retorna lista vazia se não tiver empresa vinculada

    const clients = await (prisma.client as any).findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      include: {
        bookings: {
          include: {
            service: true,
            professional: true
          },
          orderBy: { date: 'desc' },
          take: 5
        }
        // attachments: true
      }
    });

    return NextResponse.json(clients);
  } catch (error: any) {
    console.error("ERRO_GET_CLIENTES:", error);
    return NextResponse.json({ error: "Erro ao buscar clientes", details: error.message }, { status: 500 });
  }
}

// POST: CADASTRAR NOVO CLIENTE (Admin + Profissionais)
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const body = await req.json();

    // VALIDAÇÕES
    if (body.cpf && !validateCPF(body.cpf)) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
    }
    if (body.email && !validateEmail(body.email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    // Verifica se já existe cliente com esse telefone na empresa (evita duplicidade)
    if (body.phone) {
      const existing = await prisma.client.findFirst({
        where: {
          companyId,
          phone: body.phone
        }
      });
      if (existing) {
        return NextResponse.json({ error: "Já existe um cliente com este telefone." }, { status: 400 });
      }
    }

    const client = await (prisma.client as any).create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email,
        clientType: body.clientType || "FISICA",
        cpf: body.cpf,
        cnpj: body.cnpj,
        rg: body.rg,
        inscricaoEstadual: body.inscricaoEstadual,
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
        photoUrl: body.photoUrl,
        status: body.status || "ATIVO",
        companyId: companyId
      }
    });

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 });
  }
}

// PUT: ATUALIZAR CLIENTE (Admin + Profissionais)
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { id, ...data } = body;

    // VALIDAÇÕES
    if (data.cpf && !validateCPF(data.cpf)) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
    }
    if (data.email && !validateEmail(data.email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    // Garante que só atualiza clientes da MESMA empresa
    const updated = await (prisma.client as any).update({
      where: {
        id,
        companyId // Trava de segurança
      },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        clientType: data.clientType || "FISICA",
        cpf: data.cpf,
        cnpj: data.cnpj,
        rg: data.rg,
        inscricaoEstadual: data.inscricaoEstadual,
        birthDate: data.birthDate,
        cep: data.cep,
        address: data.address,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        notes: data.notes,
        maritalStatus: data.maritalStatus,
        photoUrl: data.photoUrl,
        status: data.status
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// DELETE: EXCLUIR CLIENTE (Admin + Profissionais)
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();

    await prisma.client.delete({
      where: {
        id: body.id,
        companyId // Trava de segurança
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}