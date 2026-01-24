import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();
// SEU ID REAL AQUI
const SUPER_ADMIN_ID = "user_38aeICHQCoSI3FGUxX6SVCyvEQh"; 

export async function POST(req: Request) {
  const { userId } = auth();
  if (userId !== SUPER_ADMIN_ID) return NextResponse.json({}, { status: 403 });

  const { targetUserId, diasAdicionais } = await req.json();

  // Busca assinatura atual
  const sub = await prisma.subscription.findUnique({ where: { userId: targetUserId } });
  
  // Se não existir, cria uma nova expirando hoje
  let dataBase = sub?.expiresAt ? new Date(sub.expiresAt) : new Date();
  
  // Se a assinatura já venceu, começa a contar de hoje
  if (dataBase < new Date()) dataBase = new Date();

  // Adiciona os dias
  const novaData = addDays(dataBase, diasAdicionais);

  await prisma.subscription.upsert({
    where: { userId: targetUserId },
    update: { expiresAt: novaData, status: "ACTIVE" },
    create: { userId: targetUserId, plan: "MANUAL", expiresAt: novaData }
  });

  return NextResponse.json({ success: true, novaData });
}