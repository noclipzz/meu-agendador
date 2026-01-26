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
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    console.error("Webhook signature verification failed.");
    return new NextResponse("Webhook Error", { status: 400 });
  }

  // 1. PAGAMENTO APROVADO (Cria ou Renova)
  if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
    const session = event.data.object as any;
    const subscriptionId = session.subscription as string;
    
    if (!subscriptionId) return new NextResponse(null, { status: 200 });

    const subscriptionDetails = await stripe.subscriptions.retrieve(subscriptionId);
    
    // CORREÇÃO: Buscando 'userId' (mesmo nome enviado no metadata do checkout)
    let userId = session.metadata?.userId;

    if (!userId && session.customer) {
        const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;
        userId = customer.metadata.userId;
    }

    if (userId) {
        await prisma.subscription.update({
            where: { userId: userId },
            data: {
                stripeSubscriptionId: subscriptionId,
                stripeCustomerId: session.customer as string,
                status: "ACTIVE",
                plan: session.metadata?.plan || undefined,
                expiresAt: new Date(subscriptionDetails.current_period_end * 1000)
            }
        });
        console.log(`✅ Assinatura ATIVADA: ${userId}`);
    }
  }

  // 2. CANCELAMENTO OU FALHA
  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      
      if (subscription.status !== 'active') {
          const dbSub = await prisma.subscription.findFirst({ 
              where: { stripeSubscriptionId: subscription.id }
          });
          
          if(dbSub) {
              await prisma.subscription.update({
                  where: { id: dbSub.id },
                  data: { status: "CANCELED" }
              });
              console.log(`❌ Assinatura CANCELADA: ${dbSub.userId}`);
          }
      }
  }

  return new NextResponse(null, { status: 200 });
}