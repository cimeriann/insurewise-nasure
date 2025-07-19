import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const response: ApiResponse = {
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  };

  res.status(404).json(response);
};
