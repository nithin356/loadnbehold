import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// Initialize SendGrid
if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  logger.info('SendGrid initialized');
}

/**
 * Base email sending function
 * Uses SendGrid when API key is configured, otherwise logs to console.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!to) return;

  if (env.SENDGRID_API_KEY) {
    try {
      await sgMail.send({
        to,
        from: env.SENDGRID_FROM_EMAIL,
        subject,
        html,
      });
      logger.info({ to, subject }, 'Email sent via SendGrid');
    } catch (error: any) {
      logger.error({ err: error?.response?.body || error, to, subject }, 'SendGrid email failed');
    }
    return;
  }

  // Fallback: log to console in dev
  logger.info({ to, subject, preview: html.substring(0, 100) + '...' }, 'Email (console-only — no SendGrid key)');
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmation(
  email: string,
  orderNumber: string,
  items: any[],
  total: number
): Promise<void> {
  const subject = `Order Confirmation - ${orderNumber}`;

  const itemsList = items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.quantity}x ${item.name || item.service}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">$${((item.price || 0) * item.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; text-align: center; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border-radius: 12px; font-weight: 900; font-size: 12px;">LNB</div>
        <h1 style="color: #111; margin: 16px 0 4px;">Order Confirmed!</h1>
        <p style="color: #666; margin: 0;">Order #${orderNumber}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr><th style="text-align: left; padding: 8px 0; border-bottom: 2px solid #111; font-size: 14px;">Item</th><th style="text-align: right; padding: 8px 0; border-bottom: 2px solid #111; font-size: 14px;">Price</th></tr>
        </thead>
        <tbody>${itemsList}</tbody>
        <tfoot>
          <tr><td style="padding: 12px 0; font-weight: bold; font-size: 18px;">Total</td><td style="padding: 12px 0; font-weight: bold; font-size: 18px; text-align: right;">$${total.toFixed(2)}</td></tr>
        </tfoot>
      </table>

      <p style="margin-top: 24px; color: #666; font-size: 14px;">We'll notify you when your laundry is picked up. Thank you for choosing LoadNBehold!</p>
      <p style="margin-top: 32px; font-size: 11px; color: #999;">This is an automated email from LoadNBehold.</p>
    </div>
  `;

  await sendEmail(email, subject, html);
}

/**
 * Send order status update email
 */
export async function sendOrderStatusUpdate(
  email: string,
  orderNumber: string,
  status: string
): Promise<void> {
  const subject = `Order Update - ${orderNumber}`;

  const statusMessages: Record<string, string> = {
    confirmed: 'Your order has been confirmed and is being prepared.',
    driver_assigned: 'A driver has been assigned to your order.',
    pickup_enroute: 'Your driver is on the way to pick up your laundry.',
    picked_up: 'Your laundry has been picked up!',
    at_laundry: 'Your laundry has arrived at our facility.',
    processing: 'Your laundry is being cleaned and processed.',
    quality_check: 'Your laundry is undergoing a quality check.',
    ready_for_delivery: 'Your laundry is ready for delivery!',
    out_for_delivery: 'Your clean laundry is out for delivery!',
    delivered: 'Your laundry has been delivered. Enjoy your fresh clothes!',
    cancelled: 'Your order has been cancelled.',
  };

  const message = statusMessages[status] || `Your order status has been updated to: ${status}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; text-align: center; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border-radius: 12px; font-weight: 900; font-size: 12px;">LNB</div>
      </div>

      <h1 style="color: #111; font-size: 20px;">Order #${orderNumber}</h1>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="font-size: 16px; margin: 0; color: #333;">${message}</p>
      </div>

      <p style="color: #666; font-size: 14px;">Thank you for choosing LoadNBehold!</p>
      <p style="font-size: 11px; color: #999;">This is an automated email from LoadNBehold.</p>
    </div>
  `;

  await sendEmail(email, subject, html);
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const subject = 'Welcome to LoadNBehold!';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; text-align: center; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border-radius: 12px; font-weight: 900; font-size: 12px;">LNB</div>
        <h1 style="color: #111; margin: 16px 0 4px;">Welcome, ${name}!</h1>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #333;">Thanks for joining LoadNBehold. Here's what you can do:</p>

      <ul style="font-size: 15px; line-height: 2; color: #444;">
        <li>Schedule laundry pickup at your doorstep</li>
        <li>Track your order in real-time</li>
        <li>Pay with card, wallet, or cash on delivery</li>
        <li>Earn rewards by referring friends</li>
      </ul>

      <p style="font-size: 14px; color: #666; margin-top: 24px;">Use code <strong style="color: #2563eb;">FIRST20</strong> for 20% off your first 15 orders!</p>

      <p style="font-size: 11px; color: #999; margin-top: 32px;">This is an automated email from LoadNBehold.</p>
    </div>
  `;

  await sendEmail(email, subject, html);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const subject = 'Password Reset Request';
  const resetUrl = `${env.NODE_ENV === 'production' ? 'https://loadnbehold.com' : 'http://localhost:3000'}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; text-align: center; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border-radius: 12px; font-weight: 900; font-size: 12px;">LNB</div>
      </div>

      <h1 style="color: #111; font-size: 20px;">Password Reset</h1>
      <p style="color: #666;">Click the button below to reset your password. This link expires in 1 hour.</p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>

      <p style="font-size: 12px; color: #999; word-break: break-all;">${resetUrl}</p>
      <p style="font-size: 11px; color: #999; margin-top: 32px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail(email, subject, html);
}
