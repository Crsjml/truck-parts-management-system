import express from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/authMiddleware.js';
import Transaction from '../models/Transaction.js';
import Part from '../models/Part.js';

const router = express.Router();
// We use a dummy test key if not provided in env, since we are strictly testing.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_testing');

router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Map cart items to Stripe line_items
    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: `SKU: ${item.sku}`,
            images: item.imageUrl ? [item.imageUrl] : [],
          },
          unit_amount: Math.round(item.price * 100), // Stripe expects cents
        },
        quantity: item.quantity,
      };
    });

    // We store metadata so the webhook knows what to update in the DB
    const metadata = {
      userId: req.auth.userId,
      userEmail: req.auth.email || 'customer@example.com',
      cartItems: JSON.stringify(items.map(i => ({ id: i.id || i._id, quantity: i.quantity, price: i.price, name: i.name }))),
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `http://localhost:5173/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/?checkout=canceled`,
      metadata: metadata,
      customer_email: req.auth.email, // prefill email if available
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint needs raw body
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (endpointSecret) {
      // In production, verify the signature
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      // In development without a configured webhook secret, just parse the JSON
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      const cartItems = JSON.parse(session.metadata.cartItems);
      const totalAmount = session.amount_total / 100;
      
      // 1. Create a transaction
      const newTransaction = new Transaction({
        customer: session.metadata.userEmail,
        type: 'Sale',
        amount: totalAmount,
        status: 'Completed',
        parts: cartItems.map(item => ({
          partId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
      });
      await newTransaction.save();

      // 2. Deduct inventory stock
      for (const item of cartItems) {
        await Part.findByIdAndUpdate(item.id, {
          $inc: { stock: -item.quantity }
        });
      }

      console.log(`Successfully processed order for ${session.metadata.userEmail}. Total: $${totalAmount}`);
    } catch (error) {
      console.error('Error processing successful checkout:', error);
      // Still return 200 to Stripe so it doesn't retry infinitely
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

export default router;
