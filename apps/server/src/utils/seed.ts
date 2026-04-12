import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { User } from '../models/User';
import { Driver } from '../models/Driver';
import { Outlet } from '../models/Outlet';
import { AppConfig } from '../models/AppConfig';
import { Banner } from '../models/Banner';
import { Offer } from '../models/Offer';

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/loadnbehold';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  // ─── App Config ────────────────────────────────────────
  await AppConfig.findOneAndUpdate(
    { key: 'global' },
    {
      key: 'global',
      taxRate: 6.0,
      deliveryFee: { base: 4.99, perMile: 0.5, freeAbove: 50 },
      payment: {
        cod: { enabled: true, maxOrderAmount: 100, minCompletedOrdersRequired: 3, surcharge: 0 },
        wallet: { enabled: true, maxBalance: 10_000 },
      },
    },
    { upsert: true }
  );
  console.log('✅ App config seeded');

  // ═══════════════════════════════════════════════════════
  //  USER ACCOUNTS
  // ═══════════════════════════════════════════════════════

  // ─── Super Admin ───────────────────────────────────────
  const superAdmin = await User.findOneAndUpdate(
    { phone: '+15550001111' },
    {
      phone: '+15550001111',
      name: 'Admin User',
      email: 'admin@loadnbehold.com',
      role: 'admin',
      adminRole: 'super_admin',
      referralCode: 'ADMIN01',
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Super Admin:    +15550001111 (OTP: 123456) — ${superAdmin._id}`);

  // ─── Support Staff ────────────────────────────────────
  const support = await User.findOneAndUpdate(
    { phone: '+15550002222' },
    {
      phone: '+15550002222',
      name: 'Support User',
      email: 'support@loadnbehold.com',
      role: 'admin',
      adminRole: 'support_staff',
      referralCode: 'SUPP01',
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Support Staff:  +15550002222 (OTP: 123456) — ${support._id}`);

  // ─── Marketing Admin ──────────────────────────────────
  const marketing = await User.findOneAndUpdate(
    { phone: '+15550003333' },
    {
      phone: '+15550003333',
      name: 'Marketing User',
      email: 'marketing@loadnbehold.com',
      role: 'admin',
      adminRole: 'marketing',
      referralCode: 'MARK01',
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Marketing:      +15550003333 (OTP: 123456) — ${marketing._id}`);

  // ─── Finance Admin ────────────────────────────────────
  const finance = await User.findOneAndUpdate(
    { phone: '+15550004444' },
    {
      phone: '+15550004444',
      name: 'Finance User',
      email: 'finance@loadnbehold.com',
      role: 'admin',
      adminRole: 'finance',
      referralCode: 'FIN01',
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Finance:        +15550004444 (OTP: 123456) — ${finance._id}`);

  // ─── Customer (experienced) ───────────────────────────
  const customer1 = await User.findOneAndUpdate(
    { phone: '+15551234567' },
    {
      phone: '+15551234567',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'customer',
      referralCode: 'JOHN20',
      totalOrders: 5,
      loyaltyPoints: 750,
      walletBalance: 25,
      addresses: [
        {
          label: 'Home',
          line1: '123 Main St',
          city: 'Detroit',
          state: 'MI',
          zip: '48201',
          location: { type: 'Point', coordinates: [-83.0458, 42.3314] },
        },
        {
          label: 'Work',
          line1: '456 Office Blvd',
          city: 'Detroit',
          state: 'MI',
          zip: '48226',
          location: { type: 'Point', coordinates: [-83.0389, 42.3314] },
        },
      ],
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Customer (exp): +15551234567 (OTP: 123456) — ${customer1._id}`);

  // ─── Customer (new) ───────────────────────────────────
  const customer2 = await User.findOneAndUpdate(
    { phone: '+15559876543' },
    {
      phone: '+15559876543',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'customer',
      referralCode: 'JANE10',
      totalOrders: 0,
      loyaltyPoints: 0,
      walletBalance: 0,
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Customer (new): +15559876543 (OTP: 123456) — ${customer2._id}`);

  // ─── Driver Users ─────────────────────────────────────
  const driverUser1 = await User.findOneAndUpdate(
    { phone: '+15551112222' },
    {
      phone: '+15551112222',
      name: 'Alex Morgan',
      role: 'driver',
      referralCode: 'ALEX01',
    },
    { upsert: true, new: true }
  );

  const driverUser2 = await User.findOneAndUpdate(
    { phone: '+15553334444' },
    {
      phone: '+15553334444',
      name: 'Sam Wilson',
      role: 'driver',
      referralCode: 'SAM01',
    },
    { upsert: true, new: true }
  );

  // ─── Sample Outlet ─────────────────────────────────────
  const outlet = await Outlet.findOneAndUpdate(
    { name: 'LoadNBehold — Detroit Central' },
    {
      name: 'LoadNBehold — Detroit Central',
      address: {
        line1: '456 Laundry Lane',
        city: 'Detroit',
        state: 'MI',
        zip: '48201',
        location: { type: 'Point', coordinates: [-83.0458, 42.3314] },
      },
      serviceRadius: 25,
      serviceRadiusUnit: 'miles',
      operatingHours: {
        monday: { open: '07:00', close: '21:00' },
        tuesday: { open: '07:00', close: '21:00' },
        wednesday: { open: '07:00', close: '21:00' },
        thursday: { open: '07:00', close: '21:00' },
        friday: { open: '07:00', close: '21:00' },
        saturday: { open: '08:00', close: '20:00' },
        sunday: { open: '09:00', close: '18:00' },
      },
      services: ['wash_fold', 'dry_clean', 'iron', 'stain_removal', 'bedding'],
      isActive: true,
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Outlet:         ${outlet._id} (Detroit Central)`);

  // ─── Driver Profiles ──────────────────────────────────
  const driver1 = await Driver.findOneAndUpdate(
    { userId: driverUser1._id },
    {
      userId: driverUser1._id,
      status: 'approved',
      isOnline: true,
      vehicle: { type: 'car', make: 'Toyota', model: 'Camry', year: 2022, licensePlate: 'MI-1234' },
      assignedOutlet: outlet._id,
      metrics: { totalDeliveries: 42, rating: 4.8, ratingCount: 35 },
      cashBalance: 0,
      cashCollected: 0,
      cashDeposited: 0,
      currentLocation: { type: 'Point', coordinates: [-83.0458, 42.3314] },
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Driver (online):  +15551112222 (OTP: 123456) — Alex Morgan — ${driver1._id}`);

  const driver2 = await Driver.findOneAndUpdate(
    { userId: driverUser2._id },
    {
      userId: driverUser2._id,
      status: 'approved',
      isOnline: false,
      vehicle: { type: 'car', make: 'Honda', model: 'Civic', year: 2021, licensePlate: 'MI-5678' },
      assignedOutlet: outlet._id,
      metrics: { totalDeliveries: 15, rating: 4.5, ratingCount: 12 },
      cashBalance: 0,
      cashCollected: 0,
      cashDeposited: 0,
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Driver (offline): +15553334444 (OTP: 123456) — Sam Wilson — ${driver2._id}`);

  // ─── Banners ───────────────────────────────────────────
  await Banner.deleteMany({});
  await Banner.insertMany([
    {
      imageUrl: '/banners/spring-sale.jpg',
      title: 'Spring Cleaning Sale — 20% Off',
      deepLink: '/offers/spring-sale',
      order: 0,
      activeFrom: new Date(),
      activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      targetAudience: 'all',
    },
    {
      imageUrl: '/banners/free-delivery.jpg',
      title: 'Free Delivery on Orders Over $50',
      deepLink: '/offers/free-delivery',
      order: 1,
      activeFrom: new Date(),
      activeUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isActive: true,
      targetAudience: 'all',
    },
  ]);
  console.log('✅ Banners seeded (2)');

  // ─── Offers ────────────────────────────────────────────
  await Offer.deleteMany({});
  await Offer.insertMany([
    {
      title: 'First 15 Orders — 20% Off',
      type: 'first_n_orders',
      config: {
        firstNOrders: 15,
        discountType: 'percentage',
        discountValue: 20,
        maxDiscount: 10,
        minOrderAmount: 0,
        perUserLimit: 15,
      },
      promoCode: 'FIRST20',
      targeting: 'new_users',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      title: 'Free Delivery Over $50',
      type: 'free_delivery',
      config: {
        discountType: 'flat',
        discountValue: 4.99,
        minOrderAmount: 50,
        perUserLimit: 100,
      },
      promoCode: 'FREE50',
      targeting: 'all',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  ]);
  console.log('✅ Offers seeded (2)');

  // ═══════════════════════════════════════════════════════
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           🎉 DATABASE SEEDED SUCCESSFULLY!              ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║                                                          ║');
  console.log('║  DEV OTP CODE: 123456 (works for all accounts)          ║');
  console.log('║                                                          ║');
  console.log('║  ADMIN ACCOUNTS:                                         ║');
  console.log('║    Super Admin:    +15550001111                          ║');
  console.log('║    Support Staff:  +15550002222                          ║');
  console.log('║    Marketing:      +15550003333                          ║');
  console.log('║    Finance:        +15550004444                          ║');
  console.log('║                                                          ║');
  console.log('║  CUSTOMER ACCOUNTS:                                      ║');
  console.log('║    John Doe (5 orders):  +15551234567                   ║');
  console.log('║    Jane Smith (new):     +15559876543                   ║');
  console.log('║                                                          ║');
  console.log('║  DRIVER ACCOUNTS:                                        ║');
  console.log('║    Alex Morgan (online):  +15551112222                  ║');
  console.log('║    Sam Wilson (offline):  +15553334444                  ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
