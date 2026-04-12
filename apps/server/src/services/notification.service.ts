import * as admin from 'firebase-admin';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import path from 'path';

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return;
  try {
    const serviceAccountPath = path.resolve(env.FIREBASE_SERVICE_ACCOUNT_PATH);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized');
  } catch (error) {
    logger.warn('Firebase Admin SDK not initialized — push notifications will be logged only');
  }
}

// Initialize on module load
initFirebase();

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const user = await User.findById(userId).select('fcmTokens');
    if (!user || user.fcmTokens.length === 0) {
      logger.warn(`No FCM tokens for user ${userId}`);
      // Still store the notification for in-app display
      await Notification.create({
        recipientId: userId,
        type: 'push',
        channel: 'order_status',
        title: payload.title,
        body: payload.body,
        data: payload.data,
        status: 'sent',
        sentAt: new Date(),
      });
      return;
    }

    // Send via Firebase if initialized
    if (firebaseInitialized) {
      const stringData: Record<string, string> = {};
      if (payload.data) {
        for (const [key, value] of Object.entries(payload.data)) {
          stringData[key] = String(value);
        }
      }

      const message: admin.messaging.MulticastMessage = {
        tokens: user.fcmTokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: stringData,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info(`Push sent to ${userId}: ${response.successCount}/${user.fcmTokens.length} delivered`);

      // Remove invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
            invalidTokens.push(user.fcmTokens[idx]);
          }
        });
        if (invalidTokens.length > 0) {
          await User.findByIdAndUpdate(userId, {
            $pull: { fcmTokens: { $in: invalidTokens } },
          });
          logger.info(`Removed ${invalidTokens.length} invalid FCM tokens for user ${userId}`);
        }
      }
    } else {
      logger.info(`Push to ${userId}: ${payload.title}`);
    }

    await Notification.create({
      recipientId: userId,
      type: 'push',
      channel: 'order_status',
      title: payload.title,
      body: payload.body,
      data: payload.data,
      status: 'sent',
      sentAt: new Date(),
    });
  } catch (error) {
    logger.error({ err: error }, `Failed to send push notification to ${userId}`);
  }
}

export async function sendSmsNotification(
  phone: string,
  message: string
): Promise<void> {
  try {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
      const twilio = await import('twilio');
      const client = twilio.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: message,
        from: env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      logger.info(`SMS sent to ${phone}`);
    } else {
      logger.info(`SMS to ${phone}: ${message}`);
    }
  } catch (error) {
    logger.error({ err: error }, `Failed to send SMS to ${phone}`);
  }
}

export async function sendOrderStatusNotification(
  userId: string,
  orderNumber: string,
  status: string,
  statusLabel: string
): Promise<void> {
  const messages: Record<string, string> = {
    driver_assigned: 'A driver has been assigned to your order',
    pickup_enroute: 'Your driver is on the way to pick up your laundry',
    picked_up: 'Your laundry has been picked up',
    at_laundry: 'Your laundry has arrived at our facility',
    processing: 'Your laundry is being processed',
    quality_check: 'Your laundry is undergoing quality check',
    out_for_delivery: 'Your clean laundry is out for delivery!',
    delivered: 'Your laundry has been delivered. Enjoy your fresh clothes!',
    cancelled: 'Your order has been cancelled',
  };

  await sendPushNotification(userId, {
    title: `Order ${orderNumber} — ${statusLabel}`,
    body: messages[status] || `Your order status has been updated to: ${statusLabel}`,
    data: { orderId: orderNumber, status },
  });
}

export async function getUserNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipientId: userId }),
  ]);

  return { notifications, total };
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await Notification.updateOne(
    { _id: notificationId, recipientId: userId },
    { status: 'read', readAt: new Date() }
  );
  return result.modifiedCount > 0;
}
