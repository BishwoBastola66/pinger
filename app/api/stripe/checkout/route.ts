import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { subscriptions, accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { user } = await validateSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { priceId } = await req.json();

    const [userSub] = await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, user.id)).limit(1);

    if (userSub?.providerSubscriptionId) {
      // If customer exists, redirect to billing portal instead of new checkout
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: userSub.providerSubscriptionId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
      });
      
      return NextResponse.json({ url: stripeSession.url });
    }

    const session = await stripe.checkout.sessions.create({
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      payment_method_types: ['card'],
      mode: 'subscription',
      billing_address_collection: 'auto',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
