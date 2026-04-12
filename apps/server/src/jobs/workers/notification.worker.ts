import { Job } from 'bullmq';
import { logger } from '../../utils/logger';
import {
  sendPushNotification,
  sendSmsNotification,
  sendOrderStatusNotification,
} from '../../services/notification.service';

interface PushNotificationJob {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface SmsNotificationJob {
  phone: string;
  message: string;
}

interface EmailNotificationJob {
  email: string;
  subject: string;
  body: string;
  template?: string;
}

interface OrderStatusNotificationJob {
  userId: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
}

type NotificationJobData =
  | PushNotificationJob
  | SmsNotificationJob
  | EmailNotificationJob
  | OrderStatusNotificationJob;

export async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  const { name, data } = job;

  logger.info({ jobName: name, jobId: job.id }, 'Processing notification job');

  try {
    switch (name) {
      case 'send-push':
        await handleSendPush(data as PushNotificationJob);
        break;

      case 'send-sms':
        await handleSendSms(data as SmsNotificationJob);
        break;

      case 'send-email':
        await handleSendEmail(data as EmailNotificationJob);
        break;

      case 'send-order-status':
        await handleSendOrderStatus(data as OrderStatusNotificationJob);
        break;

      default:
        logger.warn({ jobName: name }, 'Unknown notification job type');
    }
  } catch (error) {
    logger.error({ err: error, jobName: name, jobId: job.id }, 'Notification job failed');
    throw error;
  }
}

async function handleSendPush(data: PushNotificationJob): Promise<void> {
  const { userId, title, body, data: payload } = data;
  await sendPushNotification(userId, { title, body, data: payload });
}

async function handleSendSms(data: SmsNotificationJob): Promise<void> {
  const { phone, message } = data;
  await sendSmsNotification(phone, message);
}

async function handleSendEmail(data: EmailNotificationJob): Promise<void> {
  const { email, subject, body } = data;
  // In production, use an email service like SendGrid, AWS SES, etc.
  logger.info(`📧 Email to ${email}: ${subject}`);
  logger.debug({ email, subject, body }, 'Email content');
}

async function handleSendOrderStatus(data: OrderStatusNotificationJob): Promise<void> {
  const { userId, orderNumber, status, statusLabel } = data;
  await sendOrderStatusNotification(userId, orderNumber, status, statusLabel);
}
