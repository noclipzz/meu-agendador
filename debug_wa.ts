import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst({ where: { slug: 'nohud' } });
    if (!company || !company.evolutionServerUrl || !company.evolutionApiKey) {
        console.log('Missing config'); return;
    }

    const serverUrl = company.evolutionServerUrl.replace(/\/$/, '');
    const apiKey = company.evolutionApiKey;
    const instanceId = 'nohud-cmkv';
    const log: string[] = [];
    const L = (msg: string) => { log.push(msg); console.log(msg); };

    // O Manager da Evolution tem um endpoint web. Vamos tentar os v2 endpoints:

    // 1. Tentar webhook configuração
    L('--- Setting webhook for QR ---');
    // Não podemos receber webhook aqui, mas podemos ver se existe alguma config de webhook na instância
    try {
        const whRes = await fetch(`${serverUrl}/webhook/find/${instanceId}`, {
            headers: { 'apikey': apiKey }
        });
        L(`Webhook: ${whRes.status} | ${await whRes.text()}`);
    } catch (e: any) {
        L(`Webhook error: ${e.message}`);
    }

    // 2. Tentar via WebSocket - Evolution v2 suporta WebSocket para eventos
    // Mas isso não funciona em HTTP simples. Vamos ao plano B.

    // 3. Tentar o endpoint de QR code image direta (algumas configs da evolution expõem isso)
    L('\n--- QR Code image endpoint ---');
    try {
        const qrRes = await fetch(`${serverUrl}/instance/connect/${instanceId}`, {
            method: 'GET',
            headers: {
                'apikey': apiKey,
                'Accept': 'image/png'
            }
        });
        L(`QR Image: ${qrRes.status} | Content-Type: ${qrRes.headers.get('content-type')} | Size: ${qrRes.headers.get('content-length')}`);
        const buf = await qrRes.arrayBuffer();
        L(`Body size: ${buf.byteLength}`);
        if (buf.byteLength > 100) {
            const b64 = Buffer.from(buf).toString('base64');
            L(`First 100 chars of base64: ${b64.substring(0, 100)}`);
        }
    } catch (e: any) {
        L(`QR Image error: ${e.message}`);
    }

    // 4. v2.1 usa um approach diferente - settings na criação
    L('\n--- Create with webhook for qrcode ---');
    await fetch(`${serverUrl}/instance/logout/${instanceId}`, { method: 'DELETE', headers: { 'apikey': apiKey } }).catch(() => { });
    await fetch(`${serverUrl}/instance/delete/${instanceId}`, { method: 'DELETE', headers: { 'apikey': apiKey } }).catch(() => { });
    await new Promise(r => setTimeout(r, 3000));

    // Criar com qrcode: false (será que retorna qr de outra forma?)
    const createRes = await fetch(`${serverUrl}/instance/create`, {
        method: 'POST',
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            instanceName: instanceId,
            qrcode: false, // talvez o qrcode:true está bugado nessa versão 
            integration: "WHATSAPP-BAILEYS"
        })
    });
    const createData = await createRes.text();
    L(`Create (qrcode:false): ${createRes.status} | ${createData}`);

    await new Promise(r => setTimeout(r, 3000));

    // Agora tenta o connect (sem o qrcode:true na criação, talvez o connect retorne o QR)
    const connRes = await fetch(`${serverUrl}/instance/connect/${instanceId}`, {
        headers: { 'apikey': apiKey }
    });
    const connData = await connRes.text();
    L(`\nConnect after create(qrcode:false): ${connRes.status}`);
    L(connData);

    fs.writeFileSync('debug_wa_output.txt', log.join('\n'), 'utf-8');
    L('\nSaved to debug_wa_output.txt');
}

main().finally(() => prisma.$disconnect());
