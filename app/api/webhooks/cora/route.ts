import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEvolutionMessage } from '@/lib/whatsapp';
import { logIntegration } from '@/lib/integration-logger';

export async function POST(req: Request) {
    let payloadStr = "";
    let payloadObj: any = {};
    try {
        payloadStr = await req.text();
        payloadObj = JSON.parse(payloadStr);
        console.log('--- Cora Webhook Payload ---', JSON.stringify(payloadObj, null, 2));

        const { event, data } = payloadObj;
        const gatewayId = data?.id;

        if (!gatewayId) {
            await logIntegration({
                service: "CORA",
                type: "WEBHOOK",
                status: "WARNING",
                endpoint: "/api/webhooks/cora",
                payload: payloadObj,
                errorMessage: "No gatewayId found in payload",
            });
            return NextResponse.json({ message: 'No gatewayId found' }, { status: 400 });
        }

        if (event === 'invoice.paid') {
            const invoice = await db.invoice.findFirst({
                where: { gatewayId } as any,
                include: {
                    client: true,
                    company: true
                }
            });

            if (invoice) {
                await db.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        status: 'PAGO',
                        paidAt: new Date(),
                    },
                });

                await logIntegration({
                    companyId: invoice.companyId,
                    service: "CORA",
                    type: "WEBHOOK",
                    status: "SUCCESS",
                    endpoint: "/api/webhooks/cora",
                    identifier: invoice.id,
                    payload: payloadObj,
                    response: { message: `Fatura ${invoice.id} marcada como PAGO` }
                });

                console.log(`✅ Fatura ${invoice.id} marcada como PAGO via Webhook Cora.`);

                // Disparo de WhatsApp de confirmação
                const { company, client } = invoice as any;
                if (company?.evolutionServerUrl && company?.evolutionApiKey && company?.whatsappInstanceId && client?.phone) {
                    let message = company.whatsappPaymentSuccessMessage ||
                        "✅ *Pagamento Confirmado!*\n\nOlá {nome}, recebemos seu pagamento de *{valor}* referente a *{descricao}*.\n\nObrigado!";

                    const valorFormatado = Number(invoice.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                    message = message
                        .replace(/{nome}/g, client.name)
                        .replace(/{valor}/g, valorFormatado)
                        .replace(/{descricao}/g, invoice.description || "Pagamento");

                    await sendEvolutionMessage(
                        company.evolutionServerUrl,
                        company.evolutionApiKey,
                        company.whatsappInstanceId,
                        client.phone,
                        message
                    );
                    console.log(`[WHATSAPP] Notificação de pagamento enviada para ${client.name}`);
                }
            } else {
                await logIntegration({
                    service: "CORA",
                    type: "WEBHOOK",
                    status: "WARNING",
                    endpoint: "/api/webhooks/cora",
                    identifier: gatewayId,
                    payload: payloadObj,
                    errorMessage: "Invoice not found for gatewayId",
                });
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('❌ Erro no Webhook da Cora:', error.message);
        await logIntegration({
            service: "CORA",
            type: "WEBHOOK",
            status: "ERROR",
            endpoint: "/api/webhooks/cora",
            payload: payloadObj || { raw: payloadStr },
            errorMessage: error?.message || String(error),
        });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
