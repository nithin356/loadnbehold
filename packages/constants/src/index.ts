// ─── Order Status Flow ─────────────────────────────────────
export const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'driver_assigned',
  'pickup_enroute',
  'picked_up',
  'at_laundry',
  'processing',
  'quality_check',
  'ready_for_delivery',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  driver_assigned: 'Driver Assigned',
  pickup_enroute: 'Pickup En Route',
  picked_up: 'Picked Up',
  at_laundry: 'At Laundry',
  processing: 'Processing',
  quality_check: 'Quality Check',
  ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_BADGE_VARIANT: Record<string, string> = {
  placed: 'info',
  confirmed: 'info',
  driver_assigned: 'info',
  pickup_enroute: 'warning',
  picked_up: 'warning',
  at_laundry: 'neutral',
  processing: 'neutral',
  quality_check: 'neutral',
  ready_for_delivery: 'info',
  out_for_delivery: 'warning',
  delivered: 'success',
  cancelled: 'error',
};

// Statuses that allow cancellation
export const CANCELLABLE_STATUSES = ['placed', 'driver_assigned', 'pickup_enroute'] as const;

// ─── Service Types ─────────────────────────────────────────
export const SERVICES = [
  { key: 'wash_fold', label: 'Wash & Fold', icon: 'Shirt', unit: 'lbs', basePrice: 1.75 },
  { key: 'dry_clean', label: 'Dry Cleaning', icon: 'Sparkles', unit: 'items', basePrice: 8.0 },
  { key: 'iron', label: 'Iron Only', icon: 'Flame', unit: 'items', basePrice: 3.0 },
  { key: 'stain_removal', label: 'Stain Removal', icon: 'Droplets', unit: 'items', basePrice: 5.0 },
  { key: 'bedding', label: 'Bedding & Comforter', icon: 'Bed', unit: 'items', basePrice: 20.0 },
] as const;

// ─── Payment ───────────────────────────────────────────────
export const PAYMENT_METHODS = ['online', 'cod', 'wallet', 'split'] as const;
export const PAYMENT_GATEWAYS = ['stripe', 'square', 'paypal', 'cod', 'wallet'] as const;
export const WALLET_TOPUP_AMOUNTS = [10, 25, 50, 100] as const;

// ─── Admin Roles ───────────────────────────────────────────
export const ADMIN_ROLES = [
  { key: 'super_admin', label: 'Super Admin', description: 'Full access — all settings, config, financials, user data' },
  { key: 'outlet_manager', label: 'Outlet Manager', description: 'Orders, drivers, inventory for their assigned outlet only' },
  { key: 'support_staff', label: 'Support Staff', description: 'View orders, handle complaints, issue refunds (capped amount)' },
  { key: 'marketing', label: 'Marketing', description: 'Banners, offers, notifications, analytics (read-only financials)' },
  { key: 'finance', label: 'Finance', description: 'Revenue reports, payouts, refunds, COD reconciliation' },
] as const;

// ─── Driver ────────────────────────────────────────────────
export const DRIVER_STATUSES = ['pending', 'approved', 'suspended', 'rejected'] as const;
export const VEHICLE_TYPES = ['car', 'bike', 'van'] as const;
export const DRIVER_ACCEPTANCE_TIMEOUT_MS = 30_000;
export const MAX_DRIVER_ASSIGNMENT_ATTEMPTS = 3;

// ─── Driver Assignment Weights ─────────────────────────────
export const DRIVER_ASSIGNMENT_WEIGHTS = {
  distance: 0.4,
  rating: 0.3,
  idleTime: 0.3,
} as const;

// ─── Cancellation Policy ───────────────────────────────────
export const CANCELLATION_POLICY: Record<string, { allowed: boolean; refundPercent: number; fee: number }> = {
  placed: { allowed: true, refundPercent: 100, fee: 0 },
  confirmed: { allowed: true, refundPercent: 100, fee: 0 },
  driver_assigned: { allowed: true, refundPercent: 100, fee: 0 },
  pickup_enroute: { allowed: true, refundPercent: 100, fee: 5.0 },
  picked_up: { allowed: false, refundPercent: 0, fee: 0 },
  at_laundry: { allowed: false, refundPercent: 0, fee: 0 },
  processing: { allowed: false, refundPercent: 0, fee: 0 },
  quality_check: { allowed: false, refundPercent: 0, fee: 0 },
  ready_for_delivery: { allowed: false, refundPercent: 0, fee: 0 },
  out_for_delivery: { allowed: false, refundPercent: 0, fee: 0 },
  delivered: { allowed: false, refundPercent: 0, fee: 0 },
  cancelled: { allowed: false, refundPercent: 0, fee: 0 },
};

// ─── Subscription Plans ────────────────────────────────────
export const SUBSCRIPTION_PLANS = [
  {
    key: 'basic',
    name: 'Basic',
    price: 0,
    perks: ['Standard pricing', 'Earn 1 point per $1'],
    loyaltyMultiplier: 1,
  },
  {
    key: 'plus',
    name: 'Plus',
    price: 9.99,
    perks: ['Free delivery', '2x loyalty points', 'Priority pickup'],
    loyaltyMultiplier: 2,
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 19.99,
    perks: ['Free delivery', '3x loyalty points', 'Express service', '10% off all orders'],
    loyaltyMultiplier: 3,
  },
] as const;

// ─── Michigan Tax ──────────────────────────────────────────
export const MICHIGAN_TAX_RATE = 6.0;

// ─── Geospatial ────────────────────────────────────────────
export const DEFAULT_SERVICE_RADIUS_MILES = 25;
export const MILES_TO_METERS = 1609.34;
export const DRIVER_SEARCH_RADIUS_MILES = 10;

// ─── WebSocket Events ──────────────────────────────────────
export const WS_EVENTS = {
  DRIVER_LOCATION: 'driver:location',
  ORDER_STATUS: 'order:status',
  ORDER_TRACKING: 'order:tracking',
  DRIVER_NEW_ORDER: 'driver:new-order',
  DRIVER_COD_REMINDER: 'driver:cod-reminder',
  NOTIFICATION_PUSH: 'notification:push',
  WALLET_UPDATED: 'wallet:updated',
  SUPPORT_REPLY: 'support:reply',
} as const;

// ─── Rate Limits ───────────────────────────────────────────
export const RATE_LIMITS = {
  OTP_PER_PHONE_PER_HOUR: 5,
  API_REQUESTS_PER_15_MIN: 100,
  AUTH_REQUESTS_PER_15_MIN: 20,
} as const;

// ─── OTP ───────────────────────────────────────────────────
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 60;

// ─── JWT ───────────────────────────────────────────────────
export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '30d';

// ─── Pagination ────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── File Upload ───────────────────────────────────────────
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;       // 5MB
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;   // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
