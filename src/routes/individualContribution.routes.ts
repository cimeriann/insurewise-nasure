import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  submitContribution,
  getContributionHistory,
} from '@/controllers/individualContribution.controller';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/errorHandler';

const router = Router();

// Validation for submitting a contribution
const submitContributionValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount is required and must be a number'),
  body('contributionType')
    .isString()
    .notEmpty()
    .withMessage('Contribution type is required'),
  body('reference')
    .isString()
    .notEmpty()
    .withMessage('Reference is required'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];

// Validation for getting contribution history
const contributionHistoryValidation = [
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
    .isString()
    .withMessage('Type must be a string'),
];

// Routes

/**
 * @route   POST /api/v1/contributions/submit
 * @desc    Submit an individual contribution
 * @access  Private
 */
router.post(
  '/submit',
  authenticateToken,
  submitContributionValidation,
  validateRequest,
  submitContribution
);

/**
 * @route   GET /api/v1/contributions/history
 * @desc    Get user contribution history
 * @access  Private
 */
router.get(
  '/history',
  authenticateToken,
  contributionHistoryValidation,
  validateRequest,
  getContributionHistory
);

export default router;
