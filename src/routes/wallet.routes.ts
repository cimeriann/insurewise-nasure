import { Router } from 'express';
import { body, query, param } from 'express-validator';
import {
  getWalletBalance,
  getTransactionHistory,
  fundWallet,
  transferFunds,
  getTransactionSummary,
  getTransactionById,
} from '@/controllers/wallet.controller';
import { authenticateToken, requireOwnershipOrAdmin } from '@/middleware/auth';
import { validateRequest } from '@/middleware/errorHandler';

const router = Router();

// Validation rules
const fundWalletValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('paymentMethod')
    .optional()
    .isIn(['paystack', 'bank_transfer', 'card', 'ussd'])
    .withMessage('Invalid payment method'),
];

const transferValidation = [
  body('recipientEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid recipient email'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
];

const paginationValidation = [
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
    .withMessage('Type must be either credit or debit'),
  query('status')
    .optional()
    .isIn(['pending', 'successful', 'failed', 'cancelled'])
    .withMessage('Invalid status'),
];

const transactionIdValidation = [
  param('transactionId')
    .isMongoId()
    .withMessage('Invalid transaction ID format'),
];

const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
];

// Routes

/**
 * @route   GET /api/v1/wallet/balance
 * @desc    Get wallet balance
 * @access  Private
 */
router.get('/balance', authenticateToken, getWalletBalance);

/**
 * @route   GET /api/v1/wallet/transactions
 * @desc    Get transaction history
 * @access  Private
 */
router.get('/transactions', authenticateToken, paginationValidation, validateRequest, getTransactionHistory);

/**
 * @route   GET /api/v1/wallet/transactions/:transactionId
 * @desc    Get single transaction details
 * @access  Private
 */
router.get('/transactions/:transactionId', authenticateToken, transactionIdValidation, validateRequest, getTransactionById);

/**
 * @route   GET /api/v1/wallet/summary
 * @desc    Get transaction summary/statistics
 * @access  Private
 */
router.get('/summary', authenticateToken, dateRangeValidation, validateRequest, getTransactionSummary);

/**
 * @route   POST /api/v1/wallet/fund
 * @desc    Fund wallet
 * @access  Private
 */
router.post('/fund', authenticateToken, fundWalletValidation, validateRequest, fundWallet);

/**
 * @route   POST /api/v1/wallet/transfer
 * @desc    Transfer funds to another wallet
 * @access  Private
 */
router.post('/transfer', authenticateToken, transferValidation, validateRequest, transferFunds);

export default router;
