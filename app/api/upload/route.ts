import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  // Pega o nome do arquivo que enviamos na URL
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  // Garante que o corpo do request e o nome do arquivo existem
  if (!filename || !request.body) {
    return NextResponse.json({ error: "Nome do arquivo ou corpo ausente." }, { status: 400 });
  }

  try {
    // Envia o arquivo para o Vercel Blob
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    // Retorna o objeto com a URL permanente
    return NextResponse.json(blob);

  } catch (error) {
    // Se der erro no upload, avisa
    console.error("Erro no upload para o Blob:", error);
    return NextResponse.json({ error: "Erro interno no upload." }, { status: 500 });
  }
}