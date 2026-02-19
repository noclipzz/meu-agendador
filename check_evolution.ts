import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function checkEvolution() {
    const company = await db.company.findFirst({ where: { evolutionServerUrl: { not: null } } });

    if (!company) return;

    const serverUrl = company.evolutionServerUrl.replace(/\/$/, "");
    const instanceId = `${company.slug}-${company.id.slice(0, 4)}`.toLowerCase();

    try {
        const createRes = await fetch(`${serverUrl}/instance/create`, {
            method: 'POST',
            headers: { 'apikey': company.evolutionApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instanceName: instanceId,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
            })
        });
        console.log("Create new:", createRes.status, await createRes.text());
    } catch (e) {
        console.error(e);
    }
}

checkEvolution();
