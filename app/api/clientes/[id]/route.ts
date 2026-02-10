import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

// GET: Buscar UM cliente específico pelo ID com TODO o histórico
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const clienteId = params.id;

    // 1. Verifica se a empresa pertence ao usuário (Segurança)
    const userCompany = await prisma.company.findFirst({
      where: { ownerId: userId }
    });

    if (!userCompany) return new NextResponse("Empresa não encontrada", { status: 404 });

    // 2. Busca o cliente com todos os relacionamentos (Financeiro e Agenda)
    const client = await prisma.client.findFirst({
      where: {
        id: clienteId,
        companyId: userCompany.id // Garante que o cliente é desta empresa
      },
      include: {
        // Traz as faturas (Financeiro)
        invoices: {
          orderBy: { createdAt: 'desc' } // Mais recentes primeiro
        },
        // Traz os agendamentos (Histórico de serviços)
        bookings: {
          orderBy: { date: 'desc' },
          include: {
            service: true,
            professional: true
          }
        },
        // Traz anexos (se houver)
        attachments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) {
      return new NextResponse("Cliente não encontrado", { status: 404 });
    }

    return NextResponse.json(client);

  } catch (error) {
    console.error("ERRO_GET_CLIENTE_DETALHE:", error);
    return new NextResponse("Erro ao buscar detalhes do cliente", { status: 500 });
  }
}

// DELETE: Excluir um cliente
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const clienteId = params.id;

    const userCompany = await prisma.company.findFirst({
      where: { ownerId: userId }
    });

    if (!userCompany) return new NextResponse("Não autorizado", { status: 401 });

    // Deleta garantindo que pertence à empresa
    await prisma.client.delete({
      where: {
        id: clienteId,
        companyId: userCompany.id
      }
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error("ERRO_DELETE_CLIENTE:", error);
    return new NextResponse("Erro ao excluir cliente", { status: 500 });
  }
}