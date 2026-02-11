const { PrismaClient } = require('@prisma/client');

const urls = [
    "postgresql://neondb_owner:npg_SGXyn7KaYJC5@ep-raspy-dew-ahcfmesi.us-east-1.aws.neon.tech/neondb?sslmode=require",
    "postgresql://neondb_owner:npg_SGXyn7KaYJC5@ep-raspy-dew-ahcfmesi-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require",
    "postgresql://neondb_owner:npg_SGXyn7KaYJC5@ep-raspy-dew-ahcfmesi.us-east-1.aws.neon.tech:5432/neondb?sslmode=require",
    "postgresql://neondb_owner:npg_SGXyn7KaYJC5@ep-raspy-dew-ahcfmesi-pooler.us-east-1.aws.neon.tech:6432/neondb?sslmode=require"
];

async function test(url) {
    console.log(`Testing: ${url}`);
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    const start = Date.now();
    try {
        await prisma.$connect();
        const end = Date.now();
        console.log(`✅ Success in ${end - start}ms`);
        return true;
    } catch (e) {
        console.log(`❌ Failed: ${e.message.split('\n')[0]}`);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    for (const url of urls) {
        await test(url);
        console.log("---");
    }
}

main();
