import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200, meta?: { page: number; limit: number; total: number }) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    meta,
  });
}

export function sendError(res: Response, code: string, message: string, statusCode = 400, details?: Record<string, unknown>) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, details },
  });
}

export function sendPaginated<T>(res: Response, data: T[], total: number, page: number, limit: number) {
  return res.status(200).json({
    success: true,
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
