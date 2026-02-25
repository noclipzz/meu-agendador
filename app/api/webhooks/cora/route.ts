import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEvolutionMessage } from '@/lib/whatsapp';

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        console.log('--- Cora Webhook Payload ---', JSON.stringify(payload, null, 2));

        const { event, data } = payload;
        const gatewayId = data?.id;

        if (!gatewayId) return NextResponse.json({ message: 'No gatewayId found' }, { status: 400 });

        if (event === 'invoice.paid') {
            const invoice = await db.invoice.findUnique({
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
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('❌ Erro no Webhook da Cora:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
