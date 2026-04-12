/**
 * Example usage of file upload and email services
 *
 * This file demonstrates how to use the upload middleware and services
 * in your route handlers.
 */

import { Router, Request, Response } from 'express';
import { uploadSingle, uploadMultiple } from '../middleware/upload';
import { uploadFile, deleteFile } from '../services/storage.service';
import { sendEmail, sendOrderConfirmation, sendWelcomeEmail } from '../services/email.service';

const router: Router = Router();

// Example 1: Single file upload
router.post('/profile-picture', uploadSingle('avatar'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    // Upload to storage
    const url = await uploadFile(req.file, 'profile-pics');

    // TODO: Save URL to user profile in database

    res.json({
      success: true,
      data: { url },
      message: 'Profile picture uploaded successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file',
    });
  }
});

// Example 2: Multiple file upload
router.post('/order-images', uploadMultiple('images', 5), async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files provided' });
    }

    // Upload all files
    const uploadPromises = req.files.map((file) => uploadFile(file, 'order-images'));
    const urls = await Promise.all(uploadPromises);

    // TODO: Associate URLs with order in database

    res.json({
      success: true,
      data: { urls },
      message: `${urls.length} images uploaded successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload files',
    });
  }
});

// Example 3: Delete file
router.delete('/file', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'No URL provided' });
    }

    await deleteFile(url);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete file',
    });
  }
});

// Example 4: Send welcome email
router.post('/send-welcome', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required',
      });
    }

    await sendWelcomeEmail(email, name);

    res.json({
      success: true,
      message: 'Welcome email sent',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send email',
    });
  }
});

// Example 5: Send order confirmation
router.post('/send-order-confirmation', async (req: Request, res: Response) => {
  try {
    const { email, orderNumber, items, total } = req.body;

    if (!email || !orderNumber || !items || !total) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    await sendOrderConfirmation(email, orderNumber, items, total);

    res.json({
      success: true,
      message: 'Order confirmation sent',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send email',
    });
  }
});

export default router;

/**
 * Integration examples for existing routes:
 *
 * 1. Add profile picture upload to customer profile:
 *
 *    import { uploadSingle } from '../middleware/upload';
 *    import { uploadFile } from '../services/storage.service';
 *
 *    router.patch('/profile',
 *      authenticate,
 *      uploadSingle('profilePicture'),
 *      async (req, res) => {
 *        if (req.file) {
 *          const url = await uploadFile(req.file, 'profile-pics');
 *          // Update user.profilePicture = url
 *        }
 *      }
 *    );
 *
 * 2. Send order confirmation in order creation:
 *
 *    import { sendOrderConfirmation } from '../services/email.service';
 *
 *    // After creating order
 *    await sendOrderConfirmation(
 *      customer.email,
 *      order.orderNumber,
 *      order.items,
 *      order.total
 *    );
 *
 * 3. Send welcome email after registration:
 *
 *    import { sendWelcomeEmail } from '../services/email.service';
 *
 *    // After creating user
 *    await sendWelcomeEmail(user.email, user.firstName);
 */
