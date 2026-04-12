import {
  getStripe, getSquare, getPayPal,
  getGatewayChain, isCircuitOpen,
  recordSuccess, recordFailure,
} from '../config/payment';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { User } from '../models/User';
import { SavedPaymentMethod } from '../models/SavedPaymentMethod';

// ─── Types ─────────────────────────────────────────────────
export interface PaymentResult {
  success: boolean;
  gateway: string;
  transactionId?: string;
  clientSecret?: string;
  approvalUrl?: string; // PayPal redirect
  error?: string;
  failoverAttempts?: { gateway: string; status: string; timestamp: string }[];
}

export interface PaymentOptions {
  saveCard?: boolean;
  savedPaymentMethodId?: string;
  userId?: string;
}

interface GatewayError extends Error {
  statusCode?: number;
  type?: string;
}

// ─── Failover Logic ────────────────────────────────────────
// Only failover on gateway errors (5xx, timeout, network)
// Do NOT failover on card declines (4xx from payment processor)
function isGatewayError(error: unknown): boolean {
  const err = error as GatewayError;

  // Stripe: decline errors have type 'StripeCardError'
  if (err.type === 'StripeCardError') return false;

  // HTTP 4xx from the card/payment = user error, not gateway error
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) return false;

  // Everything else (5xx, timeouts, network, unknown) = gateway error
  return true;
}

// ─── Gateway Customer Management ──────────────────────────
async function getOrCreateGatewayCustomer(
  userId: string,
  gateway: string,
): Promise<string | null> {
  const user = await User.findById(userId);
  if (!user) return null;

  const existingId = user.gatewayCustomerIds?.[gateway as keyof typeof user.gatewayCustomerIds];
  if (existingId) return existingId;

  try {
    let customerId: string | null = null;

    switch (gateway) {
      case 'stripe': {
        const stripe = getStripe();
        const customer = await stripe.customers.create({
          name: user.name || undefined,
          phone: user.phone,
          email: user.email || undefined,
          metadata: { userId: user._id.toString() },
        });
        customerId = customer.id;
        break;
      }
      case 'square': {
        const square = getSquare();
        const response = await fetch(`${square.baseUrl}/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${square.accessToken}`,
            'Square-Version': '2024-11-20',
          },
          body: JSON.stringify({
            idempotency_key: `cust-${userId}-${Date.now()}`,
            given_name: user.name?.split(' ')[0] || undefined,
            family_name: user.name?.split(' ').slice(1).join(' ') || undefined,
            phone_number: user.phone,
            email_address: user.email || undefined,
            reference_id: userId,
          }),
        });
        if (response.ok) {
          const data = await response.json() as any;
          customerId = data.customer?.id;
        }
        break;
      }
      case 'paypal': {
        // PayPal uses vault tokens, no separate customer creation needed
        // The customer ID in PayPal context is the vault approval token
        return null;
      }
    }

    if (customerId) {
      await User.findByIdAndUpdate(userId, {
        [`gatewayCustomerIds.${gateway}`]: customerId,
      });
    }

    return customerId;
  } catch (error) {
    logger.error({ err: error }, `Failed to create ${gateway} customer for user ${userId}`);
    return null;
  }
}

// ─── Save Payment Method After Successful Payment ─────────
export async function savePaymentMethodFromIntent(
  userId: string,
  gateway: string,
  paymentIntentId: string,
): Promise<void> {
  try {
    switch (gateway) {
      case 'stripe': {
        const stripe = getStripe();
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        const pmId = typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id;
        if (!pmId) return;

        const pm = await stripe.paymentMethods.retrieve(pmId);

        // Check if already saved
        const existing = await SavedPaymentMethod.findOne({
          userId,
          gatewayPaymentMethodId: pmId,
        });
        if (existing) return;

        const isFirst = (await SavedPaymentMethod.countDocuments({ userId })) === 0;

        await SavedPaymentMethod.create({
          userId,
          gateway: 'stripe',
          gatewayPaymentMethodId: pmId,
          type: 'card',
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4 || '',
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          } : undefined,
          isDefault: isFirst,
        });

        logger.info(`Saved Stripe card ***${pm.card?.last4} for user ${userId}`);
        break;
      }
      case 'square': {
        // Square card-on-file is created via a separate Cards API call
        // after payment, using the customer ID
        const user = await User.findById(userId);
        const squareCustomerId = user?.gatewayCustomerIds?.square;
        if (!squareCustomerId) return;

        const square = getSquare();
        // Get payment details to extract card nonce
        const payResp = await fetch(`${square.baseUrl}/payments/${paymentIntentId}`, {
          headers: {
            Authorization: `Bearer ${square.accessToken}`,
            'Square-Version': '2024-11-20',
          },
        });
        if (!payResp.ok) return;

        const payData = await payResp.json() as any;
        const cardDetails = payData.payment?.card_details;
        if (!cardDetails) return;

        const existing = await SavedPaymentMethod.findOne({
          userId,
          gateway: 'square',
          'card.last4': cardDetails.card?.last_4,
        });
        if (existing) return;

        const isFirst = (await SavedPaymentMethod.countDocuments({ userId })) === 0;

        // Create card on file
        const cardResp = await fetch(`${square.baseUrl}/cards`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${square.accessToken}`,
            'Square-Version': '2024-11-20',
          },
          body: JSON.stringify({
            idempotency_key: `card-${userId}-${Date.now()}`,
            source_id: paymentIntentId,
            customer_id: squareCustomerId,
          }),
        });

        if (cardResp.ok) {
          const cardData = await cardResp.json() as any;
          await SavedPaymentMethod.create({
            userId,
            gateway: 'square',
            gatewayPaymentMethodId: cardData.card?.id || paymentIntentId,
            type: 'card',
            card: {
              brand: cardDetails.card?.card_brand || 'unknown',
              last4: cardDetails.card?.last_4 || '',
              expMonth: cardDetails.card?.exp_month || 0,
              expYear: cardDetails.card?.exp_year || 0,
            },
            isDefault: isFirst,
          });
          logger.info(`Saved Square card ***${cardDetails.card?.last_4} for user ${userId}`);
        }
        break;
      }
    }
  } catch (error) {
    logger.error({ err: error }, `Failed to save payment method for user ${userId}`);
  }
}

// ─── List Saved Payment Methods ───────────────────────────
export async function listSavedPaymentMethods(userId: string) {
  return SavedPaymentMethod.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
}

// ─── Delete Saved Payment Method ──────────────────────────
export async function deleteSavedPaymentMethod(
  userId: string,
  savedMethodId: string,
): Promise<boolean> {
  const method = await SavedPaymentMethod.findOne({ _id: savedMethodId, userId });
  if (!method) return false;

  try {
    // Detach from gateway
    switch (method.gateway) {
      case 'stripe': {
        const stripe = getStripe();
        await stripe.paymentMethods.detach(method.gatewayPaymentMethodId);
        break;
      }
      case 'square': {
        const square = getSquare();
        await fetch(`${square.baseUrl}/cards/${method.gatewayPaymentMethodId}/disable`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${square.accessToken}`,
            'Square-Version': '2024-11-20',
          },
        });
        break;
      }
    }
  } catch (error) {
    logger.warn({ err: error }, `Failed to detach payment method from ${method.gateway}`);
  }

  await SavedPaymentMethod.deleteOne({ _id: savedMethodId });

  // If deleted was default, make another one default
  if (method.isDefault) {
    const next = await SavedPaymentMethod.findOne({ userId }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }

  return true;
}

// ─── Set Default Payment Method ───────────────────────────
export async function setDefaultPaymentMethod(
  userId: string,
  savedMethodId: string,
): Promise<boolean> {
  const method = await SavedPaymentMethod.findOne({ _id: savedMethodId, userId });
  if (!method) return false;

  await SavedPaymentMethod.updateMany({ userId }, { isDefault: false });
  method.isDefault = true;
  await method.save();
  return true;
}

// ─── Main Payment Flow ────────────────────────────────────
export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  metadata: Record<string, string> = {},
  options: PaymentOptions = {},
): Promise<PaymentResult> {
  const chain = getGatewayChain();
  const failoverAttempts: { gateway: string; status: string; timestamp: string }[] = [];

  if (chain.length === 0) {
    logger.error('No payment gateways configured — check STRIPE_SECRET_KEY, SQUARE_ACCESS_TOKEN/LOCATION_ID, PAYPAL_CLIENT_ID/SECRET env vars');
    return {
      success: false,
      gateway: 'none',
      error: 'No payment gateways are configured. Please contact support.',
      failoverAttempts: [],
    };
  }

  let lastError = '';

  for (const gateway of chain) {
    // Skip gateways with open circuits
    if (isCircuitOpen(gateway) && env.PAYMENT_AUTO_FAILOVER) {
      failoverAttempts.push({ gateway, status: 'skipped_circuit_open', timestamp: new Date().toISOString() });
      continue;
    }

    try {
      let result: PaymentResult;

      switch (gateway) {
        case 'stripe':
          result = await createStripePaymentIntent(amount, currency, metadata, options);
          break;
        case 'square':
          result = await createSquarePayment(amount, currency, metadata, options);
          break;
        case 'paypal':
          result = await createPayPalOrder(amount, currency, metadata);
          break;
        default:
          throw new Error(`Unsupported gateway: ${gateway}`);
      }

      failoverAttempts.push({ gateway, status: 'succeeded', timestamp: new Date().toISOString() });

      return { ...result, failoverAttempts };
    } catch (error) {
      lastError = (error as Error).message || 'Unknown error';
      recordFailure(gateway);
      failoverAttempts.push({ gateway, status: 'failed', timestamp: new Date().toISOString() });

      // If it's a card decline (not a gateway error), don't try other gateways
      if (!isGatewayError(error)) {
        logger.warn({ err: error }, `Card declined on ${gateway} — not failing over`);
        return {
          success: false,
          gateway,
          error: (error as Error).message || 'Payment declined by your card issuer.',
          failoverAttempts,
        };
      }

      logger.error({ err: error }, `Gateway error on ${gateway} — attempting failover`);

      // If failover is disabled, stop here
      if (!env.PAYMENT_AUTO_FAILOVER) break;
    }
  }

  // All gateways failed
  logger.error({ failoverAttempts }, 'All payment gateways failed');

  return {
    success: false,
    gateway: chain[0] || 'none',
    error: `Payment failed: ${lastError || 'All payment gateways are currently unavailable.'}`,
    failoverAttempts,
  };
}

// ─── Stripe ────────────────────────────────────────────────
async function createStripePaymentIntent(
  amount: number,
  currency: string,
  metadata: Record<string, string>,
  options: PaymentOptions = {},
): Promise<PaymentResult> {
  const stripe = getStripe();

  const intentParams: Record<string, unknown> = {
    amount: Math.round(amount * 100), // Stripe uses cents
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  };

  // If user wants to save card or use a saved card, attach a Stripe Customer
  if (options.userId && (options.saveCard || options.savedPaymentMethodId)) {
    const customerId = await getOrCreateGatewayCustomer(options.userId, 'stripe');
    if (customerId) {
      intentParams.customer = customerId;
    }
  }

  // Save card for future use
  if (options.saveCard) {
    intentParams.setup_future_usage = 'off_session';
  }

  // Use a previously saved payment method
  if (options.savedPaymentMethodId) {
    const saved = await SavedPaymentMethod.findById(options.savedPaymentMethodId);
    if (saved && saved.gateway === 'stripe') {
      intentParams.payment_method = saved.gatewayPaymentMethodId;
    }
  }

  const paymentIntent = await stripe.paymentIntents.create(intentParams as any);

  recordSuccess('stripe');

  return {
    success: true,
    gateway: 'stripe',
    transactionId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret || undefined,
  };
}

// ─── Square ────────────────────────────────────────────────
async function createSquarePayment(
  amount: number,
  currency: string,
  metadata: Record<string, string>,
  options: PaymentOptions = {},
): Promise<PaymentResult> {
  const square = getSquare();
  const idempotencyKey = `lnb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const paymentBody: Record<string, unknown> = {
    idempotency_key: idempotencyKey,
    amount_money: {
      amount: Math.round(amount * 100), // Square uses cents
      currency: currency.toUpperCase(),
    },
    location_id: square.locationId,
    autocomplete: false, // We'll complete after confirmation
    note: metadata.orderNumber ? `Order ${metadata.orderNumber}` : undefined,
    reference_id: metadata.orderId,
  };

  // Attach Square customer if saving card
  if (options.userId && options.saveCard) {
    const customerId = await getOrCreateGatewayCustomer(options.userId, 'square');
    if (customerId) {
      paymentBody.customer_id = customerId;
    }
  }

  // Use a saved card on file
  if (options.savedPaymentMethodId) {
    const saved = await SavedPaymentMethod.findById(options.savedPaymentMethodId);
    if (saved && saved.gateway === 'square') {
      paymentBody.source_id = saved.gatewayPaymentMethodId;
      const user = await User.findById(options.userId);
      if (user?.gatewayCustomerIds?.square) {
        paymentBody.customer_id = user.gatewayCustomerIds.square;
      }
    }
  }

  const response = await fetch(`${square.baseUrl}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${square.accessToken}`,
      'Square-Version': '2024-11-20',
    },
    body: JSON.stringify(paymentBody),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as any;
    const err = new Error(body.errors?.[0]?.detail || `Square error ${response.status}`) as GatewayError;
    err.statusCode = response.status;
    throw err;
  }

  const data = await response.json() as any;
  recordSuccess('square');

  return {
    success: true,
    gateway: 'square',
    transactionId: data.payment?.id,
  };
}

// ─── PayPal ────────────────────────────────────────────────
async function getPayPalAccessToken(): Promise<string> {
  const pp = getPayPal();
  const response = await fetch(`${pp.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${pp.clientId}:${pp.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${response.status}`);
  }

  const data = await response.json() as any;
  return data.access_token;
}

async function createPayPalOrder(
  amount: number,
  currency: string,
  metadata: Record<string, string>
): Promise<PaymentResult> {
  const accessToken = await getPayPalAccessToken();
  const pp = getPayPal();

  const response = await fetch(`${pp.baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2),
          },
          reference_id: metadata.orderId,
          description: metadata.orderNumber ? `LoadNBehold Order ${metadata.orderNumber}` : 'LoadNBehold Laundry',
        },
      ],
      application_context: {
        brand_name: 'LoadNBehold',
        return_url: `${env.CORS_ALLOWED_ORIGINS.split(',')[0]}/payment/success`,
        cancel_url: `${env.CORS_ALLOWED_ORIGINS.split(',')[0]}/payment/cancel`,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as any;
    const err = new Error(body.message || `PayPal error ${response.status}`) as GatewayError;
    err.statusCode = response.status;
    throw err;
  }

  const data = await response.json() as any;
  recordSuccess('paypal');

  const approvalLink = data.links?.find((l: { rel: string; href: string }) => l.rel === 'approve');

  return {
    success: true,
    gateway: 'paypal',
    transactionId: data.id,
    approvalUrl: approvalLink?.href,
  };
}

// ─── Refund (multi-gateway) ────────────────────────────────
export async function processRefund(
  transactionId: string,
  amount?: number,
  gateway: string = 'stripe'
): Promise<PaymentResult> {
  try {
    switch (gateway) {
      case 'stripe': {
        const stripe = getStripe();
        const refund = await stripe.refunds.create({
          payment_intent: transactionId,
          ...(amount ? { amount: Math.round(amount * 100) } : {}),
        });
        return { success: true, gateway: 'stripe', transactionId: refund.id };
      }

      case 'square': {
        const square = getSquare();
        const idempotencyKey = `refund-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const response = await fetch(`${square.baseUrl}/refunds`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${square.accessToken}`,
            'Square-Version': '2024-11-20',
          },
          body: JSON.stringify({
            idempotency_key: idempotencyKey,
            payment_id: transactionId,
            amount_money: amount
              ? { amount: Math.round(amount * 100), currency: 'USD' }
              : undefined,
            reason: 'Customer refund via LoadNBehold',
          }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({})) as any;
          throw new Error(body.errors?.[0]?.detail || `Square refund error ${response.status}`);
        }
        const data = await response.json() as any;
        return { success: true, gateway: 'square', transactionId: data.refund?.id };
      }

      case 'paypal': {
        const accessToken = await getPayPalAccessToken();
        const pp = getPayPal();
        const response = await fetch(`${pp.baseUrl}/v2/payments/captures/${transactionId}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(
            amount ? { amount: { value: amount.toFixed(2), currency_code: 'USD' } } : {}
          ),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({})) as any;
          throw new Error(body.message || `PayPal refund error ${response.status}`);
        }
        const data = await response.json() as any;
        return { success: true, gateway: 'paypal', transactionId: data.id };
      }

      default:
        throw new Error(`Unsupported refund gateway: ${gateway}`);
    }
  } catch (error) {
    logger.error({ err: error }, `Refund failed on ${gateway}`);
    return { success: false, gateway, error: 'Refund processing failed.' };
  }
}

// ─── Capture PayPal Order (after customer approves) ────────
export async function capturePayPalOrder(paypalOrderId: string): Promise<PaymentResult> {
  try {
    const accessToken = await getPayPalAccessToken();
    const pp = getPayPal();

    const response = await fetch(`${pp.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as any;
      throw new Error(body.message || `PayPal capture error ${response.status}`);
    }

    const data = await response.json() as any;
    const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    return {
      success: true,
      gateway: 'paypal',
      transactionId: captureId || paypalOrderId,
    };
  } catch (error) {
    logger.error({ err: error }, 'PayPal capture failed');
    return { success: false, gateway: 'paypal', error: 'PayPal payment capture failed.' };
  }
}

// ─── Complete Square Payment ───────────────────────────────
export async function completeSquarePayment(paymentId: string): Promise<PaymentResult> {
  try {
    const square = getSquare();
    const response = await fetch(`${square.baseUrl}/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${square.accessToken}`,
        'Square-Version': '2024-11-20',
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as any;
      throw new Error(body.errors?.[0]?.detail || `Square complete error ${response.status}`);
    }

    return { success: true, gateway: 'square', transactionId: paymentId };
  } catch (error) {
    logger.error({ err: error }, 'Square payment completion failed');
    return { success: false, gateway: 'square', error: 'Square payment completion failed.' };
  }
}
