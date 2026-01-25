import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed.", error);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  // --- LÓGICA DE ATUALIZAÇÃO ---

  // QUANDO O PAGAMENTO É CONFIRMADO (Cria ou Renova)
  if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
    const session = event.data.object as any;
    const subscriptionId = session.subscription as string;
    
    // Pega os detalhes completos da assinatura no Stripe
    const subscriptionDetails = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Tenta achar o userId pelo metadata
    let userId = session.metadata?.clerkUserId;

    if (!userId) {
        // Se não achar, busca pelo ID do cliente no nosso banco
        const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;
        userId = customer.metadata.clerkUserId;
    }

    if (userId) {
        await prisma.subscription.update({
            where: { userId: userId },
            data: {
                stripeSubscriptionId: subscriptionId,
                status: "ACTIVE", // Ativa a conta
                plan: session.metadata?.plan || undefined,
                expiresAt: new Date(subscriptionDetails.current_period_end * 1000)
            }
        });
        console.log(`✅ Assinatura ATIVADA para usuário: ${userId}`);
    }
  }

  // QUANDO O CLIENTE CANCELA OU O PAGAMENTO FALHA (O MAIS IMPORTANTE)
  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      
      // Se o status no Stripe não for mais 'active' (pode ser 'canceled', 'unpaid', etc)
      if (subscription.status !== 'active') {
          // Acha a assinatura no nosso banco pelo ID da assinatura do Stripe
          const dbSub = await prisma.subscription.findFirst({ 
              where: { stripeSubscriptionId: subscription.id }
          });
          
          if(dbSub) {
              await prisma.subscription.update({
                  where: { id: dbSub.id },
                  data: { 
                      status: "CANCELED" // Marca como cancelado
                  }
              });
              console.log(`❌ Assinatura CANCELADA para usuário: ${dbSub.userId}`);
          }
      }
  }

  return new NextResponse(null, { status: 200 });
}