import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  changePassword,
  requestPasswordReset,
} from '@/controllers/auth.controller';
import { authenticateToken, verifyRefreshToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/errorHandler';

const authRouter = Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required'),
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

const passwordResetValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

// Routes
/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
authRouter.post('/register', register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
authRouter.post('/login', loginValidation, login);
authRouter.post('/login', loginValidation, login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public (with valid refresh token)
 */
authRouter.post('/refresh', refreshTokenValidation, verifyRefreshToken, refreshToken);
authRouter.post('/refresh', refreshTokenValidation, verifyRefreshToken, refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
authRouter.post('/logout', authenticateToken, logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
authRouter.get('/me', authenticateToken, getCurrentUser);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
authRouter.put('/change-password', authenticateToken, changePasswordValidation, changePassword);
authRouter.put('/change-password', authenticateToken, changePasswordValidation, changePassword);

/**
 * @route   POST /api/v1/auth/request-password-reset
 * @desc    Request password reset
 * @access  Public
 */  
authRouter.post('/request-password-reset', passwordResetValidation, requestPasswordReset);

export default authRouter;
