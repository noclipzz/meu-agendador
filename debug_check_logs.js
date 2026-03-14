
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLogs() {
    console.log("Checking integration logs for EVOLUTION...");
    const logs = await prisma.integrationLog.findMany({
        where: { service: "EVOLUTION" },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    if (logs.length === 0) {
        console.log("No logs found.");
        return;
    }

    logs.forEach(log => {
        console.log(`[${log.type}] ${log.createdAt.toISOString()} - Status: ${log.status}`);
        if (log.status === 'ERROR') console.log(`  Error: ${log.errorMessage}`);
        console.log(`  Payload: ${JSON.stringify(log.payload).substring(0, 100)}...`);
    });
}

checkLogs()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
