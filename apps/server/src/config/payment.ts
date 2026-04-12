import Stripe from 'stripe';
import { env } from './env';
import { logger } from '../utils/logger';

// ─── Stripe Setup ──────────────────────────────────────────
let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    });
  }
  return stripe;
}

// ─── Square Setup ──────────────────────────────────────────
interface SquareClient {
  applicationId: string;
  accessToken: string;
  locationId: string;
  baseUrl: string;
}

let squareClient: SquareClient | null = null;

export function getSquare(): SquareClient {
  if (!squareClient) {
    if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
      throw new Error('Square credentials not configured (SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID)');
    }
    squareClient = {
      applicationId: env.SQUARE_APPLICATION_ID || '',
      accessToken: env.SQUARE_ACCESS_TOKEN,
      locationId: env.SQUARE_LOCATION_ID,
      baseUrl: env.NODE_ENV === 'production'
        ? 'https://connect.squareup.com/v2'
        : 'https://connect.squareupsandbox.com/v2',
    };
  }
  return squareClient;
}

// ─── PayPal Setup ──────────────────────────────────────────
interface PayPalClient {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

let paypalClient: PayPalClient | null = null;

export function getPayPal(): PayPalClient {
  if (!paypalClient) {
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
      throw new Error('PayPal credentials not configured (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)');
    }
    paypalClient = {
      clientId: env.PAYPAL_CLIENT_ID,
      clientSecret: env.PAYPAL_CLIENT_SECRET,
      baseUrl: env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com',
    };
  }
  return paypalClient;
}

// ─── Circuit Breaker ───────────────────────────────────────
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  lastSuccess: number;
  totalRequests: number;
  totalFailures: number;
}

const circuitBreakers: Record<string, CircuitBreakerState> = {};

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT_MS = 30_000;  // 30s before half-open
const WINDOW_MS = 60_000;         // 60s sliding window

export function getCircuitBreaker(service: string): CircuitBreakerState {
  if (!circuitBreakers[service]) {
    circuitBreakers[service] = {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      lastSuccess: 0,
      totalRequests: 0,
      totalFailures: 0,
    };
  }

  const breaker = circuitBreakers[service];
  const now = Date.now();

  // Transition from open → half-open after timeout
  if (breaker.state === 'open' && now - breaker.lastFailure > RESET_TIMEOUT_MS) {
    breaker.state = 'half-open';
    logger.info(`Circuit breaker ${service}: open → half-open`);
  }

  // Reset failure count if window expired
  if (breaker.state === 'closed' && now - breaker.lastFailure > WINDOW_MS) {
    breaker.failures = 0;
  }

  return breaker;
}

export function recordSuccess(service: string): void {
  const breaker = getCircuitBreaker(service);
  breaker.totalRequests++;
  breaker.lastSuccess = Date.now();
  if (breaker.state === 'half-open') {
    breaker.state = 'closed';
    breaker.failures = 0;
    logger.info(`Circuit breaker ${service}: half-open → closed`);
  }
}

export function recordFailure(service: string): void {
  const breaker = getCircuitBreaker(service);
  breaker.failures++;
  breaker.totalFailures++;
  breaker.totalRequests++;
  breaker.lastFailure = Date.now();

  if (breaker.failures >= FAILURE_THRESHOLD) {
    breaker.state = 'open';
    logger.warn(`Circuit breaker ${service}: OPEN after ${breaker.failures} failures`);
  }
}

export function isCircuitOpen(service: string): boolean {
  const breaker = getCircuitBreaker(service);
  return breaker.state === 'open';
}

// ─── Gateway Health Status (for admin dashboard) ──────────
export interface GatewayHealthStatus {
  gateway: string;
  circuitState: 'closed' | 'open' | 'half-open';
  configured: boolean;
  failures: number;
  totalRequests: number;
  totalFailures: number;
  lastSuccess: number;
  lastFailure: number;
  isPrimary: boolean;
  isFallback: boolean;
}

export function getAllGatewayHealth(): GatewayHealthStatus[] {
  const gateways = ['stripe', 'square', 'paypal'];

  return gateways.map((gw) => {
    const breaker = getCircuitBreaker(gw);
    let configured = false;

    if (gw === 'stripe') configured = !!env.STRIPE_SECRET_KEY;
    else if (gw === 'square') configured = !!(env.SQUARE_ACCESS_TOKEN && env.SQUARE_LOCATION_ID);
    else if (gw === 'paypal') configured = !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);

    return {
      gateway: gw,
      circuitState: breaker.state,
      configured,
      failures: breaker.failures,
      totalRequests: breaker.totalRequests,
      totalFailures: breaker.totalFailures,
      lastSuccess: breaker.lastSuccess,
      lastFailure: breaker.lastFailure,
      isPrimary: env.PAYMENT_PRIMARY_GATEWAY === gw,
      isFallback: env.PAYMENT_FALLBACK_GATEWAY === gw || env.PAYMENT_SECONDARY_FALLBACK_GATEWAY === gw,
    };
  });
}

// ─── Payment Gateway Selection (ordered failover chain) ───
function isGatewayConfigured(gw: string): boolean {
  if (gw === 'stripe') return !!env.STRIPE_SECRET_KEY;
  if (gw === 'square') return !!(env.SQUARE_ACCESS_TOKEN && env.SQUARE_LOCATION_ID);
  if (gw === 'paypal') return !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
  return false;
}

export function getGatewayChain(): string[] {
  const chain = [
    env.PAYMENT_PRIMARY_GATEWAY,
    env.PAYMENT_FALLBACK_GATEWAY,
    env.PAYMENT_SECONDARY_FALLBACK_GATEWAY,
  ];

  // De-duplicate and filter to only configured gateways
  return [...new Set(chain)].filter(isGatewayConfigured);
}

export function getActiveGateway(): string {
  const chain = getGatewayChain();

  for (const gw of chain) {
    if (!isCircuitOpen(gw)) return gw;
  }

  if (!env.PAYMENT_AUTO_FAILOVER) {
    return chain[0]; // Force primary even if open when failover disabled
  }

  throw new Error('All payment gateways are unavailable');
}

// ─── Gateway Health Ping (called by cron) ──────────────────
export async function pingGatewayHealth(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  // Stripe health check
  if (env.STRIPE_SECRET_KEY) {
    try {
      const s = getStripe();
      await s.balance.retrieve();
      results.stripe = true;
    } catch {
      results.stripe = false;
    }
  }

  // Square health check (list locations)
  if (env.SQUARE_ACCESS_TOKEN) {
    try {
      const sq = getSquare();
      const res = await fetch(`${sq.baseUrl}/locations`, {
        headers: { Authorization: `Bearer ${sq.accessToken}` },
      });
      results.square = res.ok;
    } catch {
      results.square = false;
    }
  }

  // PayPal health check (get oauth token)
  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET) {
    try {
      const pp = getPayPal();
      const res = await fetch(`${pp.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${pp.clientId}:${pp.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      results.paypal = res.ok;
    } catch {
      results.paypal = false;
    }
  }

  logger.info({ results }, 'Payment gateway health check');
  return results;
}
