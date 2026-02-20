
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function run() {
    const teamMembers = await db.teamMember.findMany();
    console.log('All TeamMembers:', JSON.stringify(teamMembers, null, 2));

    const professionals = await db.professional.findMany();
    console.log('All Professionals:', JSON.stringify(professionals.map(p => ({ id: p.id, name: p.name, userId: p.userId, companyId: p.companyId })), null, 2));

    const companies = await db.company.findMany();
    console.log('All Companies:', JSON.stringify(companies.map(c => ({ id: c.id, name: c.name, ownerId: c.ownerId })), null, 2));
}
run().finally(() => db.$disconnect());
