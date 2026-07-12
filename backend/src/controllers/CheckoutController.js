// backend/src/controllers/CheckoutController.js
import BaseController from './BaseController.js';
import checkoutService from '../services/CheckoutService.js';

class CheckoutController extends BaseController {

  createCheckoutSession = async (req, res) => {
    try {
      const { items } = req.body;
      const userEmail = req.auth?.email;
      const userId = req.auth?.userId;

      const session = await checkoutService.createCheckoutSession(items, userEmail, userId);
      res.json({ id: session.id, url: session.url });
    } catch (err) {
      console.error('[create checkout session]', err);
      if (err.message === 'Cart is empty') {
        return res.status(400).json({ error: err.message });
      }
      this.handleError(res, err, 'Server error creating checkout session.');
    }
  };

  webhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = checkoutService.constructStripeEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      try {
        await checkoutService.processSuccessfulCheckout(session);
      } catch (error) {
        console.error('Error processing successful checkout:', error);
        // Still return 200 to Stripe so it doesn't retry infinitely
      }
    }

    // Return a 200 response to acknowledge receipt of the event
    res.send();
  };

}

export default new CheckoutController();
