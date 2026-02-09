import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";

const prisma = new PrismaClient();
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
                    const newTotal = Math.max(0, Number(product.quantity) - Number(item.amount)); // Simples subtração do total para o cache
                    
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

    // 4. ENVIO DE E-MAILS (Mantido igual)
    if (cliente?.email && process.env.RESEND_API_KEY) {
        // ... (seu código de envio de email atual) ...
        // Vou omitir para não ficar gigante, mas mantenha o bloco try/catch do Resend que você já tem
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("ERRO_CHECKOUT:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}