# File Upload & Email Service Setup

This document describes the file upload and email services that have been added to the LoadNBehold server.

## Files Created

### 1. Storage Service (`src/services/storage.service.ts`)

Handles file uploads with support for local and S3 storage.

**Features:**
- Automatic unique filename generation (timestamp + random string + original name)
- Local storage implementation (saves to `uploads/` directory)
- S3 storage placeholder (ready for future AWS integration)
- Organized file storage by folder (e.g., 'profile-pics', 'order-images')

**Functions:**
- `uploadFile(file: Express.Multer.File, folder: string): Promise<string>` - Uploads a file and returns the URL
- `deleteFile(url: string): Promise<void>` - Deletes a file from storage

**Environment Variables Used:**
- `STORAGE_PROVIDER` - Set to 'local' or 's3' (defaults to 'local')
- `AWS_S3_BUCKET` - S3 bucket name (for future S3 implementation)
- `AWS_S3_REGION` - S3 region (defaults to 'us-east-2')

### 2. Upload Middleware (`src/middleware/upload.ts`)

Configures multer for file uploads with validation.

**Features:**
- Memory storage (flexible for processing before saving)
- File size limit: 10MB
- Allowed file types: JPEG, PNG, WebP, PDF
- Type-safe middleware functions

**Functions:**
- `uploadSingle(fieldName: string)` - Middleware for single file upload
- `uploadMultiple(fieldName: string, maxCount: number)` - Middleware for multiple files

### 3. Email Service (`src/services/email.service.ts`)

Handles email sending with pre-built templates.

**Features:**
- Console logging in development mode
- Production-ready structure (SendGrid integration needed)
- Pre-built email templates with HTML formatting

**Functions:**
- `sendEmail(to, subject, html)` - Base email sending function
- `sendOrderConfirmation(email, orderNumber, items, total)` - Order confirmation email
- `sendOrderStatusUpdate(email, orderNumber, status)` - Order status update email
- `sendWelcomeEmail(email, name)` - Welcome email for new users
- `sendPasswordResetEmail(email, token)` - Password reset email

### 4. Static File Serving

Updated `src/index.ts` to serve uploaded files:
- Added `import path from 'path'`
- Added route: `app.use('/uploads', express.static(path.join(__dirname, '../uploads')))`
- Files are accessible at: `http://localhost:5000/uploads/{folder}/{filename}`

### 5. Example Usage (`src/examples/upload-example.ts`)

Comprehensive examples showing how to integrate the services into routes.

## Directory Structure

```
apps/server/
├── src/
│   ├── services/
│   │   ├── storage.service.ts    ✅ NEW
│   │   └── email.service.ts      ✅ NEW
│   ├── middleware/
│   │   └── upload.ts             ✅ NEW
│   ├── examples/
│   │   └── upload-example.ts     ✅ NEW
│   └── index.ts                  ✅ UPDATED
├── uploads/                      ✅ NEW
│   └── .gitkeep
└── .gitignore                    ✅ UPDATED
```

## Installation

Dependencies installed:
```bash
pnpm add multer @types/multer
```

## Usage Examples

### Single File Upload (Profile Picture)

```typescript
import { Router } from 'express';
import { uploadSingle } from '../middleware/upload';
import { uploadFile } from '../services/storage.service';

router.post('/profile-picture',
  authenticate,
  uploadSingle('avatar'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const url = await uploadFile(req.file, 'profile-pics');

    // Save URL to database
    await User.findByIdAndUpdate(req.user.id, { profilePicture: url });

    res.json({ success: true, data: { url } });
  }
);
```

### Multiple File Upload (Order Images)

```typescript
router.post('/order-images',
  authenticate,
  uploadMultiple('images', 5),
  async (req, res) => {
    if (!req.files || !Array.isArray(req.files)) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const uploadPromises = req.files.map(file =>
      uploadFile(file, 'order-images')
    );
    const urls = await Promise.all(uploadPromises);

    res.json({ success: true, data: { urls } });
  }
);
```

### Send Order Confirmation

```typescript
import { sendOrderConfirmation } from '../services/email.service';

// After creating an order
await sendOrderConfirmation(
  customer.email,
  order.orderNumber,
  order.items,
  order.total
);
```

### Send Welcome Email

```typescript
import { sendWelcomeEmail } from '../services/email.service';

// After user registration
await sendWelcomeEmail(user.email, user.firstName);
```

## Configuration

### Environment Variables (.env)

```bash
# Storage Configuration
STORAGE_PROVIDER=local          # 'local' or 's3'
AWS_S3_BUCKET=                  # Required for S3
AWS_S3_REGION=us-east-2         # Required for S3

# Email Configuration (for future SendGrid integration)
# SENDGRID_API_KEY=
```

## File Storage Strategy

### Local Storage (Current)
- Files saved to: `apps/server/uploads/{folder}/{filename}`
- Accessible at: `http://localhost:5000/uploads/{folder}/{filename}`
- Files are gitignored (except `.gitkeep`)

### S3 Storage (Future)
- To implement S3, install: `pnpm add @aws-sdk/client-s3`
- Update `uploadToS3()` and `deleteFromS3()` functions in `storage.service.ts`
- Set AWS credentials in environment variables

## Email Strategy

### Development Mode (Current)
- Emails logged to console with pino logger
- Full email HTML visible in debug logs

### Production Mode (Future)
- Integrate SendGrid or similar service
- Update `sendEmail()` function in `email.service.ts`
- Add API key to environment variables

## Security Considerations

1. **File Validation**: Only JPEG, PNG, WebP, and PDF files allowed
2. **File Size Limit**: 10MB maximum
3. **Unique Filenames**: Prevents overwriting and adds security through obscurity
4. **Memory Storage**: Files processed in memory before saving (enables additional validation)
5. **Gitignore**: Uploaded files not committed to repository

## Next Steps

### Integration Recommendations

1. **Customer Profile Routes** (`src/modules/customer/customer.routes.ts`)
   - Add profile picture upload endpoint
   - Update customer model to include `profilePicture` field

2. **Order Routes** (`src/modules/order/order.routes.ts`)
   - Send order confirmation after order creation
   - Send status updates when order status changes
   - Add order image upload for customer receipts

3. **Auth Routes** (`src/modules/auth/auth.routes.ts`)
   - Send welcome email after successful registration
   - Implement password reset email flow

4. **Driver Routes** (`src/modules/driver/driver.routes.ts`)
   - Add profile picture upload
   - Add document upload (driver's license, insurance, etc.)

### Production Readiness

1. **S3 Integration**
   - Install AWS SDK: `pnpm add @aws-sdk/client-s3`
   - Implement `uploadToS3()` and `deleteFromS3()` functions
   - Add AWS credentials to environment

2. **Email Service Integration**
   - Choose provider (SendGrid recommended)
   - Install SDK: `pnpm add @sendgrid/mail`
   - Update `sendEmail()` function
   - Add API key to environment

3. **File Cleanup**
   - Implement scheduled job to delete orphaned files
   - Add file deletion when records are deleted

4. **CDN Integration** (Optional)
   - Add CloudFront or similar CDN in front of S3
   - Update URL generation in storage service

## Testing

The build has been verified and all TypeScript compilation succeeds. Test the services:

```bash
cd apps/server
pnpm build    # Verify compilation
pnpm dev      # Start development server
```

## Support

For questions or issues, refer to:
- Example usage: `src/examples/upload-example.ts`
- Service implementations in `src/services/`
- Middleware documentation in `src/middleware/upload.ts`
