import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: "Slug faltando" }, { status: 400 });

  const empresa = await prisma.company.findUnique({
    where: { slug: slug },
    include: { services: true, professionals: true }
  });

  if (!empresa) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  return NextResponse.json(empresa);
}