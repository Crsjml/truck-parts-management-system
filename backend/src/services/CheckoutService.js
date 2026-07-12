// backend/src/services/CheckoutService.js
import Stripe from 'stripe';
import { prisma } from '../config/prisma.js';
import transactionsRepository from '../repositories/TransactionsRepository.js';

class CheckoutService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  async getBaseCurrency() {
    const setting = await prisma.setting.findFirst();
    return (setting?.base_currency || 'PHP').toLowerCase();
  }

  async createCheckoutSession(items, userEmail, userId) {
    if (!items || items.length === 0) {
      throw new Error('Cart is empty');
    }

    const currency = await this.getBaseCurrency();

    // Map cart items to Stripe line_items
    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency,
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
      userId: userId || 'N/A',
      userEmail: userEmail || 'customer@example.com',
      cartItems: JSON.stringify(items.map(i => ({ id: i.id || i._id, quantity: i.quantity, price: i.price, name: i.name }))),
      currency,
    };

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `http://localhost:5173/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/?checkout=canceled`,
      metadata: metadata,
      customer_email: userEmail || undefined,
    });

    return session;
  }

  constructStripeEvent(rawBody, signature, endpointSecret) {
    if (!endpointSecret) {
      // In development without a configured webhook secret, just parse the JSON
      return JSON.parse(rawBody.toString());
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  }

  async processSuccessfulCheckout(session) {
    const cartItems = JSON.parse(session.metadata.cartItems);
    const totalAmount = session.amount_total / 100;
    
    await transactionsRepository.executeTransaction(async (tx) => {
      // 1. Create a transaction
      await tx.transaction.create({
        data: {
          invoiceNumber: `WEB-${Date.now()}`,
          customerName: session.metadata.userEmail,
          customerContact: session.metadata.userId,
          userId: session.metadata.userId !== 'N/A' ? session.metadata.userId : null,
          subtotal: totalAmount,
          taxAmount: 0,
          total: totalAmount,
          items: {
            create: cartItems.map(item => ({
              partId: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.price
            }))
          }
        }
      });

      // 2. Deduct inventory stock
      for (const item of cartItems) {
        await tx.part.update({
          where: { id: item.id },
          data: { stock: { decrement: item.quantity } }
        });
      }
    });

    const paidCurrency = session.metadata.currency || 'PHP';
    console.log(`Successfully processed order for ${session.metadata.userEmail}. Total: ${totalAmount} ${paidCurrency.toUpperCase()}`);
  }
}

export default new CheckoutService();
