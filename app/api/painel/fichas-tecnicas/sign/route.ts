import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import signpdf, { plainAddPlaceholder } from "node-signpdf";
import forge from "node-forge";

const prisma = db;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    const { pdfBase64, choice, professionalId, entryId } = body;

    if (!pdfBase64) {
      return NextResponse.json({ error: "PDF não recebido para assinatura." }, { status: 400 });
    }

    console.log("[SIGN_API] Recebido - choice:", choice, "professionalId:", professionalId, "entryId:", entryId);

    // 1. Buscar a empresa do usuário para pegar os certificados/senhas
    const empresa = await prisma.company.findFirst({
      where: {
        OR: [{ ownerId: userId }, { professionals: { some: { userId: userId } } }],
      },
    });

    if (!empresa) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    let p12Url = "";
    let p12Password = "";
    let signerName = "";

    // 2. Definir qual certificado usar (com auto-detecção se choice for 'none' ou vazio)
    let effectiveChoice = choice;

    // Se o choice é 'none', vazio ou inválido, auto-detectar
    if (!effectiveChoice || effectiveChoice === 'none') {
      console.log("[SIGN_API] Choice vazio/none, auto-detectando certificado...");
      
      // Tentar empresa primeiro
      if ((empresa as any).certificadoA1Url) {
        effectiveChoice = 'company';
      }
      // Tentar profissional técnico
      else if (professionalId) {
        const techProf = await prisma.professional.findUnique({ where: { id: professionalId } });
        if ((techProf as any)?.certificadoA1Url) {
          effectiveChoice = 'technical';
        }
      }
      // Tentar profissional preenchedor
      else if (entryId) {
        const entry = await prisma.formEntry.findUnique({ where: { id: entryId } });
        if (entry?.filledBy) {
          const prof = await prisma.professional.findFirst({ where: { userId: entry.filledBy } });
          if ((prof as any)?.certificadoA1Url) {
            effectiveChoice = 'prof';
          }
        }
      }

      if (!effectiveChoice || effectiveChoice === 'none') {
        return NextResponse.json({ error: "Nenhum certificado A1 encontrado. Cadastre um certificado nas configurações." }, { status: 400 });
      }
      
      console.log("[SIGN_API] Auto-detectado choice:", effectiveChoice);
    }

    console.log("[SIGN_API] Assinando com choice:", effectiveChoice);

    if (effectiveChoice === "company") {
      p12Url = (empresa as any).certificadoA1Url || "";
      p12Password = (empresa as any).certificadoSenha || "";
      signerName = empresa.corporateName || empresa.name;
    } else if (effectiveChoice === "technical" && professionalId) {
      const techProf = await prisma.professional.findUnique({
        where: { id: professionalId },
      });
      p12Url = (techProf as any)?.certificadoA1Url || "";
      p12Password = (techProf as any)?.certificadoSenha || "";
      signerName = techProf?.name || "";
    } else if (effectiveChoice === "prof") {
       const entry = await prisma.formEntry.findUnique({
           where: { id: entryId },
           include: { template: true }
       });
       
       if (entry?.filledBy) {
           const prof = await prisma.professional.findFirst({
               where: { userId: entry.filledBy }
           });
           p12Url = (prof as any)?.certificadoA1Url || "";
           p12Password = (prof as any)?.certificadoSenha || "";
           signerName = prof?.name || "";
       }
    }

    if (!p12Url) {
      return NextResponse.json({ error: "Certificado A1 não encontrado para o assinante selecionado (" + effectiveChoice + ")" }, { status: 400 });
    }

    // 3. Baixar o certificado
    const certRes = await fetch(p12Url);
    if (!certRes.ok) {
        return NextResponse.json({ error: "Erro ao baixar certificado A1" }, { status: 500 });
    }
    const certBuffer = Buffer.from(await certRes.arrayBuffer());

    // 4. Preparar o PDF para assinatura (Adicionar placeholder)
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    
    let pdfWithPlaceholder;
    try {
        pdfWithPlaceholder = plainAddPlaceholder({
            pdfBuffer,
            reason: "Assinatura de Ficha Técnica - Nohud App",
            contactInfo: "suporte@nohud.app",
            name: signerName,
            location: empresa.city || "Brasil",
        });
    } catch (err: any) {
        console.error("Erro ao adicionar placeholder:", err);
        return NextResponse.json({ error: "Erro ao preparar PDF para assinatura digital: " + err.message }, { status: 500 });
    }

    // 5. Realizar a assinatura
    const signer = new (signpdf as any).SignPdf();
    const signedPdf = signer.sign(pdfWithPlaceholder, certBuffer, {
      password: p12Password,
    });

    // 6. Retornar o arquivo assinado
    return new NextResponse(signedPdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ficha_assinada_${Date.now()}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("ERRO_AO_ASSINAR_PDF:", error);
    return NextResponse.json({ 
        error: "Erro interno ao processar assinatura digital",
        details: error.message 
    }, { status: 500 });
  }
}
