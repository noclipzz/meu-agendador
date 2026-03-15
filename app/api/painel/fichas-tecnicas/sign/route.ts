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

    if (!pdfBase64 || !choice) {
      return NextResponse.json({ error: "Dados insuficientes para assinatura" }, { status: 400 });
    }

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

    // 2. Definir qual certificado usar
    if (choice === "company") {
      p12Url = empresa.certificadoA1Url || "";
      p12Password = empresa.certificadoSenha || "";
      signerName = empresa.corporateName || empresa.name;
    } else if (choice === "technical" && professionalId) {
      const techProf = await prisma.professional.findUnique({
        where: { id: professionalId },
      });
      p12Url = techProf?.certificadoA1Url || "";
      p12Password = techProf?.certificadoSenha || ""; // Supondo que adicionamos senha no profissional também
      signerName = techProf?.name || "";
    } else if (choice === "prof") {
       // Pega o profissional que preencheu a ficha
       const entry = await prisma.formEntry.findUnique({
           where: { id: entryId },
           include: { template: true }
       });
       
       // Note: FormEntry doesn't have a direct professional relation in schema, 
       // but it has a clientId. Let's assume the user who filled it (filledBy) 
       // is the one we want to check, but since we don't have a direct link 
       // to Professional by clerkId easily here without more queries, 
       // I'll stick to technical and company for now or fetch by filledBy.
       
       if (entry?.filledBy) {
           const prof = await prisma.professional.findFirst({
               where: { userId: entry.filledBy }
           });
           p12Url = prof?.certificadoA1Url || "";
           p12Password = prof?.certificadoSenha || "";
           signerName = prof?.name || "";
       }
    }

    if (!p12Url) {
      return NextResponse.json({ error: "Certificado A1 não encontrado para o assinante selecionado" }, { status: 400 });
    }

    // 3. Baixar o certificado
    const certRes = await fetch(p12Url);
    if (!certRes.ok) {
        return NextResponse.json({ error: "Erro ao baixar certificado A1" }, { status: 500 });
    }
    const certBuffer = Buffer.from(await certRes.arrayBuffer());

    // 4. Preparar o PDF para assinatura (Adicionar placeholder)
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    
    // node-signpdf plainAddPlaceholder adiciona o espaço necessário para a assinatura PKCS7
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
