import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: RequestPart = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        }

        sendError(res, 'VALIDATION_ERROR', 'Invalid request data', 400, details);
        return;
      }
      next(error);
    }
  };
}
