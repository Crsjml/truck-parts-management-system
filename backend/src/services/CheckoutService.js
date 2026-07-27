// backend/src/services/CheckoutService.js
import Stripe from 'stripe';
import { prisma } from '../config/prisma.js';
import transactionsRepository from '../repositories/TransactionsRepository.js';

/**
 * Part.price is the wholesale base price; the customer-facing selling price is
 * that value plus the global Setting.active_markup percentage.
 */
export function computeSellingPrice(basePrice, markupPercent) {
  const markup = Number(markupPercent) || 0;
  return Math.round(basePrice * (1 + markup / 100) * 100) / 100;
}

/**
 * PH VAT is 12% and has been since 2006. Shelf prices are VAT-inclusive, so VAT
 * is extracted from the total rather than added to it. Mirrored in
 * frontend/src/utils/posMoney.js; change both together.
 */
const VAT_RATE = 0.12;

class CheckoutService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  async getSettings() {
    const setting = await prisma.setting.findFirst();
    return {
      currency: (setting?.base_currency || 'PHP').toLowerCase(),
      markup: setting?.active_markup || 0,
    };
  }

  async createCheckoutSession(items, userEmail, userId) {
    if (!items || items.length === 0) {
      throw new Error('Cart is empty');
    }

    const { currency, markup } = await this.getSettings();

    // Never trust a client-supplied price. Re-resolve every line from the DB.
    const ids = items.map((i) => i.id || i._id);
    const parts = await prisma.part.findMany({ where: { id: { in: ids } } });
    const partsById = new Map(parts.map((p) => [p.id, p]));

    const pricedItems = items.map((item) => {
      const id = item.id || item._id;
      const part = partsById.get(id);
      if (!part) throw new Error(`Part ${id} not found`);

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error(`Invalid quantity for part ${id}`);
      }

      return {
        id,
        name: part.name,
        sku: part.sku,
        imageUrl: part.imageUrl,
        quantity,
        price: computeSellingPrice(part.price, markup),
      };
    });

    const lineItems = pricedItems.map((item) => ({
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
    }));

    // We store metadata so the webhook knows what to update in the DB
    const metadata = {
      userId: userId || 'N/A',
      userEmail: userEmail || 'customer@example.com',
      cartItems: JSON.stringify(
        pricedItems.map((i) => ({ id: i.id, quantity: i.quantity, price: i.price, name: i.name }))
      ),
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
    const sessionId = session.id;

    // Idempotency check: Ensure we don't process the same session twice
    const existingTransaction = await prisma.transaction.findUnique({
      where: { stripeSessionId: sessionId }
    });

    if (existingTransaction) {
      console.log(`Session ${sessionId} already processed.`);
      return;
    }

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
          stripeSessionId: sessionId,
          subtotal: Math.round((totalAmount / (1 + VAT_RATE)) * 100) / 100,
          taxAmount: Math.round((totalAmount - totalAmount / (1 + VAT_RATE)) * 100) / 100,
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

      // 2. Reserve inventory stock (Deducted upon Completed status)
      for (const item of cartItems) {
        await tx.part.update({
          where: { id: item.id },
          data: { reservedStock: { increment: item.quantity } }
        });
      }
    });

    const paidCurrency = session.metadata.currency || 'PHP';
    console.log(`Successfully processed order for ${session.metadata.userEmail}. Total: ${totalAmount} ${paidCurrency.toUpperCase()}`);
  }
}

export default new CheckoutService();
