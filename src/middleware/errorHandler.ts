import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';
import { MongoError } from 'mongodb';
import { logger } from '@/config/logger';
import { ApiResponse } from '@/types';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, isOperational = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle different types of errors
const handleCastErrorDB = (err: any): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: MongoError): AppError => {
  const field = Object.keys((err as any).keyValue)[0];
  const value = (err as any).keyValue[field];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err: any): AppError => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again', 401);
};

const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired. Please log in again', 401);
};

const handleMulterError = (err: any): AppError => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large. Please upload a smaller file', 400);
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files. Please upload fewer files', 400);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected file field. Please check your upload', 400);
  }
  return new AppError('File upload error', 400);
};

// Send error response for development
const sendErrorDev = (err: AppError, res: Response): void => {
  const response: ApiResponse = {
    status: 'error',
    message: err.message,
    data: {
      error: err,
      stack: err.stack,
    },
  };

  res.status(err.statusCode).json(response);
};

// Send error response for production
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response: ApiResponse = {
      status: 'error',
      message: err.message,
    };

    res.status(err.statusCode).json(response);
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unexpected error:', err);

    const response: ApiResponse = {
      status: 'error',
      message: 'Something went wrong!',
    };

    res.status(500).json(response);
  }
};

// Handle validation errors from express-validator
const handleValidationErrors = (errors: ValidationError[]): AppError => {
  const message = errors
    .map((error) => `${error.type}: ${error.msg}`)
    .join(', ');
  return new AppError(`Validation error: ${message}`, 400);
};

// Global error handling middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'MulterError') error = handleMulterError(error);

    sendErrorProd(error, res);
  }
};

// Async error wrapper
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// Handle unhandled routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

// Rate limit error handler
export const rateLimitHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  };

  res.status(429).json(response);
};

// Validation middleware
export const validateRequest = (validationResult: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const error = handleValidationErrors(errors.array());
      next(error);
      return;
    }
    
    next();
  };
};
