# LoadNBehold - Startup Instructions

Complete guide to set up and run the project on a new system.

---

## Prerequisites

Install the following before starting:

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 20+ | https://nodejs.org/ (LTS recommended) |
| **pnpm** | 10.33+ | `npm install -g pnpm@10.33.0` |
| **Docker Desktop** | Latest | https://www.docker.com/products/docker-desktop/ |
| **Git** | Latest | https://git-scm.com/ |

**For Mobile development (optional):**

| Tool | Install |
|------|---------|
| **Expo CLI** | `npm install -g expo-cli` |
| **Expo Go app** | Install on your phone from App Store / Play Store |
| **Android Studio** | For Android emulator (optional) |
| **Xcode** | For iOS simulator - macOS only (optional) |

---

## Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url> loadnbehold
cd loadnbehold

# Install all dependencies (monorepo - installs everything)
pnpm install
```

This installs dependencies for all apps (server, web, admin, mobile) and shared packages.

---

## Step 2: Start MongoDB & Redis with Docker

The project uses MongoDB for the database and Redis for OTP storage, JWT blacklisting, driver location caching, and job queues (BullMQ).

```bash
# From the project root, start both services
docker compose up -d
```

This starts:
- **MongoDB 7** on `localhost:27017` (container: `lnb-mongodb`)
- **Redis 7** on `localhost:6379` (container: `lnb-redis`)

**Verify they're running:**
```bash
docker ps
```

You should see both `lnb-mongodb` and `lnb-redis` containers with status "Up".

**To stop them later:**
```bash
docker compose down
```

**To stop AND delete all data:**
```bash
docker compose down -v
```

### Manual Install (without Docker)

If you prefer not to use Docker:

**MongoDB:**
1. Download from https://www.mongodb.com/try/download/community (v7+)
2. Install and start the service
3. Default connection: `mongodb://localhost:27017`

**Redis:**
1. **Windows:** Download from https://github.com/microsoftarchive/redis/releases or use WSL
2. **macOS:** `brew install redis && brew services start redis`
3. **Linux:** `sudo apt install redis-server && sudo systemctl start redis`
4. Default connection: `redis://localhost:6379`

---

## Step 3: Configure Environment Variables

### Server (.env)

```bash
# Copy the example env file
cp apps/server/.env.example apps/server/.env
```

Open `apps/server/.env` and configure. **Minimum required for local development:**

```env
# ---- Core ----
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/loadnbehold
REDIS_URL=redis://localhost:6379

# ---- JWT (generate your own random strings) ----
JWT_ACCESS_SECRET=your-access-secret-change-this
JWT_REFRESH_SECRET=your-refresh-secret-change-this
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# ---- OTP (use console mode for dev - prints OTP to terminal) ----
OTP_PROVIDER=console
OTP_EXPIRY_SECONDS=60
OTP_LENGTH=6
DEV_OTP_BYPASS=true
DEV_OTP_CODE=123456

# ---- CORS ----
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# ---- URLs ----
API_BASE_URL=http://localhost:5000
WEB_APP_URL=http://localhost:3000
ADMIN_APP_URL=http://localhost:3001
```

**Optional services** (only needed if you use these features):

```env
# ---- Stripe (payments) ----
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ---- Twilio (SMS OTP in production) ----
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
TWILIO_VERIFY_SERVICE_SID=VA...

# ---- SendGrid (email) ----
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@loadnbehold.com

# ---- AWS S3 (file uploads) ----
STORAGE_PROVIDER=local
AWS_S3_BUCKET=...
AWS_S3_REGION=us-east-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# ---- Firebase (push notifications) ----
FIREBASE_SERVICE_ACCOUNT_PATH=./src/config/firebase-service-account.json

# ---- Mapbox ----
MAPBOX_ACCESS_TOKEN=pk.eyJ...
```

### Web App (.env.local)

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Admin App (.env.local)

Create `apps/admin/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

### Mobile App

Create `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
EXPO_PUBLIC_WS_BASE_URL=http://localhost:5000
```

> **Important for physical devices:** Replace `localhost` with your computer's LAN IP address (e.g., `http://192.168.1.100:5000/api/v1`). Find it with `ipconfig` (Windows) or `ifconfig` (macOS/Linux).

---

## Step 4: Seed the Database

```bash
pnpm db:seed
```

This creates test data including:

| Type | Details |
|------|---------|
| **Admin accounts** | super_admin, support_staff, marketing, finance |
| **Customer accounts** | 2 customers (one with 5 orders, one new) |
| **Driver accounts** | 2 drivers (one online, one offline) |
| **Outlet** | Detroit Central (sample) |
| **Content** | 2 banners, 2 offers, app config |

All test accounts use **OTP code: `123456`** (when `DEV_OTP_BYPASS=true`).

---

## Step 5: Start the Apps

### Option A: Start Everything at Once

```bash
pnpm dev
```

This uses Turborepo to start all apps in parallel.

### Option B: Start Apps Individually

Open separate terminal windows for each:

```bash
# Terminal 1 - Server (API)
pnpm dev:server

# Terminal 2 - Web App (customer-facing)
pnpm dev:web

# Terminal 3 - Admin Dashboard
pnpm dev:admin

# Terminal 4 - Mobile App
cd apps/mobile
npx expo start
```

---

## Step 6: Access the Apps

| App | URL | Description |
|-----|-----|-------------|
| **Server API** | http://localhost:5000 | Express API (health check: `GET /health`) |
| **Web App** | http://localhost:3000 | Customer-facing Next.js app |
| **Admin Dashboard** | http://localhost:3001 | Admin panel (Next.js) |
| **Mobile App** | Expo Go on phone | Scan QR code from `expo start` |
| **API Docs** | http://localhost:5000/api/v1/... | All API routes under `/api/v1` |

---

## Step 7: Login with Test Accounts

All accounts use phone-based OTP login. With `DEV_OTP_BYPASS=true`, use OTP code **`123456`** for any account.

### Web App (http://localhost:3000)
- Enter any seeded customer phone number
- Enter OTP: `123456`

### Admin Dashboard (http://localhost:3001)
- Enter admin phone number
- Enter OTP: `123456`
- Admin roles: `super_admin` (full access), `support_staff`, `marketing`, `finance` (limited access)

### Mobile App
- Open Expo Go on your phone
- Scan the QR code from the terminal
- Login with customer or driver phone number + OTP `123456`
- Customers see the customer tab layout, drivers see the driver dashboard

---

## Project Structure

```
loadnbehold/
├── apps/
│   ├── server/          # Express API (port 5000)
│   ├── web/             # Next.js customer web app (port 3000)
│   ├── admin/           # Next.js admin dashboard (port 3001)
│   └── mobile/          # Expo React Native app
├── packages/
│   ├── types/           # Shared TypeScript types
│   ├── constants/       # Shared constants (order statuses, etc.)
│   ├── validators/      # Shared Zod validation schemas
│   ├── design-tokens/   # Color tokens, spacing, typography
│   └── config/          # Client configuration helper
├── docker-compose.yml   # MongoDB + Redis
├── turbo.json           # Turborepo config
├── pnpm-workspace.yaml  # Workspace definition
└── package.json         # Root scripts
```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm dev:server` | Start only the server |
| `pnpm dev:web` | Start only the web app |
| `pnpm dev:admin` | Start only the admin app |
| `pnpm build` | Build all apps for production |
| `pnpm db:seed` | Seed database with test data |
| `pnpm lint` | Run ESLint across all apps |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm test` | Run tests (server) |
| `pnpm clean` | Clean build outputs |
| `docker compose up -d` | Start MongoDB + Redis |
| `docker compose down` | Stop MongoDB + Redis |
| `docker compose down -v` | Stop + delete all data volumes |

---

## Troubleshooting

### "Cannot connect to MongoDB"
- Ensure Docker is running: `docker ps`
- Check MongoDB container: `docker logs lnb-mongodb`
- Verify port 27017 is not used by another process

### "Cannot connect to Redis"
- Check Redis container: `docker logs lnb-redis`
- Verify port 6379 is free
- Note: In dev mode, the server will continue without Redis (with warnings). MongoDB is required.

### "CORS errors in browser"
- Ensure `CORS_ALLOWED_ORIGINS` in server `.env` includes your web/admin URLs
- Default: `http://localhost:3000,http://localhost:3001`

### "OTP not working"
- Ensure `DEV_OTP_BYPASS=true` and `DEV_OTP_CODE=123456` in server `.env`
- Ensure `OTP_PROVIDER=console` (OTPs will print to server terminal)

### "Mobile app can't reach server"
- Replace `localhost` with your machine's LAN IP in mobile env
- Ensure phone and computer are on the same WiFi network
- Check firewall isn't blocking port 5000

### "pnpm install fails"
- Ensure you're using pnpm 10.33+: `pnpm --version`
- Delete `node_modules` and `pnpm-lock.yaml`, then retry: `pnpm install`

### "Type errors in shared packages"
- Shared packages have no build step — they're transpiled directly by each app
- Run `pnpm type-check` to verify everything compiles

### "Port already in use"
- Server: change `PORT` in `apps/server/.env`
- Web: `PORT=3002 pnpm dev:web`
- Admin: set port in `apps/admin/package.json` dev script

---

## Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Server** | Express 4, TypeScript, tsx (dev runner) |
| **Database** | MongoDB 7 (Mongoose 8 ODM) |
| **Cache/Queue** | Redis 7 (ioredis + BullMQ) |
| **Web/Admin** | Next.js 15, React 19, Tailwind CSS |
| **Mobile** | Expo SDK 52, React Native 0.76, Expo Router 4 |
| **Auth** | JWT (access + refresh tokens), phone OTP |
| **Payments** | Stripe (primary), Square, PayPal (fallbacks) |
| **Real-time** | Socket.IO (order tracking, driver location) |
| **Email** | SendGrid |
| **SMS** | Twilio |
| **Push** | Firebase Cloud Messaging |
| **Storage** | AWS S3 (or local in dev) |
| **Validation** | Zod |
| **State** | Zustand |
