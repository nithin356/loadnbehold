# LoadNBehold — API Testing & Setup Guide

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Local Infrastructure (Docker)](#2-local-infrastructure-docker)
3. [Third-Party API Keys](#3-third-party-api-keys---where-to-get-them)
4. [Complete API Endpoint Reference](#4-complete-api-endpoint-reference)
5. [Testing Cheat Sheet](#5-testing-cheat-sheet)
6. [Admin Roles for Testing](#6-admin-roles-for-testing)
7. [Order Status Flow](#7-order-status-flow)
8. [Key Test Scenarios](#8-key-test-scenarios)
9. [Database Seeding](#9-database-seeding)
10. [Postman Collection Structure](#10-postman--thunder-client-collection-structure)
11. [Error Response Reference](#11-error-response-reference)
12. [Performance & Load Testing](#12-performance--load-testing)
13. [Debugging Tips](#13-debugging-tips)
14. [Summary](#summary)

---

## 1. Environment Setup

Before testing any API, create a `.env` file in `apps/server/` with all required variables.

### Minimum Required for Local Development

```bash
# ──────────────── APP ────────────────
NODE_ENV=development
APP_NAME=LoadNBehold
APP_VERSION=1.0.0
API_BASE_URL=http://localhost:5000
WEB_APP_URL=http://localhost:3000
ADMIN_APP_URL=http://localhost:3001
PORT=5000

# ──────────────── DATABASE ────────────────
MONGODB_URI=mongodb://localhost:27017/loadnbehold
REDIS_URL=redis://localhost:6379

# ──────────────── AUTH & JWT ────────────────
JWT_ACCESS_SECRET=dev-access-secret-change-in-prod
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-prod
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
OTP_EXPIRY_SECONDS=60
OTP_LENGTH=6
OTP_PROVIDER=twilio
OTP_RATE_LIMIT_PER_PHONE=5

# ──────────────── TWILIO (OTP) ────────────────
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ──────────────── STRIPE (Payments) ────────────────
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx

# ──────────────── MAPBOX ────────────────
MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoxxxxxxxxxxxxxxxx

# ──────────────── AWS S3 (File Storage) ────────────────
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=loadnbehold-dev-assets
AWS_S3_REGION=us-east-2

# ──────────────── FIREBASE (Push Notifications) ────────────────
FIREBASE_PROJECT_ID=loadnbehold-dev
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@loadnbehold-dev.iam.gserviceaccount.com

# ──────────────── SENDGRID (Email) ────────────────
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=dev@loadnbehold.com
SENDGRID_FROM_NAME=LoadNBehold Dev

# ──────────────── MONITORING ────────────────
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
LOG_LEVEL=debug

# ──────────────── RATE LIMITING ────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ──────────────── CORS ────────────────
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Optional (Add When Needed)

```bash
# ──────────────── MSG91 (OTP Fallback) ────────────────
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_TEMPLATE_ID=your-template-id
MSG91_SENDER_ID=LOADNB

# ──────────────── GOOGLE OAUTH ────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ──────────────── APPLE SIGN-IN ────────────────
APPLE_CLIENT_ID=com.loadnbehold.app
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# ──────────────── SQUARE (Payment Fallback) ────────────────
SQUARE_APPLICATION_ID=sq0idp-xxxxxxxxxxxxxxxx
SQUARE_ACCESS_TOKEN=EAAAxxxxxxxxxxxxxxxx
SQUARE_LOCATION_ID=Lxxxxxxxxxxxxxxxx
SQUARE_WEBHOOK_SIGNATURE_KEY=your-square-webhook-key

# ──────────────── PAYPAL (Secondary Fallback) ────────────────
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=sandbox

# ──────────────── PAYMENT CONFIG ────────────────
PAYMENT_PRIMARY_GATEWAY=stripe
PAYMENT_FALLBACK_GATEWAY=square
PAYMENT_AUTO_FAILOVER=true
PAYMENT_COD_ENABLED=true
PAYMENT_COD_MAX_AMOUNT=100
PAYMENT_COD_MIN_ORDERS=3
PAYMENT_COD_SURCHARGE=0
PAYMENT_WALLET_ENABLED=true
PAYMENT_WALLET_MAX_BALANCE=10000

# ──────────────── GOOGLE MAPS (Fallback) ────────────────
GOOGLE_MAPS_API_KEY=AIzaSyxxxxxxxxxxxxxxxx

# ──────────────── CLOUDFLARE R2 (Alt Storage) ────────────────
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET=loadnbehold-assets
```

### Client-Side (.env.local for Next.js apps)

```bash
# apps/web/.env.local AND apps/admin/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:5000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_KEY=pk_test_xxxxxxxxxxxxxxxx
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=loadnbehold-dev
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSyxxxxxxxxxxxxxxxx
```

### Dev Mode OTP Bypass

For faster local development, you can optionally configure a dev-only OTP bypass:

```bash
# Only for NODE_ENV=development — NEVER in production
DEV_OTP_BYPASS=true
DEV_OTP_CODE=123456
```

When `DEV_OTP_BYPASS=true`, any OTP verification will accept `123456` as a valid code, bypassing Twilio entirely. This avoids burning SMS credits during development.

---

## 2. Local Infrastructure (Docker)

Start MongoDB and Redis locally:

```bash
docker-compose up -d mongodb redis
```

Or manually:

```bash
docker run -d --name loadnbehold-mongo -p 27017:27017 mongo:7
docker run -d --name loadnbehold-redis -p 6379:6379 redis:7-alpine
```

### Verify Services Are Running

```bash
# Check MongoDB
docker exec loadnbehold-mongo mongosh --eval "db.runCommand({ ping: 1 })"

# Check Redis
docker exec loadnbehold-redis redis-cli ping
# Expected: PONG
```

### Start the Backend Server

```bash
cd apps/server
pnpm install
pnpm dev
# Server starts on http://localhost:5000
```

### Health Check

```bash
curl http://localhost:5000/api/health
# Expected: { "success": true, "data": { "status": "ok", "uptime": "...", "mongodb": "connected", "redis": "connected" } }
```

---

## 3. Third-Party API Keys — Where to Get Them

| Service | Sign Up URL | Free Tier? | What You Need |
|---------|-------------|------------|---------------|
| **Twilio** | https://www.twilio.com/try-twilio | Yes (trial) | Account SID, Auth Token, Phone Number, Verify Service SID |
| **Stripe** | https://dashboard.stripe.com/register | Yes (test mode) | Publishable Key, Secret Key, Webhook Secret |
| **Mapbox** | https://account.mapbox.com/auth/signup | Yes (50k loads/mo) | Access Token |
| **Firebase** | https://console.firebase.google.com | Yes | Project ID, Private Key, Client Email |
| **SendGrid** | https://signup.sendgrid.com | Yes (100 emails/day) | API Key |
| **AWS S3** | https://aws.amazon.com | Free tier (12 months) | Access Key ID, Secret Access Key, Bucket, Region |
| **Sentry** | https://sentry.io/signup | Yes (5k errors/mo) | DSN |
| **Square** | https://developer.squareup.com | Yes (sandbox) | Application ID, Access Token, Location ID |
| **PayPal** | https://developer.paypal.com | Yes (sandbox) | Client ID, Client Secret |
| **Google OAuth** | https://console.cloud.google.com | Yes | Client ID, Client Secret |
| **Apple Sign-In** | https://developer.apple.com | $99/yr | Client ID, Team ID, Key ID, Private Key |
| **Google Maps** | https://console.cloud.google.com | $200/mo credit | API Key |
| **MSG91** | https://msg91.com | Trial credits | Auth Key, Template ID |
| **PostHog** | https://posthog.com | Yes (1M events/mo) | API Key |

### Stripe Test Card Numbers

| Card Number          | Scenario           |
| -------------------- | ------------------ |
| `4242 4242 4242 4242`| Success            |
| `4000 0000 0000 0002`| Card declined      |
| `4000 0000 0000 9995`| Insufficient funds |
| `4000 0000 0000 3220`| 3D Secure required |
| `4000 0000 0000 0069`| Expired card       |

Use any future expiry date (e.g., `12/30`), any 3-digit CVC, and any billing ZIP.

---

## 4. Complete API Endpoint Reference

> **Base URL**: `http://localhost:5000` (dev) / `https://api.loadnbehold.com` (prod)
>
> **Auth**: All endpoints except Auth and Webhooks require `Authorization: Bearer <access_token>` header.
>
> **Response Format**:
> ```json
> { "success": true, "data": {}, "message": "...", "meta": { "page": 1, "limit": 20, "total": 156 } }
> ```

---

### 4.1 Authentication (Public — No Auth Required)

| # | Method | Endpoint | Description | Key Request Body |
|---|--------|----------|-------------|-----------------|
| 1 | `POST` | `/api/auth/send-otp` | Send OTP to phone number | `{ "phone": "+15551234567" }` |
| 2 | `POST` | `/api/auth/verify-otp` | Verify OTP and receive JWT tokens | `{ "phone": "+15551234567", "otp": "123456" }` |
| 3 | `POST` | `/api/auth/refresh` | Refresh expired access token | `{ "refreshToken": "..." }` |
| 4 | `POST` | `/api/auth/logout` | Invalidate current session | (token in header) |
| 5 | `POST` | `/api/auth/google` | Sign in with Google | `{ "idToken": "..." }` |
| 6 | `POST` | `/api/auth/apple` | Sign in with Apple | `{ "identityToken": "...", "authorizationCode": "..." }` |

**Test Flow**:
```
1. POST /api/auth/send-otp  →  OTP sent to phone (or use DEV_OTP_BYPASS)
2. POST /api/auth/verify-otp  →  { accessToken, refreshToken, user }
3. Use accessToken in all subsequent requests as: Authorization: Bearer <token>
4. When accessToken expires (15 min) → POST /api/auth/refresh → new accessToken
5. POST /api/auth/logout → invalidates session
```

---

### 4.2 Customer APIs (Auth: Customer Role)

| # | Method | Endpoint | Description | Key Params/Body |
|---|--------|----------|-------------|-----------------|
| 7 | `GET` | `/api/customer/profile` | Get customer profile | — |
| 8 | `PUT` | `/api/customer/profile` | Update customer profile | `{ "name": "...", "email": "...", "preferences": { "theme": "dark" } }` |
| 9 | `POST` | `/api/customer/addresses` | Add a saved address | `{ "label": "Home", "line1": "...", "city": "...", "state": "MI", "zip": "48201", "location": { "type": "Point", "coordinates": [-83.04, 42.33] } }` |
| 10 | `GET` | `/api/customer/addresses` | List all saved addresses | — |
| 11 | `PUT` | `/api/customer/addresses/:id` | Update a saved address | Same body as POST |
| 12 | `DELETE` | `/api/customer/addresses/:id` | Remove a saved address | `:id` = address ObjectId |
| 13 | `GET` | `/api/customer/nearby-outlets` | Find outlets within service radius | `?lat=42.33&lng=-83.04` |
| 14 | `GET` | `/api/customer/recommendations` | Personalized recommendations | — |

---

### 4.3 Order APIs (Auth: Customer/Driver/Admin)

| # | Method | Endpoint | Description | Key Params/Body |
|---|--------|----------|-------------|-----------------|
| 15 | `POST` | `/api/orders` | Place a new order | `{ "items": [...], "pickupAddress": {...}, "deliveryAddress": {...}, "schedule": {...}, "paymentMethod": "online|cod|wallet", "promoCode": "FIRST20" }` |
| 16 | `GET` | `/api/orders` | List orders (paginated + filtered) | `?status=placed&page=1&limit=20&sort=-createdAt` |
| 17 | `GET` | `/api/orders/:id` | Get full order details | `:id` = order ObjectId |
| 18 | `PUT` | `/api/orders/:id/cancel` | Cancel an order | `{ "reason": "..." }` |
| 19 | `POST` | `/api/orders/:id/rate` | Rate a completed order | `{ "service": 5, "driver": 4, "review": "Great!" }` |
| 20 | `GET` | `/api/orders/:id/track` | Get live tracking data | `:id` = order ObjectId |
| 21 | `POST` | `/api/orders/:id/reorder` | Reorder from past order | `:id` = original order ObjectId |
| 22 | `POST` | `/api/orders/:id/dispute` | Raise a dispute | `{ "reason": "...", "photos": [...] }` |
| 23 | `GET` | `/api/orders/:id/invoice` | Download invoice as PDF | Returns `application/pdf` |

---

### 4.4 Driver APIs (Auth: Driver Role)

| # | Method | Endpoint | Description | Key Params/Body |
|---|--------|----------|-------------|-----------------|
| 24 | `POST` | `/api/driver/register` | Submit driver application | `{ "vehicle": {...}, "documents": {...}, "bankAccount": {...} }` |
| 25 | `PUT` | `/api/driver/status` | Toggle online/offline | `{ "isOnline": true }` |
| 26 | `PUT` | `/api/driver/location` | Update GPS coordinates | `{ "latitude": 42.33, "longitude": -83.04 }` |
| 27 | `GET` | `/api/driver/orders` | Get assigned orders | `?status=active` |
| 28 | `PUT` | `/api/driver/orders/:id/accept` | Accept an order request | `:id` = order ObjectId |
| 29 | `PUT` | `/api/driver/orders/:id/reject` | Reject an order request | `{ "reason": "..." }` |
| 30 | `PUT` | `/api/driver/orders/:id/status` | Update order status | `{ "status": "picked_up" }` |
| 31 | `POST` | `/api/driver/orders/:id/proof` | Upload pickup/delivery photo | `multipart/form-data` with image file |
| 32 | `POST` | `/api/driver/orders/:id/verify-otp` | Verify delivery OTP | `{ "otp": "1234" }` |
| 33 | `GET` | `/api/driver/earnings` | Get earnings summary | `?period=daily|weekly|monthly` |
| 34 | `GET` | `/api/driver/earnings/tax-summary` | Annual 1099 tax summary | `?year=2026` |

---

### 4.5 Payment APIs (Auth: Customer/Driver)

| # | Method | Endpoint | Description | Key Params/Body |
|---|--------|----------|-------------|-----------------|
| 35 | `POST` | `/api/payments/create-intent` | Create Stripe payment intent | `{ "orderId": "...", "amount": 38.03 }` |
| 36 | `POST` | `/api/payments/confirm` | Confirm payment (after 3DS) | `{ "paymentIntentId": "pi_..." }` |
| 37 | `POST` | `/api/payments/cod/place` | Place order with Cash on Delivery | `{ "orderId": "..." }` |
| 38 | `POST` | `/api/payments/cod/collect` | Driver marks cash collected | `{ "orderId": "...", "amountCollected": 38.03 }` |
| 39 | `POST` | `/api/payments/cod/deposit` | Driver marks cash deposited at outlet | `{ "orderId": "..." }` |
| 40 | `GET` | `/api/payments/cod/ledger` | Driver's COD cash ledger | `?from=2026-04-01&to=2026-04-08` |
| 41 | `POST` | `/api/payments/webhook/stripe` | Stripe webhook (no auth — uses signature) | Raw body + `Stripe-Signature` header |
| 42 | `POST` | `/api/payments/webhook/square` | Square webhook (no auth — uses signature) | Raw body + signature header |
| 43 | `POST` | `/api/payments/refund` | Process a refund | `{ "orderId": "...", "amount": 15.00, "reason": "...", "refundTo": "original|wallet" }` |

---

### 4.6 Wallet APIs (Auth: Customer)

| # | Method | Endpoint | Description | Key Params/Body |
|---|--------|----------|-------------|-----------------|
| 44 | `GET` | `/api/wallet/balance` | Get wallet balance | — |
| 45 | `POST` | `/api/wallet/topup` | Add funds to wallet | `{ "amount": 25.00 }` |
| 46 | `POST` | `/api/wallet/pay` | Pay for order via wallet | `{ "orderId": "...", "amount": 38.03 }` |
| 47 | `GET` | `/api/wallet/transactions` | Wallet transaction history | `?page=1&limit=20&type=topup|debit|credit` |

---

### 4.7 Support APIs (Auth: Customer)

| # | Method | Endpoint | Description | Key Params/Body |
|---|--------|----------|-------------|-----------------|
| 48 | `POST` | `/api/support/tickets` | Create support ticket | `{ "orderId": "...", "category": "order_issue", "subject": "...", "message": "..." }` |
| 49 | `GET` | `/api/support/tickets` | List my tickets | `?status=open&page=1` |
| 50 | `GET` | `/api/support/tickets/:id` | Get ticket details | `:id` = ticket ObjectId |
| 51 | `POST` | `/api/support/tickets/:id/reply` | Reply to a ticket | `{ "message": "...", "attachments": [] }` |
| 52 | `GET` | `/api/support/faq` | Get FAQ list | `?category=payments|orders|general` |

---

### 4.8 Subscription & Loyalty APIs (Auth: Customer)

| # | Method | Endpoint | Description | Key Params/Body |
|---|--------|----------|-------------|-----------------|
| 53 | `GET` | `/api/subscriptions/plans` | List available plans | — |
| 54 | `POST` | `/api/subscriptions/subscribe` | Subscribe to a plan | `{ "planId": "plus" }` |
| 55 | `PUT` | `/api/subscriptions/cancel` | Cancel subscription | `{ "reason": "..." }` |
| 56 | `GET` | `/api/subscriptions/current` | Current subscription status | — |
| 57 | `GET` | `/api/loyalty/points` | Get loyalty points balance | — |
| 58 | `POST` | `/api/loyalty/redeem` | Redeem points on an order | `{ "orderId": "...", "points": 500 }` |

---

### 4.9 Recurring Orders & Family APIs (Auth: Customer)

| # | Method | Endpoint | Description | Key Params/Body |
|---|--------|----------|-------------|-----------------|
| 59 | `POST` | `/api/recurring-orders` | Set up a recurring order | `{ "frequency": "weekly", "dayOfWeek": "monday", "timeSlot": {...}, "services": [...] }` |
| 60 | `GET` | `/api/recurring-orders` | List recurring orders | — |
| 61 | `PUT` | `/api/recurring-orders/:id` | Update recurring order | Partial update body |
| 62 | `DELETE` | `/api/recurring-orders/:id` | Cancel recurring order | — |
| 63 | `POST` | `/api/family/members` | Add family member | `{ "name": "...", "phone": "...", "canPlaceOrders": true }` |
| 64 | `GET` | `/api/family/members` | List family members | — |
| 65 | `DELETE` | `/api/family/members/:id` | Remove family member | — |

---

### 4.10 Referral APIs (Auth: Customer)

| # | Method | Endpoint | Description | Key Params/Body |
|---|--------|----------|-------------|-----------------|
| 66 | `GET` | `/api/referral/code` | Get my referral code + stats | — |
| 67 | `POST` | `/api/referral/apply` | Apply a referral code (new user) | `{ "code": "JOHN20" }` |

---

### 4.11 Admin Dashboard APIs (Auth: Admin Roles)

| # | Method | Endpoint | Description | Required Role |
|---|--------|----------|-------------|---------------|
| 68 | `GET` | `/api/admin/dashboard` | Dashboard stats (orders, revenue, drivers) | Any Admin |
| 69 | `POST` | `/api/admin/outlets` | Create new outlet | Super Admin |
| 70 | `GET` | `/api/admin/outlets` | List all outlets | Any Admin |
| 71 | `GET` | `/api/admin/outlets/:id` | Get outlet details | Any Admin |
| 72 | `PUT` | `/api/admin/outlets/:id` | Update outlet settings | Super Admin, Outlet Manager |
| 73 | `DELETE` | `/api/admin/outlets/:id` | Delete outlet | Super Admin |
| 74 | `POST` | `/api/admin/offers` | Create offer/promo | Super Admin, Marketing |
| 75 | `GET` | `/api/admin/offers` | List all offers | Any Admin |
| 76 | `GET` | `/api/admin/offers/:id` | Get offer details | Any Admin |
| 77 | `PUT` | `/api/admin/offers/:id` | Update offer | Super Admin, Marketing |
| 78 | `DELETE` | `/api/admin/offers/:id` | Deactivate offer | Super Admin, Marketing |
| 79 | `POST` | `/api/admin/banners` | Create banner | Super Admin, Marketing |
| 80 | `GET` | `/api/admin/banners` | List all banners | Any Admin |
| 81 | `PUT` | `/api/admin/banners/:id` | Update banner | Super Admin, Marketing |
| 82 | `DELETE` | `/api/admin/banners/:id` | Remove banner | Super Admin, Marketing |
| 83 | `GET` | `/api/admin/drivers` | List all drivers | Any Admin |
| 84 | `GET` | `/api/admin/drivers/:id` | Get driver details | Any Admin |
| 85 | `PUT` | `/api/admin/drivers/:id/approve` | Approve or reject driver | Super Admin, Outlet Manager |
| 86 | `PUT` | `/api/admin/drivers/:id/suspend` | Suspend a driver | Super Admin, Outlet Manager |
| 87 | `GET` | `/api/admin/customers` | List all customers | Any Admin |
| 88 | `GET` | `/api/admin/customers/:id` | Customer detail view | Any Admin |
| 89 | `PUT` | `/api/admin/customers/:id/block` | Block/unblock customer | Super Admin |
| 90 | `GET` | `/api/admin/orders` | All orders with filters | Any Admin |
| 91 | `PUT` | `/api/admin/orders/:id` | Override order status | Super Admin, Outlet Manager |
| 92 | `PUT` | `/api/admin/orders/:id/assign-driver` | Manually assign driver | Super Admin, Outlet Manager |
| 93 | `PUT` | `/api/admin/orders/:id/adjust-price` | Adjust price after weighing | Super Admin, Outlet Manager |
| 94 | `POST` | `/api/admin/notifications/send` | Send push notification | Super Admin, Marketing |
| 95 | `GET` | `/api/admin/config` | Get global app config | Super Admin |
| 96 | `PUT` | `/api/admin/config` | Update global app config | Super Admin |
| 97 | `GET` | `/api/admin/reports/:type` | Generate report | Super Admin, Finance |
| 98 | `GET` | `/api/admin/audit-logs` | View audit logs | Super Admin |

---

### 4.12 Admin COD & Wallet APIs (Auth: Admin Roles)

| # | Method | Endpoint | Description | Required Role |
|---|--------|----------|-------------|---------------|
| 99 | `GET` | `/api/admin/cod/dashboard` | COD overview (totals, pending, overdue) | Super Admin, Finance |
| 100 | `GET` | `/api/admin/cod/drivers` | Per-driver cash collection status | Super Admin, Finance |
| 101 | `PUT` | `/api/admin/cod/drivers/:id/reconcile` | Mark driver cash as reconciled | Super Admin, Finance |
| 102 | `GET` | `/api/admin/wallet/credits` | View all wallet credits issued | Super Admin, Finance |
| 103 | `POST` | `/api/admin/wallet/:userId/credit` | Add credit to customer wallet | Super Admin, Support Staff |
| 104 | `POST` | `/api/admin/wallet/:userId/debit` | Debit from customer wallet | Super Admin |
| 105 | `GET` | `/api/admin/support/tickets` | All support tickets with SLA info | Super Admin, Support Staff |
| 106 | `PUT` | `/api/admin/support/tickets/:id/assign` | Assign ticket to support staff | Super Admin, Support Staff |
| 107 | `PUT` | `/api/admin/support/tickets/:id/resolve` | Resolve support ticket | Super Admin, Support Staff |

---

### 4.13 WebSocket Events (Real-Time via Socket.IO)

Connect to: `ws://localhost:5000` (dev) / `wss://api.loadnbehold.com` (prod)

**Authentication**: Pass JWT token in the `auth` handshake:
```javascript
const socket = io("ws://localhost:5000", {
  auth: { token: "your-jwt-access-token" }
});
```

| # | Event Name | Direction | Description | Payload Example |
|---|------------|-----------|-------------|-----------------|
| W1 | `driver:location` | Driver → Server | Driver sends GPS update | `{ "lat": 42.33, "lng": -83.04, "timestamp": "..." }` |
| W2 | `order:status` | Server → Client | Order status changed | `{ "orderId": "...", "status": "picked_up", "timestamp": "..." }` |
| W3 | `order:tracking` | Server → Client | Live driver location for order | `{ "orderId": "...", "driverLocation": { "lat": 42.33, "lng": -83.04 }, "eta": "5 min" }` |
| W4 | `driver:new-order` | Server → Driver | New order assignment request | `{ "orderId": "...", "pickup": {...}, "timeout": 30 }` |
| W5 | `driver:cod-reminder` | Server → Driver | Cash deposit deadline reminder | `{ "orderId": "...", "amount": 38.03, "deadline": "..." }` |
| W6 | `notification:push` | Server → Client | Real-time notification | `{ "title": "...", "body": "...", "data": {...} }` |
| W7 | `wallet:updated` | Server → Client | Wallet balance changed | `{ "newBalance": 45.50, "transaction": {...} }` |
| W8 | `support:reply` | Server → Client | New reply on support ticket | `{ "ticketId": "...", "message": "...", "sender": "..." }` |
| W9 | `order:eta-update` | Server → Client | ETA recalculated | `{ "orderId": "...", "eta": "8 min", "reason": "traffic" }` |

---

## 5. Testing Cheat Sheet

### Quick Test Order — Full Auth Flow (cURL)

```bash
# 1. Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+15551234567"}'

# 2. Verify OTP (use 123456 if DEV_OTP_BYPASS is enabled)
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+15551234567", "otp": "123456"}'
# Response: { "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "..." } }

# 3. Save the token
export TOKEN="eyJ..."

# 4. Get profile
curl http://localhost:5000/api/customer/profile \
  -H "Authorization: Bearer $TOKEN"

# 5. Find nearby outlets
curl "http://localhost:5000/api/customer/nearby-outlets?lat=42.3314&lng=-83.0458" \
  -H "Authorization: Bearer $TOKEN"

# 6. Place an order
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [{"service": "wash_fold", "quantity": 1, "weight": 5.2, "specialInstructions": "Separate darks"}],
    "pickupAddress": {"line1": "123 Main St", "city": "Detroit", "state": "MI", "zip": "48201", "location": {"type": "Point", "coordinates": [-83.0458, 42.3314]}},
    "deliveryAddress": {"line1": "123 Main St", "city": "Detroit", "state": "MI", "zip": "48201", "location": {"type": "Point", "coordinates": [-83.0458, 42.3314]}},
    "schedule": {"pickupSlot": {"date": "2026-04-15", "from": "10:00", "to": "11:00"}},
    "paymentMethod": "online"
  }'

# 7. Track order
curl http://localhost:5000/api/orders/<ORDER_ID>/track \
  -H "Authorization: Bearer $TOKEN"

# 8. Cancel order
curl -X PUT http://localhost:5000/api/orders/<ORDER_ID>/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason": "Changed my mind"}'
```

### Stripe Test Webhook (Local)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:5000/api/payments/webhook/stripe

# In another terminal, trigger test events:
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
stripe trigger customer.subscription.updated
```

### WebSocket Test (JavaScript)

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: { token: "your-jwt-access-token" }
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message);
});

socket.on("order:status", (data) => {
  console.log("Order update:", data);
});

socket.on("order:tracking", (data) => {
  console.log("Driver location:", data);
});

socket.on("notification:push", (data) => {
  console.log("Notification:", data);
});

socket.on("wallet:updated", (data) => {
  console.log("Wallet updated:", data);
});
```

### WebSocket Test (wscat from terminal)

```bash
# Install: npm install -g wscat
wscat -c ws://localhost:5000 -H "Authorization: Bearer <token>"
```

### Test COD Flow

```bash
# 1. Place a COD order (customer must have 3+ completed orders)
curl -X POST http://localhost:5000/api/payments/cod/place \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{"orderId": "<ORDER_ID>"}'

# 2. Driver collects cash
curl -X POST http://localhost:5000/api/payments/cod/collect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"orderId": "<ORDER_ID>", "amountCollected": 38.03}'

# 3. Driver deposits cash
curl -X POST http://localhost:5000/api/payments/cod/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"orderId": "<ORDER_ID>"}'

# 4. Admin reconciles
curl -X PUT http://localhost:5000/api/admin/cod/drivers/<DRIVER_ID>/reconcile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"orderIds": ["<ORDER_ID>"]}'
```

### Test Wallet Flow

```bash
# 1. Top up wallet
curl -X POST http://localhost:5000/api/wallet/topup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount": 50.00}'

# 2. Check balance
curl http://localhost:5000/api/wallet/balance \
  -H "Authorization: Bearer $TOKEN"

# 3. Pay with wallet
curl -X POST http://localhost:5000/api/wallet/pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"orderId": "<ORDER_ID>", "amount": 38.03}'
```

---

## 6. Admin Roles for Testing

Create test admin users with different roles to test RBAC:

| Role | Can Access | Cannot Access |
|------|-----------|---------------|
| **Super Admin** | Everything | — |
| **Outlet Manager** | Orders, Drivers, Inventory (own outlet) | Global config, other outlets, financials |
| **Support Staff** | Orders (view), Tickets, Refunds (capped) | Config, drivers, offers, banners |
| **Marketing** | Banners, Offers, Notifications, Analytics | Config, financials (write), drivers |
| **Finance** | Revenue reports, Payouts, Refunds, COD | Config, banners, notifications |

### RBAC Test Matrix

Test each endpoint with each role to verify proper 403 responses:

```bash
# Test: Marketing role trying to update config (should get 403)
curl -X PUT http://localhost:5000/api/admin/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MARKETING_TOKEN" \
  -d '{"taxRate": 7.0}'
# Expected: { "success": false, "error": { "code": "FORBIDDEN", "message": "Insufficient permissions" } }
```

---

## 7. Order Status Flow (for testing state transitions)

```
placed -> driver_assigned -> pickup_enroute -> picked_up -> at_laundry -> processing -> quality_check -> out_for_delivery -> delivered
                                                                                                                            |
placed -> cancelled (only before picked_up)                                                                                 v
                                                                                                                         completed
```

### Valid Status Transitions

| From               | To                  | Who Can Trigger        |
| ------------------- | ------------------- | ---------------------- |
| `placed`           | `driver_assigned`   | System (auto-assign)   |
| `placed`           | `cancelled`         | Customer               |
| `driver_assigned`  | `pickup_enroute`    | Driver (accepts order) |
| `driver_assigned`  | `cancelled`         | Customer               |
| `pickup_enroute`   | `picked_up`         | Driver                 |
| `pickup_enroute`   | `cancelled`         | Customer (with fee)    |
| `picked_up`        | `at_laundry`        | Driver / System        |
| `at_laundry`       | `processing`        | Outlet staff / System  |
| `processing`       | `quality_check`     | Outlet staff           |
| `quality_check`    | `out_for_delivery`  | Driver                 |
| `out_for_delivery` | `delivered`         | Driver                 |
| Any status         | Any status          | Admin (override)       |

### Cancellation + Refund Tests

- Customer cancels at `placed` → 100% refund, no fee
- Customer cancels at `driver_assigned` → 100% refund, no fee
- Customer cancels at `pickup_enroute` → refund minus cancellation fee ($5 default)
- Customer attempts cancel at `picked_up` → rejected with error

---

## 8. Key Test Scenarios

### Authentication

| Scenario | Expected Result |
|----------|----------------|
| Send OTP to valid phone | 200, OTP sent |
| Send OTP 6 times in 1 hour | 429, rate limit error |
| Verify with correct OTP | 200, tokens returned |
| Verify with wrong OTP | 401, "Invalid OTP" |
| Verify expired OTP (>60s) | 401, "OTP expired" |
| Use expired access token | 401, "Token expired" |
| Refresh with valid refresh token | 200, new access token |
| Refresh with expired refresh token | 401, re-auth required |

### Geospatial

| Scenario | Expected Result |
|----------|----------------|
| Order from 24.9 miles | Accepted, within radius |
| Order from 25.0 miles | Accepted, at boundary |
| Order from 26.0 miles | Rejected, "outside service area" |
| Find outlets near Detroit | Returns nearest outlet with distance |

### Payments

| Scenario | Expected Result |
|----------|----------------|
| Pay with valid Stripe card | 200, payment succeeded |
| Pay with declined card (`4000000000000002`) | 402, "Card declined" |
| Stripe timeout → Square fallback | 200, payment via Square |
| All gateways fail | 503, suggest COD if eligible |
| COD for new user (0 orders) | 403, "Need 3 completed orders" |
| COD for $150 order (max $100) | 403, "Exceeds COD limit" |
| Wallet with sufficient balance | 200, deducted from wallet |
| Wallet with $30 for $50 order | 200, split payment prompt |
| Refund to original method | 200, refund initiated |
| Refund to wallet | 200, wallet credited instantly |

### Driver Assignment

| Scenario | Expected Result |
|----------|----------------|
| Driver accepts within 30s | Order assigned, customer notified |
| Driver timeout (30s) | Next ranked driver gets request |
| Driver rejects | Next driver gets request |
| All 3 drivers reject | Admin alerted, manual assignment |
| No online drivers | Customer gets "finding driver" message |

### Admin

| Scenario | Expected Result |
|----------|----------------|
| Update service radius | Reflects immediately for new orders |
| Toggle COD off | Customers can't select COD |
| Create offer with past end date | Rejected, "end date must be in the future" |
| Delete active outlet with pending orders | Rejected, "has active orders" |

---

## 9. Database Seeding (Test Data)

### Seed Script Structure

Run the seed script to populate test data:

```bash
cd apps/server
pnpm seed
# or
npx ts-node src/scripts/seed.ts
```

### Collections to Seed

1. **Users** — at least 1 customer, 1 driver, 1 admin per role
2. **Outlets** — at least 1 outlet in Detroit, MI with 25mi radius
3. **Drivers** — 3 approved drivers assigned to the outlet
4. **AppConfig** — global config singleton with defaults
5. **Offers** — test offers (first-order, promo code, expired offer, future offer)
6. **Banners** — 2-3 active banners
7. **Wallets** — wallet for each customer with some balance
8. **Orders** — a few orders in various statuses for testing

### Sample Seed User Credentials

| Role | Phone | Name | Notes |
|------|-------|------|-------|
| Customer | +15551234567 | John Doe | 5 completed orders, $25 wallet |
| Customer | +15559876543 | Jane Smith | 0 orders (new user) |
| Driver | +15551112222 | Alex Morgan | Approved, online |
| Driver | +15553334444 | Sam Wilson | Approved, offline |
| Super Admin | +15550001111 | Admin User | Full access |
| Support Staff | +15550002222 | Support User | Limited access |

---

## 10. Postman / Thunder Client Collection Structure

```
LoadNBehold API/
├── Auth/
│   ├── Send OTP
│   ├── Verify OTP
│   ├── Google Sign-In
│   ├── Apple Sign-In
│   ├── Refresh Token
│   └── Logout
├── Customer/
│   ├── Get Profile
│   ├── Update Profile
│   ├── Add Address
│   ├── Update Address
│   ├── List Addresses
│   ├── Delete Address
│   ├── Nearby Outlets
│   └── Recommendations
├── Orders/
│   ├── Place Order
│   ├── List Orders
│   ├── Get Order Details
│   ├── Cancel Order
│   ├── Rate Order
│   ├── Track Order
│   ├── Reorder
│   ├── Raise Dispute
│   └── Download Invoice
├── Driver/
│   ├── Register
│   ├── Toggle Status
│   ├── Update Location
│   ├── Get Assigned Orders
│   ├── Accept Order
│   ├── Reject Order
│   ├── Update Order Status
│   ├── Upload Proof Photo
│   ├── Verify Delivery OTP
│   ├── Get Earnings
│   └── Tax Summary
├── Payments/
│   ├── Create Payment Intent
│   ├── Confirm Payment
│   ├── COD — Place
│   ├── COD — Collect
│   ├── COD — Deposit
│   ├── COD — Ledger
│   └── Process Refund
├── Wallet/
│   ├── Get Balance
│   ├── Top Up
│   ├── Pay with Wallet
│   └── Transaction History
├── Subscriptions & Loyalty/
│   ├── List Plans
│   ├── Subscribe
│   ├── Cancel Subscription
│   ├── Current Subscription
│   ├── Loyalty Points
│   └── Redeem Points
├── Recurring Orders/
│   ├── Create Recurring Order
│   ├── List Recurring Orders
│   ├── Update Recurring Order
│   └── Cancel Recurring Order
├── Family/
│   ├── Add Member
│   ├── List Members
│   └── Remove Member
├── Referral/
│   ├── Get Referral Code
│   └── Apply Referral Code
├── Support/
│   ├── Create Ticket
│   ├── List Tickets
│   ├── Ticket Details
│   ├── Reply to Ticket
│   └── Get FAQ
├── Admin — Dashboard/
│   ├── Dashboard Stats
│   ├── Global Config (GET)
│   ├── Global Config (PUT)
│   └── Audit Logs
├── Admin — Outlets/
│   ├── Create Outlet
│   ├── List Outlets
│   ├── Get Outlet
│   ├── Update Outlet
│   └── Delete Outlet
├── Admin — Orders/
│   ├── List All Orders
│   ├── Override Order Status
│   ├── Assign Driver
│   └── Adjust Price
├── Admin — Drivers/
│   ├── List Drivers
│   ├── Get Driver Details
│   ├── Approve/Reject Driver
│   └── Suspend Driver
├── Admin — Customers/
│   ├── List Customers
│   ├── Customer Details
│   └── Block/Unblock Customer
├── Admin — Offers/
│   ├── Create Offer
│   ├── List Offers
│   ├── Get Offer
│   ├── Update Offer
│   └── Delete Offer
├── Admin — Banners/
│   ├── Create Banner
│   ├── List Banners
│   ├── Update Banner
│   └── Delete Banner
├── Admin — Notifications/
│   └── Send Notification
├── Admin — COD/
│   ├── COD Dashboard
│   ├── Driver Cash Status
│   └── Reconcile Driver Cash
├── Admin — Wallet/
│   ├── View Credits
│   ├── Credit User Wallet
│   └── Debit User Wallet
├── Admin — Support/
│   ├── All Tickets
│   ├── Assign Ticket
│   └── Resolve Ticket
└── Admin — Reports/
    └── Generate Report (:type = revenue|orders|drivers|cod|sla)
```

### Postman Environment Variables

Set these in your Postman environment for easy token management:

| Variable | Initial Value | Usage |
|----------|---------------|-------|
| `BASE_URL` | `http://localhost:5000` | All requests |
| `CUSTOMER_TOKEN` | (set after auth) | Customer requests |
| `DRIVER_TOKEN` | (set after auth) | Driver requests |
| `ADMIN_TOKEN` | (set after auth) | Admin requests |
| `ORDER_ID` | (set after creating) | Order-related requests |
| `OUTLET_ID` | (set after seeding) | Outlet-related requests |
| `TICKET_ID` | (set after creating) | Support ticket requests |

---

## 11. Error Response Reference

All errors follow a standardized format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

### Common Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request body/params failed Zod validation |
| 400 | `INVALID_ORDER_STATUS` | Invalid status transition attempted |
| 400 | `ORDER_OUTSIDE_RADIUS` | Address is outside outlet service radius |
| 400 | `COD_AMOUNT_EXCEEDED` | Order exceeds max COD amount |
| 400 | `INSUFFICIENT_WALLET` | Wallet balance too low |
| 401 | `UNAUTHORIZED` | Missing or invalid auth token |
| 401 | `TOKEN_EXPIRED` | Access token has expired |
| 401 | `INVALID_OTP` | Wrong OTP code |
| 401 | `OTP_EXPIRED` | OTP has expired (>60s) |
| 403 | `FORBIDDEN` | Insufficient role/permissions |
| 403 | `COD_NOT_ELIGIBLE` | User doesn't meet COD requirements |
| 403 | `CANCEL_NOT_ALLOWED` | Order cannot be cancelled at this stage |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `DUPLICATE_ORDER` | Duplicate order (idempotency check) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 502 | `GATEWAY_ERROR` | Payment gateway error |
| 503 | `SERVICE_UNAVAILABLE` | Service is in maintenance mode |

---

## 12. Performance & Load Testing

### k6 Load Test Example

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp up to 50 users
    { duration: '3m', target: 200 },   // ramp up to 200 users
    { duration: '5m', target: 500 },   // ramp up to 500 users
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],   // 95% of requests under 200ms
    http_req_failed: ['rate<0.01'],     // <1% error rate
  },
};

export default function () {
  const baseUrl = 'http://localhost:5000';

  // Health check
  const health = http.get(`${baseUrl}/api/health`);
  check(health, { 'health OK': (r) => r.status === 200 });

  // List outlets (authenticated)
  const outlets = http.get(`${baseUrl}/api/customer/nearby-outlets?lat=42.33&lng=-83.04`, {
    headers: { 'Authorization': `Bearer ${__ENV.TOKEN}` },
  });
  check(outlets, { 'outlets OK': (r) => r.status === 200 });

  sleep(1);
}
```

### Run Load Test

```bash
k6 run --env TOKEN=your-test-token load-test.js
```

### Performance Targets

| Endpoint Category | P95 Latency Target | Max Throughput |
|-------------------|--------------------|----------------|
| Auth (OTP)        | < 500ms            | 100 req/s      |
| Customer CRUD     | < 100ms            | 500 req/s      |
| Order Placement   | < 300ms            | 200 req/s      |
| Order Tracking    | < 50ms             | 1000 req/s     |
| Admin Dashboard   | < 200ms            | 100 req/s      |
| Admin Reports     | < 2000ms           | 20 req/s       |

---

## 13. Debugging Tips

### View Server Logs

```bash
# Real-time logs (if running with pnpm dev)
# Logs are structured JSON via Pino

# Pretty-print logs
pnpm dev | npx pino-pretty
```

### Inspect MongoDB

```bash
# Connect to local MongoDB
docker exec -it loadnbehold-mongo mongosh

# List collections
use loadnbehold
show collections

# Find a user
db.users.findOne({ phone: "+15551234567" })

# Find recent orders
db.orders.find().sort({ createdAt: -1 }).limit(5).pretty()

# Check geospatial query
db.outlets.find({
  "address.location": {
    $nearSphere: {
      $geometry: { type: "Point", coordinates: [-83.0458, 42.3314] },
      $maxDistance: 40233  // 25 miles in meters
    }
  }
}).pretty()
```

### Inspect Redis

```bash
# Connect to local Redis
docker exec -it loadnbehold-redis redis-cli

# Check OTP stored for a phone
GET otp:+15551234567

# Check all keys
KEYS *

# Check driver location cache
GET driver:location:<driverId>

# Check rate limiting
GET ratelimit:otp:+15551234567
```

### Decode a JWT Token

```bash
# macOS/Linux
echo "eyJ..." | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool

# Or use jwt.io in browser
```

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| "Cannot connect to MongoDB" | Docker container not running | `docker-compose up -d mongodb` |
| "OTP not received" | Twilio credentials wrong | Check `TWILIO_ACCOUNT_SID`, use `DEV_OTP_BYPASS` for local |
| CORS error in browser | Origin not whitelisted | Add to `CORS_ALLOWED_ORIGINS` |
| 401 on all requests | Token expired or malformed | Re-authenticate, check token format |
| Stripe webhook 400 | Wrong webhook secret | Update `STRIPE_WEBHOOK_SECRET` from Stripe CLI |
| "Outside service radius" | Coordinates wrong | Verify lat/lng are correct (lat first, lng second in query params; lng first, lat second in GeoJSON) |
| WebSocket won't connect | Auth token not passed | Include `auth: { token }` in socket handshake |
| Slow queries | Missing indexes | Run `db.collection.getIndexes()` and verify 2dsphere indexes exist |

---

## Summary

- **107 REST API endpoints** across 13 modules
- **9 WebSocket events** for real-time features
- **~60 environment variables** (30 required, 30 optional)
- **13+ third-party services** to configure
- **5 admin roles** with different access levels
- **4 payment methods**: Online (Stripe/Square/PayPal), COD, Wallet, Split
- **Standardized error codes** for consistent client handling
- **Dev OTP bypass** for faster local testing
- **Performance targets** defined for every endpoint category

---

*Keep this guide updated as new endpoints are added. Use it alongside the IMPLEMENTATION.md for the complete picture.*
