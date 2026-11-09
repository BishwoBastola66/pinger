import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { payments, plans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { processSubscriptionUpdate } from '@/lib/payments/provider';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.client_reference_id) {
          const userId = session.client_reference_id;
          const stripeCustomerId = session.customer as string;
          const stripeSubscriptionId = session.subscription as string;
          
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;
          const priceId = subscription.items.data[0].price.id;

          const [plan] = await db.select().from(plans).where(eq(plans.providerPlanId, priceId)).limit(1);

          // Record payment transaction (with idempotency via providerPaymentId)
          try {
            await db.insert(payments).values({
              workspaceId: userId,
              planId: plan?.id,
              amount: ((session.amount_total || 0) / 100).toFixed(2),
              currency: (session.currency || 'USD').toUpperCase(),
              provider: 'stripe',
              providerPaymentId: session.id,
              status: 'succeeded',
            });
          } catch (err: any) {
            const isDuplicate =
              (err.cause?.code === '23505') ||
              err.message?.includes('unique constraint') ||
              err.message?.includes('duplicate key');
            if (isDuplicate) {
              console.log(`Idempotency hit: skipping duplicate payment event ${session.id}`);
              return NextResponse.json({ received: true, skipped: true });
            }
            throw err;
          }

          await processSubscriptionUpdate(userId, {
            provider: 'stripe',
            providerCustomerId: stripeCustomerId,
            providerSubscriptionId: stripeSubscriptionId,
            providerPlanId: priceId,
            status: subscription.status,
            startDate: subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : new Date(),
            endDate: new Date(subscription.current_period_end * 1000),
          });
        }
        break;
      }
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const stripeCustomerId = subscription.customer as string;
        const stripeSubscriptionId = subscription.id as string;
        
        const priceId = subscription.items.data[0].price.id;

        await processSubscriptionUpdate(null, {
          provider: 'stripe',
          providerCustomerId: stripeCustomerId,
          providerSubscriptionId: stripeSubscriptionId,
          providerPlanId: priceId,
          status: subscription.status,
          endDate: new Date(subscription.current_period_end * 1000),
        });
        
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`Webhook handler failed: ${err.message}`);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
