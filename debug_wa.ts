import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst({ where: { slug: 'nohud' } });
    if (!company || !company.evolutionServerUrl || !company.evolutionApiKey) {
        console.log('Missing config'); return;
    }

    const serverUrl = company.evolutionServerUrl.replace(/\/$/, '');
    const apiKey = company.evolutionApiKey;
    const instanceId = 'nohud-cmkv';

    // 1. Delete existing instance
    console.log(`Deleting instance ${instanceId}...`);
    await fetch(`${serverUrl}/instance/delete/${instanceId}`, {
        method: 'DELETE',
        headers: { 'apikey': apiKey }
    }).catch(() => { });

    // 2. Create instance on v2.3.7
    console.log('Creating instance on v2.3.7...');
    const createRes = await fetch(`${serverUrl}/instance/create`, {
        method: 'POST',
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            instanceName: instanceId,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        })
    });
    const createData = await createRes.json().catch(() => ({}));
    console.log('Create status:', createRes.status);

    // In v2.3.x, qrcode might be inside the create object or needs to be fetched from /instance/connect
    if (createData.qrcode?.base64) {
        console.log('>>> SUCCESS! QR CODE IS RETURNED IN CREATE RESPONSE! <<<');
        console.log('QR length:', createData.qrcode.base64.length);
    } else {
        console.log('Checking /instance/connect for QR...');
        const connectRes = await fetch(`${serverUrl}/instance/connect/${instanceId}`, {
            headers: { 'apikey': apiKey }
        });
        const connectData = await connectRes.json().catch(() => ({}));
        console.log('Connect status:', connectRes.status);
        if (connectData.base64) {
            console.log('>>> SUCCESS! QR CODE IS RETURNED IN CONNECT RESPONSE! <<<');
            console.log('QR length:', connectData.base64.length);
        } else {
            console.log('Connect data:', JSON.stringify(connectData));
        }
    }
}

main().finally(() => prisma.$disconnect());
