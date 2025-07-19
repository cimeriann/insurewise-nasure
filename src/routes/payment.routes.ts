import { Router } from 'express';
import { body, query, param } from 'express-validator';
import {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  getPaymentHistory,
  getPaymentConfig,
} from '@/controllers/payment.controller';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/errorHandler';

const router = Router();

// Validation rules
const initializePaymentValidation = [
  body('amount')
    .isInt({ min: 10000 }) // Minimum ₦100 (10000 kobo)
    .withMessage('Amount must be at least ₦100'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];

const referenceValidation = [
  param('reference')
    .matches(/^INS_\d+_[a-zA-Z0-9]{6}$/)
    .withMessage('Invalid reference format'),
];

const paymentHistoryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['credit', 'debit'])
    .withMessage('Type must be credit or debit'),
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid status'),
];

// Routes

/**
 * @route   GET /api/v1/payments/config
 * @desc    Get payment configuration
 * @access  Private
 */
router.get('/config', authenticateToken, getPaymentConfig);

/**
 * @route   GET /api/v1/payments/history
 * @desc    Get payment history
 * @access  Private
 */
router.get('/history', authenticateToken, paymentHistoryValidation, validateRequest, getPaymentHistory);

/**
 * @route   POST /api/v1/payments/initialize
 * @desc    Initialize Paystack payment
 * @access  Private
 */
router.post('/initialize', authenticateToken, initializePaymentValidation, validateRequest, initializePayment);

/**
 * @route   GET /api/v1/payments/verify/:reference
 * @desc    Verify Paystack payment
 * @access  Private
 */
router.get('/verify/:reference', authenticateToken, referenceValidation, validateRequest, verifyPayment);

/**
 * @route   POST /api/v1/payments/webhook/paystack
 * @desc    Paystack webhook handler
 * @access  Public (Webhook)
 */
router.post('/webhook/paystack', paystackWebhook);

export default router;
