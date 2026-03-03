import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { invoiceId } = body;

        if (!invoiceId) {
            return NextResponse.json({ error: "ID da fatura é obrigatório." }, { status: 400 });
        }

        const invoice = await db.invoice.findUnique({
            where: { id: invoiceId },
            include: { client: true, company: true }
        });

        if (!invoice) {
            return NextResponse.json({ error: "Fatura não encontrada." }, { status: 404 });
        }

        if (!invoice.client?.email) {
            return NextResponse.json({ error: "O cliente não possui e-mail cadastrado." }, { status: 400 });
        }

        if (!invoice.nfeUrl && !invoice.nfeProtocol) {
            return NextResponse.json({ error: "Esta nota ainda não foi processada pela prefeitura." }, { status: 400 });
        }

        const empresa = invoice.company;
        const cliente = invoice.client;
        const linkNfse = invoice.nfeUrl || "";
        const numeroNfse = invoice.nfeProtocol || invoice.nfeNumber || "-";
        const valorFormatado = Number(invoice.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const { error } = await resend.emails.send({
            from: `NOHUD App <nao-responda@nohud.com.br>`,
            to: cliente.email!,
            subject: `NFS-e nº ${numeroNfse} - ${empresa.name}`,
            html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 24px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 32px 40px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800;">📄 Nota Fiscal de Serviço</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">NFS-e nº ${numeroNfse}</p>
                </div>
                
                <div style="padding: 32px 40px;">
                    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                        Olá, <strong>${cliente.name}</strong>.
                    </p>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                        Segue sua Nota Fiscal de Serviço Eletrônica referente ao atendimento realizado por <strong>${empresa.name}</strong>.
                    </p>
                    
                    <div style="background: #f9fafb; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #f3f4f6;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Nº NFS-e</td>
                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${numeroNfse}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Descrição</td>
                                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${invoice.description || '-'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Valor Total</td>
                                <td style="padding: 8px 0; color: #059669; font-size: 18px; font-weight: 800; text-align: right;">${valorFormatado}</td>
                            </tr>
                        </table>
                    </div>

                    ${linkNfse ? `
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${linkNfse}" target="_blank" style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
                            🖨️ Visualizar / Imprimir NFS-e
                        </a>
                    </div>
                    ` : ''}

                    <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
                        ${empresa.name} • NFS-e emitida eletronicamente<br/>
                        Este é um e-mail automático. Não responda.
                    </p>
                </div>
            </div>
            `
        });

        if (error) {
            console.error("ERRO_ENVIO_NFSE_EMAIL:", error);
            return NextResponse.json({ error: "Erro ao enviar e-mail." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `NFS-e enviada por e-mail para ${cliente.email}`
        });

    } catch (e: any) {
        console.error("ERRO_ENVIO_NFSE_EMAIL:", e);
        return NextResponse.json({ error: e.message || "Erro ao enviar e-mail" }, { status: 500 });
    }
}
