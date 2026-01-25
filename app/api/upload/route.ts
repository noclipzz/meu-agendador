import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'upload.png';

    const blobFile = await request.blob();

    // Adicionamos 'addRandomSuffix: true' para evitar o erro de arquivo duplicado
    const blob = await put(filename, blobFile, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true, // Isso resolve o erro que você recebeu
    });

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error("ERRO NO UPLOAD:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}