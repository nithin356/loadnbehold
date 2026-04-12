import { z } from 'zod';

// ─── Auth Validators ───────────────────────────────────────
export const phoneSchema = z
  .string()
  .regex(/^\+1\d{10}$/, 'Phone must be US format: +1XXXXXXXXXX');

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

// ─── Profile Validators ───────────────────────────────────
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  profileImage: z.string().url().optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      language: z.string().optional(),
      notifications: z
        .object({
          orderUpdates: z.boolean().optional(),
          promotions: z.boolean().optional(),
          reminders: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

// ─── Address Validators ────────────────────────────────────
export const geoPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]),
});

export const addressSchema = z.object({
  label: z.string().min(1).max(50),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid US zip code'),
  location: geoPointSchema,
  instructions: z.string().max(500).optional(),
});

// ─── Order Validators ──────────────────────────────────────
export const serviceTypeSchema = z.enum([
  'wash_fold',
  'dry_clean',
  'iron',
  'stain_removal',
  'bedding',
]);

export const orderItemSchema = z.object({
  service: serviceTypeSchema,
  quantity: z.number().int().min(1),
  weight: z.number().min(0).optional(),
  unit: z.enum(['lbs', 'kg', 'items']),
  specialInstructions: z.string().max(500).optional(),
});

export const timeSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  from: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  to: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item required'),
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema,
  schedule: z.object({
    pickupSlot: timeSlotSchema,
  }),
  paymentMethod: z.enum(['online', 'cod', 'wallet', 'split']),
  promoCode: z.string().optional(),
  tip: z.number().min(0).max(200).optional(),
  specialInstructions: z.string().max(1000).optional(),
  deliveryInstructions: z.string().max(500).optional(),
  isRecurring: z.boolean().optional(),
  recurringSchedule: z
    .object({
      frequency: z.enum(['weekly', 'biweekly', 'monthly']),
      dayOfWeek: z.number().int().min(0).max(6),
      time: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
});

export const rateOrderSchema = z.object({
  service: z.number().int().min(1).max(5),
  driver: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
  refundMethod: z.enum(['wallet', 'original_payment']).optional(),
});

// ─── Driver Validators ─────────────────────────────────────
export const driverRegisterSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  email: z.string().email().optional(),
  vehicle: z.object({
    type: z.enum(['car', 'bike', 'van']),
    make: z.string().min(1).max(50),
    model: z.string().min(1).max(50),
    plate: z.string().min(1).max(20),
    color: z.string().min(1).max(30),
  }),
});

export const updateDriverLocationSchema = z.object({
  location: geoPointSchema,
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pickup_enroute',
    'picked_up',
    'at_laundry',
    'processing',
    'quality_check',
    'out_for_delivery',
    'delivered',
  ]),
  note: z.string().max(500).optional(),
  weight: z.number().min(0).optional(),
  deliveryOtp: z.string().length(4).optional(),
});

// ─── Payment Validators ────────────────────────────────────
export const createPaymentIntentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().min(0.5),
  currency: z.string().length(3).default('usd'),
});

export const codCollectSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().min(0),
});

// ─── Wallet Validators ─────────────────────────────────────
export const walletTopupSchema = z.object({
  amount: z.number().min(1).max(10_000),
  paymentIntentId: z.string().optional(),
});

// ─── Admin — Outlet Validators ─────────────────────────────
export const operatingHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
});

export const createOutletSchema = z.object({
  name: z.string().min(1).max(200),
  address: addressSchema,
  serviceRadius: z.number().min(1).max(100),
  serviceRadiusUnit: z.enum(['miles', 'km']).default('miles'),
  operatingHours: z.object({
    monday: operatingHoursSchema,
    tuesday: operatingHoursSchema,
    wednesday: operatingHoursSchema,
    thursday: operatingHoursSchema,
    friday: operatingHoursSchema,
    saturday: operatingHoursSchema,
    sunday: operatingHoursSchema,
  }),
  services: z.array(serviceTypeSchema).min(1),
  capacityPerDay: z.number().int().min(1).default(100),
  capacityPerSlot: z.number().int().min(1).default(10),
});

// ─── Admin — Offer Validators ──────────────────────────────
export const createOfferSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  type: z.enum([
    'first_n_orders', 'first_n_customers', 'min_order', 'promo_code',
    'referral', 'loyalty', 'flash_sale', 'happy_hour', 'bundle',
    'free_delivery', 'seasonal',
  ]),
  config: z.object({
    firstNOrders: z.number().int().min(1).optional(),
    firstNCustomers: z.number().int().min(1).optional(),
    discountType: z.enum(['percentage', 'flat']),
    discountValue: z.number().min(0),
    minOrderAmount: z.number().min(0).default(0),
    maxDiscount: z.number().min(0).optional(),
    usageLimit: z.number().int().min(1).optional(),
    perUserLimit: z.number().int().min(1).default(1),
    happyHourStart: z.string().optional(),
    happyHourEnd: z.string().optional(),
    happyHourDays: z.array(z.number().int().min(0).max(6)).optional(),
    bundleServices: z.array(serviceTypeSchema).optional(),
  }),
  promoCode: z.string().max(20).optional(),
  targeting: z.enum(['all', 'new_users', 'segment']).default('all'),
  segmentFilter: z.record(z.unknown()).optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
});

// ─── Admin — Banner Validators ─────────────────────────────
export const createBannerSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url(),
  deepLink: z.string().min(1),
  order: z.number().int().min(0),
  activeFrom: z.string(),
  activeUntil: z.string(),
  targetAudience: z.enum(['all', 'new', 'returning']).default('all'),
});

// ─── Admin — Notification Validators ───────────────────────
export const sendNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  type: z.enum(['push', 'sms', 'email']),
  target: z.enum(['all_customers', 'all_drivers', 'segment', 'individual']),
  recipientIds: z.array(z.string()).optional(),
  segmentFilter: z.record(z.unknown()).optional(),
  data: z.record(z.unknown()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// ─── Support Validators ────────────────────────────────────
export const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  orderId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const ticketReplySchema = z.object({
  message: z.string().min(1).max(2000),
  attachments: z.array(z.string().url()).optional(),
});

// ─── Pagination Validators ─────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Export types inferred from schemas
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type RateOrderInput = z.infer<typeof rateOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type DriverRegisterInput = z.infer<typeof driverRegisterSchema>;
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type WalletTopupInput = z.infer<typeof walletTopupSchema>;
export type CreateOutletInput = z.infer<typeof createOutletSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
