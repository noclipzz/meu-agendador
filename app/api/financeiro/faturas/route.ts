import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";

const prisma = db;
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { clientId, companyId, description, value, dueDate, status, method, bookingId } = body;

        // 1. Busca dados do cliente e da empresa
        const [cliente, empresa] = await Promise.all([
            prisma.client.findUnique({ where: { id: clientId } }),
            prisma.company.findUnique({ where: { id: companyId } })
        ]);

        // 2. Cria a Fatura
        const invoice = await prisma.invoice.create({
            data: {
                clientId,
                companyId,
                description,
                value: parseFloat(value),
                dueDate: new Date(dueDate),
                status: status || "PENDENTE",
                method: method || null,
                bookingId: bookingId || null,
                paidAt: status === "PAGO" ? new Date() : null
            }
        });

        // 3. Atualiza agendamento E BAIXA ESTOQUE COM LÓGICA DE LOTES
        if (bookingId) {
            // A) Atualiza status do agendamento
            await prisma.booking.update({ where: { id: bookingId }, data: { status: "CONCLUIDO" } });

            // B) LÓGICA DE ESTOQUE
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                select: { serviceId: true }
            });

            if (booking?.serviceId) {
                // Busca a "receita" do serviço
                const consumiveis = await prisma.serviceProduct.findMany({
                    where: { serviceId: booking.serviceId }
                });

                // Para cada produto da receita, abate dos lotes
                for (const item of consumiveis) {
                    const productId = item.productId;
                    let remainingToDeduct = Number(item.amount);

                    // Busca lotes disponíveis ordenados (Vence primeiro -> Sai primeiro)
                    const batches = await prisma.productBatch.findMany({
                        where: { productId, quantity: { gt: 0 } },
                        orderBy: [
                            { expiryDate: 'asc' }, // Prioridade: Validade
                            { createdAt: 'asc' }   // Desempate: Mais antigo
                        ]
                    });

                    // Loop para abater dos lotes
                    for (const batch of batches) {
                        if (remainingToDeduct <= 0) break;

                        const batchQty = Number(batch.quantity);
                        const toTake = Math.min(batchQty, remainingToDeduct);

                        if (batchQty - toTake <= 0) {
                            await prisma.productBatch.delete({ where: { id: batch.id } }); // Lote zerou
                        } else {
                            await prisma.productBatch.update({
                                where: { id: batch.id },
                                data: { quantity: batchQty - toTake }
                            });
                        }
                        remainingToDeduct -= toTake;
                    }

                    // Atualiza o totalizador do produto e gera log
                    const product = await prisma.product.findUnique({ where: { id: productId } });
                    if (product) {
                        const newTotal = Math.max(0, Number(product.quantity) - Number(item.amount));

                        await prisma.product.update({
                            where: { id: productId },
                            data: { quantity: newTotal }
                        });

                        await prisma.stockLog.create({
                            data: {
                                productId,
                                quantity: -Number(item.amount),
                                oldStock: product.quantity,
                                newStock: newTotal,
                                type: "SAIDA",
                                reason: `Serviço: ${description}`
                            }
                        });
                    }
                }
            }
        }

        // 4. ENVIO DE E-MAILS (ATUALIZADO)
        if (cliente?.email && process.env.RESEND_API_KEY) {
            const isPago = status === "PAGO";
            const corStatus = isPago ? "#059669" : "#dc2626";
            const tituloEmail = isPago ? `Recibo de Pagamento - ${empresa?.name}` : `Fatura em Aberto - ${empresa?.name}`;

            try {
                await resend.emails.send({
                    from: `NOHUD App <nao-responda@nohud.com.br>`,
                    // ------------------------------------------------------------------
                    to: cliente.email,
                    subject: tituloEmail,
                    html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 20px; padding: 40px; color: #333;">
                        <h1 style="color: ${corStatus}; font-size: 24px;">${isPago ? 'Pagamento Confirmado!' : 'Pagamento em Aberto'}</h1>
                        <p>Olá, <strong>${cliente.name}</strong>.</p>
                        <p>${isPago ? 'Recebemos seu pagamento. Seguem os detalhes do serviço realizado:' : 'Seu atendimento foi concluído! O pagamento consta em aberto no nosso sistema.'}</p>
                        
                        <div style="background: #f9fafb; border-radius: 15px; padding: 20px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Serviço:</strong> ${description}</p>
                            <p style="margin: 5px 0;"><strong>Valor:</strong> R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p style="margin: 5px 0;"><strong>Forma de Pagamento:</strong> ${method || 'A definir'}</p>
                            <p style="margin: 5px 0;"><strong>Vencimento:</strong> ${new Date(dueDate).toLocaleDateString('pt-BR')}</p>
                        </div>

                        ${!isPago ? `
                            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;">
                                <p style="color: #991b1b; margin: 0; font-size: 14px;"><strong>Atenção:</strong> Por favor, entre em contato conosco para realizar o pagamento e baixar sua fatura.</p>
                            </div>
                        ` : ''}

                        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                        <p style="font-size: 12px; color: #999; text-align: center;">${empresa?.name} - Sistema Automático</p>
                    </div>
                `
                });

                // --- E-mail para ADMIN EMPRESA ---
                if (empresa?.notificationEmail) {
                    await resend.emails.send({
                        from: `NOHUD App <nao-responda@nohud.com.br>`,
                        to: empresa.notificationEmail,
                        subject: isPago ? `💰 Pagamento Recebido: R$ ${value}` : `🧾 Fatura Gerada: R$ ${value}`,
                        html: `
                            <p>Atualização financeira:</p>
                            <p><strong>Cliente:</strong> ${cliente.name}</p>
                            <p><strong>Valor:</strong> R$ ${parseFloat(value).toLocaleString('pt-BR')}</p>
                            <p><strong>Status:</strong> ${isPago ? 'PAGO ✅' : 'PENDENTE ⏳'}</p>
                        `
                    });
                }

            } catch (e) {
                console.error("Erro ao enviar e-mail financeiro:", e);
            }
        }

        return NextResponse.json(invoice);
    } catch (error) {
        console.error("ERRO_CHECKOUT:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}