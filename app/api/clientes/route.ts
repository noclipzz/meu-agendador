import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

// FUNÇÃO AUXILIAR: Descobre o ID da empresa (seja Dono ou Funcionário)
async function getCompanyId(userId: string) {
  // 1. Tenta achar como DONO
  const companyOwner = await prisma.company.findUnique({
    where: { ownerId: userId },
    select: { id: true }
  });
  if (companyOwner) return companyOwner.id;

  // 2. Se não for dono, tenta achar como MEMBRO DA EQUIPE
  const teamMember = await prisma.teamMember.findUnique({
    where: { clerkUserId: userId },
    select: { companyId: true }
  });
  if (teamMember) return teamMember.companyId;

  return null;
}

// GET: LISTAR CLIENTES (Admin + Profissionais)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return NextResponse.json([]); // Retorna lista vazia se não tiver empresa vinculada

    const clients = await prisma.client.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      include: {
        bookings: {
          include: {
            service: true,
            professional: true
          },
          orderBy: { date: 'desc' },
          take: 5 // Traz apenas os 5 últimos para não pesar a listagem
        }
      }
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("ERRO_GET_CLIENTES:", error);
    return NextResponse.json({ error: "Erro ao buscar clientes" }, { status: 500 });
  }
}

// POST: CADASTRAR NOVO CLIENTE (Admin + Profissionais)
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return new NextResponse("Empresa não encontrada", { status: 404 });

    const body = await req.json();

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

    const client = await prisma.client.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email,
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
        status: body.status || "ATIVO",
        companyId: companyId
      }
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("ERRO_POST_CLIENTE:", error);
    return new NextResponse("Erro ao criar cliente", { status: 500 });
  }
}

// PUT: ATUALIZAR CLIENTE (Admin + Profissionais)
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    const { id, ...data } = body;

    // Garante que só atualiza clientes da MESMA empresa
    const updated = await prisma.client.update({
      where: {
        id,
        companyId // Trava de segurança
      },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        cpf: data.cpf,
        rg: data.rg,
        birthDate: data.birthDate,
        cep: data.cep,
        address: data.address,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        notes: data.notes,
        status: data.status
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("ERRO_PUT_CLIENTE:", error);
    return new NextResponse("Erro ao atualizar", { status: 500 });
  }
}

// DELETE: EXCLUIR CLIENTE (Admin + Profissionais)
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();

    await prisma.client.delete({
      where: {
        id: body.id,
        companyId // Trava de segurança
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERRO_DELETE_CLIENTE:", error);
    return new NextResponse("Erro ao excluir", { status: 500 });
  }
}