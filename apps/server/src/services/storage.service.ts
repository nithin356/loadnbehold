import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// S3 client (lazy init)
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_S3_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return s3Client;
}

// Initialize upload directory
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    logger.info(`Created upload directory at ${UPLOAD_DIR}`);
  }
}

// Generate unique filename
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${timestamp}-${randomString}-${sanitizedName}${ext}`;
}

// Local storage strategy
async function uploadToLocal(file: Express.Multer.File, folder: string): Promise<string> {
  await ensureUploadDir();

  const folderPath = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(folderPath, { recursive: true });

  const filename = generateUniqueFilename(file.originalname);
  const filePath = path.join(folderPath, filename);

  await fs.writeFile(filePath, file.buffer);

  const url = `/uploads/${folder}/${filename}`;
  logger.info(`File uploaded to local storage: ${url}`);

  return url;
}

// S3 storage strategy
async function uploadToS3(file: Express.Multer.File, folder: string): Promise<string> {
  if (!env.AWS_S3_BUCKET || !env.AWS_ACCESS_KEY_ID) {
    logger.warn('S3 credentials not configured, falling back to local storage');
    return uploadToLocal(file, folder);
  }

  const client = getS3Client();
  const filename = generateUniqueFilename(file.originalname);
  const key = `${folder}/${filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  const url = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_S3_REGION}.amazonaws.com/${key}`;
  logger.info(`File uploaded to S3: ${url}`);

  return url;
}

// Delete from local storage
async function deleteFromLocal(url: string): Promise<void> {
  const relativePath = url.replace(/^\/uploads\//, '');
  const filePath = path.join(UPLOAD_DIR, relativePath);

  try {
    await fs.unlink(filePath);
    logger.info(`File deleted from local storage: ${url}`);
  } catch (error) {
    logger.error({ error, url }, 'Failed to delete file from local storage');
    throw error;
  }
}

// Delete from S3
async function deleteFromS3(url: string): Promise<void> {
  if (!env.AWS_S3_BUCKET || !env.AWS_ACCESS_KEY_ID) {
    logger.warn('S3 credentials not configured, falling back to local delete');
    return deleteFromLocal(url);
  }

  const client = getS3Client();
  // Extract key from full S3 URL
  const urlObj = new URL(url);
  const key = urlObj.pathname.slice(1); // remove leading /

  await client.send(
    new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
    })
  );

  logger.info(`File deleted from S3: ${url}`);
}

/**
 * Upload a file to the configured storage provider
 */
export async function uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
  if (env.STORAGE_PROVIDER === 's3') {
    return uploadToS3(file, folder);
  }
  return uploadToLocal(file, folder);
}

/**
 * Delete a file from the configured storage provider
 */
export async function deleteFile(url: string): Promise<void> {
  if (env.STORAGE_PROVIDER === 's3') {
    return deleteFromS3(url);
  }
  return deleteFromLocal(url);
}
