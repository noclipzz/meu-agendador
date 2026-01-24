import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

// SEU ID REAL AQUI
const SUPER_ADMIN_ID = "user_38aeICHQCoSI3FGUxX6SVCyvEQh"; 

// BUSCAR TUDO (GET)
export async function GET() {
  try {
    const { userId } = auth();

    // Bloqueia quem não for você
    if (userId !== SUPER_ADMIN_ID) {
        return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });
    }

    // 1. Busca todas as empresas
    const empresas = await prisma.company.findMany({
      include: { 
        _count: { select: { bookings: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Busca todas as assinaturas
    const assinaturas = await prisma.subscription.findMany();

    // 3. Cruza os dados
    const dadosCompletos = empresas.map(emp => {
        const assinatura = assinaturas.find(s => s.userId === emp.ownerId);
        
        return {
            ...emp,
            plano: assinatura?.plan || "SEM PLANO",
            status: assinatura?.status || "INACTIVE",
            expiresAt: assinatura?.expiresAt || null
        };
    });

    return NextResponse.json(dadosCompletos);

  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETAR EMPRESA (DELETE)
export async function DELETE(req: Request) {
  try {
    const { userId } = auth();
    
    // Verificação de segurança
    if (userId !== SUPER_ADMIN_ID) {
        return NextResponse.json({ error: "Proibido" }, { status: 403 });
    }

    const { companyId } = await req.json();

    // 1. Apaga agendamentos
    await prisma.booking.deleteMany({ where: { companyId } });
    
    // 2. Apaga serviços
    await prisma.service.deleteMany({ where: { companyId } });
    
    // 3. Apaga profissionais
    await prisma.professional.deleteMany({ where: { companyId } });
    
    // 4. Apaga membros da equipe
    await prisma.teamMember.deleteMany({ where: { companyId } });

    // 5. Apaga a empresa
    await prisma.company.delete({ where: { id: companyId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir empresa:", error);
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}