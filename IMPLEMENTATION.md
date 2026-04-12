# LoadNBehold — Laundry Service App

## Complete Implementation Blueprint

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [UI/UX Design System](#4-uiux-design-system)
5. [Screen-by-Screen Design Specifications](#5-screen-by-screen-design-specifications)
6. [Feature Breakdown](#6-feature-breakdown)
7. [Database Schema](#7-database-schema)
8. [API Endpoints Overview](#8-api-endpoints-overview)
9. [Environment Configuration](#9-environment-configuration)
10. [Payment Strategy](#10-payment-strategy)
11. [Real-Time Tracking Implementation](#11-real-time-tracking-implementation)
12. [Project Structure](#12-project-structure)
13. [Implementation Phases](#13-implementation-phases)
14. [Security & Compliance](#14-security--compliance)
15. [Driver Assignment Algorithm](#15-driver-assignment-algorithm)
16. [Cancellation & Refund Policy Engine](#16-cancellation--refund-policy-engine)
17. [Subscription & Loyalty Program](#17-subscription--loyalty-program)
18. [Laundry Processing Workflow](#18-laundry-processing-workflow)
19. [Background Job Queue](#19-background-job-queue)
20. [Testing Strategy](#20-testing-strategy)
21. [API Versioning & Backward Compatibility](#21-api-versioning--backward-compatibility)
22. [Offline & Error Resilience](#22-offline--error-resilience)
23. [Analytics & Observability](#23-analytics--observability)
24. [Accessibility & Internationalization](#24-accessibility--internationalization)
25. [Deep Linking & Sharing](#25-deep-linking--sharing)
26. [Additional Database Collections](#26-additional-database-collections)
27. [Deployment Architecture](#27-deployment-architecture)
28. [Performance Optimization](#28-performance-optimization)
29. [Design Principles Summary](#29-design-principles-summary)
30. [Third-Party Services Summary](#30-third-party-services-summary)

---

## 1. Project Overview

**LoadNBehold** is a full-service on-demand laundry pickup and delivery platform serving the state of Michigan, USA. Customers can schedule laundry pickups from their location, track their order in real-time (similar to Zepto/Zomato), and receive deliveries — all within a configurable service radius. The platform supports future multi-outlet expansion with a fully configurable admin dashboard.

### Core Personas

| Persona      | Description                                                                   |
| ------------ | ----------------------------------------------------------------------------- |
| **Customer** | Orders laundry pickup/delivery, tracks orders live, pays online               |
| **Driver**   | Verified driver who picks up and delivers laundry                             |
| **Admin**    | Manages outlets, drivers, pricing, offers, banners, notifications, config     |

### Brand Identity

| Attribute       | Value                                                    |
| --------------- | -------------------------------------------------------- |
| **Brand Name**  | LoadNBehold                                              |
| **Tagline**     | "Fresh clothes, delivered."                              |
| **Tone**        | Friendly, trustworthy, efficient, slightly playful       |
| **Target Demo** | Urban professionals, families, college students in MI    |
| **Positioning** | Premium convenience at affordable pricing                |

---

## 2. Tech Stack

### Frontend (Customer & Admin Web App)

| Layer          | Technology                   | Reason                                              |
| -------------- | ---------------------------- | --------------------------------------------------- |
| Framework      | **Next.js 14+ (App Router)** | SSR, SEO, API routes, responsive by default         |
| UI Library     | **Tailwind CSS + shadcn/ui** | Design system primitives with rapid iteration       |
| State          | **Zustand**                  | Lightweight global state                            |
| Maps           | **Mapbox GL JS**             | Real-time driver tracking, geofencing, radius viz   |
| Animations     | **Framer Motion**            | Smooth micro-interactions and page transitions      |
| Real-time      | **Socket.IO Client**         | Live order tracking, driver location updates        |
| Forms          | **React Hook Form + Zod**    | Validation with type safety                         |
| Phone Auth     | **OTP input component**      | Custom OTP flow via backend                         |
| Icons          | **Lucide React**             | Consistent, clean icon set (stroke-based)           |
| Charts         | **Recharts**                 | Admin dashboard charts and analytics                |
| Date Picker    | **date-fns + shadcn DatePicker** | Lightweight date handling                       |
| Toast/Alerts   | **Sonner**                   | Minimal, animated toast notifications               |

### Mobile App (Cross-Platform)

| Layer          | Technology                   | Reason                                              |
| -------------- | ---------------------------- | --------------------------------------------------- |
| Framework      | **React Native (Expo)**      | Single codebase for iOS + Android, shared logic with web |
| Navigation     | **Expo Router**              | File-based routing, deep linking                    |
| UI             | **NativeWind (Tailwind)**    | Consistent design language with web                 |
| Maps           | **react-native-maps + Mapbox** | Native map performance, live tracking            |
| Notifications  | **Expo Notifications + FCM/APNs** | Push notifications                             |
| Real-time      | **Socket.IO Client**         | Live order/driver tracking                          |
| Animations     | **React Native Reanimated**  | 60fps native animations                             |
| Haptics        | **Expo Haptics**             | Tactile feedback on key actions                     |

### Backend

| Layer          | Technology                   | Reason                                              |
| -------------- | ---------------------------- | --------------------------------------------------- |
| Runtime        | **Node.js + Express.js**     | Fast, JS ecosystem consistency                      |
| Language       | **TypeScript**               | Type safety across full stack                       |
| API Style      | **REST + WebSocket**         | REST for CRUD, WebSocket for real-time tracking     |
| Auth           | **Phone OTP (Twilio/MSG91)** | Phone-first auth, no passwords                      |
| Payments       | **Stripe (primary) + Square / PayPal (fallback)** | US-based, auto-failover     |
| File Storage   | **AWS S3 / Cloudflare R2**   | Banner images, receipts, driver docs                |
| Push Notifs    | **Firebase Cloud Messaging** | Cross-platform push notifications                   |
| SMS/OTP        | **Twilio / MSG91**           | OTP delivery, order status SMS                      |
| Email          | **SendGrid / AWS SES**       | Transactional emails, receipts                      |
| Cron Jobs      | **node-cron / BullMQ**       | Scheduled tasks, offer expiry, report generation    |
| Geospatial     | **MongoDB geospatial / PostGIS** | Radius queries, outlet coverage zones           |

### Database

| Database           | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| **MongoDB**        | Primary DB — flexible schema for orders, users, config, outlets. Native geospatial indexing (`2dsphere`) for radius-based queries |
| **Redis**          | OTP storage (TTL-based), session cache, rate limiting, real-time driver location cache |

> **Why MongoDB over PostgreSQL?** The app has highly dynamic config (admin-configurable fields, variable offer structures, outlet-specific settings). MongoDB's flexible documents handle this naturally. Its native `$geoWithin` and `$nearSphere` operators handle the radius-based outlet matching without needing PostGIS extensions.

### DevOps & Infra

| Tool               | Purpose                            |
| ------------------- | ---------------------------------- |
| **Docker**          | Containerized deployments          |
| **AWS / Vercel**    | Hosting (Vercel for web, AWS for backend) |
| **GitHub Actions**  | CI/CD pipeline                     |
| **Sentry**          | Error monitoring                   |
| **Cloudflare**      | CDN, DDoS protection              |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Customer  │  │ Customer     │  │ Admin Dashboard    │    │
│  │ Mobile App│  │ Web App      │  │ (Next.js)          │    │
│  │ (Expo)    │  │ (Next.js)    │  │                    │    │
│  └─────┬─────┘  └──────┬───────┘  └─────────┬──────────┘   │
│        │               │                     │              │
│  ┌─────┴─────┐         │           ┌─────────┴──────────┐   │
│  │ Driver    │         │           │ Driver Dashboard   │   │
│  │ Mobile App│         │           │ (Web)              │   │
│  │ (Expo)    │         │           │                    │   │
│  └─────┬─────┘         │           └─────────┬──────────┘   │
└────────┼───────────────┼─────────────────────┼──────────────┘
         │               │                     │
         └───────────────┼─────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   API Gateway /     │
              │   Load Balancer     │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
   ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼──────┐
   │  REST API  │  │ WebSocket │  │  Webhook   │
   │  Server    │  │  Server   │  │  Handler   │
   │ (Express)  │  │(Socket.IO)│  │ (Payments) │
   └─────┬─────┘  └─────┬─────┘  └─────┬──────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
   ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼──────┐
   │  MongoDB   │  │   Redis   │  │  AWS S3    │
   │ (Primary)  │  │  (Cache)  │  │ (Storage)  │
   └───────────┘  └───────────┘  └────────────┘
```

---

## 4. UI/UX Design System

This section defines every visual guideline for building a polished, modern, production-grade interface. Every component, screen, and interaction should follow these rules.

### 4.1 Design Philosophy

The LoadNBehold UI follows a **clean, elevated, modern** aesthetic — inspired by apps like Linear, Vercel, Stripe Dashboard, Arc Browser, and Zepto. It avoids the "generic Bootstrap" look by combining:

- **Generous whitespace** — content breathes, never cramped
- **Subtle depth** — layered cards with soft shadows, not flat or skeuomorphic
- **Restrained color** — neutral base with strategic accent color pops
- **Purposeful motion** — animations that communicate state, not decorate
- **Typographic hierarchy** — size, weight, and color create clear visual order without relying on borders or dividers

### 4.2 Color Palette

#### Light Mode (Default)

| Token                  | Value       | Usage                                          |
| ---------------------- | ----------- | ---------------------------------------------- |
| `--background`         | `#FAFAFA`   | Page background (warm off-white, not sterile)  |
| `--surface`            | `#FFFFFF`   | Cards, modals, sheets, elevated containers     |
| `--surface-secondary`  | `#F4F4F5`   | Input fields, hover states, secondary surfaces |
| `--border`             | `#E4E4E7`   | Card borders, dividers (subtle, zinc-200)      |
| `--border-hover`       | `#D4D4D8`   | Borders on interactive hover                   |
| `--text-primary`       | `#09090B`   | Headings, primary content (zinc-950)           |
| `--text-secondary`     | `#71717A`   | Descriptions, labels, metadata (zinc-500)      |
| `--text-tertiary`      | `#A1A1AA`   | Placeholder text, disabled states (zinc-400)   |
| `--brand`              | `#2563EB`   | Primary action buttons, links, active states (blue-600) |
| `--brand-hover`        | `#1D4ED8`   | Hover state on brand elements (blue-700)       |
| `--brand-light`        | `#EFF6FF`   | Brand tint backgrounds (blue-50)               |
| `--brand-muted`        | `#BFDBFE`   | Tags, badges with brand color (blue-200)       |
| `--success`            | `#16A34A`   | Delivered, paid, approved, online (green-600)  |
| `--success-light`      | `#F0FDF4`   | Success background tint (green-50)             |
| `--warning`            | `#EA580C`   | Pending, caution states (orange-600)           |
| `--warning-light`      | `#FFF7ED`   | Warning background tint (orange-50)            |
| `--error`              | `#DC2626`   | Errors, failed, declined, overdue (red-600)    |
| `--error-light`        | `#FEF2F2`   | Error background tint (red-50)                 |

#### Dark Mode

| Token                  | Value       | Usage                                          |
| ---------------------- | ----------- | ---------------------------------------------- |
| `--background`         | `#09090B`   | Page background (zinc-950)                     |
| `--surface`            | `#18181B`   | Cards, modals, elevated containers (zinc-900)  |
| `--surface-secondary`  | `#27272A`   | Input fields, hover states (zinc-800)          |
| `--border`             | `#3F3F46`   | Borders, dividers (zinc-700)                   |
| `--text-primary`       | `#FAFAFA`   | Headings, primary content (zinc-50)            |
| `--text-secondary`     | `#A1A1AA`   | Descriptions, labels (zinc-400)                |
| `--text-tertiary`      | `#71717A`   | Placeholders, disabled (zinc-500)              |
| `--brand`              | `#3B82F6`   | Primary actions (blue-500, brighter for dark)  |
| `--brand-hover`        | `#60A5FA`   | Hover state (blue-400)                         |
| `--brand-light`        | `#172554`   | Brand tint backgrounds (blue-950)              |

#### Gradient Accents (Used Sparingly)

```css
/* Hero sections, CTAs, premium badges */
--gradient-brand: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);

/* Success states, completed order celebration */
--gradient-success: linear-gradient(135deg, #16A34A 0%, #0EA5E9 100%);

/* Premium/subscription badges */
--gradient-premium: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);

/* Subtle card sheen (light mode only) */
--gradient-surface: linear-gradient(145deg, #FFFFFF 0%, #F4F4F5 100%);
```

### 4.3 Typography

Use **Inter** as the primary typeface (or system font stack as fallback). Inter is optimized for screens, has excellent readability at small sizes, and supports tabular figures for numbers.

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

#### Type Scale

| Name       | Size    | Weight    | Line Height | Letter Spacing | Usage                          |
| ---------- | ------- | --------- | ----------- | -------------- | ------------------------------ |
| `display`  | 36px    | 700 Bold  | 1.1         | -0.02em        | Hero headlines only            |
| `h1`       | 30px    | 700 Bold  | 1.2         | -0.02em        | Page titles                    |
| `h2`       | 24px    | 600 Semi  | 1.3         | -0.01em        | Section headings               |
| `h3`       | 20px    | 600 Semi  | 1.4         | -0.01em        | Card titles, subsections       |
| `h4`       | 16px    | 600 Semi  | 1.5         | 0              | Sidebar headings, list titles  |
| `body`     | 15px    | 400 Reg   | 1.6         | 0              | Default body text              |
| `body-sm`  | 14px    | 400 Reg   | 1.5         | 0              | Secondary text, table cells    |
| `caption`  | 13px    | 500 Med   | 1.4         | 0.01em         | Labels, timestamps, metadata   |
| `tiny`     | 11px    | 500 Med   | 1.3         | 0.02em         | Badges, micro-labels           |

#### Typography Rules

- **Never use font-weight below 400** — thin weights hurt readability on most screens
- **Use semibold (600) for emphasis**, not bold (700) — bold is reserved for headings
- **Numbers in data displays** should use `font-variant-numeric: tabular-nums` for alignment
- **Line length**: body text should not exceed 65-75 characters per line (use `max-w-prose`)
- **Heading color** is always `--text-primary`; body text is `--text-primary` or `--text-secondary` depending on hierarchy

### 4.4 Spacing & Layout

#### Spacing Scale (8px Base Grid)

All spacing derives from a base unit of **4px**, primarily using multiples of **8px**:

| Token  | Value  | Usage                                |
| ------ | ------ | ------------------------------------ |
| `xs`   | 4px    | Inline icon gaps, badge padding      |
| `sm`   | 8px    | Tight padding, small gaps            |
| `md`   | 12px   | Button padding (vertical), input padding |
| `base` | 16px   | Default gap, card padding, section spacing |
| `lg`   | 24px   | Card padding (desktop), section gaps |
| `xl`   | 32px   | Section spacing, page margin         |
| `2xl`  | 48px   | Major section dividers               |
| `3xl`  | 64px   | Page-level vertical spacing          |
| `4xl`  | 96px   | Hero sections, landing page spacing  |

#### Container Widths

```css
--container-sm: 640px;     /* Auth pages, modals */
--container-md: 768px;     /* Content pages */
--container-lg: 1024px;    /* Dashboard sidebar + content */
--container-xl: 1280px;    /* Admin dashboard full width */
--container-max: 1440px;   /* Absolute maximum, centered */
```

#### Responsive Breakpoints

| Breakpoint | Width    | Target                         |
| ---------- | -------- | ------------------------------ |
| `sm`       | 640px    | Large phones (landscape)       |
| `md`       | 768px    | Tablets (portrait)             |
| `lg`       | 1024px   | Tablets (landscape), laptops   |
| `xl`       | 1280px   | Desktops                       |
| `2xl`      | 1536px   | Large desktops                 |

#### Layout Patterns

- **Customer web**: Single-column centered content, max-width 480px on mobile, 768px on desktop
- **Admin dashboard**: Sidebar (256px collapsed 64px) + main content area, sticky top bar
- **Mobile**: Full-bleed cards, bottom sheet modals, tab bar navigation
- **Grid**: Use CSS Grid for admin tables/dashboards; Flexbox for component layouts

### 4.5 Component Design Tokens

#### Border Radius

| Token           | Value  | Usage                                    |
| --------------- | ------ | ---------------------------------------- |
| `radius-sm`     | 6px    | Badges, tags, small chips                |
| `radius-md`     | 8px    | Buttons, inputs, small cards             |
| `radius-lg`     | 12px   | Cards, modals, dropdown menus            |
| `radius-xl`     | 16px   | Large cards, image containers            |
| `radius-2xl`    | 20px   | Bottom sheets, hero sections             |
| `radius-full`   | 9999px | Avatars, pill buttons, toggle switches   |

#### Shadows (Elevation System)

Use shadows to establish hierarchy. Higher elevation = more important/interactive.

```css
/* Level 0 — Flat (default state for most elements) */
--shadow-none: none;

/* Level 1 — Subtle lift (cards, inputs on focus) */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Level 2 — Standard card elevation */
--shadow-md: 0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08);

/* Level 3 — Dropdowns, floating elements */
--shadow-lg: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05);

/* Level 4 — Modals, dialogs */
--shadow-xl: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);

/* Level 5 — Toasts, command palettes */
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.15);

/* Colored shadow for brand buttons */
--shadow-brand: 0 4px 14px 0 rgba(37, 99, 235, 0.25);

/* Inset shadow for pressed states */
--shadow-inset: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
```

#### Borders

```css
--border-width: 1px;
--border-style: solid;
--border-color: var(--border);     /* #E4E4E7 light, #3F3F46 dark */

/* Cards */
border: 1px solid var(--border);

/* Interactive elements on hover — border darkens subtly */
border-color: var(--border-hover);

/* Focus rings (accessibility + beauty) */
--ring-offset: 2px;
--ring-width: 2px;
--ring-color: var(--brand);
/* Applied as: ring-2 ring-brand ring-offset-2 ring-offset-background */
```

### 4.6 Component Library (shadcn/ui Customization)

Every shadcn component should be styled to match the design system. Key overrides:

#### Buttons

| Variant     | Background          | Text            | Border       | Shadow             | Usage                  |
| ----------- | ------------------- | --------------- | ------------ | ------------------- | ---------------------- |
| `primary`   | `--brand`           | White           | None         | `--shadow-brand`    | Main CTAs              |
| `secondary` | `--surface`         | `--text-primary`| `--border`   | `--shadow-sm`       | Secondary actions      |
| `outline`   | Transparent         | `--brand`       | `--brand`    | None                | Tertiary actions       |
| `ghost`     | Transparent         | `--text-secondary` | None      | None                | Inline actions, icons  |
| `danger`    | `--error`           | White           | None         | Error glow          | Delete, cancel         |
| `success`   | `--success`         | White           | None         | Success glow        | Confirm, approve       |

```css
/* Button base styles */
.btn {
  height: 40px;                    /* Default size */
  padding: 0 16px;
  border-radius: var(--radius-md); /* 8px */
  font-weight: 500;
  font-size: 14px;
  transition: all 150ms ease;
  cursor: pointer;
}

/* Sizes */
.btn-sm { height: 32px; padding: 0 12px; font-size: 13px; }
.btn-lg { height: 48px; padding: 0 24px; font-size: 15px; }
.btn-xl { height: 56px; padding: 0 32px; font-size: 16px; border-radius: var(--radius-lg); }

/* Primary hover: slight lift + deeper shadow */
.btn-primary:hover {
  background: var(--brand-hover);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
  transform: translateY(-1px);
}

/* Primary active: press down */
.btn-primary:active {
  transform: translateY(0);
  box-shadow: var(--shadow-brand);
}
```

#### Input Fields

```css
.input {
  height: 44px;
  padding: 0 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 15px;
  color: var(--text-primary);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.input::placeholder {
  color: var(--text-tertiary);
}

.input:hover {
  border-color: var(--border-hover);
}

.input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  outline: none;
}

.input-error {
  border-color: var(--error);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

/* Labels — always above inputs, never floating */
.label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
}

/* Helper text below inputs */
.helper {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}
```

#### Cards

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);   /* 12px */
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 200ms ease, border-color 200ms ease;
}

/* Interactive cards (clickable) — lift on hover */
.card-interactive:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-hover);
}

/* Highlighted/selected card — brand border */
.card-selected {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-light);
}

/* Stat cards (dashboard) */
.card-stat {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card-stat .label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
.card-stat .value { font-size: 28px; font-weight: 700; color: var(--text-primary); }
.card-stat .trend { font-size: 13px; font-weight: 500; }
.card-stat .trend.up { color: var(--success); }
.card-stat .trend.down { color: var(--error); }
```

#### Badges & Status Chips

```css
/* Base badge */
.badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

/* Semantic badge variants */
.badge-success { background: var(--success-light); color: var(--success); }
.badge-warning { background: var(--warning-light); color: var(--warning); }
.badge-error   { background: var(--error-light);   color: var(--error);   }
.badge-info    { background: var(--brand-light);    color: var(--brand);   }
.badge-neutral { background: var(--surface-secondary); color: var(--text-secondary); }
```

**Status badge mapping:**

| Order Status        | Badge Variant | Label              |
| ------------------- | ------------- | -------------------|
| `placed`            | `info`        | Order Placed       |
| `driver_assigned`   | `info`        | Driver Assigned    |
| `pickup_enroute`    | `warning`     | Pickup En Route    |
| `picked_up`         | `warning`     | Picked Up          |
| `at_laundry`        | `neutral`     | At Laundry         |
| `processing`        | `neutral`     | Processing         |
| `quality_check`     | `neutral`     | Quality Check      |
| `out_for_delivery`  | `warning`     | Out for Delivery   |
| `delivered`         | `success`     | Delivered          |
| `cancelled`         | `error`       | Cancelled          |

#### Modals & Dialogs

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);    /* 16px */
  box-shadow: var(--shadow-xl);
  padding: 24px;
  max-width: 480px;
  width: 90vw;
  animation: modal-enter 200ms ease;
}

@keyframes modal-enter {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
```

#### Bottom Sheets (Mobile)

```css
.bottom-sheet {
  background: var(--surface);
  border-top-left-radius: var(--radius-2xl);  /* 20px */
  border-top-right-radius: var(--radius-2xl);
  box-shadow: var(--shadow-2xl);
  padding: 16px 20px 32px;
}

/* Drag handle indicator */
.bottom-sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: var(--radius-full);
  margin: 0 auto 16px;
}
```

#### Tables (Admin Dashboard)

```css
.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.table th {
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-secondary);
  position: sticky;
  top: 0;
}

.table td {
  font-size: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
  vertical-align: middle;
}

.table tr:hover td {
  background: var(--surface-secondary);
}

.table tr:last-child td {
  border-bottom: none;
}
```

#### Toasts (Sonner)

```css
/* Customize Sonner toast for brand consistency */
[data-sonner-toast] {
  --border-radius: var(--radius-lg);
  font-family: var(--font-sans);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
}
```

### 4.7 Animation & Motion Guidelines

#### Principles

1. **Speed**: All transitions between 100-300ms. Nothing slower unless it's decorative (e.g., a background gradient shift).
2. **Easing**: Use `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for hover states. Never use `linear` for UI transitions.
3. **Purposeful**: Every animation should communicate a state change — element appearing, element moving, state updating. No decorative bounces or unnecessary wiggles.
4. **Reduced motion**: All animations should respect `prefers-reduced-motion: reduce`. Replace transforms/fades with instant visibility changes.

#### Standard Transitions

```css
/* Hover state changes (color, shadow, border) */
transition: all 150ms ease;

/* Element entrance (fade in + slight slide) */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
animation: fade-in-up 200ms ease-out;

/* Page transition (Framer Motion) */
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15, ease: "easeIn" } },
};

/* Skeleton loading shimmer */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--surface-secondary) 25%, var(--border) 50%, var(--surface-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}
```

#### Micro-Interactions

| Action                 | Animation                                        | Duration |
| ---------------------- | ------------------------------------------------ | -------- |
| Button press           | `scale(0.97)` then release                      | 100ms    |
| Card hover             | Shadow deepens, border lightens, `translateY(-2px)` | 150ms |
| Toggle switch          | Thumb slides, track color fades                  | 200ms    |
| Order status change    | New status slides in from right, old fades left  | 250ms    |
| Toast appears          | Slides up from bottom with fade                  | 200ms    |
| Modal opens            | Overlay fades, modal scales from 0.95 to 1       | 200ms    |
| Bottom sheet opens     | Slides up from off-screen with spring easing     | 300ms    |
| Live tracking marker   | Smooth position interpolation between GPS points | 1000ms   |
| Success checkmark      | SVG path draw animation + green circle scale     | 400ms    |
| Skeleton → content     | Crossfade with 100ms overlap                     | 200ms    |
| Pull to refresh        | Spinner scales in, spins, scales out             | Custom   |
| Tab switch             | Underline slides to active tab position          | 200ms    |

### 4.8 Iconography

Use **Lucide React** (stroke-based, 24x24 default viewport) consistently across the app.

#### Rules

- Default stroke width: **1.75px** (the Lucide default of 2px feels heavy at small sizes)
- Icon size in buttons: **16px** (with 8px gap to label)
- Icon size in navigation: **20px**
- Icon size standalone (empty states, features): **24px** or **32px**
- Monochrome icons only — icon color should match its text color (`--text-primary` or `--text-secondary`)
- Never use filled icons except for: heart (favorites), star (ratings), notification bell (unread indicator)

#### Key Icons

| Feature             | Icon                  | Notes                         |
| ------------------- | --------------------- | ----------------------------- |
| Home                | `House`               |                               |
| Orders              | `ShoppingBag`         |                               |
| Tracking            | `MapPin`              |                               |
| Wallet              | `Wallet`              |                               |
| Profile             | `User`                |                               |
| Settings            | `Settings`            | Gear icon                     |
| Notifications       | `Bell`                | Dot indicator when unread     |
| Search              | `Search`              |                               |
| Filter              | `SlidersHorizontal`   |                               |
| Calendar/Schedule   | `Calendar`            |                               |
| Pickup              | `Package`             |                               |
| Delivery            | `Truck`               |                               |
| Wash & Fold         | `Shirt`               | Custom or closest match       |
| Dry Clean           | `Sparkles`            |                               |
| Iron                | `Flame`               | Or custom iron icon           |
| Phone               | `Phone`               |                               |
| Chat                | `MessageCircle`       |                               |
| Add                 | `Plus`                |                               |
| Close               | `X`                   |                               |
| Back                | `ArrowLeft`           |                               |
| Chevron (expand)    | `ChevronRight`        |                               |
| Check               | `Check`               |                               |
| Error               | `AlertCircle`         |                               |
| Info                | `Info`                |                               |
| Star (rating)       | `Star` (filled)       | Filled for rated, stroke for unrated |

### 4.9 Empty States & Loading

#### Empty States

Every list or data view must have a designed empty state containing:
1. An **illustration or icon** (48px Lucide icon in `--text-tertiary` color, or a custom SVG illustration)
2. A **headline** (h3, e.g., "No orders yet")
3. A **description** (body-sm, e.g., "Your order history will appear here once you place your first order.")
4. A **CTA button** (primary, e.g., "Place your first order")

```
┌──────────────────────────────┐
│                              │
│         📦 (48px icon)       │
│                              │
│       No orders yet          │ ← h3, text-primary
│   Place your first order     │ ← body-sm, text-secondary
│   to see it here.            │
│                              │
│     [ Start an Order ]       │ ← primary button
│                              │
└──────────────────────────────┘
```

#### Loading States

- **Page-level loading**: Full skeleton matching the content layout (cards, text lines, images). Never a centered spinner on a blank page.
- **Button loading**: Replace button label with a 16px spinner, button width stays constant (use `min-width`), button stays disabled.
- **Inline loading**: Small 14px spinner next to the element being loaded.
- **Pull to refresh (mobile)**: Custom spinner that scales in at top of scroll view.
- **Map loading**: Light grey rectangle with a shimmer effect, matching the map container dimensions.

### 4.10 Dark Mode Implementation

- Toggle location: Profile/Settings page (also auto-detect via `prefers-color-scheme`)
- Implementation: CSS custom properties toggled by a `dark` class on `<html>` (Tailwind's class-based dark mode)
- Persist user preference in `localStorage` and sync to user profile (so it follows across devices)
- Images and illustrations: provide dark-mode variants or apply a subtle brightness reduction (`filter: brightness(0.9)`)
- Maps: switch to Mapbox's built-in dark style (`mapbox://styles/mapbox/dark-v11`)

### 4.11 Image & Media Guidelines

| Asset Type        | Format    | Max Size | Dimensions          | Notes                         |
| ----------------- | --------- | -------- | ------------------- | ----------------------------- |
| Banners (home)    | WebP/AVIF | 200KB    | 1200x400 (3:1)      | With fallback JPG             |
| Service icons     | SVG       | 5KB      | 64x64               | Monochrome, theme-aware       |
| User avatars      | WebP      | 50KB     | 200x200 (1:1)       | Circle-cropped in UI          |
| Proof photos      | WebP/JPG  | 2MB      | Original (min 800px) | Compressed on upload          |
| Driver documents  | PDF/JPG   | 10MB     | Original             | Stored encrypted              |
| App icon          | PNG       | —        | 1024x1024            | For app stores                |
| OG images (SEO)   | PNG       | 100KB    | 1200x630 (1.91:1)   | For social sharing            |

- Use `next/image` with `priority` on above-the-fold images
- Lazy-load all below-the-fold images
- Always provide `alt` text
- Use `object-fit: cover` for banner/hero images
- Implement blur placeholder (low-quality image placeholder via `blurDataURL`)

---

## 5. Screen-by-Screen Design Specifications

### 5.1 Customer — Auth Screens

#### Login / OTP Screen

```
┌──────────────────────────────────────┐
│                                      │
│           ┌────────────┐             │
│           │  LNB Logo  │             │ ← Brand logo, centered, 48px
│           └────────────┘             │
│                                      │
│         Welcome back                 │ ← h1 (30px, bold)
│    Enter your phone to continue      │ ← body (15px, text-secondary)
│                                      │
│  Phone Number                        │ ← label (14px, semibold)
│  ┌──────┬───────────────────────┐    │
│  │ +1 ▼ │ (555) 123-4567        │    │ ← combined input, 48px height
│  └──────┴───────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │        Send OTP Code         │    │ ← primary button, 48px, full width
│  └──────────────────────────────┘    │
│                                      │
│  ─── or continue with ───           │ ← divider with text
│                                      │
│  ┌──────────┐    ┌──────────┐       │
│  │  Google  │    │  Apple   │       │ ← social buttons, secondary variant
│  └──────────┘    └──────────┘       │
│                                      │
│  By continuing, you agree to our     │ ← caption, text-tertiary
│  Terms of Service & Privacy Policy   │ ← links in brand color
│                                      │
└──────────────────────────────────────┘
```

#### OTP Verification Screen

```
┌──────────────────────────────────────┐
│  ← Back                             │ ← ghost button
│                                      │
│        Verify your number            │ ← h1
│  We sent a code to +1 (555) 123-4567│ ← body-sm, text-secondary
│                                      │
│     ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │ ← 6 separate input boxes
│     │ 1│ │ 2│ │ 3│ │ 4│ │ 5│ │ 6│  │   48x48px each, 12px gap
│     └──┘ └──┘ └──┘ └──┘ └──┘ └──┘  │   Auto-focus, auto-advance
│                                      │   Brand border on active
│     Resend code in 0:47              │ ← countdown timer, caption
│     or                               │
│     Resend via SMS · WhatsApp        │ ← links, text-secondary
│                                      │
│  ┌──────────────────────────────┐    │
│  │         Verify Code          │    │ ← primary button, 48px
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

### 5.2 Customer — Home Screen

```
┌──────────────────────────────────────┐
│  🏠 Detroit, MI ▼     🔔 (dot)  👤  │ ← top bar: location, notif, profile
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │      🌸 Spring Cleaning      │    │ ← Banner carousel (auto-scroll)
│  │      Sale — 20% Off          │    │   Rounded corners (radius-xl)
│  │      [ Shop Now → ]          │    │   Pagination dots at bottom
│  │                              │    │
│  └──────────────────────────────┘    │
│   · ○ ○                             │
│                                      │
│  Good morning, John 👋              │ ← Greeting (h2), personalized
│                                      │
│  Our Services                        │ ← Section heading (h4)
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 👕  │ │ ✨  │ │ 🔥  │ │ 🧹  │   │ ← Service grid (2x2 or scroll)
│  │Wash │ │ Dry │ │Iron │ │Stain│   │   Each: icon + label, 80x80
│  │&Fold│ │Clean│ │Only │ │Rmvl │   │   Tap to start order flow
│  └─────┘ └─────┘ └─────┘ └─────┘   │   Subtle shadow, radius-lg
│                                      │
│  🔥 Active Offers                    │ ← Section heading + "See all →"
│  ┌────────────────┐┌────────────────┐│
│  │ 20% Off First  ││ Free Delivery  ││ ← Horizontal scroll cards
│  │ 15 Orders      ││ Over $50       ││   Gradient or brand-light bg
│  │ Ends in 2d 14h ││ Code: FREE50   ││   Countdown timer if expiring
│  └────────────────┘└────────────────┘│
│                                      │
│  📦 Quick Reorder                    │ ← Only if has past orders
│  ┌──────────────────────────────┐    │
│  │ Wash & Fold · 5.2 lbs       │    │ ← Last order card
│  │ April 5, 2026  ─  $18.76    │    │   One-tap reorder button
│  │              [ Reorder → ]   │    │
│  └──────────────────────────────┘    │
│                                      │
│  📍 Your Nearest Outlet              │
│  ┌──────────────────────────────┐    │
│  │ LoadNBehold — Detroit Central│    │
│  │ 2.3 miles · Open until 9 PM │    │ ← Distance, operating status
│  └──────────────────────────────┘    │
│                                      │
├──────────────────────────────────────┤
│  🏠    📦    🗺️     💰    👤      │ ← Bottom tab bar (mobile)
│  Home  Orders Track  Wallet Profile  │   Active = brand color + filled
└──────────────────────────────────────┘
```

### 5.3 Customer — Order Flow

Multi-step form with a progress indicator at the top.

```
Step indicator (top):
  ● Select ─── ○ Schedule ─── ○ Address ─── ○ Payment ─── ○ Confirm
  (filled dot = completed, ring = current, empty = upcoming)
```

**Step 1: Select Services** — Card-based selection with quantity controls
**Step 2: Schedule Pickup** — Calendar date picker + time slot grid (pill buttons for slots)
**Step 3: Address** — Map with draggable pin + saved addresses as selectable cards
**Step 4: Payment** — Payment method cards (radio-style), offer code input, price breakdown
**Step 5: Confirm** — Full order summary card with "Place Order" CTA

### 5.4 Customer — Live Tracking

```
┌──────────────────────────────────────┐
│  ← Back        Track Order    Share↗ │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │       🗺️  MAP VIEW           │    │ ← Full-width map, 60% height
│  │                              │    │   Driver marker (brand dot)
│  │    📍 Pickup ── 🚗 ── 📍    │    │   Dashed route line
│  │         Driver                │    │   Smooth marker animation
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │ ← Draggable bottom sheet
│  │  ──────  (drag handle)       │    │
│  │                              │    │
│  │  Driver is on the way! 🚗    │    │ ← Status headline (h3)
│  │  Estimated arrival: 12 min   │    │ ← ETA (body, semibold)
│  │                              │    │
│  │  ┌────┐ Alex M. ⭐ 4.8      │    │ ← Driver card
│  │  │ 🧑 │ White Toyota Camry   │    │   Avatar + info
│  │  │    │ ABC 1234             │    │   Phone + Chat buttons
│  │  └────┘ 📞 Call  💬 Chat     │    │
│  │                              │    │
│  │  Order Timeline              │    │ ← Vertical progress line
│  │  ✅ Order Placed     10:00   │    │   Completed = green check
│  │  ✅ Driver Assigned  10:02   │    │   Current = pulsing dot
│  │  🔵 Pickup En Route  10:05   │    │   Future = grey dot
│  │  ○  Picked Up                │    │
│  │  ○  At Laundry               │    │
│  │  ○  Processing               │    │
│  │  ○  Out for Delivery         │    │
│  │  ○  Delivered                │    │
│  │                              │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

### 5.5 Admin — Dashboard

```
┌───────────────────────────────────────────────────────────┐
│  ☰  LoadNBehold Admin        🔔 3   👤 Admin ▼          │ ← Top bar
├──────────┬────────────────────────────────────────────────┤
│          │                                                │
│ SIDEBAR  │  Dashboard                                     │ ← h1
│          │  Saturday, April 11, 2026                      │
│ Dashboard│                                                │
│ Orders   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │ ← Stat cards row
│ Drivers  │  │ 156  │ │$4,280│ │  12  │ │  3   │         │
│ Customers│  │Orders│ │Revenue│ │Drivers│ │Issues│         │
│ Outlets  │  │Today │ │Today │ │Online│ │Open  │         │
│ Offers   │  │↑ 12% │ │↑ 8%  │ │      │ │⚠️    │         │
│ Banners  │  └──────┘ └──────┘ └──────┘ └──────┘         │
│ Notifs   │                                                │
│ Config   │  ┌────────────────────┐ ┌──────────────────┐  │
│ Reports  │  │  Revenue Chart     │ │  Live Order Map  │  │
│ Support  │  │  (Recharts area    │ │  (Mapbox with    │  │
│          │  │   chart, gradient  │ │   driver pins)   │  │
│ ──────── │  │   fill under line) │ │                  │  │
│ Settings │  └────────────────────┘ └──────────────────┘  │
│ Logout   │                                                │
│          │  Recent Orders                        See all →│
│          │  ┌────────────────────────────────────────┐    │
│          │  │ # │ Customer │ Status │ Total │ Time   │    │
│          │  │ 1 │ John D.  │ 🟢    │ $38   │ 10:02  │    │
│          │  │ 2 │ Sarah K. │ 🟡    │ $24   │ 09:45  │    │
│          │  │ 3 │ Mike R.  │ 🔵    │ $52   │ 09:30  │    │
│          │  └────────────────────────────────────────┘    │
│          │                                                │
├──────────┴────────────────────────────────────────────────┤
```

### 5.6 Navigation Patterns

#### Customer (Mobile — Bottom Tab Bar)

- 5 tabs: **Home**, **Orders**, **Track**, **Wallet**, **Profile**
- Active tab: Brand color icon (filled variant) + label
- Inactive tab: `--text-tertiary` icon (stroke variant) + label
- Notification badge: Red dot (8px) on Bell icon in top bar
- Tab bar height: 56px (with safe area padding on iOS)
- Subtle top border: 1px `--border`
- No shadow on tab bar (border is sufficient)

#### Customer (Web — Top Navigation)

- Horizontal nav bar, sticky at top
- Logo left, nav links center, auth/profile right
- Active link: Brand color + bottom indicator line (2px)
- Mobile: Hamburger menu → slide-in drawer from left

#### Admin (Web — Sidebar + Top Bar)

- Sidebar: 256px wide (collapsible to 64px icon-only on small screens)
- Sidebar background: `--surface` with right border
- Active nav item: Brand-light background + brand text + left indicator (3px brand bar)
- Hover: `--surface-secondary` background
- Section dividers with label ("Management", "Marketing", "System")
- Top bar: Breadcrumbs, global search (Cmd+K), notification bell, user dropdown

---

## 6. Feature Breakdown

### 6.1 Customer App

#### Authentication
- Phone number input with country code (+1 US default)
- **Google / Apple Sign-In** — optional social login alongside phone OTP
- OTP verification (6-digit, 60s expiry)
- Auto-read OTP on mobile (SMS Retriever API)
- JWT token-based session (access + refresh tokens)
- Profile setup: name, email (optional), saved addresses

#### Home Screen
- Dynamic banners (admin-controlled, carousel with auto-scroll)
- Active offers section with countdown timers
- Service categories (Wash & Fold, Dry Clean, Iron Only, etc.)
- Quick reorder from past orders
- Nearest outlet info with distance
- **Personalized recommendations** — "Based on your last order" section
- **Service status bar** — show if outlet is open/closed, next available slot

#### Order Flow
1. **Select Services** — choose laundry type, quantity, special instructions
2. **Photo Upload** — customer can upload photos of stains, delicate items, or special care instructions
3. **Weight Estimator** — interactive calculator ("How many shirts, pants, bedsheets?") to estimate weight before pickup
4. **Schedule Pickup** — date/time picker (same-day or future scheduling)
5. **Recurring Schedule** — option to set weekly/biweekly auto-repeat orders (e.g., every Monday 10 AM)
6. **Address** — saved addresses, map pin, GPS auto-detect
7. **Delivery Instructions** — gate code, "leave at door", "ring doorbell", building/apt access notes
8. **Radius Check** — validate address is within outlet service radius
9. **Pricing Preview** — estimated cost based on items + weight
10. **Apply Offers** — promo codes, first-order discounts, loyalty points redemption, wallet balance
11. **Payment** — Stripe (primary), Square/PayPal fallback, **Cash on Delivery (COD)**, wallet
12. **Confirm** — order summary, place order

#### Live Tracking (Zepto/Zomato Style)
- Real-time map showing driver location with **smooth animated marker**
- Order status timeline:
  - `Order Placed` → `Driver Assigned` → `Pickup En Route` → `Picked Up` → `At Laundry` → `Processing` → `Quality Check` → `Out for Delivery` → `Delivered`
- ETA display with live updates (recalculated based on traffic)
- Driver info card (name, photo, phone, vehicle, rating)
- In-app call/chat with driver
- Delivery photo proof
- **Share tracking link** — send live tracking to family/roommate via WhatsApp/SMS
- **Delivery OTP** — optional PIN customer gives driver at doorstep for high-value orders

#### Order History & Reorder
- Past orders with details and itemized receipt
- Re-order with one tap (pre-fills everything including address and service preferences)
- Rate & review (driver + service — separate ratings)
- Download invoice/receipt as PDF
- **Dispute/complaint** — raise issue with photo evidence within 48 hours

#### Wallet System
- In-app wallet balance (loaded via card, or earned via referrals/credits)
- Auto-apply wallet at checkout (toggle on/off)
- Wallet top-up: $10, $25, $50, $100 presets or custom amount
- Refunds credited to wallet (instant) or original payment method (3-5 days)
- Wallet transaction history with filters
- Admin can credit/debit wallet from dashboard

#### Notifications
- Push notifications for order status updates
- SMS fallback for critical updates
- Promotional notifications (admin-triggered)
- **Smart notifications** — "Your weekly laundry is due! Schedule now?" for recurring users
- **Price drop alerts** — notify when a service the customer frequently uses goes on offer

#### Profile & Settings
- Manage addresses (home, work, custom) with map pin adjustment
- Payment methods management (cards, wallet, COD preference)
- **Service presets** — save preferred service configurations ("My Weekly Wash": 2x Wash&Fold + 3x Iron)
- **Family account** — add family members who can place orders under same account with shared wallet
- Notification preferences (granular: order updates, promos, reminders)
- **Dark mode / Light mode** toggle
- Help & support with in-app FAQ and live chat
- Referral program with shareable link/code
- **Order for someone else** — place order for different pickup/delivery address and person
- **Language selector** — English (default), Spanish, Arabic (Phase 2)
- **Calendar integration** — add scheduled pickup to Google Calendar / Apple Calendar

### 6.2 Driver App

#### Onboarding & Validation
- Driver registration with required documents:
  - Government ID (driver's license)
  - Vehicle registration
  - Insurance proof
  - Background check consent
  - **Bank account / payment info** for payouts
- Admin approval workflow (multi-step: docs → background check → approval)
- Document expiry tracking with renewal reminders (30-day, 7-day, expired alerts)
- **Training module** — in-app onboarding guide for first-time drivers (how to handle clothes, app usage)

#### Active Operations
- Toggle online/offline status
- Incoming order requests (accept/reject with 30s timer)
- **Batch orders** — pick up multiple orders in one trip if addresses are nearby
- Navigation integration (Google Maps / Apple Maps / Waze deep link)
- Pickup checklist:
  - Verify customer identity
  - Count items / weigh bag (manual entry + photo of scale)
  - Note pre-existing damage (photo + description)
  - Photo proof of pickup
  - Customer signs on screen (optional, admin-configurable)
- Delivery flow:
  - Navigate to customer
  - Delivery photo proof
  - **Delivery OTP verification** (if enabled for the order)
  - Customer confirmation
  - **COD collection** — collect cash, mark amount collected in app

#### COD Cash Handling (Driver)
- COD orders clearly marked with cash amount to collect
- Driver confirms exact cash amount collected at delivery
- **Daily cash reconciliation** — driver must log total cash collected per day
- **Cash deposit deadline** — driver deposits cash at outlet within 24 hours (admin-configurable)
- Admin tracks cash outstanding per driver
- Driver earnings auto-adjusted: payout = earnings - undeposited cash
- If driver holds cash beyond deadline → automatic alert to admin

#### Earnings & History
- Daily/weekly/monthly earnings dashboard with breakdown (delivery fees, tips, bonuses)
- Trip history with details (pickup/delivery addresses, items, payment method)
- Payout schedule and history (bank transfer records)
- **COD cash ledger** — track collected cash vs deposited cash
- **Performance bonuses** — visible bonus targets ("Complete 5 more deliveries this week for $20 bonus")
- **Tax summary** — annual 1099-ready earnings summary for US tax filing

### 6.3 Admin Dashboard

#### Role-Based Access Control (RBAC)
Admin is not a single role — support multiple admin tiers:

| Role              | Access                                                        |
| ----------------- | ------------------------------------------------------------- |
| **Super Admin**   | Full access — all settings, config, financials, user data     |
| **Outlet Manager**| Orders, drivers, inventory for their assigned outlet only     |
| **Support Staff** | View orders, handle complaints, issue refunds (capped amount) |
| **Marketing**     | Banners, offers, notifications, analytics (read-only financials)|
| **Finance**       | Revenue reports, payouts, refunds, COD reconciliation         |

- Admin invite system (email-based with role assignment)
- Activity log per admin user (who changed what, when)
- Two-factor authentication for admin login (TOTP / SMS)

#### Dashboard Home (Customizable Widgets)
- **Drag-and-drop widget layout** — each admin can customize their dashboard view
- Today's orders (count, revenue, status breakdown)
- **Live order map** — real-time map showing all active orders and driver positions
- Active drivers count (online/offline/busy breakdown)
- Pending issues / complaints (with SLA timer)
- Revenue charts (daily, weekly, monthly, YoY comparison)
- **COD pending collection** — total cash outstanding with drivers
- **Order heatmap** — geographic visualization of where orders are coming from
- **Conversion funnel** — how many visitors → signups → first order → repeat orders
- **Alerts panel** — gateway down, driver doc expiring, complaint SLA breach, low driver availability

#### Outlet Management
- Add/edit/delete outlets
- Per-outlet configuration:
  - Address with map pin + **coverage area polygon** (draw custom shape, not just radius)
  - **Service radius** (default 25 miles, configurable per outlet)
  - Operating hours (per day of week, holiday overrides)
  - Service types offered (toggle per outlet)
  - Pricing overrides (per service, per outlet)
  - **Capacity limits** — max orders per day / per slot to prevent overloading
  - **Blackout dates** — holidays, maintenance days, special closures
- Future: multi-outlet support with independent configs
- **Outlet performance comparison** — side-by-side metrics when multi-outlet

#### Order Management
- All orders list with filters (status, date, outlet, driver, payment method, COD/online)
- Order detail view with full timeline + pickup/delivery proof photos
- Manual order status override with reason (logged in audit)
- Assign/reassign driver
- **Bulk actions** — bulk status update, bulk assign to driver, bulk export
- **Order flagging** — flag suspicious orders (address mismatch, excessive COD, repeat complaints)
- Refund processing (full/partial, to wallet or original payment method)
- Complaint resolution with SLA tracking
- **Price adjustment** — modify final price after weighing (auto-notify customer if > 15% difference)
- **COD orders tab** — separate view for COD orders with collection status

#### COD Management (Admin)

```
┌─────────────────────────────────────────────────────┐
│              COD MANAGEMENT DASHBOARD               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  COD Settings                                       │
│  ├── COD enabled: [ON/OFF]                          │
│  ├── Max COD order amount: [$100] (configurable)    │
│  ├── COD available for: [All / Repeat customers]    │
│  ├── Min completed orders for COD: [3]              │
│  ├── COD fee (extra charge): [$0.00]                │
│  └── Driver cash deposit deadline: [24] hours       │
│                                                     │
│  COD Analytics                                      │
│  ├── Total COD collected today: $XXX                │
│  ├── Total COD pending deposit: $XXX                │
│  ├── Overdue deposits: X drivers (alert!)           │
│  └── COD vs Online payment ratio: XX% / XX%         │
│                                                     │
│  Driver Cash Ledger                                 │
│  ├── [Driver Name] — Collected: $XX / Deposited: $XX│
│  ├── [Driver Name] — Collected: $XX / Deposited: $XX│
│  └── ... (sortable, filterable by date/driver)      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Admin can restrict COD to trusted/repeat customers only (configurable: min X completed orders)
- Max COD amount per order (admin-configurable, e.g., $100)
- Optional COD surcharge (e.g., $2 extra for cash handling)
- Track per-driver cash collection and deposit status
- Flag drivers with overdue cash deposits
- Daily COD reconciliation report (auto-generated)
- Ability to disable COD globally or per-outlet with one toggle

#### Driver Management
- Driver list with status (online/offline/busy) + **live map of all drivers**
- Approval queue for new drivers (multi-step: docs received → docs verified → background cleared → approved)
- Document verification workflow with **side-by-side doc viewer** (uploaded doc vs ID photo comparison)
- Performance metrics (deliveries, ratings, on-time %, acceptance rate, avg delivery time)
- **Driver leaderboard** — gamified ranking with weekly/monthly top performers
- **Driver scheduling** — assign drivers to shifts, manage availability calendar
- **COD cash tracking** per driver (collected vs deposited)
- Suspend / deactivate drivers with reason (logged)
- **Automated alerts**: doc expiry in 30 days, rating below 3.5, on-time below 80%

#### Customer Management
- Customer list with search + **advanced filters** (signup date, total orders, last order, LTV, area)
- **Customer segmentation engine** — create segments based on:
  - Order frequency (power users, casual, dormant, churned)
  - Average order value
  - Geographic zone
  - Subscription plan
  - Preferred service type
- Customer detail view:
  - Order history + lifetime value (LTV)
  - Wallet balance + transaction history
  - Subscription status
  - Communication history (notifications sent, support tickets)
  - Referral tree (who they referred, who referred them)
- Issue credits / wallet adjustments with reason
- Block / flag customers
- **Churn prediction** — highlight customers who haven't ordered in X days (configurable) for re-engagement campaigns
- **Bulk customer actions** — send targeted notification, apply offer, export segment

#### Offers & Promotions
- Create/edit/deactivate offers:
  - **First-order discounts** (e.g., first 15 orders get 20% off)
  - **First N customers** (e.g., first 20 signups get flat $10 off)
  - **Minimum order offers** (e.g., $5 off on orders above $30)
  - Promo codes (single-use, multi-use, expiry date)
  - **Time-based flash sales** (e.g., 2 hours only, with countdown)
  - **Happy hour pricing** (e.g., 20% off orders placed 2-4 PM weekdays)
  - **Bundle deals** (e.g., Wash & Fold + Iron = 15% off combined)
  - **Free delivery** threshold offers
  - Referral rewards
  - Loyalty milestones (10th order, 50th order, etc.)
  - **Seasonal campaigns** (Spring Cleaning, Back to School, Holiday, etc.)
- Offer targeting (all users, new users, specific segments, specific zip codes)
- **Offer stacking rules** — configure if multiple offers can combine or if best-single-offer applies
- Offer scheduling (start/end dates) with preview before activation
- **A/B testing** — run two offer variants, measure which converts better
- Usage tracking and analytics (redemptions, revenue impact, ROI per offer)
- **Auto-expire** offers at end date, with optional "last chance" notification 24h before

#### Banner Management
- Upload/manage home screen banners + **popup modals** (first-time open, special announcements)
- Banner scheduling (active from / active until)
- Banner linking (deep link to offer, service, order flow, or external URL)
- Drag-and-drop ordering
- **Banner targeting** — different banners for new vs returning customers, or by location
- Preview on device mockup (mobile + web responsive preview)
- **Banner analytics** — impressions, tap-through rate, conversion per banner
- **A/B banner testing** — show variant A to 50%, variant B to 50%, measure CTR

#### Notification Center
- Send push notifications to:
  - All customers
  - Specific segments (by area, order history, LTV, dormancy, etc.)
  - Individual customers
  - All drivers / specific drivers
- Notification templates (reusable, with variable placeholders: `{{name}}`, `{{orderNumber}}`)
- **Automated notification triggers** (configurable, no code deploy):
  - Order status changes → customer notified
  - Abandoned cart (order started but not completed in 30 min) → reminder push
  - Dormant customer (no order in 14 days) → "We miss you!" + offer
  - Driver near pickup → "Your driver is almost there!"
  - Recurring order reminder → "Time for your weekly laundry!"
  - Wallet low balance → "Top up your wallet"
- Scheduled notifications (send at specific date/time)
- **Timezone-aware delivery** — notifications sent in customer's local timezone
- Delivery tracking (sent, delivered, opened, tapped)
- **Notification analytics** — open rates, CTR, best-performing templates
- SMS broadcast capability + **WhatsApp Business API** integration (optional)

#### Configuration (Global Settings)

```
┌──────────────────────────────────────────────────────────────┐
│                ADMIN CONFIGURATION PANEL                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Service Settings                                            │
│  ├── Default service radius: [25] miles                      │
│  ├── Minimum order amount: [$__]                             │
│  ├── Operating hours: [__] to [__]                           │
│  ├── Pickup slot duration: [__] mins                         │
│  ├── Max future scheduling: [__] days                        │
│  ├── Express service: [ON] (same-day surcharge: [50]%)       │
│  └── Recurring orders: [ON]                                  │
│                                                              │
│  Pricing                                                     │
│  ├── Base pricing per service type                           │
│  ├── Surge pricing rules (peak hours, weekends, holidays)    │
│  ├── Delivery fee structure (base + per mile + free above)   │
│  ├── Tax rate (Michigan): [6%]                               │
│  └── Minimum weight charge: [5] lbs                          │
│                                                              │
│  Payment                                                     │
│  ├── Primary gateway: [Stripe ▼]                             │
│  ├── Fallback gateway: [Square ▼]                            │
│  ├── Auto-failover: [ON]                                     │
│  ├── COD enabled: [ON]                                       │
│  ├── COD max amount: [$100]                                  │
│  ├── COD min completed orders: [3]                           │
│  ├── COD surcharge: [$0.00]                                  │
│  ├── Wallet enabled: [ON]                                    │
│  └── Payout schedule: [Weekly ▼]                             │
│                                                              │
│  Notifications                                               │
│  ├── Order status SMS: [ON]                                  │
│  ├── Promotional push: [ON]                                  │
│  ├── Driver assignment alerts: [ON]                          │
│  ├── Abandoned cart reminder: [ON] after [30] mins           │
│  ├── Dormant customer re-engagement: [ON] after [14] days    │
│  └── WhatsApp notifications: [OFF]                           │
│                                                              │
│  Customer Experience                                         │
│  ├── Delivery OTP verification: [ON for orders > $50]        │
│  ├── Photo proof required (pickup): [ON]                     │
│  ├── Photo proof required (delivery): [ON]                   │
│  ├── Customer photo upload: [ON]                             │
│  ├── Family accounts: [ON]                                   │
│  └── Max family members: [5]                                 │
│                                                              │
│  Driver Settings                                             │
│  ├── Driver acceptance timeout: [30] seconds                 │
│  ├── Max concurrent orders per driver: [3]                   │
│  ├── Batch pickup enabled: [ON]                              │
│  ├── Cash deposit deadline: [24] hours                       │
│  └── Auto-suspend on rating below: [3.0]                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Reports & Analytics
- Revenue reports (by outlet, by service, by time period, **by payment method**)
- **COD reconciliation report** — daily/weekly cash collected vs deposited per driver
- Order volume trends (with day-of-week and time-of-day heatmaps)
- Customer acquisition & retention (**cohort analysis** — Week 1 signups retention over 12 weeks)
- **Customer Lifetime Value (LTV)** analysis by segment
- Driver performance leaderboard
- Offer redemption analytics with **ROI per campaign**
- **SLA compliance** — % orders picked up within scheduled slot, % delivered on time
- **Demand forecasting** — predict order volume for next week based on historical data
- Export to CSV / PDF / Google Sheets
- **Automated email reports** — daily summary to admin, weekly digest to all managers
- **Financial reconciliation** — Stripe + Square + PayPal + COD totals vs order totals (catch discrepancies)

#### In-App Support System (Admin Side)
- **Support ticket queue** — customer complaints and disputes routed to support staff
- SLA timers per ticket (e.g., respond within 4 hours, resolve within 24 hours)
- Canned responses for common issues
- **Escalation matrix**: Support Staff → Outlet Manager → Super Admin
- Link ticket to order (auto-pull timeline, proof photos, payment info)
- Resolution actions: refund, credit, rebook, compensate, reject with reason
- Customer satisfaction survey sent after ticket resolution

---

## 7. Database Schema (MongoDB Collections)

### Users
```json
{
  "_id": "ObjectId",
  "phone": "+15551234567",
  "name": "John Doe",
  "email": "john@email.com",
  "role": "customer | driver | admin",
  "addresses": [
    {
      "label": "Home",
      "line1": "123 Main St",
      "city": "Detroit",
      "state": "MI",
      "zip": "48201",
      "location": { "type": "Point", "coordinates": [-83.0458, 42.3314] }
    }
  ],
  "profileImage": "s3://...",
  "referralCode": "JOHN20",
  "loyaltyPoints": 150,
  "preferences": {
    "theme": "light | dark | system",
    "language": "en"
  },
  "isBlocked": false,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Drivers
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: Users)",
  "status": "pending | approved | suspended | rejected",
  "isOnline": true,
  "currentLocation": { "type": "Point", "coordinates": [-83.05, 42.33] },
  "vehicle": {
    "type": "car | bike | van",
    "make": "Toyota",
    "model": "Camry",
    "plate": "ABC 1234",
    "color": "White"
  },
  "documents": {
    "license": { "url": "s3://...", "verified": true, "expiry": "date" },
    "insurance": { "url": "s3://...", "verified": true, "expiry": "date" },
    "backgroundCheck": { "status": "cleared", "date": "date" }
  },
  "metrics": {
    "totalDeliveries": 342,
    "rating": 4.8,
    "onTimePercent": 96.5
  },
  "assignedOutlet": "ObjectId (ref: Outlets)"
}
```

### Outlets
```json
{
  "_id": "ObjectId",
  "name": "LoadNBehold - Detroit Central",
  "address": {
    "line1": "456 Laundry Lane",
    "city": "Detroit",
    "state": "MI",
    "zip": "48201",
    "location": { "type": "Point", "coordinates": [-83.0458, 42.3314] }
  },
  "serviceRadius": 25,
  "serviceRadiusUnit": "miles",
  "operatingHours": {
    "monday": { "open": "07:00", "close": "21:00" },
    "tuesday": { "open": "07:00", "close": "21:00" }
  },
  "services": ["wash_fold", "dry_clean", "iron", "stain_removal"],
  "pricingOverrides": {},
  "isActive": true
}
```

### Orders
```json
{
  "_id": "ObjectId",
  "orderNumber": "LNB-2026-00001",
  "customerId": "ObjectId (ref: Users)",
  "driverId": "ObjectId (ref: Drivers)",
  "outletId": "ObjectId (ref: Outlets)",
  "status": "placed | driver_assigned | pickup_enroute | picked_up | at_laundry | processing | out_for_delivery | delivered | cancelled",
  "items": [
    {
      "service": "wash_fold",
      "quantity": 1,
      "weight": 5.2,
      "unit": "lbs",
      "specialInstructions": "Separate darks",
      "price": 15.60
    }
  ],
  "pickupAddress": { "...address with coordinates" },
  "deliveryAddress": { "...address with coordinates" },
  "schedule": {
    "pickupSlot": { "date": "2026-04-10", "from": "10:00", "to": "11:00" },
    "estimatedDelivery": "2026-04-11T18:00:00Z"
  },
  "pricing": {
    "subtotal": 35.60,
    "deliveryFee": 4.99,
    "tax": 2.44,
    "discount": 5.00,
    "total": 38.03
  },
  "paymentMethod": "online | cod | wallet | split",
  "payment": {
    "gateway": "stripe | square | paypal | cod | wallet",
    "transactionId": "pi_xxxxx",
    "status": "paid | pending | refunded | failed | cod_pending | cod_collected",
    "codAmount": 0,
    "walletAmount": 0,
    "onlineAmount": 38.03,
    "codCollectedByDriver": false,
    "codDepositedAt": null
  },
  "offerId": "ObjectId (ref: Offers)",
  "promoCode": "FIRST20",
  "timeline": [
    { "status": "placed", "timestamp": "...", "note": "" },
    { "status": "driver_assigned", "timestamp": "...", "driverId": "..." }
  ],
  "rating": { "service": 5, "driver": 4, "review": "Great service!" },
  "proofImages": {
    "pickup": "s3://...",
    "delivery": "s3://..."
  }
}
```

### Offers
```json
{
  "_id": "ObjectId",
  "title": "First 15 Orders - 20% Off",
  "type": "first_n_orders | min_order | promo_code | referral | loyalty",
  "config": {
    "firstNOrders": 15,
    "discountType": "percentage | flat",
    "discountValue": 20,
    "minOrderAmount": 0,
    "maxDiscount": 10.00,
    "usageLimit": null,
    "perUserLimit": 1
  },
  "promoCode": "FIRST20",
  "targeting": "all | new_users | segment",
  "segmentFilter": {},
  "validFrom": "2026-04-01T00:00:00Z",
  "validUntil": "2026-06-30T23:59:59Z",
  "isActive": true,
  "redemptions": 234
}
```

### Banners
```json
{
  "_id": "ObjectId",
  "imageUrl": "s3://banners/spring-sale.jpg",
  "title": "Spring Cleaning Sale",
  "deepLink": "/offers/spring-sale",
  "order": 1,
  "activeFrom": "2026-04-01",
  "activeUntil": "2026-04-30",
  "isActive": true,
  "targetAudience": "all"
}
```

### AppConfig (Global Singleton)
```json
{
  "_id": "ObjectId",
  "key": "global",
  "serviceRadius": { "default": 25, "unit": "miles" },
  "minimumOrderAmount": 15.00,
  "deliveryFee": { "base": 4.99, "perMile": 0.50, "freeAbove": 50.00 },
  "taxRate": 6.0,
  "pickupSlotDuration": 60,
  "maxFutureScheduleDays": 7,
  "payment": {
    "primaryGateway": "stripe",
    "fallbackGateway": "square",
    "autoFailover": true,
    "cod": {
      "enabled": true,
      "maxOrderAmount": 100.00,
      "minCompletedOrdersRequired": 3,
      "surcharge": 0.00,
      "driverDepositDeadlineHours": 24
    },
    "wallet": {
      "enabled": true,
      "maxBalance": 10000.00,
      "topUpAmounts": [10, 25, 50, 100]
    }
  },
  "notifications": {
    "orderStatusSMS": true,
    "promotionalPush": true,
    "driverAlerts": true
  },
  "referral": {
    "referrerReward": 5.00,
    "refereeDiscount": 10,
    "refereeDiscountType": "percentage"
  },
  "maintenance": {
    "isDown": false,
    "message": ""
  }
}
```

### Geospatial Indexes
```javascript
db.outlets.createIndex({ "address.location": "2dsphere" })
db.drivers.createIndex({ "currentLocation": "2dsphere" })
db.users.createIndex({ "addresses.location": "2dsphere" })
```

---

## 8. API Endpoints Overview

### Auth
| Method | Endpoint              | Description             |
| ------ | --------------------- | ----------------------- |
| POST   | `/api/auth/send-otp`  | Send OTP to phone       |
| POST   | `/api/auth/verify-otp`| Verify OTP, return JWT  |
| POST   | `/api/auth/refresh`   | Refresh access token    |
| POST   | `/api/auth/logout`    | Invalidate session      |

### Customer
| Method | Endpoint                        | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| GET    | `/api/customer/profile`         | Get profile                    |
| PUT    | `/api/customer/profile`         | Update profile                 |
| POST   | `/api/customer/addresses`       | Add address                    |
| GET    | `/api/customer/addresses`       | List addresses                 |
| DELETE | `/api/customer/addresses/:id`   | Remove address                 |
| GET    | `/api/customer/nearby-outlets`  | Find outlets in radius         |

### Orders
| Method | Endpoint                        | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| POST   | `/api/orders`                   | Place new order                |
| GET    | `/api/orders`                   | List orders (with filters)     |
| GET    | `/api/orders/:id`               | Order details                  |
| PUT    | `/api/orders/:id/cancel`        | Cancel order                   |
| POST   | `/api/orders/:id/rate`          | Rate completed order           |
| GET    | `/api/orders/:id/track`         | Get live tracking data         |

### Driver
| Method | Endpoint                        | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| POST   | `/api/driver/register`          | Submit driver application      |
| PUT    | `/api/driver/status`            | Toggle online/offline          |
| PUT    | `/api/driver/location`          | Update current location        |
| GET    | `/api/driver/orders`            | Get assigned orders            |
| PUT    | `/api/driver/orders/:id/accept` | Accept order                   |
| PUT    | `/api/driver/orders/:id/status` | Update order status            |
| POST   | `/api/driver/orders/:id/proof`  | Upload pickup/delivery photo   |
| GET    | `/api/driver/earnings`          | Earnings summary               |

### Admin
| Method | Endpoint                          | Description                   |
| ------ | --------------------------------- | ----------------------------- |
| GET    | `/api/admin/dashboard`            | Dashboard stats               |
| CRUD   | `/api/admin/outlets`              | Manage outlets                |
| CRUD   | `/api/admin/offers`               | Manage offers/promos          |
| CRUD   | `/api/admin/banners`              | Manage banners                |
| GET    | `/api/admin/drivers`              | List drivers                  |
| PUT    | `/api/admin/drivers/:id/approve`  | Approve/reject driver         |
| GET    | `/api/admin/orders`               | All orders with filters       |
| PUT    | `/api/admin/orders/:id`           | Override order status          |
| POST   | `/api/admin/notifications/send`   | Send push notification        |
| GET    | `/api/admin/config`               | Get global config             |
| PUT    | `/api/admin/config`               | Update global config          |
| GET    | `/api/admin/reports/:type`        | Generate reports              |

### Payments
| Method | Endpoint                          | Description                   |
| ------ | --------------------------------- | ----------------------------- |
| POST   | `/api/payments/create-intent`     | Create payment intent (online)|
| POST   | `/api/payments/cod/place`         | Place COD order               |
| POST   | `/api/payments/cod/collect`       | Driver marks cash collected   |
| POST   | `/api/payments/cod/deposit`       | Driver marks cash deposited   |
| GET    | `/api/payments/cod/ledger`        | Driver's COD cash ledger      |
| POST   | `/api/payments/webhook/stripe`    | Stripe webhook                |
| POST   | `/api/payments/webhook/square`    | Square webhook                |
| POST   | `/api/payments/refund`            | Process refund                |

### Wallet
| Method | Endpoint                          | Description                   |
| ------ | --------------------------------- | ----------------------------- |
| GET    | `/api/wallet/balance`             | Get wallet balance            |
| POST   | `/api/wallet/topup`               | Add funds to wallet           |
| POST   | `/api/wallet/pay`                 | Pay for order via wallet      |
| GET    | `/api/wallet/transactions`        | Wallet transaction history    |

### Support
| Method | Endpoint                          | Description                   |
| ------ | --------------------------------- | ----------------------------- |
| POST   | `/api/support/tickets`            | Create support ticket         |
| GET    | `/api/support/tickets`            | List my tickets               |
| GET    | `/api/support/tickets/:id`        | Ticket details                |
| POST   | `/api/support/tickets/:id/reply`  | Reply to ticket               |
| GET    | `/api/support/faq`                | Get FAQ list                  |

### Admin — COD & Wallet
| Method | Endpoint                                | Description                        |
| ------ | --------------------------------------- | ---------------------------------- |
| GET    | `/api/admin/cod/dashboard`              | COD overview (totals, pending)     |
| GET    | `/api/admin/cod/drivers`                | Per-driver cash status             |
| PUT    | `/api/admin/cod/drivers/:id/reconcile`  | Mark driver cash as reconciled     |
| GET    | `/api/admin/wallet/credits`             | View all wallet credits issued     |
| POST   | `/api/admin/wallet/:userId/credit`      | Add credit to customer wallet      |
| POST   | `/api/admin/wallet/:userId/debit`       | Debit from customer wallet         |
| GET    | `/api/admin/support/tickets`            | All support tickets (with SLA)     |
| PUT    | `/api/admin/support/tickets/:id/assign` | Assign ticket to support staff     |
| PUT    | `/api/admin/support/tickets/:id/resolve`| Resolve ticket                     |

### WebSocket Events
| Event                    | Direction      | Description                      |
| ------------------------ | -------------- | -------------------------------- |
| `driver:location`        | Driver → Server| Driver location update           |
| `order:status`           | Server → Client| Order status change              |
| `order:tracking`         | Server → Client| Live driver location for order   |
| `driver:new-order`       | Server → Driver| New order assignment             |
| `driver:cod-reminder`    | Server → Driver| Cash deposit deadline reminder    |
| `notification:push`      | Server → Client| Real-time notification           |
| `wallet:updated`         | Server → Client| Wallet balance changed           |
| `support:reply`          | Server → Client| New reply on support ticket       |

---

## 9. Environment Configuration

### `.env` Structure

```bash
# ─────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────
NODE_ENV=production
APP_NAME=LoadNBehold
APP_VERSION=1.0.0
API_BASE_URL=https://api.loadnbehold.com
WEB_APP_URL=https://app.loadnbehold.com
ADMIN_APP_URL=https://admin.loadnbehold.com
PORT=5000

# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/loadnbehold
REDIS_URL=redis://:password@redis-host:6379

# ─────────────────────────────────────────────
# AUTH & OTP
# ─────────────────────────────────────────────
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
OTP_EXPIRY_SECONDS=60
OTP_LENGTH=6
OTP_PROVIDER=twilio
OTP_RATE_LIMIT_PER_PHONE=5

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# MSG91 (fallback)
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_TEMPLATE_ID=your-template-id
MSG91_SENDER_ID=LOADNB

# Google OAuth (social login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple Sign-In
APPLE_CLIENT_ID=com.loadnbehold.app
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# ─────────────────────────────────────────────
# PAYMENT GATEWAYS
# ─────────────────────────────────────────────
PAYMENT_PRIMARY_GATEWAY=stripe
PAYMENT_FALLBACK_GATEWAY=square
PAYMENT_AUTO_FAILOVER=true
PAYMENT_COD_ENABLED=true
PAYMENT_COD_MAX_AMOUNT=100
PAYMENT_COD_MIN_ORDERS=3
PAYMENT_COD_SURCHARGE=0
PAYMENT_WALLET_ENABLED=true
PAYMENT_WALLET_MAX_BALANCE=10000

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx

# Square (fallback)
SQUARE_APPLICATION_ID=sq0idp-xxxxxxxxxxxxxxxx
SQUARE_ACCESS_TOKEN=EAAAxxxxxxxxxxxxxxxx
SQUARE_LOCATION_ID=Lxxxxxxxxxxxxxxxx
SQUARE_WEBHOOK_SIGNATURE_KEY=your-square-webhook-key

# PayPal (secondary fallback)
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=live

# ─────────────────────────────────────────────
# MAPS & GEOLOCATION
# ─────────────────────────────────────────────
MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoxxxxxxxxxxxxxxxx
GOOGLE_MAPS_API_KEY=AIzaSyxxxxxxxxxxxxxxxx

# ─────────────────────────────────────────────
# FILE STORAGE
# ─────────────────────────────────────────────
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=loadnbehold-assets
AWS_S3_REGION=us-east-2

# Cloudflare R2 (alternative)
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET=loadnbehold-assets

# ─────────────────────────────────────────────
# PUSH NOTIFICATIONS
# ─────────────────────────────────────────────
FIREBASE_PROJECT_ID=loadnbehold-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@loadnbehold-prod.iam.gserviceaccount.com

# ─────────────────────────────────────────────
# EMAIL
# ─────────────────────────────────────────────
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=orders@loadnbehold.com
SENDGRID_FROM_NAME=LoadNBehold

# ─────────────────────────────────────────────
# MONITORING & LOGGING
# ─────────────────────────────────────────────
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
LOG_LEVEL=info

# ─────────────────────────────────────────────
# RATE LIMITING
# ─────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=https://app.loadnbehold.com,https://admin.loadnbehold.com
```

### Client-Side Config (Shared via API / build-time injection)

```typescript
export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  wsBaseUrl: process.env.NEXT_PUBLIC_WS_BASE_URL,
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_KEY,
  firebaseConfig: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
  googleMapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
}
```

---

## 10. Payment Strategy (Online + COD + Wallet)

### Payment Methods Available

| Method         | Flow                                | When Available                       |
| -------------- | ----------------------------------- | ------------------------------------ |
| **Online**     | Card via Stripe/Square/PayPal       | Always (default)                     |
| **COD**        | Driver collects cash at delivery    | After min X completed orders (admin-configurable) |
| **Wallet**     | Deducted from in-app wallet balance | When wallet has sufficient balance   |
| **Split**      | Part wallet + part online/COD       | When wallet balance < order total    |

### Online Payment Failover

```
Customer selects "Pay Online"
        │
        ▼
┌───────────────────┐
│ Try PRIMARY       │ (Stripe)
│ Gateway           │
└───────┬───────────┘
        │
   Success? ─── YES ──→ Complete Payment
        │
       NO (timeout / 5xx / gateway error)
        │
        ▼
┌───────────────────┐
│ Try FALLBACK      │ (Square)
│ Gateway           │
└───────┬───────────┘
        │
   Success? ─── YES ──→ Complete Payment
        │
       NO
        │
        ▼
┌───────────────────┐
│ Try SECONDARY     │ (PayPal)
│ FALLBACK          │
└───────┬───────────┘
        │
   Success? ─── YES ──→ Complete Payment
        │
       NO
        │
        ▼
  Offer "Switch to COD?" (if eligible)
  OR: Notify customer: "Payment failed, try again later"
  Alert admin via Slack/email
```

### COD Flow

```
Customer selects "Cash on Delivery"
        │
        ▼
┌───────────────────┐
│ Eligibility Check │
│ ├── COD enabled?  │
│ ├── Order ≤ max?  │ ($100 default)
│ ├── Min orders?   │ (3 completed orders)
│ └── Not blocked?  │ (no overdue COD history)
└───────┬───────────┘
        │
   Eligible? ─── NO ──→ Show reason, offer online payment
        │
       YES
        │
        ▼
┌───────────────────┐
│ Place order as    │
│ COD (payment      │
│ status: pending)  │
└───────┬───────────┘
        │
        ▼ (at delivery)
┌───────────────────┐
│ Driver collects   │
│ cash, confirms    │
│ amount in app     │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Driver deposits   │
│ cash at outlet    │
│ within 24 hours   │
└───────┬───────────┘
        │
        ▼
  Admin reconciles in COD dashboard
  Payment status: cod_collected → deposited
```

### Wallet Flow

```
Customer selects "Pay with Wallet"
        │
        ▼
  Wallet balance ≥ order total?
        │
   YES ──→ Deduct full amount from wallet → Complete
        │
       NO
        │
        ▼
  Offer split payment:
  ├── Wallet covers: $XX
  └── Remaining via: Online / COD
        │
        ▼
  Process remaining via selected method
```

**Failover rules:**
- Auto-failover only on gateway errors (5xx, timeout), NOT on card declines (4xx)
- Log every failover event for admin review
- Admin can change primary/fallback from dashboard without code deploy
- Health check pings to each gateway every 60s to pre-detect outages
- When all online gateways fail → **auto-suggest COD** to eligible customers (prevents lost orders)

---

## 11. Real-Time Tracking Implementation

### How It Works (Zepto/Zomato Style)

1. **Driver app** sends GPS coordinates every 5 seconds via WebSocket
2. **Server** stores latest location in Redis (fast read) + MongoDB (history)
3. **Customer app** subscribes to their order's tracking channel
4. **Server** broadcasts driver location to subscribed customers
5. **Map** renders smooth animated marker movement using interpolation

### Tracking UI Components
- **Map view** — full-screen map with driver marker, pickup/delivery pins
- **Status bar** — collapsible bottom sheet showing current status + ETA
- **Timeline** — vertical progress indicator with timestamps
- **Driver card** — photo, name, rating, vehicle info, call/chat buttons
- **ETA** — calculated using Mapbox Directions API, updated in real-time

### Tracking Map Styling

```javascript
const mapConfig = {
  light: {
    style: "mapbox://styles/mapbox/light-v11",
    driverMarker: { color: "#2563EB", size: 14, pulse: true },
    routeLine: { color: "#2563EB", width: 3, dashArray: [2, 4] },
    pickupPin: { color: "#16A34A", icon: "marker" },
    deliveryPin: { color: "#DC2626", icon: "marker" },
  },
  dark: {
    style: "mapbox://styles/mapbox/dark-v11",
    driverMarker: { color: "#3B82F6", size: 14, pulse: true },
    routeLine: { color: "#3B82F6", width: 3, dashArray: [2, 4] },
    pickupPin: { color: "#22C55E", icon: "marker" },
    deliveryPin: { color: "#EF4444", icon: "marker" },
  },
};
```

---

## 12. Project Structure

```
loadnbehold/
├── apps/
│   ├── web/                          # Next.js — Customer Web App
│   │   ├── app/
│   │   │   ├── (auth)/               # Login, OTP verification
│   │   │   ├── (customer)/           # Home, orders, tracking
│   │   │   ├── (profile)/            # Profile, addresses, settings
│   │   │   ├── globals.css           # CSS custom properties (design tokens)
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn components (customized)
│   │   │   ├── maps/                 # Map, tracking components
│   │   │   ├── orders/               # Order flow components
│   │   │   └── layout/               # Navbar, footer, sidebar
│   │   └── lib/
│   │       ├── api.ts                # API client
│   │       ├── socket.ts             # WebSocket client
│   │       ├── design-tokens.ts      # JS-accessible design tokens
│   │       └── config.ts             # Env-based config
│   │
│   ├── admin/                        # Next.js — Admin Dashboard
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   ├── outlets/
│   │   │   ├── orders/
│   │   │   ├── drivers/
│   │   │   ├── customers/
│   │   │   ├── offers/
│   │   │   ├── banners/
│   │   │   ├── notifications/
│   │   │   ├── config/
│   │   │   ├── support/
│   │   │   └── reports/
│   │   └── components/
│   │
│   ├── mobile/                       # Expo React Native — Customer + Driver
│   │   ├── app/
│   │   │   ├── (customer)/           # Customer screens
│   │   │   ├── (driver)/             # Driver screens
│   │   │   └── (auth)/               # Shared auth screens
│   │   ├── components/
│   │   └── lib/
│   │
│   └── server/                       # Express.js — Backend API
│       ├── src/
│       │   ├── config/
│       │   │   ├── env.ts            # Validated env loading (zod)
│       │   │   ├── database.ts       # MongoDB connection
│       │   │   ├── redis.ts          # Redis connection
│       │   │   └── payment.ts        # Payment gateway config + failover
│       │   ├── middleware/
│       │   │   ├── auth.ts           # JWT verification
│       │   │   ├── roleGuard.ts      # Role-based access
│       │   │   ├── rateLimiter.ts    # Rate limiting
│       │   │   └── validator.ts      # Request validation (zod)
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── customer/
│       │   │   ├── driver/
│       │   │   ├── order/
│       │   │   ├── payment/
│       │   │   ├── wallet/
│       │   │   ├── cod/
│       │   │   ├── notification/
│       │   │   ├── offer/
│       │   │   ├── banner/
│       │   │   ├── outlet/
│       │   │   ├── support/
│       │   │   └── admin/
│       │   ├── models/               # Mongoose schemas
│       │   ├── socket/               # WebSocket handlers
│       │   │   ├── tracking.ts
│       │   │   └── notifications.ts
│       │   ├── services/
│       │   │   ├── otp.service.ts
│       │   │   ├── payment.service.ts
│       │   │   ├── notification.service.ts
│       │   │   ├── geolocation.service.ts
│       │   │   └── storage.service.ts
│       │   └── utils/
│       └── .env
│
├── packages/                         # Shared code (monorepo)
│   ├── types/                        # Shared TypeScript types
│   ├── constants/                    # Shared constants
│   ├── validators/                   # Shared Zod schemas
│   ├── design-tokens/                # Shared design tokens (JSON + TS)
│   └── config/                       # Shared config utilities
│
├── docker-compose.yml
├── turbo.json                        # Turborepo config
├── package.json
├── IMPLEMENTATION.md
└── API_TESTING_GUIDE.md
```

---

## 13. Implementation Phases

### Phase 1 — Foundation (Weeks 1-3)
- [ ] Monorepo setup (Turborepo + pnpm)
- [ ] Design token setup — CSS custom properties, Tailwind theme config, shadcn/ui customization
- [ ] Backend boilerplate (Express, MongoDB, Redis, env config)
- [ ] Auth module (phone OTP login/signup + Google/Apple social login)
- [ ] User, driver, admin models with RBAC
- [ ] Admin auth with 2FA
- [ ] Wallet module (top-up, deduct, transaction history)
- [ ] Global layout components (nav, sidebar, tab bar) with responsive behavior

### Phase 2 — Core Customer Flow (Weeks 4-7)
- [ ] Customer web app (Next.js + Tailwind + shadcn)
- [ ] Home screen with banners, services, personalized recommendations
- [ ] Order placement flow (services → photo upload → weight estimator → scheduling → address → payment)
- [ ] Stripe payment integration
- [ ] COD payment flow
- [ ] Wallet payment + split payment flow
- [ ] Order history with dispute/complaint system
- [ ] Service presets and recurring order setup
- [ ] Skeleton loading, empty states, error states for all screens

### Phase 3 — Driver & Tracking (Weeks 8-10)
- [ ] Driver registration and multi-step approval flow
- [ ] Driver mobile app (Expo)
- [ ] Driver assignment algorithm (distance + rating + idle scoring)
- [ ] Real-time tracking (WebSocket + Mapbox) with smooth animation
- [ ] Pickup/delivery proof workflow with photos
- [ ] Delivery OTP verification
- [ ] COD cash collection and daily reconciliation flow
- [ ] Batch order pickup support

### Phase 4 — Admin Dashboard (Weeks 11-14)
- [ ] Admin web app (Next.js) with RBAC (Super Admin, Outlet Manager, Support, Marketing, Finance)
- [ ] Customizable widget dashboard with live order map
- [ ] Outlet management with radius config + coverage polygon + capacity limits
- [ ] Order management with bulk actions, price adjustments
- [ ] Driver management with live map, scheduling, COD tracking
- [ ] Customer management with segmentation engine, LTV analytics
- [ ] Banner management with A/B testing and analytics
- [ ] Offer management with stacking rules, flash sales, A/B testing
- [ ] COD management dashboard with driver cash ledger
- [ ] Notification center with automated triggers + templates
- [ ] Global config panel (all settings from one place)
- [ ] Support ticket system with SLA tracking
- [ ] Reports: revenue, COD reconciliation, SLA compliance, demand forecasting

### Phase 5 — Payment Failover & Notifications (Weeks 15-16)
- [ ] Square integration (fallback)
- [ ] PayPal integration (secondary fallback)
- [ ] Auto-failover logic with circuit breaker
- [ ] Push notification system (FCM)
- [ ] SMS notifications (Twilio)
- [ ] Automated notification triggers (abandoned cart, dormancy, recurring reminders)
- [ ] WhatsApp Business integration (optional)

### Phase 6 — Mobile Customer App (Weeks 17-19)
- [ ] Customer mobile app (Expo)
- [ ] All customer flows on mobile (including wallet, COD, photo upload)
- [ ] Native push notifications with deep linking
- [ ] Live tracking on mobile with share tracking link
- [ ] OTP auto-read
- [ ] Family account support
- [ ] Dark mode with system preference detection
- [ ] Calendar integration
- [ ] Haptic feedback on key interactions

### Phase 7 — Polish & Launch (Weeks 20-22)
- [ ] Responsive design audit across all screen sizes (320px to 2560px)
- [ ] Visual QA — every screen matches design system tokens
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (lazy loading, image optimization, caching)
- [ ] Animation audit — smooth, purposeful, reduced-motion support
- [ ] Security audit (OWASP top 10, PCI compliance check)
- [ ] Load testing (500+ concurrent users)
- [ ] App Store / Play Store submission
- [ ] Production deployment + CDN setup
- [ ] Monitoring & alerting setup (Sentry, uptime checks, PagerDuty)
- [ ] Admin training documentation

---

## 14. Security & Compliance

### PCI DSS Compliance (Payments)
- **Never store raw card data** — use Stripe/Square tokenized payment methods only
- All payment intents created server-side; client only handles tokenized card elements
- Webhook signature verification on every payment callback
- Separate webhook endpoints per gateway with individual secret validation

### Data Protection
- **Encryption at rest** — MongoDB Atlas encryption, S3 server-side encryption (SSE-S3)
- **Encryption in transit** — TLS 1.3 on all endpoints, HTTPS enforced, HSTS headers
- **PII handling** — customer phone numbers, addresses, and driver documents stored encrypted
- **JWT security** — short-lived access tokens (15 min), HTTP-only refresh token cookies, token rotation on refresh
- **OTP security** — rate-limited (5/hr per phone), hashed in Redis (not plaintext), auto-expire after 60s

### Michigan & US Regulations
- **Michigan Sales Tax** — 6% state rate, no local tax on laundry services (services are generally exempt — verify with CPA)
- **CCPA-like compliance** — data export on request, account deletion with 30-day data purge
- **Driver classification** — consult legal on 1099 independent contractor vs W-2 employee (Michigan ABC test)
- **Business licensing** — ensure laundry facility has required state/local permits

### Application Security
- Helmet.js for HTTP security headers (CSP, X-Frame-Options, etc.)
- CORS whitelist — only allow configured origins
- Rate limiting on all public endpoints (stricter on auth)
- Input sanitization via Zod schemas on every request
- SQL/NoSQL injection prevention — parameterized queries, no raw string interpolation
- File upload validation — type check, size limits (5MB images, 10MB documents), virus scanning
- Admin routes behind role-based middleware + IP whitelist (optional)

### Audit Logging
```json
{
  "_id": "ObjectId",
  "actor": { "userId": "ObjectId", "role": "admin", "ip": "192.168.1.1" },
  "action": "offer.created",
  "resource": { "type": "offer", "id": "ObjectId" },
  "changes": { "before": {}, "after": {} },
  "timestamp": "2026-04-08T14:30:00Z"
}
```
- Log all admin mutations (create/update/delete on config, offers, banners, drivers, orders)
- Log all payment events (charge, refund, failover)
- Log driver status changes (approved, suspended, document expiry)
- Retained for 1 year minimum, exportable for compliance

---

## 15. Driver Assignment Algorithm

### Order Assignment Flow
```
New order placed
       │
       ▼
┌──────────────────┐
│ Find outlet       │ — nearest outlet covering customer's address
│ within radius     │   (geospatial query: customer coords within outlet radius)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Find online       │ — drivers assigned to that outlet
│ drivers nearby    │ — within 10 miles of pickup address
│                   │ — sorted by: distance (40%) + rating (30%) + idle time (30%)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Send request to   │ — driver gets 30s to accept
│ top-ranked driver │ — countdown timer on driver app
└────────┬─────────┘
         │
    Accepted? ─── YES ──→ Assign & notify customer
         │
        NO (timeout or reject)
         │
         ▼
┌──────────────────┐
│ Try next driver   │ — up to 3 attempts
│ in ranked list    │
└────────┬─────────┘
         │
    All rejected?
         │
         ▼
  Admin notified — manual assignment required
  Customer gets "Finding driver, we'll notify you" message
```

### Multi-Outlet Routing (Future)
When multiple outlets exist:
1. Find **all outlets** whose radius covers the customer's address
2. Rank by: distance to customer (50%) + current load/queue (30%) + driver availability (20%)
3. Assign to the best-scoring outlet
4. Admin can override with manual outlet assignment

---

## 16. Cancellation & Refund Policy Engine

### Cancellation Windows (Admin-Configurable)

| Order Status        | Cancellation | Refund              | Fee         |
| ------------------- | ------------ | ------------------- | ----------- |
| `placed`            | Allowed      | 100% refund         | None        |
| `driver_assigned`   | Allowed      | 100% refund         | None        |
| `pickup_enroute`    | Allowed      | 100% - cancellation fee | $5 (configurable) |
| `picked_up`         | Not allowed  | —                   | —           |
| `at_laundry`+       | Not allowed  | —                   | —           |

### Refund Processing
- Refund issued to original payment method via same gateway
- If original gateway is down, queue refund for retry (BullMQ delayed job)
- Admin can issue manual refunds/credits from dashboard
- Partial refunds supported (e.g., damaged item compensation)
- Refund status tracked: `initiated` → `processing` → `completed` / `failed`

### Dispute Handling
- Customer can raise dispute within 48 hours of delivery
- Dispute triggers admin review queue
- Admin can view pickup/delivery proof photos, order timeline
- Resolution options: full refund, partial refund, credit, reject with reason

---

## 17. Subscription & Loyalty Program

### Subscription Plans (Admin-Configurable)

| Plan       | Price/Month | Perks                                            |
| ---------- | ----------- | ------------------------------------------------ |
| **Basic**  | Free        | Standard pricing, earn 1 point per $1            |
| **Plus**   | $9.99       | Free delivery, 2x loyalty points, priority pickup |
| **Premium**| $19.99      | Free delivery, 3x points, express service, 10% off all orders |

- Plans managed in admin config — name, price, perks are all editable
- Recurring billing via Stripe Subscriptions
- Grace period on failed renewal (3 days retry before downgrade)

### Loyalty Points System
- Earn points on every order (configurable rate per plan)
- Redeem points as discount on future orders (e.g., 100 points = $1)
- Points expire after 6 months of inactivity (configurable)
- Milestone rewards: 10th order bonus, 50th order bonus, etc.
- Admin dashboard shows loyalty program analytics

### Referral Program
- Each customer gets a unique referral code
- Referrer earns $5 credit when referee completes first order
- Referee gets 10% off first order
- Both amounts admin-configurable
- Fraud prevention: max 20 referrals per customer, phone verification required

---

## 18. Laundry Processing Workflow

### Internal Order Lifecycle (What Happens at the Outlet)

```
Driver arrives at outlet with customer's laundry
       │
       ▼
┌──────────────────┐
│ 1. INTAKE         │ — weigh bag, log actual weight
│                   │ — tag items with order barcode/QR
│                   │ — note any pre-existing damage (photo)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. SORTING        │ — separate by service type
│                   │ — separate by color/fabric
│                   │ — flag special instructions
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. PROCESSING     │ — wash / dry clean / iron
│                   │ — stain treatment if needed
│                   │ — estimated processing time logged
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. QUALITY CHECK  │ — inspect all items
│                   │ — verify stain removal
│                   │ — re-process if needed
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. PACKAGING      │ — fold / hang per service type
│                   │ — package with order label
│                   │ — mark ready for delivery
└────────┬─────────┘
         │
         ▼
  Status updates to customer at each stage
  Admin can track per-item progress
```

### Pricing Model

| Service         | Pricing Basis | Example Rate     |
| --------------- | ------------- | ---------------- |
| Wash & Fold     | Per pound     | $1.75/lb         |
| Dry Cleaning    | Per item      | $5-15/item       |
| Iron Only       | Per item      | $2-4/item        |
| Stain Removal   | Per item      | $3-8/item        |
| Express (same day)| Surcharge   | +50% on base     |
| Bedding/Comforter| Per item     | $15-30/item      |

- All rates admin-configurable per outlet
- Minimum order weight/amount enforced (configurable)
- Estimated price shown at order time; final price adjusted after actual weighing at intake
- Customer notified if final price differs by more than 15% from estimate

---

## 19. Background Job Queue (BullMQ)

### Job Types

| Queue Name           | Jobs                                         | Priority |
| -------------------- | -------------------------------------------- | -------- |
| `notifications`      | Push notifications, SMS, email dispatch      | High     |
| `payments`           | Retry failed payments, process refunds       | Critical |
| `driver-assignment`  | Auto-assign drivers, retry on rejection      | High     |
| `reports`            | Generate daily/weekly reports for admin      | Low      |
| `maintenance`        | Expire offers, purge old OTPs, clean logs    | Low      |
| `subscriptions`      | Renewal reminders, failed payment retries    | Medium   |

### Retry Strategy
- **Payment jobs**: 3 retries with exponential backoff (1min, 5min, 15min)
- **Notification jobs**: 2 retries with 30s delay
- **Driver assignment**: immediate retry to next driver (no backoff)
- Dead letter queue for jobs that exhaust retries — admin alerted

### Scheduled Jobs (Cron)

| Schedule       | Job                                          |
| -------------- | -------------------------------------------- |
| Every 60s      | Payment gateway health check pings           |
| Every 5 min    | Clean expired OTPs from Redis                |
| Every hour     | Check driver document expiry (30-day warning)|
| Daily 2:00 AM  | Generate daily revenue report                |
| Daily 3:00 AM  | Expire ended offers, deactivate old banners  |
| Weekly Monday  | Generate weekly analytics digest for admin   |
| Monthly 1st    | Loyalty points expiry check                  |

---

## 20. Testing Strategy

### Testing Pyramid

| Layer              | Tool                        | Coverage Target |
| ------------------ | --------------------------- | --------------- |
| **Unit Tests**     | Vitest                      | 80%+ on services, utils, validators |
| **Integration**    | Vitest + Supertest          | All API endpoints, DB operations     |
| **E2E (Web)**      | Playwright                  | Critical flows (auth, order, payment)|
| **E2E (Mobile)**   | Detox                       | Core user journeys                   |
| **Load Testing**   | k6 / Artillery              | API under 500+ concurrent users      |
| **Visual Regression** | Chromatic (Storybook)    | UI component consistency             |

### What to Test

- **Auth**: OTP send/verify, rate limiting, token refresh, expired token handling
- **Geospatial**: radius boundary cases (exactly 25 miles, just outside, edge of radius)
- **Payments**: Stripe success, Stripe failure → Square fallback, all-gateway-down scenario
- **Order flow**: full lifecycle from placement to delivery
- **Driver assignment**: ranking algorithm, timeout cascade, no-driver-available fallback
- **Offers**: first-N orders, promo code validation, expired offer rejection, stacking rules
- **WebSocket**: connection, reconnection, driver location broadcast, order status updates
- **Admin config**: changing radius reflects immediately, payment gateway switch, offer CRUD
- **UI components**: visual regression on buttons, cards, badges, modals in both light/dark mode

### CI Pipeline (GitHub Actions)

```
Push / PR
   │
   ├── Lint (ESLint + Prettier) ──────────────── 30s
   ├── Type Check (tsc --noEmit) ─────────────── 45s
   ├── Unit Tests (Vitest) ───────────────────── 2min
   ├── Integration Tests (Vitest + test DB) ──── 3min
   ├── Build all apps ────────────────────────── 3min
   ├── Visual Regression (Chromatic) ─────────── 2min
   └── E2E Tests (Playwright — critical only) ── 5min
                                         Total: ~16min
```

---

## 21. API Versioning & Backward Compatibility

### Strategy: URL-based Versioning
```
/api/v1/orders
/api/v2/orders    (future)
```

- Mobile apps can't be force-updated immediately — old API versions must remain supported
- **Deprecation policy**: old version supported for 6 months after new version launches
- Version sunset communicated via:
  - Response header: `X-API-Deprecation: 2026-12-01`
  - In-app banner: "Please update your app for the best experience"
  - Force-update mechanism for critical security patches (app store version check on launch)

### API Response Format (Standardized)
```json
{
  "success": true,
  "data": { },
  "message": "Order placed successfully",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "ORDER_OUTSIDE_RADIUS",
    "message": "Your address is outside our service area",
    "details": { "distance": 28.3, "maxRadius": 25, "unit": "miles" }
  }
}
```

---

## 22. Offline & Error Resilience

### Customer App
- **Offline queue** — if connection drops during order submission, queue locally and retry on reconnect
- **Cached data** — home screen banners, service list, saved addresses available offline (stale-while-revalidate)
- **Tracking reconnection** — WebSocket auto-reconnect with exponential backoff; show "Reconnecting..." overlay
- **Payment resilience** — if payment intent created but confirmation lost, backend idempotency key prevents double charge

### Driver App
- **Location buffering** — if WebSocket drops, buffer GPS points locally (up to 5 minutes) and flush on reconnect
- **Offline order actions** — pickup/delivery confirmations queued and synced when back online
- **Photo upload retry** — proof photos saved locally, uploaded with retry queue

### Backend Circuit Breaker Pattern
```
External Service (Stripe, Twilio, Mapbox, etc.)
       │
       ▼
┌──────────────────┐
│ Circuit Breaker   │
│                   │
│ CLOSED ──→ if 5 failures in 60s ──→ OPEN
│ OPEN   ──→ reject immediately for 30s ──→ HALF-OPEN
│ HALF-OPEN ──→ try 1 request ──→ success? → CLOSED
│                               ──→ fail?    → OPEN
└──────────────────┘
```
- Prevents cascading failures when external services are down
- Each external integration gets its own circuit breaker
- Admin dashboard shows circuit breaker states (green/yellow/red)

### Error UI States

Every error state should be designed, never a raw error message:

```
┌──────────────────────────────┐
│                              │
│       ⚠️ (48px icon)        │
│                              │
│    Something went wrong      │ ← h3, text-primary
│  We couldn't load your       │ ← body-sm, text-secondary
│  orders. Please try again.   │
│                              │
│     [ Try Again ]            │ ← primary button
│      Contact Support         │ ← ghost button / link
│                              │
└──────────────────────────────┘
```

---

## 23. Analytics & Observability

### Product Analytics
| Tool               | Purpose                                     |
| ------------------- | ------------------------------------------- |
| **Mixpanel / PostHog** | User behavior tracking (funnels, retention, feature usage) |
| **Google Analytics 4** | Web traffic, conversion tracking           |
| **Firebase Analytics** | Mobile app analytics                       |

### Key Events to Track
- `otp_requested`, `otp_verified`, `signup_completed`
- `home_viewed`, `banner_tapped`, `service_selected`
- `order_started`, `address_entered`, `payment_initiated`, `order_placed`
- `order_cancelled` (with reason), `order_rated`
- `offer_applied`, `offer_failed` (with reason)
- `tracking_opened`, `driver_called`, `driver_chatted`
- `referral_shared`, `referral_redeemed`
- `theme_changed` (light/dark)

### Funnel to Monitor
```
App Open → Home Viewed → Service Selected → Address Entered → Payment → Order Placed
  100%        85%             60%               45%             35%         30%
```
- Drop-off alerts if any step decreases by more than 10% week-over-week

### Observability Stack
| Layer           | Tool                | Purpose                        |
| --------------- | ------------------- | ------------------------------ |
| Error Tracking  | Sentry              | Frontend + backend errors      |
| APM             | Sentry Performance  | API latency, slow queries      |
| Logging         | Pino + Logtail/Datadog | Structured JSON logs         |
| Uptime          | BetterStack / UptimeRobot | Endpoint health monitoring |
| Alerts          | PagerDuty / Slack   | On-call alerting               |

### Key Metrics Dashboard
- **P95 API latency** — target < 200ms
- **WebSocket connection count** — active tracking sessions
- **Payment success rate** — target > 99%
- **OTP delivery rate** — Twilio delivery callbacks
- **Driver online count** — by hour, by day
- **Order completion rate** — placed vs delivered vs cancelled

---

## 24. Accessibility & Internationalization

### Accessibility (WCAG 2.1 AA)
- Semantic HTML throughout (proper headings, landmarks, labels)
- Keyboard navigable — all actions reachable without mouse
- Screen reader support — ARIA labels on interactive elements, live regions for status updates
- Color contrast ratio minimum 4.5:1 (text), 3:1 (large text/UI components)
- Focus management — trap focus in modals, return focus on close
- Touch targets minimum 44x44px on mobile
- Motion preferences — respect `prefers-reduced-motion` for animations
- Focus ring styling — visible 2px brand-colored ring on all focusable elements

### Internationalization (Future-Ready)
- All user-facing strings in translation files (JSON-based, `next-intl`)
- RTL layout support via Tailwind's `rtl:` variant
- Currency formatting via `Intl.NumberFormat` (USD default)
- Date/time formatting via `Intl.DateTimeFormat` (US Eastern default for Michigan)
- Phone number formatting via `libphonenumber-js`
- **Launch language**: English only
- **Phase 2 languages** (based on Michigan demographics): Spanish, Arabic

---

## 25. Deep Linking & Sharing

### URL Scheme
| Action              | Web URL                              | Mobile Deep Link                   |
| ------------------- | ------------------------------------ | ---------------------------------- |
| Track order         | `app.loadnbehold.com/track/ORD123`   | `loadnbehold://track/ORD123`       |
| View offer          | `app.loadnbehold.com/offers/SPRING20`| `loadnbehold://offers/SPRING20`    |
| Referral            | `app.loadnbehold.com/ref/JOHN20`     | `loadnbehold://ref/JOHN20`         |
| Reorder             | `app.loadnbehold.com/reorder/ORD123` | `loadnbehold://reorder/ORD123`     |

- **Universal Links** (iOS) + **App Links** (Android) — tapping web URLs opens mobile app if installed
- **Deferred deep linking** — if app not installed, redirect to store → after install, navigate to intended screen
- **Notification deep links** — every push notification payload includes a deep link target
- **Share order** — customer can share tracking link via WhatsApp, SMS, etc.

---

## 26. Additional Database Collections

### Notifications (Log)
```json
{
  "_id": "ObjectId",
  "recipientId": "ObjectId (ref: Users)",
  "type": "push | sms | email",
  "channel": "order_status | promotional | system",
  "title": "Your laundry is ready!",
  "body": "Driver is on the way with your clothes.",
  "data": { "orderId": "ObjectId", "deepLink": "/track/ORD123" },
  "status": "sent | delivered | failed | read",
  "sentAt": "timestamp",
  "deliveredAt": "timestamp",
  "readAt": "timestamp"
}
```

### Transactions (Payment Ledger)
```json
{
  "_id": "ObjectId",
  "orderId": "ObjectId (ref: Orders)",
  "customerId": "ObjectId (ref: Users)",
  "type": "charge | refund | payout | credit",
  "amount": 38.03,
  "currency": "USD",
  "gateway": "stripe",
  "gatewayTransactionId": "pi_xxxxx",
  "status": "pending | succeeded | failed | refunded",
  "failoverAttempts": [
    { "gateway": "stripe", "status": "failed", "error": "timeout", "timestamp": "..." },
    { "gateway": "square", "status": "succeeded", "timestamp": "..." }
  ],
  "metadata": {},
  "createdAt": "timestamp"
}
```

### Subscriptions
```json
{
  "_id": "ObjectId",
  "customerId": "ObjectId (ref: Users)",
  "plan": "plus | premium",
  "status": "active | cancelled | past_due | expired",
  "stripeSubscriptionId": "sub_xxxxx",
  "currentPeriodStart": "timestamp",
  "currentPeriodEnd": "timestamp",
  "cancelledAt": null,
  "createdAt": "timestamp"
}
```

### Wallets
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: Users)",
  "balance": 45.50,
  "currency": "USD",
  "isActive": true,
  "transactions": [
    {
      "type": "topup | debit | credit | refund | referral_reward",
      "amount": 25.00,
      "description": "Wallet top-up via Stripe",
      "orderId": null,
      "gateway": "stripe",
      "gatewayTransactionId": "pi_xxxxx",
      "balanceAfter": 45.50,
      "createdAt": "timestamp"
    }
  ],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### CODLedger (Cash on Delivery Tracking)
```json
{
  "_id": "ObjectId",
  "driverId": "ObjectId (ref: Drivers)",
  "orderId": "ObjectId (ref: Orders)",
  "amountToCollect": 38.03,
  "amountCollected": 38.03,
  "collectedAt": "timestamp",
  "depositStatus": "pending | deposited | overdue",
  "depositedAt": null,
  "depositDeadline": "timestamp",
  "reconciledBy": "ObjectId (ref: Users — admin)",
  "reconciledAt": null,
  "notes": "",
  "createdAt": "timestamp"
}
```

### SupportTickets
```json
{
  "_id": "ObjectId",
  "ticketNumber": "TKT-2026-00042",
  "customerId": "ObjectId (ref: Users)",
  "orderId": "ObjectId (ref: Orders) — optional",
  "category": "order_issue | payment | driver_complaint | damage | refund | general",
  "subject": "Clothes returned with stain",
  "status": "open | in_progress | waiting_customer | resolved | closed",
  "priority": "low | medium | high | urgent",
  "assignedTo": "ObjectId (ref: Users — support staff)",
  "messages": [
    {
      "senderId": "ObjectId",
      "senderRole": "customer | support | admin",
      "message": "My white shirt has a new stain after washing",
      "attachments": ["s3://..."],
      "createdAt": "timestamp"
    }
  ],
  "resolution": {
    "action": "refund | credit | rebook | compensate | rejected",
    "amount": 15.00,
    "note": "Issued partial refund for damaged item",
    "resolvedBy": "ObjectId",
    "resolvedAt": "timestamp"
  },
  "slaDeadline": "timestamp",
  "slaBreach": false,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### RecurringOrders
```json
{
  "_id": "ObjectId",
  "customerId": "ObjectId (ref: Users)",
  "frequency": "weekly | biweekly | monthly",
  "dayOfWeek": "monday",
  "timeSlot": { "from": "10:00", "to": "11:00" },
  "services": [
    { "service": "wash_fold", "estimatedWeight": 8, "specialInstructions": "Separate darks" }
  ],
  "pickupAddress": { "...address with coordinates" },
  "deliveryAddress": { "...address with coordinates" },
  "paymentMethod": "online | cod | wallet",
  "isActive": true,
  "nextScheduledDate": "2026-04-14",
  "lastOrderId": "ObjectId (ref: Orders)",
  "createdAt": "timestamp"
}
```

### FamilyAccounts
```json
{
  "_id": "ObjectId",
  "ownerId": "ObjectId (ref: Users)",
  "members": [
    {
      "userId": "ObjectId (ref: Users)",
      "name": "Jane Doe",
      "phone": "+15559876543",
      "role": "member",
      "canPlaceOrders": true,
      "canUseWallet": true,
      "addedAt": "timestamp"
    }
  ],
  "sharedWallet": true,
  "maxMembers": 5,
  "createdAt": "timestamp"
}
```

### AuditLogs
```json
{
  "_id": "ObjectId",
  "actor": { "userId": "ObjectId", "role": "admin", "ip": "string" },
  "action": "string",
  "resource": { "type": "string", "id": "ObjectId" },
  "changes": { "before": {}, "after": {} },
  "timestamp": "timestamp"
}
```

---

## 27. Deployment Architecture

### Environment Strategy

| Environment  | Purpose                    | URL                              | Database           |
| ------------ | -------------------------- | -------------------------------- | ------------------ |
| **Local**    | Development                | `localhost:3000/5000`            | Local Docker MongoDB |
| **Staging**  | QA + UAT testing           | `staging.loadnbehold.com`        | MongoDB Atlas (staging cluster) |
| **Production** | Live users               | `app.loadnbehold.com`           | MongoDB Atlas (prod cluster)    |

### Docker Compose (Local Dev)
```yaml
services:
  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo-data:/data/db]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  server:
    build: ./apps/server
    ports: ["5000:5000"]
    env_file: .env.local
    depends_on: [mongodb, redis]

  web:
    build: ./apps/web
    ports: ["3000:3000"]
    env_file: .env.local

  admin:
    build: ./apps/admin
    ports: ["3001:3001"]
    env_file: .env.local
```

### Production Setup
- **Web apps** → Vercel (auto-deploy on push to `main`)
- **API server** → AWS ECS Fargate (auto-scaling, min 2 containers)
- **MongoDB** → Atlas M10+ (dedicated cluster, auto-scaling, daily backups)
- **Redis** → AWS ElastiCache (or Redis Cloud)
- **S3** → us-east-2 (Ohio, closest AWS region to Michigan)
- **CDN** → Cloudflare (cache static assets, DDoS protection)
- **SSL** → Cloudflare + ACM (auto-renewal)

### Backup & Disaster Recovery
- **MongoDB**: Atlas continuous backup with point-in-time restore (last 7 days)
- **S3**: Versioning enabled, cross-region replication to us-west-2
- **Redis**: AOF persistence + RDB snapshots every 6 hours
- **Recovery Time Objective (RTO)**: < 1 hour
- **Recovery Point Objective (RPO)**: < 5 minutes

---

## 28. Performance Optimization

### Frontend Performance Targets

| Metric                    | Target         | Measurement            |
| ------------------------- | -------------- | ---------------------- |
| **First Contentful Paint**| < 1.2s         | Lighthouse             |
| **Largest Contentful Paint**| < 2.5s       | Lighthouse             |
| **Cumulative Layout Shift** | < 0.1        | Lighthouse             |
| **First Input Delay**     | < 100ms        | Lighthouse             |
| **Time to Interactive**   | < 3.5s         | Lighthouse             |
| **Bundle Size (gzipped)** | < 200KB initial| webpack-bundle-analyzer|

### Optimization Techniques

- **Code splitting** — route-based splitting via Next.js App Router (automatic)
- **Image optimization** — `next/image` with WebP/AVIF, responsive `srcset`, blur placeholder
- **Font optimization** — `next/font` for Inter (self-hosted, no layout shift)
- **Lazy loading** — below-fold images, map component, heavy components (chart library)
- **Prefetching** — prefetch likely next pages on hover (`<Link>` default in Next.js)
- **Service worker** — cache static assets, offline home screen
- **API response caching** — SWR/React Query with stale-while-revalidate for config, banners, services
- **Skeleton screens** — show content layout immediately while data loads
- **Virtualized lists** — use `react-window` for long order lists in admin dashboard
- **Debounced search** — 300ms debounce on search inputs to reduce API calls

### Backend Performance

- **Database indexing** — compound indexes on frequently queried fields (status + date, customerId + status)
- **Redis caching** — cache hot data (outlet list, service config, active banners) with 5-minute TTL
- **Connection pooling** — MongoDB connection pool (min 5, max 50)
- **Response compression** — gzip/brotli on all API responses
- **Query optimization** — lean queries, projection (select only needed fields), pagination

---

## 29. Design Principles Summary

1. **Mobile-first responsive** — every screen designed for mobile first, scaled up to desktop
2. **Clean elevated aesthetic** — neutral base, strategic color, generous whitespace, soft shadows
3. **Config-driven** — admin changes reflect instantly, no code deploys for business logic
4. **Fault-tolerant payments** — automatic gateway failover, zero revenue loss
5. **Real-time everything** — live tracking, instant status updates, push notifications
6. **Scalable for multi-outlet** — data model supports multiple outlets from day one
7. **Type-safe end-to-end** — shared TypeScript types between frontend and backend
8. **Consistent design language** — same tokens, components, and patterns across web, admin, and mobile
9. **Accessibility first** — WCAG 2.1 AA compliance, keyboard navigable, screen reader friendly
10. **Performance budget** — every page loads under 2.5s LCP, every API responds under 200ms P95

---

## 30. Third-Party Services Summary

| Service           | Provider(s)            | Purpose                    | Monthly Estimate |
| ----------------- | ---------------------- | -------------------------- | ---------------- |
| Database          | MongoDB Atlas          | Primary database           | $57+             |
| Cache             | Redis Cloud / AWS      | OTP, sessions, location    | $15+             |
| SMS/OTP           | Twilio                 | Phone authentication       | Pay per SMS      |
| Payments          | Stripe + Square        | Payment processing         | 2.9% + 30c/txn  |
| Maps              | Mapbox                 | Tracking, geocoding        | Free tier + $$$  |
| Push Notifications| Firebase (FCM)         | Push to mobile             | Free             |
| File Storage      | AWS S3                 | Images, documents          | ~$5              |
| Email             | SendGrid               | Transactional emails       | Free tier + $$$  |
| Hosting (Web)     | Vercel                 | Next.js apps               | $20/app          |
| Hosting (API)     | AWS (ECS/EC2)          | Backend server             | $50+             |
| Monitoring        | Sentry                 | Error tracking             | Free tier        |
| CI/CD             | GitHub Actions         | Automated deploys          | Free tier        |
| Analytics         | PostHog / Mixpanel     | Product analytics          | Free tier        |
| Font              | Google Fonts (Inter)   | Typography                 | Free             |

---

*This document serves as the single source of truth for the LoadNBehold implementation. Update it as decisions evolve.*
