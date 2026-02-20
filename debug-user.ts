import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const userId = 'user_39S9qNrKwwgObMZffifdZyNKUKm';
async function run() {
    const company = await db.company.findUnique({ where: { ownerId: userId } });
    const professional = await db.professional.findUnique({ where: { userId }, include: { company: true } });
    const member = await db.teamMember.findUnique({ where: { clerkUserId: userId } });

    console.log('Is Owner:', !!company);
    console.log('Is Prof:', !!professional);
    if (member) console.log('Member Role:', member.role);
}
run().finally(() => db.$disconnect());
