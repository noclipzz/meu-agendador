import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // 1. AUTENTICAÇÃO OBRIGATÓRIA
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'upload.png';

    // 2. VALIDAÇÃO DO ARQUIVO
    const blobFile = await request.blob();

    // Limite de tamanho (5MB)
    if (blobFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo muito grande (máx 5MB)" }, { status: 400 });
    }

    // Validação de tipo (Apenas imagens e PDF)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(blobFile.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não permitido. Apenas imagens e PDF." }, { status: 400 });
    }

    // 3. UPLOAD SEGURO
    // Adicionamos 'addRandomSuffix: true' para evitar o erro de arquivo duplicado
    const blob = await put(filename, blobFile, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
      contentType: blobFile.type // Garante o Content-Type correto
    });

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error("ERRO NO UPLOAD:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}