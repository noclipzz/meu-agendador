import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst({ where: { slug: 'nohud' } });
    if (!company) { console.log('Company not found'); return; }

    const serverUrl = company.evolutionServerUrl!.replace(/\/$/, "");
    const apiKey = company.evolutionApiKey!;
    const instanceId = company.whatsappInstanceId || "nohud-cmkv";
    const appUrl = 'https://nohud.com.br';
    const webhookUrl = `${appUrl}/api/webhooks/evolution`;

    console.log(`Creating instance: ${instanceId} on ${serverUrl}`);
    try {
        const createRes = await fetch(`${serverUrl}/instance/create`, {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instanceName: instanceId,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS",
                webhook: {
                    url: webhookUrl,
                    byEvents: false,
                    base64: true,
                    events: ["QRCODE_UPDATED", "CONNECTION_UPDATE"]
                }
            })
        });

        const data = await createRes.json();
        console.log('Response Status:', createRes.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error creating instance:', e);
    }
}

main().finally(() => prisma.$disconnect());
