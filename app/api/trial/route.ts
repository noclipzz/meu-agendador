import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { addDays, format } from 'date-fns';
import { Resend } from 'resend';

const prisma = db;
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { userId } = auth();
        const user = await currentUser();

        if (!userId || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = user.emailAddresses[0]?.emailAddress;

        // Verifica se já existe assinatura (qualquer status)
        const existingSub = await prisma.subscription.findUnique({
            where: { userId }
        });

        if (existingSub) {
            // Se já existe e está ativa, retorna sucesso sem fazer nada
            if (existingSub.status === "ACTIVE" && existingSub.expiresAt && new Date(existingSub.expiresAt) > new Date()) {
                return NextResponse.json({ success: true, message: "Você já possui uma assinatura ativa." });
            }
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

        // Envia E-mail de Confirmação
        if (userEmail) {
            try {
                await resend.emails.send({
                    from: 'NOHUD App <nao-responda@nohud.com.br>',
                    to: userEmail,
                    subject: '🚀 Seu período de teste começou!',
                    html: `
                        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h1 style="color: #2563eb;">Bem-vindo ao NOHUD!</h1>
                            <p style="font-size: 16px; line-height: 1.5;">Olá, <strong>${user.firstName}</strong>!</p>
                            <p style="font-size: 16px; line-height: 1.5;">Seu período de teste de <strong>7 dias gratuitos</strong> no plano <strong>MASTER</strong> foi ativado com sucesso.</p>
                            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0; font-weight: bold;">Seu teste expira em: ${format(expiresAt, 'dd/MM/yyyy')}</p>
                            </div>
                            <p>Aproveite para explorar todas as funcionalidades:</p>
                            <ul>
                                <li>Gestão de Agenda e Clientes</li>
                                <li>Controle Financeiro Completo</li>
                                <li>Relatórios Avançados</li>
                                <li>Lembretes Automáticos</li>
                            </ul>
                            <br/>
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://nohud.com.br/painel/dashboard" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Acessar Meu Painel</a>
                            </div>
                        </div>
                    `
                });
            } catch (emailError) {
                console.error("Erro ao enviar email de trial:", emailError);
                // Não falha a requisição se o email falhar
            }
        }

        return NextResponse.json({ success: true, message: "Período de teste ativado com sucesso!" });

    } catch (error: any) {
        console.error("Erro ao ativar trial:", error);
        return NextResponse.json({ error: "Erro interno", details: error.message }, { status: 500 });
    }
}
