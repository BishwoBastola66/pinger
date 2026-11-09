import Stripe from 'stripe';

// Vercel build phase does not inject production secrets. Skip validation during build.
if (!process.env.STRIPE_SECRET_KEY && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('STRIPE_SECRET_KEY is missing');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-08-26.dahlia', // Used current available stripe API version
  appInfo: {
    name: 'Pingr',
    version: '1.0.0',
  },
});
