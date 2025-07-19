import { Router } from 'express';
import { body, query, param } from 'express-validator';
import {
  submitClaim,
  getUserClaims,
  getClaimById,
  updateClaimStatus,
  getPendingClaims,
  uploadClaimDocuments,
  getClaimStatistics,
} from '@/controllers/claim.controller';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { validateRequest } from '@/middleware/errorHandler';

const router = Router();

// Validation rules
const submitClaimValidation = [
  body('type')
    .isIn(['medical', 'auto', 'home', 'life', 'other'])
    .withMessage('Invalid claim type'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('receiptUrl')
    .optional()
    .isURL()
    .withMessage('Receipt URL must be a valid URL'),
  body('documents')
    .optional()
    .isArray()
    .withMessage('Documents must be an array'),
  body('documents.*')
    .optional()
    .isURL()
    .withMessage('Each document must be a valid URL'),
];

const updateStatusValidation = [
  body('status')
    .isIn(['under_review', 'approved', 'declined'])
    .withMessage('Invalid status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  body('approvedAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Approved amount must be a positive number'),
];

const claimIdValidation = [
  param('claimId')
    .isMongoId()
    .withMessage('Invalid claim ID format'),
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
  query('status')
    .optional()
    .isIn(['pending', 'under_review', 'approved', 'declined', 'paid'])
    .withMessage('Invalid status'),
];

const uploadDocumentsValidation = [
  body('documentUrls')
    .isArray({ min: 1 })
    .withMessage('At least one document URL is required'),
  body('documentUrls.*')
    .isURL()
    .withMessage('Each document must be a valid URL'),
];

// Routes

/**
 * @route   GET /api/v1/claims
 * @desc    Get user's claims
 * @access  Private
 */
router.get('/', authenticateToken, paginationValidation, validateRequest, getUserClaims);

/**
 * @route   POST /api/v1/claims
 * @desc    Submit new claim
 * @access  Private
 */
router.post('/', authenticateToken, submitClaimValidation, validateRequest, submitClaim);

/**
 * @route   GET /api/v1/claims/statistics
 * @desc    Get claim statistics
 * @access  Private
 */
router.get('/statistics', authenticateToken, getClaimStatistics);

/**
 * @route   GET /api/v1/claims/pending
 * @desc    Get all pending claims (Admin only)
 * @access  Private (Admin)
 */
router.get('/pending', authenticateToken, requireAdmin, paginationValidation, validateRequest, getPendingClaims);

/**
 * @route   GET /api/v1/claims/:claimId
 * @desc    Get claim details
 * @access  Private
 */
router.get('/:claimId', authenticateToken, claimIdValidation, validateRequest, getClaimById);

/**
 * @route   PUT /api/v1/claims/:claimId/status
 * @desc    Update claim status (Admin only)
 * @access  Private (Admin)
 */
router.put('/:claimId/status', authenticateToken, requireAdmin, claimIdValidation, updateStatusValidation, validateRequest, updateClaimStatus);

/**
 * @route   POST /api/v1/claims/:claimId/documents
 * @desc    Upload additional documents for claim
 * @access  Private
 */
router.post('/:claimId/documents', authenticateToken, claimIdValidation, uploadDocumentsValidation, validateRequest, uploadClaimDocuments);

export default router;
