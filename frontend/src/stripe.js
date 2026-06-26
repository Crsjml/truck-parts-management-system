import { loadStripe } from '@stripe/stripe-js';

// We use a dummy test key if it's not provided in the .env, since we are strictly testing.
// Make sure to replace this with your actual Stripe publishable test key.
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');
