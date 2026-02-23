import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { validateCPF, validateEmail } from "@/lib/validators";

const prisma = db;
export const dynamic = "force-dynamic";

async function getCompanyId(userId: string) {
    const companyOwner = await prisma.company.findUnique({
        where: { ownerId: userId },
        select: { id: true }
    });
    if (companyOwner) return companyOwner.id;

    const teamMember = await prisma.teamMember.findFirst({
        where: { clerkUserId: userId },
        select: { companyId: true }
    });
    if (teamMember) return teamMember.companyId;

    const professional = await prisma.professional.findFirst({
        where: { userId },
        select: { companyId: true }
    });
    if (professional) return professional.companyId;

    return null;
}

// POST: IMPORTAR MÚLTIPLOS CLIENTES
export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const companyId = await getCompanyId(userId);
        if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const body = await req.json();
        const { clients } = body; // Espera um array: [{ name, phone, email, ... }, ...]

        if (!clients || !Array.isArray(clients) || clients.length === 0) {
            return NextResponse.json({ error: "Nenhum cliente fornecido para importação." }, { status: 400 });
        }

        let importados = 0;
        let erros = [];

        // Buscando todos os telefones de clientes já cadastrados (para evitar dup)
        const currentClients = await prisma.client.findMany({
            where: { companyId },
            select: { phone: true, email: true }
        });
        const currentPhones = new Set(currentClients.map(c => c.phone).filter(Boolean));
        const currentEmails = new Set(currentClients.map(c => c.email).filter(Boolean));

        const clientsToCreate = [];

        for (const client of clients) {
            // Ignorar sem nome
            if (!client.name || typeof client.name !== 'string' || client.name.trim() === '') {
                erros.push(`Linha ignorada: Faltando nome obrigatório.`);
                continue;
            }

            // Normalização básica
            const phoneStr = client.phone ? String(client.phone).trim() : "";
            const phone = phoneStr === "" ? null : phoneStr;

            const emailStr = client.email ? String(client.email).trim().toLowerCase() : "";
            const email = emailStr === "" ? null : emailStr;

            const cpfStr = client.cpf ? String(client.cpf).trim() : "";
            const cpf = cpfStr === "" ? null : cpfStr;

            if (phone && currentPhones.has(phone)) {
                erros.push(`Cliente ${client.name} ignorado (telefone duplicado: ${phone}).`);
                continue;
            }
            if (email && currentEmails.has(email)) {
                erros.push(`Cliente ${client.name} ignorado (e-mail duplicado: ${email}).`);
                continue;
            }

            if (email && !validateEmail(email)) {
                erros.push(`Cliente ${client.name} ignorado (e-mail inválido: ${email}).`);
                continue;
            }
            if (cpf && !validateCPF(cpf)) {
                erros.push(`Cliente ${client.name} ignorado (CPF inválido: ${cpf}).`);
                continue;
            }

            clientsToCreate.push({
                name: String(client.name).trim(),
                phone: phone,
                email: email,
                clientType: client.clientType === "JURIDICA" ? "JURIDICA" : "FISICA",
                cpf: cpf,
                cnpj: client.cnpj ? String(client.cnpj).trim() : null,
                address: client.address ? String(client.address).trim() : null,
                number: client.number ? String(client.number).trim() : null,
                complement: client.complement ? String(client.complement).trim() : null,
                neighborhood: client.neighborhood ? String(client.neighborhood).trim() : null,
                city: client.city ? String(client.city).trim() : null,
                state: client.state ? String(client.state).trim() : null,
                notes: client.notes ? String(client.notes).trim() : null,
                status: "ATIVO",
                companyId: companyId
            });

            if (phone) currentPhones.add(phone);
            if (email) currentEmails.add(email);
        }

        if (clientsToCreate.length > 0) {
            const result = await prisma.client.createMany({
                data: clientsToCreate,
                skipDuplicates: true
            });
            importados = result.count;
        }

        return NextResponse.json({
            success: true,
            importados,
            erros,
            message: `Importados ${importados} de ${clients.length}. ${erros.length} erros.`
        });
    } catch (error: any) {
        console.error("ERRO_IMPORT_CLIENTES:", error);
        return NextResponse.json({ error: "Erro ao importar clientes", details: error.message }, { status: 500 });
    }
}
