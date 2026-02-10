import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const prisma = db;

export async function GET() {
  try {
    const company = await prisma.company.findFirst({
      include: { services: true }
    });

    if (!company) {
      return NextResponse.json({ error: "Nenhuma empresa encontrada" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Erro detalhado:", error); // Isso vai mostrar o erro real no terminal
    return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 });
  }
}