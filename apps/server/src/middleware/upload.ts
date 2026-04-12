import multer, { type Multer } from 'multer';
import { Request, RequestHandler } from 'express';

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

// Configure multer with memory storage for flexibility
const storage = multer.memoryStorage();

// File filter to validate file types
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      )
    );
  }
};

// Base multer configuration
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

/**
 * Middleware for single file upload
 * @param fieldName - Name of the form field
 * @returns Express middleware
 */
export function uploadSingle(fieldName: string): RequestHandler {
  return upload.single(fieldName);
}

/**
 * Middleware for multiple file uploads
 * @param fieldName - Name of the form field
 * @param maxCount - Maximum number of files allowed
 * @returns Express middleware
 */
export function uploadMultiple(fieldName: string, maxCount: number): RequestHandler {
  return upload.array(fieldName, maxCount);
}
