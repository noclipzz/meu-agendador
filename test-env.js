const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Stripe = require('stripe');

async function main() {
    console.log("DB URL:", process.env.DATABASE_URL ? "OK" : "MISSING");
    console.log("STRIPE KEY:", process.env.STRIPE_SECRET_KEY ? "OK" : "MISSING");
    console.log("PRICE INDIVIDUAL:", process.env.STRIPE_PRICE_INDIVIDUAL ? "OK" : "MISSING");

    try {
        await prisma.$connect();
        console.log("✅ Database connection: OK");
    } catch (e) {
        console.log("❌ Database connection: FAILED", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
