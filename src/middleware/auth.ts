import jwt, { SignOptions } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, JWTPayload } from '@/types';
import User from '@/models/User';
import { logger } from '@/config/logger';

/**
 * Middleware to authenticate JWT tokens
 */


const { sign } = jwt;
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Access token is required',
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not defined in environment variables');
      res.status(500).json({
        status: 'error',
        message: 'Server configuration error',
      });
      return;
    }

    // Verify the token
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Check if user still exists and is active
    const user = await User.findById(decoded.id).select('+isActive');
    if (!user || !user.isActive) {
      res.status(401).json({
        status: 'error',
        message: 'User not found or account has been deactivated',
      });
      return;
    }

    // Add user info to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        status: 'error',
        message: 'Token has expired',
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Authentication failed',
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      status: 'error',
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      status: 'error',
      message: 'Admin access required',
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user owns the resource or is admin
 */
export const requireOwnershipOrAdmin = (userIdParam = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const resourceUserId = req.params[userIdParam] || req.body.userId;
    
    // Allow if user is admin or owns the resource
    if (req.user.role === 'admin' || req.user.id === resourceUserId) {
      next();
      return;
    }

    res.status(403).json({
      status: 'error',
      message: 'Access denied. You can only access your own resources.',
    });
  };
};

/**
 * Middleware to generate and verify refresh tokens
 */
export const verifyRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({
        status: 'error',
        message: 'Refresh token is required',
      });
      return;
    }

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtRefreshSecret) {
      logger.error('JWT_REFRESH_SECRET is not defined in environment variables');
      res.status(500).json({
        status: 'error',
        message: 'Server configuration error',
      });
      return;
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as JWTPayload;

    // Check if user still exists and is active
    const user = await User.findById(decoded.id).select('+isActive');
    if (!user || !user.isActive) {
      res.status(401).json({
        status: 'error',
        message: 'User not found or account has been deactivated',
      });
      return;
    }

    // Add user info to request object
    (req as any).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.error('Refresh token verification error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        status: 'error',
        message: 'Refresh token has expired',
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Refresh token verification failed',
    });
  }
};

/**
 * Generate JWT tokens
 */
export const generateTokens = (payload: Omit<JWTPayload, 'iat' | 'exp'>) => {
  const jwtSecret = process.env.JWT_SECRET!;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn } as SignOptions);
  const refreshToken = jwt.sign(payload, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn } as SignOptions);

  return { accessToken, refreshToken };
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      next();
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    const user = await User.findById(decoded.id).select('+isActive');

    if (user && user.isActive) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};
