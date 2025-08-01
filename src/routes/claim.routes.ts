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

/**
 * @swagger
 * tags:
 *   name: Claims
 *   description: Claim management endpoints
 */

// Validation rules
const submitClaimValidation = [
  body('type').isIn(['medical', 'auto', 'home', 'life', 'other']).withMessage('Invalid claim type'),
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('receiptUrl').optional().isURL().withMessage('Receipt URL must be a valid URL'),
  body('documents').optional().isArray().withMessage('Documents must be an array'),
  body('documents.*').optional().isURL().withMessage('Each document must be a valid URL'),
];

const updateStatusValidation = [
  body('status').isIn(['under_review', 'approved', 'declined']).withMessage('Invalid status'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('approvedAmount').optional().isFloat({ min: 0 }).withMessage('Approved amount must be a positive number'),
];

const claimIdValidation = [param('claimId').isMongoId().withMessage('Invalid claim ID format')];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'under_review', 'approved', 'declined', 'paid']).withMessage('Invalid status'),
];

const uploadDocumentsValidation = [
  body('documentUrls').isArray({ min: 1 }).withMessage('At least one document URL is required'),
  body('documentUrls.*').isURL().withMessage('Each document must be a valid URL'),
];

/**
 * @swagger
 * /api/v1/claims:
 *   get:
 *     summary: Get user's claims
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user's claims
 */
router.get('/', authenticateToken, paginationValidation, validateRequest, getUserClaims);

/**
 * @swagger
 * /api/v1/claims:
 *   post:
 *     summary: Submit a new claim
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, title, description, amount]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [medical, auto, home, life, other]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               receiptUrl:
 *                 type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Claim submitted successfully
 */
router.post('/', authenticateToken, submitClaimValidation, validateRequest, submitClaim);

/**
 * @swagger
 * /api/v1/claims/statistics:
 *   get:
 *     summary: Get claim statistics
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Claim statistics retrieved
 */
router.get('/statistics', authenticateToken, getClaimStatistics);

/**
 * @swagger
 * /api/v1/claims/pending:
 *   get:
 *     summary: Get all pending claims (Admin only)
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of pending claims
 */
router.get('/pending', authenticateToken, requireAdmin, paginationValidation, validateRequest, getPendingClaims);

/**
 * @swagger
 * /api/v1/claims/{claimId}:
 *   get:
 *     summary: Get claim details
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Claim details retrieved
 */
router.get('/:claimId', authenticateToken, claimIdValidation, validateRequest, getClaimById);

/**
 * @swagger
 * /api/v1/claims/{claimId}/status:
 *   put:
 *     summary: Update claim status (Admin only)
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [under_review, approved, declined]
 *               notes:
 *                 type: string
 *               approvedAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Claim status updated
 */
router.put('/:claimId/status', authenticateToken, requireAdmin, claimIdValidation, updateStatusValidation, validateRequest, updateClaimStatus);

/**
 * @swagger
 * /api/v1/claims/{claimId}/documents:
 *   post:
 *     summary: Upload additional documents for a claim
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [documentUrls]
 *             properties:
 *               documentUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
 */
router.post('/:claimId/documents', authenticateToken, claimIdValidation, uploadDocumentsValidation, validateRequest, uploadClaimDocuments);

export default router;
