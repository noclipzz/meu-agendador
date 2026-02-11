const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_SGXyn7KaYJC5@ep-raspy-dew-ahcfmesi.us-east-1.aws.neon.tech/neondb?sslmode=require"
        },
    },
});

async function main() {
    try {
        await prisma.$connect();
        console.log("✅ Direct Database connection: OK");
        const count = await prisma.subscription.count();
        console.log("Count:", count);
    } catch (e) {
        console.log("❌ Direct Database connection: FAILED", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
