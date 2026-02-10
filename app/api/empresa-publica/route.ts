import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const prisma = db;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: "Slug faltando" }, { status: 400 });
    }

    // Busca a empresa pelo link (slug)
    const empresa = await prisma.company.findUnique({
      where: { slug: slug },
      include: {
        services: true,
        professionals: true
      }
    });

    if (!empresa) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // O objeto 'empresa' aqui já inclui instagramUrl e facebookUrl automaticamente
    return NextResponse.json(empresa);

  } catch (error) {
    console.error("ERRO_GET_EMPRESA_PUBLICA:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}