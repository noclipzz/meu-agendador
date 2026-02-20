import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst({ where: { slug: 'nohud' } });
    if (!company) { console.log('Company not found'); return; }

    const serverUrl = company.evolutionServerUrl!.replace(/\/$/, "");
    const apiKey = company.evolutionApiKey!;
    const instanceId = company.whatsappInstanceId || "nohud-cmkv";

    console.log(`Checking instance: ${instanceId}`);
    try {
        const res = await fetch(`${serverUrl}/instance/fetchInstances?instanceName=${instanceId}`, {
            headers: { 'apikey': apiKey }
        });
        const data = await res.json();
        console.log('Instances:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error fetching instances:', e);
    }
}

main().finally(() => prisma.$disconnect());
