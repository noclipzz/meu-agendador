import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { notifyAdminsOfCompany, notifyProfessional } from "@/lib/push-server";
import { formatarDataApenas } from "@/app/utils/formatters";
import { createCoraCharge } from "@/lib/cora-api";
import { sendEvolutionMessage, sendEvolutionMedia } from "@/lib/whatsapp";
import { emitirNfeSigcorp, parseGerarNfseResponse } from "@/lib/nfe/sigcorp";

const prisma = db;
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");

        // Busca a empresa do usuário
        const company = await prisma.company.findUnique({ where: { ownerId: userId } });
        let targetCompanyId = company?.id;

        if (!targetCompanyId) {
            const member = await prisma.teamMember.findUnique({ where: { clerkUserId: userId } });
            targetCompanyId = member?.companyId;
        }

        if (!targetCompanyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const where: any = { companyId: targetCompanyId };
        if (status && status !== "TODAS") {
            where.status = status;
        }

        const invoices = await prisma.invoice.findMany({
            where,
            include: { client: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ invoices });
    } catch (error) {
        console.error("ERRO_FATURA_GET:", error);
        return NextResponse.json({ error: "Erro ao buscar faturas" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { clientId, companyId, description, value, dueDate, status, method, bookingId, emitirNfse, costCenter } = body;

        // 1. Busca dados do cliente e da empresa
        const [cliente, empresa] = await Promise.all([
            prisma.client.findUnique({ where: { id: clientId } }),
            prisma.company.findUnique({ where: { id: companyId } })
        ]);

        // 2. Cálculo de Taxas (Abate)
        const valorBruto = parseFloat(value);
        let valorTaxa = 0;

        if (method === 'CREDITO' && empresa?.creditCardTax) {
            valorTaxa = (valorBruto * Number(empresa.creditCardTax)) / 100;
        } else if (method === 'DEBITO' && empresa?.debitCardTax) {
            valorTaxa = (valorBruto * Number(empresa.debitCardTax)) / 100;
        }

        const valorLiquido = valorBruto - valorTaxa;

        // 3. Cria a Fatura
        const invoice = await prisma.invoice.create({
            data: {
                clientId,
                companyId,
                description,
                value: valorBruto,
                cardTax: valorTaxa,
                netValue: valorLiquido,
                dueDate: new Date(dueDate),
                status: status || "PENDENTE",
                method: method || null,
                bookingId: bookingId || null,
                costCenter: costCenter || null,
                paidAt: status === "PAGO" ? new Date() : null
            } as any
        });

        // 3. Atualiza agendamento E BAIXA ESTOQUE COM LÓGICA DE LOTES
        if (bookingId) {
            // A) Atualiza status do agendamento
            await prisma.booking.update({ where: { id: bookingId }, data: { status: "CONCLUIDO" } });

            // B) LÓGICA DE ESTOQUE
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                select: { serviceId: true, professionalId: true }
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

                // C) LANÇAMENTO DE COMISSÃO (SE PROFISSIONAL EXISTE E SERVIÇO TEM COMISSÃO)
                if (booking.professionalId && booking.serviceId) {
                    const servicoData = await prisma.service.findUnique({ where: { id: booking.serviceId } });
                    const profData = await prisma.professional.findUnique({ where: { id: booking.professionalId } });

                    if (servicoData && servicoData.commission > 0 && profData) {
                        const comissaoPercent = servicoData.commission;
                        const valorComissao = (valorLiquido * comissaoPercent) / 100;

                        // Criação do Contas a Pagar para o Profissional
                        await (prisma.expense as any).create({
                            data: {
                                companyId,
                                description: `Comissão - ${profData.name} - ${servicoData.name}`,
                                value: valorComissao,
                                category: "COMISSOES",
                                status: "PENDENTE",
                                dueDate: new Date(), // Vence no dia
                                paymentMethod: method || "OUTRO",
                                notes: `Comissão gerada automaticamente do Agendamento ID: ${bookingId}`,
                                createdBy: "SISTEMA",
                                updatedBy: "SISTEMA",
                            }
                        });
                        console.log(`🤑 [COMISSÃO] Lançada despesa de R$ ${valorComissao} para ${profData.name}`);
                    }
                }
            }
        }

        // 4. ENVIO DE E-MAILS (ATUALIZADO)
        if (process.env.RESEND_API_KEY) {
            const isPago = status === "PAGO";
            const corStatus = isPago ? "#059669" : "#dc2626";
            const tituloEmail = isPago ? `Recibo de Pagamento - ${empresa?.name}` : `Fatura em Aberto - ${empresa?.name}`;

            try {
                // A. E-mail para o Cliente (Se houver e-mail)
                if (cliente?.email) {
                    console.log("📨 [DEBUG] Enviando e-mail financeiro para CLIENTE:", cliente.email);
                    const { error: errorClient } = await resend.emails.send({
                        from: `NOHUD App <nao-responda@nohud.com.br>`,
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
                                <p style="margin: 5px 0;"><strong>Vencimento:</strong> ${formatarDataApenas(new Date(dueDate))}</p>
                            </div>
                            <p style="font-size: 12px; color: #999; text-align: center;">${empresa?.name} - Sistema Automático</p>
                        </div>
                    `
                    });
                    if (errorClient) console.error("❌ [DEBUG] Erro Resend Financeiro Cliente:", errorClient);
                } else {
                    console.log("⚠️ [DEBUG] Cliente sem e-mail, pulando notificação financeira do cliente.");
                }

                // B. E-mail para o Admin (Sempre que houver notificationEmail)
                if (empresa?.notificationEmail) {
                    console.log("📨 [DEBUG] Enviando e-mail financeiro para ADMIN:", empresa.notificationEmail);
                    const { error: errorAdmin } = await resend.emails.send({
                        from: `NOHUD App <nao-responda@nohud.com.br>`,
                        to: empresa.notificationEmail,
                        subject: isPago ? `💰 Pagamento Recebido: R$ ${value}` : `🧾 Fatura Gerada: R$ ${value}`,
                        html: `
                            <p>Atualização financeira no sistema:</p>
                            <p><strong>Cliente:</strong> ${cliente?.name || 'Não identificado'}</p>
                            <p><strong>Serviço:</strong> ${description}</p>
                            <p><strong>Valor:</strong> R$ ${parseFloat(value).toLocaleString('pt-BR')}</p>
                            <p><strong>Status:</strong> ${isPago ? 'PAGO ✅' : 'PENDENTE ⏳'}</p>
                        `
                    });
                    if (errorAdmin) console.error("❌ [DEBUG] Erro Resend Financeiro Admin:", errorAdmin);
                }
            } catch (e) {
                console.error("❌ [DEBUG] Erro fatal no envio financeiro:", e);
            }
        }

        // 5. NOTIFICAÇÃO PUSH (ADMIN E PROFISSIONAL)
        if (bookingId) {
            try {
                const bookingCompleto = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    include: { professional: true }
                });

                if (bookingCompleto) {
                    const isPago = status === "PAGO";
                    const statusTxt = isPago ? "PAGO ✅" : "PENDENTE ⏳";
                    const titulo = isPago ? "🏁 Atendimento Concluído e Pago!" : "🏁 Atendimento Concluído!";
                    const corpo = `${bookingCompleto.customerName} finalizou o atendimento. Pagamento: ${statusTxt}`;

                    // Notifica Admins
                    await notifyAdminsOfCompany(companyId, titulo, corpo, "/painel/financeiro");

                    // Notifica o Profissional
                    if (bookingCompleto.professionalId) {
                        await notifyProfessional(bookingCompleto.professionalId, titulo, corpo, "/painel/agenda");
                    }
                }
            } catch (pushErr) {
                console.error("Erro ao enviar push de conclusão:", pushErr);
            }
        }

        // 6. INTEGRAÇÃO CORA (Se método for PIX_CORA ou BOLETO)
        let coraResult = null;
        console.log(`💳 [CHECKOUT] Método: ${method} | Status: ${status} | ClienteID: ${clientId} | Telefone: ${cliente?.phone || 'N/A'}`);
        if (method === 'PIX_CORA' || method === 'BOLETO') {
            try {
                console.log(`💰 [CORA] Gerando cobrança para fatura ${invoice.id}...`);
                coraResult = await createCoraCharge(companyId, invoice.id);
                console.log(`✅ [CORA] Cobrança criada! BoletoURL: ${coraResult?.payment_options?.bank_slip?.url || 'N/A'} | PIX: ${coraResult?.payment_options?.pix?.emv ? 'SIM' : 'N/A'}`);
            } catch (coraErr: any) {
                console.error("❌ [CORA] Erro ao gerar cobrança:", coraErr?.message || coraErr);
            }
        }

        // 6.1 ENVIO AUTOMÁTICO VIA WHATSAPP (BOT)
        if (cliente?.phone && empresa?.evolutionServerUrl && empresa?.evolutionApiKey && empresa?.whatsappInstanceId) {
            try {
                if (status === 'PAGO') {
                    // MENSAGEM DE SUCESSO DE PAGAMENTO
                    let msgSucesso = empresa.whatsappPaymentSuccessMessage || "✅ *Pagamento Confirmado!*\n\nOlá {nome}, recebemos seu pagamento de *{valor}* referente a *{descricao}*.\n\nObrigado!";
                    msgSucesso = msgSucesso
                        .replace(/{nome}/g, cliente.name)
                        .replace(/{valor}/g, `R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
                        .replace(/{descricao}/g, description);

                    await sendEvolutionMessage(empresa.evolutionServerUrl, empresa.evolutionApiKey, empresa.whatsappInstanceId, cliente.phone, msgSucesso);
                    console.log(`📨 [WHATSAPP] Confirmação de pagamento enviada para ${cliente.phone}`);
                } 
                else if (status === 'PENDENTE') {
                    // MENSAGEM COBRANDO OU ENVIANDO PIX/BOLETO
                    const valorStr = parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    let msg = "";

                    if (method === 'BOLETO' && coraResult) {
                        const boletoUrl = coraResult?.payment_options?.bank_slip?.url;
                        const pixCode = coraResult?.payment_options?.pix?.emv;

                        msg = `💰 *Boleto Gerado - ${empresa.name}*\n\n`;
                        msg += `Olá, *${cliente.name}*!\n`;
                        msg += `Segue o boleto referente ao serviço realizado:\n\n`;
                        msg += `📝 *Serviço:* ${description}\n`;
                        msg += `💵 *Valor:* R$ ${valorStr}\n`;
                        msg += `📅 *Vencimento:* ${formatarDataApenas(new Date(dueDate + (typeof dueDate === 'string' && dueDate.length === 10 ? 'T12:00:00' : '')))}\n`;

                        if (boletoUrl) msg += `\n🔗 *Link do Boleto:*\n${boletoUrl}\n`;
                        if (pixCode) msg += `\n📱 *PIX (Copia e Cola):*\n${pixCode}\n`;
                        msg += `\n_Mensagem automática - ${empresa.name}_`;

                        await sendEvolutionMessage(empresa.evolutionServerUrl, empresa.evolutionApiKey, empresa.whatsappInstanceId, cliente.phone, msg);

                        if (boletoUrl) {
                            await sendEvolutionMedia(empresa.evolutionServerUrl, empresa.evolutionApiKey, empresa.whatsappInstanceId, cliente.phone, boletoUrl, {
                                mediatype: 'document',
                                caption: `Boleto - ${description} - R$ ${valorStr}`,
                                fileName: `boleto_${empresa.name.replace(/\s/g, '_')}.pdf`
                            });
                        }
                        console.log(`📨 [WHATSAPP] Boleto enviado para ${cliente.phone}`);
                    } 
                    else if (method === 'PIX_CORA' && coraResult) {
                        const pixCode = coraResult?.payment_options?.pix?.emv;
                        
                        msg = `✨ *Serviço Concluído - ${empresa.name}*\n\n`;
                        msg += `Olá, *${cliente.name}*! O seu atendimento foi finalizado com sucesso.\n\n`;
                        msg += `📝 *Serviço:* ${description}\n`;
                        msg += `💵 *Valor:* R$ ${valorStr}\n\n`;
                        if (pixCode) {
                            msg += `Para facilitar, segue o seu PIX Copia e Cola:\n\n${pixCode}\n\n`;
                        }
                        msg += `Muito obrigado pela preferência! 😊`;

                        await sendEvolutionMessage(empresa.evolutionServerUrl, empresa.evolutionApiKey, empresa.whatsappInstanceId, cliente.phone, msg);
                        console.log(`📨 [WHATSAPP] PIX enviado para ${cliente.phone}`);
                    }
                    else {
                        // Aviso genérico de pendência
                        msg = `✨ *Serviço Concluído - ${empresa.name}*\n\n`;
                        msg += `Olá, *${cliente.name}*! O seu atendimento foi finalizado com sucesso.\n\n`;
                        msg += `📝 *Serviço:* ${description}\n`;
                        msg += `💵 *Ficou no valor de:* R$ ${valorStr}\n\n`;
                        msg += `Consta no sistema que o pagamento está pendente (A combinar / Acerto na recepção).\n`;
                        msg += `Muito obrigado pela preferência! 😊`;

                        await sendEvolutionMessage(empresa.evolutionServerUrl, empresa.evolutionApiKey, empresa.whatsappInstanceId, cliente.phone, msg);
                        console.log(`📨 [WHATSAPP] Aviso de pendência genérico enviado para ${cliente.phone}`);
                    }
                }
            } catch (wpErr) {
                console.error("⚠️ [WHATSAPP] Erro ao enviar mensagem de checkout:", wpErr);
            }
        }

        // 7. EMISSÃO AUTOMÁTICA DE NFS-e (Se checkbox marcada)
        if (emitirNfse) {
            try {
                console.log(`📝 [NFSe] Emitindo nota fiscal para fatura ${invoice.id}...`);
                const invoiceForNfse = await prisma.invoice.findUnique({
                    where: { id: invoice.id },
                    include: { client: true, company: true }
                });

                if (invoiceForNfse) {
                    const nsfeResult = await emitirNfeSigcorp({
                        invoice: invoiceForNfse,
                        company: invoiceForNfse.company,
                        environment: 'PRODUCTION',
                        discriminacao: description
                    });

                    if (nsfeResult.success) {
                        const parsed = parseGerarNfseResponse(nsfeResult.soapResponse);

                        if (parsed.isSuccess && parsed.nfseGerada) {
                            await (prisma.invoice as any).update({
                                where: { id: invoice.id },
                                data: {
                                    nfeStatus: "EMITIDA",
                                    nfeProtocol: parsed.numeroNfse || null,
                                    nfeNumber: nsfeResult.rpsNumero || null
                                }
                            });
                            console.log(`✅ [NFSe] Nota fiscal emitida! Nº ${parsed.numeroNfse}`);
                        } else if (!parsed.isError) {
                            await (prisma.invoice as any).update({
                                where: { id: invoice.id },
                                data: {
                                    nfeStatus: "PROCESSANDO",
                                    nfeProtocol: parsed.protocolo || null,
                                    nfeNumber: nsfeResult.rpsNumero || null
                                }
                            });
                            console.log(`⏳ [NFSe] Nota em processamento. Protocolo: ${parsed.protocolo}`);
                        } else {
                            console.error(`❌ [NFSe] Erro da prefeitura: ${parsed.errorMessage}`);
                        }
                    } else {
                        console.error(`❌ [NFSe] Falha na comunicação: ${nsfeResult.error}`);
                    }
                }
            } catch (nfseErr: any) {
                console.error("⚠️ [NFSe] Erro ao emitir nota fiscal:", nfseErr?.message || nfseErr);
            }
        }

        return NextResponse.json(invoice);
    } catch (error) {
        console.error("ERRO_CHECKOUT:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { id, status, value, description, dueDate, method, costCenter } = body;

        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                status,
                value: value ? parseFloat(value.toString().replace(',', '.')) : undefined,
                description,
                dueDate: dueDate ? new Date(`${dueDate.toString().split('T')[0]}T12:00:00`) : undefined,
                method,
                costCenter,
                paidAt: status === "PAGO" ? new Date() : undefined
            } as any
        });

        return NextResponse.json(updatedInvoice);
    } catch (error) {
        console.error("ERRO_FATURA_PUT:", error);
        return NextResponse.json({ error: "Erro ao atualizar fatura" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const { searchParams } = new URL(req.url);
        const urlId = searchParams.get("id");

        // Tenta ler o corpo para exclusão em massa
        let body: any = {};
        try { body = await req.json(); } catch (e) { }

        const idsToDelete = body.ids || (body.id ? [body.id] : (urlId ? [urlId] : []));

        if (idsToDelete.length === 0) return new NextResponse("ID não fornecido", { status: 400 });

        await (prisma.invoice as any).deleteMany({
            where: { id: { in: idsToDelete } }
        });

        return NextResponse.json({ success: true, count: idsToDelete.length });
    } catch (error) {
        console.error("ERRO_FATURA_DELETE:", error);
        return NextResponse.json({ error: "Erro ao excluir fatura" }, { status: 500 });
    }
}