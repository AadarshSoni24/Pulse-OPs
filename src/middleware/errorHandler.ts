import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { SSRFError } from '../utils/ssrfGuard';
import { logger } from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  logger.error('Unhandled request error', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  if (err instanceof SSRFError) {
    return res.status(400).json({
      error: 'Security Error (SSRF Guard)',
      message: err.message
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
}
