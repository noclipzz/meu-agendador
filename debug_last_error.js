
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLastError() {
    const logs = await prisma.integrationLog.findMany({
        where: { service: "EVOLUTION", status: "ERROR" },
        orderBy: { createdAt: 'desc' },
        take: 1
    });

    if (logs.length === 0) {
        console.log("No error logs.");
        return;
    }

    const log = logs[0];
    console.log(`Log ID: ${log.id}`);
    console.log(`Time: ${log.createdAt.toISOString()}`);
    console.log(`Error: ${log.errorMessage}`);
    console.log(`Payload: ${JSON.stringify(log.payload, null, 2)}`);
}

checkLastError()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
