import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

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
    return new NextResponse("Webhook Error", { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // 1. QUANDO O PAGAMENTO É CONFIRMADO OU RENOVADO
  if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
    
    const subscriptionId = session.subscription as string;
    
    // Recupera detalhes da assinatura no Stripe para saber a validade
    const subscriptionDetails = await stripe.subscriptions.retrieve(subscriptionId);
    
    // A mágica: userId vem do metadata que enviamos no checkout
    // Se for invoice.payment_succeeded, o metadata pode estar no customer
    let userId = session.metadata?.userId;

    if(!userId) {
        // Tenta buscar pelo customer id no nosso banco se não vier no metadata
        const dbSub = await prisma.subscription.findFirst({ where: { stripeCustomerId: session.customer as string }});
        userId = dbSub?.userId;
    }

    if (userId) {
        await prisma.subscription.update({
            where: { userId: userId },
            data: {
                stripeSubscriptionId: subscriptionId,
                status: "ACTIVE",
                plan: session.metadata?.plan || undefined, // Atualiza plano se disponível
                // Define a validade baseada no Stripe (fim do período atual)
                expiresAt: new Date(subscriptionDetails.current_period_end * 1000)
            }
        });
    }
  }

  // 2. QUANDO O CLIENTE CANCELA OU O PAGAMENTO FALHA
  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      
      // Se status não for active, bloqueia no banco
      if (subscription.status !== 'active') {
          const dbSub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscription.id }});
          if(dbSub) {
              await prisma.subscription.update({
                  where: { id: dbSub.id },
                  data: { status: subscription.status } // ex: 'canceled', 'unpaid'
              });
          }
      }
  }

  return new NextResponse(null, { status: 200 });
}