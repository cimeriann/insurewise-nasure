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
    .isInt({ min: 10000 })
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

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment handling and verification via Paystack
 */

/**
 * @swagger
 * /api/v1/payments/config:
 *   get:
 *     summary: Get payment configuration
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment config fetched successfully
 */

/**
 * @swagger
 * /api/v1/payments/history:
 *   get:
 *     summary: Get payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [credit, debit]
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *     responses:
 *       200:
 *         description: User payment history
 */

/**
 * @swagger
 * /api/v1/payments/initialize:
 *   post:
 *     summary: Initialize a payment via Paystack
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: Amount in kobo (₦100 = 10000)
 *               email:
 *                 type: string
 *                 format: email
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 */

/**
 * @swagger
 * /api/v1/payments/verify/{reference}:
 *   get:
 *     summary: Verify a Paystack payment by reference
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Reference format: INS_123456_ABC123
 *     responses:
 *       200:
 *         description: Payment verified successfully
 */

/**
 * @swagger
 * /api/v1/payments/webhook/paystack:
 *   post:
 *     summary: Paystack webhook endpoint
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload sent by Paystack
 *     responses:
 *       200:
 *         description: Webhook received
 */

// Routes
router.get('/config', authenticateToken, getPaymentConfig);
router.get('/history', authenticateToken, paymentHistoryValidation, validateRequest, getPaymentHistory);
router.post('/initialize', authenticateToken, initializePaymentValidation, validateRequest, initializePayment);
router.get('/verify/:reference', authenticateToken, referenceValidation, validateRequest, verifyPayment);
router.post('/webhook/paystack', paystackWebhook);

export default router;
