import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { addDays } from 'date-fns';

const prisma = db;

export async function POST(req: Request) {
    try {
        const { userId } = auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verifica se já existe assinatura (qualquer status)
        const existingSub = await prisma.subscription.findUnique({
            where: { userId }
        });

        if (existingSub) {
            // Se já existe e está ativa, retorna sucesso sem fazer nada
            if (existingSub.status === "ACTIVE" && existingSub.expiresAt && new Date(existingSub.expiresAt) > new Date()) {
                return NextResponse.json({ success: true, message: "Você já possui uma assinatura ativa." });
            }
            // Se existe mas não é ativa, poderiamos reativar como trial? 
            // Geralmente trial é só uma vez. Vamos assumir que se já tem registro, já usou trial ou já pagou.
            // Mas para facilitar testes e evitar frustração de quem clicou sem querer e cancelou, 
            // vamos permitir APENAS se não tiver stripeCustomerId (significando que nunca pagou via Stripe)
            // e se o trial anterior já expirou há muito tempo?

            // Simplificação: Se já tem registro, bloqueia trial. O usuário deve escolher um plano.
            return NextResponse.json({ error: "Trial já utilizado ou assinatura existente.", code: "TRIAL_USED" }, { status: 400 });
        }

        // Cria assinatura de Trial de 7 dias
        const expiresAt = addDays(new Date(), 7);

        await prisma.subscription.create({
            data: {
                userId,
                plan: "MASTER", // Dá gosto do plano completo
                status: "ACTIVE",
                stripeSubscriptionId: "TRIAL_PERIOD", // Marcador para saber que é trial
                stripeCustomerId: "TRIAL_USER",
                expiresAt: expiresAt
            }
        });

        return NextResponse.json({ success: true, message: "Período de teste ativado com sucesso!" });

    } catch (error: any) {
        console.error("Erro ao ativar trial:", error);
        return NextResponse.json({ error: "Erro interno", details: error.message }, { status: 500 });
    }
}
