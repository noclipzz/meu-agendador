import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst({ where: { slug: 'nohud' } });
    if (!company || !company.evolutionServerUrl || !company.evolutionApiKey) {
        console.log('Missing config'); return;
    }

    const serverUrl = company.evolutionServerUrl.replace(/\/$/, '');
    const apiKey = company.evolutionApiKey;
    const instanceId = company.whatsappInstanceId || 'nohud-cmkv';

    // Cleanup
    await fetch(`${serverUrl}/instance/logout/${instanceId}`, { method: 'DELETE', headers: { 'apikey': apiKey } }).catch(() => { });
    await fetch(`${serverUrl}/instance/delete/${instanceId}`, { method: 'DELETE', headers: { 'apikey': apiKey } }).catch(() => { });
    await new Promise(r => setTimeout(r, 3000));

    // Create sem qrcode (com number para tentar pairing code)
    console.log('Creating instance...');
    const createRes = await fetch(`${serverUrl}/instance/create`, {
        method: 'POST',
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            instanceName: instanceId,
            qrcode: false,
            integration: "WHATSAPP-BAILEYS"
        })
    });
    console.log('Create:', createRes.status, await createRes.text());

    await new Promise(r => setTimeout(r, 2000));

    // Tenta o pairing code
    console.log('\nTrying pairing code...');
    const pairRes = await fetch(`${serverUrl}/instance/connect/${instanceId}`, {
        method: 'GET',
        headers: { 'apikey': apiKey }
    });
    console.log('Connect response:', await pairRes.text());

    // Tenta verificar o manager URL
    console.log('\nManager URL:', `${serverUrl}/manager`);
    console.log('You can access the manager directly to generate QR code');
}

main().finally(() => prisma.$disconnect());
