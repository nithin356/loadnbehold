import { describe, it, expect, beforeEach, vi } from 'vitest';

// Set environment variables BEFORE any imports
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.NODE_ENV = 'test';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.APP_NAME = 'LoadNBehold Test';

// Mock Redis
vi.mock('../config/redis', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
  },
  connectRedis: vi.fn().mockResolvedValue(undefined),
}));

// Mock notification service
vi.mock('../services/notification.service', () => ({
  sendOrderStatusNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock BullMQ queue
vi.mock('../jobs/queue', () => ({
  createQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue(undefined),
  }),
  queues: {
    orderProcessing: {
      add: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { User } from '../models/User';
import { Outlet } from '../models/Outlet';
import { Order } from '../models/Order';
import { AppConfig } from '../models/AppConfig';

describe('Orders API', () => {
  let user: any;
  let outlet: any;
  let accessToken: string;

  beforeEach(async () => {
    // Create a test user
    user = await User.create({
      phone: '+15551234567',
      name: 'Test Customer',
      role: 'customer',
      referralCode: 'TEST01',
      totalOrders: 5,
    });

    // Create a test outlet
    outlet = await Outlet.create({
      name: 'Main Laundry Center',
      address: {
        line1: '123 Main St',
        city: 'Detroit',
        state: 'MI',
        zip: '48201',
        location: {
          type: 'Point',
          coordinates: [-83.0458, 42.3314], // Detroit coordinates
        },
      },
      serviceRadius: 10,
      isActive: true,
      operatingHours: {
        monday: { open: '08:00', close: '20:00' },
        tuesday: { open: '08:00', close: '20:00' },
        wednesday: { open: '08:00', close: '20:00' },
        thursday: { open: '08:00', close: '20:00' },
        friday: { open: '08:00', close: '20:00' },
        saturday: { open: '09:00', close: '18:00' },
        sunday: { open: '09:00', close: '18:00' },
      },
      services: ['wash_fold', 'dry_clean', 'iron'],
    });

    // Create app config
    await AppConfig.create({
      key: 'global',
      taxRate: 6.0,
      deliveryFee: {
        base: 4.99,
        perMile: 0.5,
        freeAbove: 50,
      },
      payment: {
        cod: {
          enabled: true,
          minCompletedOrdersRequired: 3,
          maxOrderAmount: 100,
        },
      },
    });

    // Generate access token
    accessToken = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' }
    );
  });

  describe('POST /api/v1/orders', () => {
    it('should create a new order with valid data', async () => {
      const orderData = {
        items: [
          {
            service: 'wash_fold',
            quantity: 2,
            weight: 10,
            unit: 'lbs',
            specialInstructions: 'Gentle cycle',
            price: 17.5,
          },
        ],
        pickupAddress: {
          label: 'Home',
          line1: '456 Test Ave',
          city: 'Detroit',
          state: 'MI',
          zip: '48201',
          location: {
            type: 'Point',
            coordinates: [-83.0458, 42.3314],
          },
          instructions: 'Ring doorbell',
        },
        deliveryAddress: {
          label: 'Home',
          line1: '456 Test Ave',
          city: 'Detroit',
          state: 'MI',
          zip: '48201',
          location: {
            type: 'Point',
            coordinates: [-83.0458, 42.3314],
          },
        },
        schedule: {
          pickupSlot: {
            date: '2026-04-15',
            from: '09:00',
            to: '11:00',
          },
        },
        paymentMethod: 'online',
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderNumber');
      expect(response.body.data.status).toBe('placed');
      expect(response.body.data.customerId).toBe(user._id.toString());
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.pricing).toHaveProperty('total');
    });

    it('should reject order for address outside service area', async () => {
      const orderData = {
        items: [
          {
            service: 'wash_fold',
            quantity: 1,
            weight: 5,
            unit: 'lbs',
            price: 8.75,
          },
        ],
        pickupAddress: {
          label: 'Far Away',
          line1: '999 Faraway St',
          city: 'Chicago',
          state: 'IL',
          zip: '60601',
          location: {
            type: 'Point',
            coordinates: [-87.6298, 41.8781], // Chicago coordinates
          },
        },
        deliveryAddress: {
          label: 'Far Away',
          line1: '999 Faraway St',
          city: 'Chicago',
          state: 'IL',
          zip: '60601',
          location: {
            type: 'Point',
            coordinates: [-87.6298, 41.8781],
          },
        },
        schedule: {
          pickupSlot: {
            date: '2026-04-15',
            from: '09:00',
            to: '11:00',
          },
        },
        paymentMethod: 'online',
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_OUTSIDE_RADIUS');
    });

    it('should reject COD order for new users', async () => {
      // Create new user with no orders
      const newUser = await User.create({
        phone: '+15559999999',
        name: 'New User',
        role: 'customer',
        referralCode: 'NEW01',
        totalOrders: 0,
      });

      const newUserToken = jwt.sign(
        { userId: newUser._id.toString(), role: newUser.role },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '15m' }
      );

      const orderData = {
        items: [
          {
            service: 'wash_fold',
            quantity: 1,
            weight: 5,
            unit: 'lbs',
            price: 8.75,
          },
        ],
        pickupAddress: {
          label: 'Home',
          line1: '456 Test Ave',
          city: 'Detroit',
          state: 'MI',
          zip: '48201',
          location: {
            type: 'Point',
            coordinates: [-83.0458, 42.3314],
          },
        },
        deliveryAddress: {
          label: 'Home',
          line1: '456 Test Ave',
          city: 'Detroit',
          state: 'MI',
          zip: '48201',
          location: {
            type: 'Point',
            coordinates: [-83.0458, 42.3314],
          },
        },
        schedule: {
          pickupSlot: {
            date: '2026-04-15',
            from: '09:00',
            to: '11:00',
          },
        },
        paymentMethod: 'cod',
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COD_NOT_ELIGIBLE');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/orders', () => {
    beforeEach(async () => {
      // Create test orders
      await Order.create({
        orderNumber: 'LNB-2026-00001',
        customerId: user._id,
        outletId: outlet._id,
        status: 'placed',
        items: [
          {
            service: 'wash_fold',
            quantity: 1,
            weight: 5,
            unit: 'lbs',
            price: 8.75,
          },
        ],
        pickupAddress: {
          label: 'Home',
          line1: '456 Test Ave',
          city: 'Detroit',
          state: 'MI',
          zip: '48201',
          location: {
            type: 'Point',
            coordinates: [-83.0458, 42.3314],
          },
        },
        deliveryAddress: {
          label: 'Home',
          line1: '456 Test Ave',
          city: 'Detroit',
          state: 'MI',
          zip: '48201',
          location: {
            type: 'Point',
            coordinates: [-83.0458, 42.3314],
          },
        },
        schedule: {
          pickupSlot: {
            date: '2026-04-15',
            from: '09:00',
            to: '11:00',
          },
        },
        pricing: {
          subtotal: 8.75,
          deliveryFee: 4.99,
          tax: 0.53,
          discount: 0,
          surcharge: 0,
          total: 14.27,
        },
        paymentMethod: 'online',
        payment: {
          gateway: 'stripe',
          status: 'pending',
          codAmount: 0,
          walletAmount: 0,
          onlineAmount: 14.27,
          codCollectedByDriver: false,
        },
        timeline: [
          {
            status: 'placed',
            timestamp: new Date(),
          },
        ],
      });
    });

    it('should return list of user orders', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('orderNumber');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/orders').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/orders/:id/cancel', () => {
    let order: any;

    beforeEach(async () => {
      order = await Order.create({
        orderNumber: 'LNB-2026-00002',
        customerId: user._id,
        outletId: outlet._id,
        status: 'placed',
        items: [
          {
            service: 'wash_fold',
            quantity: 1,
            weight: 5,
            unit: 'lbs',
            price: 8.75,
          },
        ],
        pickupAddress: {
          label: 'Home',
          line1: '456 Test Ave',
          city: 'Detroit',
          state: 'MI',
          zip: '48201',
          location: {
            type: 'Point',
            coordinates: [-83.0458, 42.3314],
          },
        },
        deliveryAddress: {
          label: 'Home',
          line1: '456 Test Ave',
          city: 'Detroit',
          state: 'MI',
          zip: '48201',
          location: {
            type: 'Point',
            coordinates: [-83.0458, 42.3314],
          },
        },
        schedule: {
          pickupSlot: {
            date: '2026-04-15',
            from: '09:00',
            to: '11:00',
          },
        },
        pricing: {
          subtotal: 8.75,
          deliveryFee: 4.99,
          tax: 0.53,
          discount: 0,
          surcharge: 0,
          total: 14.27,
        },
        paymentMethod: 'online',
        payment: {
          gateway: 'stripe',
          status: 'pending',
          codAmount: 0,
          walletAmount: 0,
          onlineAmount: 14.27,
          codCollectedByDriver: false,
        },
        timeline: [
          {
            status: 'placed',
            timestamp: new Date(),
          },
        ],
      });
    });

    it('should cancel an order successfully', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should return error for non-existent order', async () => {
      const response = await request(app)
        .put('/api/v1/orders/507f1f77bcf86cd799439011/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${order._id}/cancel`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
