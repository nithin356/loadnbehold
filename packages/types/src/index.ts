// ─── User Types ────────────────────────────────────────────
export type UserRole = 'customer' | 'driver' | 'admin';

export type AdminRole = 'super_admin' | 'outlet_manager' | 'support_staff' | 'marketing' | 'finance';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Address {
  _id?: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  location: GeoPoint;
  instructions?: string;
}

export interface UserPreferences {
  theme: ThemePreference;
  language: string;
  notifications: {
    orderUpdates: boolean;
    promotions: boolean;
    reminders: boolean;
  };
}

export interface User {
  _id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  adminRole?: AdminRole;
  addresses: Address[];
  profileImage?: string;
  referralCode: string;
  loyaltyPoints: number;
  preferences: UserPreferences;
  isBlocked: boolean;
  familyMembers?: FamilyMember[];
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  _id?: string;
  name: string;
  phone: string;
  relationship: string;
}

// ─── Driver Types ──────────────────────────────────────────
export type DriverStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

export type VehicleType = 'car' | 'bike' | 'van';

export interface Vehicle {
  type: VehicleType;
  make: string;
  model: string;
  plate: string;
  color: string;
}

export interface DriverDocument {
  url: string;
  verified: boolean;
  expiry: string;
  uploadedAt: string;
}

export interface DriverDocuments {
  license: DriverDocument;
  insurance: DriverDocument;
  backgroundCheck: {
    status: 'pending' | 'cleared' | 'failed';
    date: string;
  };
}

export interface DriverMetrics {
  totalDeliveries: number;
  rating: number;
  onTimePercent: number;
  acceptanceRate: number;
  avgDeliveryTime: number;
}

export interface Driver {
  _id: string;
  userId: string;
  status: DriverStatus;
  isOnline: boolean;
  currentLocation: GeoPoint;
  vehicle: Vehicle;
  documents: DriverDocuments;
  metrics: DriverMetrics;
  assignedOutlet: string;
  cashBalance: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Outlet Types ──────────────────────────────────────────
export interface OperatingHours {
  open: string;
  close: string;
}

export interface WeeklyHours {
  monday: OperatingHours;
  tuesday: OperatingHours;
  wednesday: OperatingHours;
  thursday: OperatingHours;
  friday: OperatingHours;
  saturday: OperatingHours;
  sunday: OperatingHours;
}

export type ServiceType = 'wash_fold' | 'dry_clean' | 'iron' | 'stain_removal' | 'bedding';

export interface Outlet {
  _id: string;
  name: string;
  address: Address;
  serviceRadius: number;
  serviceRadiusUnit: 'miles' | 'km';
  operatingHours: WeeklyHours;
  services: ServiceType[];
  pricingOverrides: Record<string, number>;
  capacityPerDay: number;
  capacityPerSlot: number;
  blackoutDates: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Order Types ───────────────────────────────────────────
export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'driver_assigned'
  | 'pickup_enroute'
  | 'picked_up'
  | 'at_laundry'
  | 'processing'
  | 'quality_check'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'online' | 'cod' | 'wallet' | 'split';

export type PaymentGateway = 'stripe' | 'square' | 'paypal' | 'cod' | 'wallet';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'completed'
  | 'refunded'
  | 'failed'
  | 'cod_pending'
  | 'cod_collected'
  | 'cod_deposited';

export interface OrderItem {
  service: ServiceType;
  quantity: number;
  weight?: number;
  unit: 'lbs' | 'kg' | 'items';
  specialInstructions?: string;
  price: number;
}

export interface TimeSlot {
  date: string;
  from: string;
  to: string;
}

export interface OrderSchedule {
  pickupSlot: TimeSlot;
  estimatedDelivery: string;
}

export interface OrderPricing {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  surcharge: number;
  total: number;
}

export interface OrderPayment {
  gateway: PaymentGateway;
  transactionId?: string;
  status: PaymentStatus;
  codAmount: number;
  walletAmount: number;
  onlineAmount: number;
  codCollectedByDriver: boolean;
  codDepositedAt?: string;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  driverId?: string;
  actor?: string;
}

export interface OrderRating {
  service: number;
  driver: number;
  review?: string;
}

export interface OrderProofImages {
  pickup?: string;
  delivery?: string;
  customerPhotos?: string[];
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  driverId?: string;
  outletId: string;
  status: OrderStatus;
  items: OrderItem[];
  pickupAddress: Address;
  deliveryAddress: Address;
  schedule: OrderSchedule;
  pricing: OrderPricing;
  paymentMethod: PaymentMethod;
  payment: OrderPayment;
  offerId?: string;
  promoCode?: string;
  timeline: OrderTimelineEntry[];
  rating?: OrderRating;
  proofImages: OrderProofImages;
  isRecurring: boolean;
  recurringSchedule?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    dayOfWeek: number;
    time: string;
  };
  deliveryOtp?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Offer Types ───────────────────────────────────────────
export type OfferType =
  | 'first_n_orders'
  | 'first_n_customers'
  | 'min_order'
  | 'promo_code'
  | 'referral'
  | 'loyalty'
  | 'flash_sale'
  | 'happy_hour'
  | 'bundle'
  | 'free_delivery'
  | 'seasonal';

export type DiscountType = 'percentage' | 'flat';

export type OfferTargeting = 'all' | 'new_users' | 'segment';

export interface OfferConfig {
  firstNOrders?: number;
  firstNCustomers?: number;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  usageLimit?: number;
  perUserLimit: number;
  happyHourStart?: string;
  happyHourEnd?: string;
  happyHourDays?: number[];
  bundleServices?: ServiceType[];
}

export interface Offer {
  _id: string;
  title: string;
  description?: string;
  type: OfferType;
  config: OfferConfig;
  promoCode?: string;
  targeting: OfferTargeting;
  segmentFilter?: Record<string, unknown>;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  redemptions: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Banner Types ──────────────────────────────────────────
export interface Banner {
  _id: string;
  imageUrl: string;
  title: string;
  description?: string;
  deepLink: string;
  order: number;
  activeFrom: string;
  activeUntil: string;
  isActive: boolean;
  targetAudience: 'all' | 'new' | 'returning';
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Wallet Types ──────────────────────────────────────────
export type WalletTransactionType = 'topup' | 'payment' | 'refund' | 'credit' | 'debit' | 'referral';

export interface WalletTransaction {
  _id: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  balance: number;
  description: string;
  orderId?: string;
  createdAt: string;
}

export interface Wallet {
  _id: string;
  userId: string;
  balance: number;
  transactions: WalletTransaction[];
  createdAt: string;
  updatedAt: string;
}

// ─── Notification Types ────────────────────────────────────
export type NotificationType = 'push' | 'sms' | 'email';
export type NotificationChannel = 'order_status' | 'promotional' | 'system' | 'reminder';
export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'read';

export interface Notification {
  _id: string;
  recipientId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status: NotificationStatus;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
}

// ─── Support Types ─────────────────────────────────────────
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicket {
  _id: string;
  customerId: string;
  orderId?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo?: string;
  messages: TicketMessage[];
  resolution?: string;
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  _id?: string;
  senderId: string;
  senderRole: UserRole;
  message: string;
  attachments?: string[];
  createdAt: string;
}

// ─── App Config Types ──────────────────────────────────────
export interface AppConfig {
  _id: string;
  key: 'global';
  serviceRadius: { default: number; unit: 'miles' | 'km' };
  minimumOrderAmount: number;
  deliveryFee: { base: number; perMile: number; freeAbove: number };
  taxRate: number;
  pickupSlotDuration: number;
  maxFutureScheduleDays: number;
  expressService: { enabled: boolean; surchargePercent: number };
  recurringOrders: boolean;
  payment: {
    primaryGateway: PaymentGateway;
    fallbackGateway: PaymentGateway;
    autoFailover: boolean;
    cod: {
      enabled: boolean;
      maxOrderAmount: number;
      minCompletedOrdersRequired: number;
      surcharge: number;
      driverDepositDeadlineHours: number;
    };
    wallet: {
      enabled: boolean;
      maxBalance: number;
      topUpAmounts: number[];
    };
  };
  notifications: {
    orderStatusSMS: boolean;
    promotionalPush: boolean;
    driverAlerts: boolean;
    abandonedCartMinutes: number;
    dormantCustomerDays: number;
  };
  referral: {
    referrerReward: number;
    refereeDiscount: number;
    refereeDiscountType: DiscountType;
    maxReferralsPerUser: number;
  };
  driver: {
    acceptanceTimeoutSeconds: number;
    maxConcurrentOrders: number;
    batchPickupEnabled: boolean;
    cashDepositDeadlineHours: number;
    autoSuspendRatingBelow: number;
  };
  maintenance: {
    isDown: boolean;
    message: string;
  };
}

// ─── Transaction / Ledger Types ────────────────────────────
export type TransactionType = 'charge' | 'refund' | 'payout' | 'credit' | 'cod_collection' | 'cod_deposit';

export interface Transaction {
  _id: string;
  orderId?: string;
  customerId?: string;
  driverId?: string;
  type: TransactionType;
  amount: number;
  gateway?: PaymentGateway;
  gatewayTransactionId?: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  createdAt: string;
}

// ─── Audit Log Types ───────────────────────────────────────
export interface AuditLog {
  _id: string;
  actor: {
    userId: string;
    role: string;
    ip: string;
  };
  action: string;
  resource: {
    type: string;
    id: string;
  };
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  timestamp: string;
}

// ─── API Response Types ────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ─── Socket Event Types ────────────────────────────────────
export interface DriverLocationUpdate {
  driverId: string;
  location: GeoPoint;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  timestamp: string;
  driverLocation?: GeoPoint;
  eta?: number;
}

export interface TrackingData {
  orderId: string;
  driverLocation: GeoPoint;
  eta: number;
  routePolyline?: string;
  updatedAt: string;
}
