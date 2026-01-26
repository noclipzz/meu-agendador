import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

// BUSCAR CLIENTES (APENAS DA EMPRESA DO USUÁRIO LOGADO)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    // 1. Localiza a empresa que pertence ao usuário logado
    const userCompany = await prisma.company.findFirst({
      where: { ownerId: userId }
    });

    if (!userCompany) return NextResponse.json([]);

    // 2. Busca clientes vinculados APENAS a essa empresa
    const clients = await prisma.client.findMany({
      where: { companyId: userCompany.id },
      orderBy: { name: 'asc' },
      include: { 
        bookings: { 
          include: { 
            service: true,
            professional: true 
          },
          orderBy: { date: 'desc' }
        } 
      }
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("ERRO_GET_CLIENTES:", error);
    return NextResponse.json({ error: "Erro ao buscar clientes" }, { status: 500 });
  }
}

// CADASTRAR NOVO CLIENTE (VINCULADO À EMPRESA DO DONO)
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    // 1. Localiza a empresa do usuário logado
    const userCompany = await prisma.company.findFirst({
      where: { ownerId: userId }
    });

    if (!userCompany) return new NextResponse("Empresa não encontrada para este usuário", { status: 404 });

    const body = await req.json();

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
        city: body.city,
        notes: body.notes,
        status: body.status || "ATIVO",
        companyId: userCompany.id // Vincula obrigatoriamente à empresa do dono
      }
    });
    
    return NextResponse.json(client);
  } catch (error) { 
    console.error("ERRO_POST_CLIENTE:", error);
    return new NextResponse("Erro ao criar cliente", { status: 500 }); 
  }
}

// ATUALIZAR CLIENTE (COM VALIDAÇÃO DE SEGURANÇA)
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    // 1. Localiza a empresa do usuário logado
    const userCompany = await prisma.company.findFirst({
      where: { ownerId: userId }
    });

    if (!userCompany) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();

    // 2. Atualiza garantindo que o cliente pertence à empresa do usuário (Proteção extra)
    const updated = await prisma.client.update({
      where: { 
        id: body.id,
        companyId: userCompany.id // Só atualiza se o cliente for "dele"
      },
      data: { 
        name: body.name, 
        phone: body.phone, 
        email: body.email, 
        cpf: body.cpf,
        rg: body.rg,
        birthDate: body.birthDate,
        cep: body.cep,
        address: body.address,
        city: body.city,
        notes: body.notes,
        status: body.status
      }
    });

    return NextResponse.json(updated);
  } catch (error) { 
    console.error("ERRO_PUT_CLIENTE:", error);
    return new NextResponse("Erro ao atualizar cliente", { status: 500 }); 
  }
}