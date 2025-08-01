import { Router } from 'express';
import { body, query, param } from 'express-validator';
import {
  createGroupSavings,
  getUserGroupSavings,
  getGroupSavingsById,
  joinGroupSavings,
  leaveGroupSavings,
  makeContribution,
  startGroupSavings,
  getGroupSavingsStatistics,
  getAvailableGroups,
} from '@/controllers/group.controller';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/errorHandler';

const router = Router();

// Validation rules
const createGroupValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Group name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('contributionAmount')
    .isFloat({ min: 1000 })
    .withMessage('Contribution amount must be at least ₦1,000'),
  body('frequency')
    .isIn(['weekly', 'monthly'])
    .withMessage('Frequency must be weekly or monthly'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date')
    .custom((value) => {
      const startDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        throw new Error('Start date cannot be in the past');
      }
      
      return true;
    }),
  body('maxMembers')
    .isInt({ min: 2, max: 50 })
    .withMessage('Maximum members must be between 2 and 50'),
  body('rules.allowEarlyWithdrawal')
    .optional()
    .isBoolean()
    .withMessage('Allow early withdrawal must be a boolean'),
  body('rules.penaltyAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Penalty amount must be a positive number'),
  body('rules.minimumContributions')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum contributions must be at least 1'),
  body('rules.autoKickInactive')
    .optional()
    .isBoolean()
    .withMessage('Auto kick inactive must be a boolean'),
];

const groupIdValidation = [
  param('groupId')
    .isMongoId()
    .withMessage('Invalid group ID format'),
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
    .isIn(['draft', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
];



/**
 * @swagger
 * tags:
 *   name: GroupSavings
 *   description: Group savings endpoints
 */

/**
 * @swagger
 * /api/v1/groups/available:
 *   get:
 *     summary: Get available group savings to join
 *     tags: [GroupSavings]
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
 *         description: List of available groups
 */
router.get('/available', authenticateToken, paginationValidation, validateRequest, getAvailableGroups);

/**
 * @swagger
 * /api/v1/groups/statistics:
 *   get:
 *     summary: Get group savings statistics for a user
 *     tags: [GroupSavings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved
 */
router.get('/statistics', authenticateToken, getGroupSavingsStatistics);

/**
 * @swagger
 * /api/v1/groups:
 *   get:
 *     summary: Get user's group savings
 *     tags: [GroupSavings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's group savings
 */
router.get('/', authenticateToken, paginationValidation, validateRequest, getUserGroupSavings);

/**
 * @swagger
 * /api/v1/groups:
 *   post:
 *     summary: Create a new group savings
 *     tags: [GroupSavings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, contributionAmount, frequency, startDate, maxMembers]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               contributionAmount:
 *                 type: number
 *               frequency:
 *                 type: string
 *                 enum: [weekly, monthly]
 *               startDate:
 *                 type: string
 *                 format: date
 *               maxMembers:
 *                 type: integer
 *               rules:
 *                 type: object
 *                 properties:
 *                   allowEarlyWithdrawal:
 *                     type: boolean
 *                   penaltyAmount:
 *                     type: number
 *                   minimumContributions:
 *                     type: integer
 *                   autoKickInactive:
 *                     type: boolean
 *     responses:
 *       201:
 *         description: Group created successfully
 */
router.post('/', authenticateToken, createGroupValidation, validateRequest, createGroupSavings);

/**
 * @swagger
 * /api/v1/groups/{groupId}:
 *   get:
 *     summary: Get details of a group savings
 *     tags: [GroupSavings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group details retrieved
 */
router.get('/:groupId', authenticateToken, groupIdValidation, validateRequest, getGroupSavingsById);

/**
 * @swagger
 * /api/v1/groups/{groupId}/join:
 *   post:
 *     summary: Join a group savings
 *     tags: [GroupSavings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Joined group successfully
 */
router.post('/:groupId/join', authenticateToken, groupIdValidation, validateRequest, joinGroupSavings);

/**
 * @swagger
 * /api/v1/groups/{groupId}/leave:
 *   post:
 *     summary: Leave a group savings
 *     tags: [GroupSavings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Left group successfully
 */
router.post('/:groupId/leave', authenticateToken, groupIdValidation, validateRequest, leaveGroupSavings);

/**
 * @swagger
 * /api/v1/groups/{groupId}/contribute:
 *   post:
 *     summary: Make a contribution to a group
 *     tags: [GroupSavings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contribution successful
 */
router.post('/:groupId/contribute', authenticateToken, groupIdValidation, validateRequest, makeContribution);

/**
 * @swagger
 * /api/v1/groups/{groupId}/start:
 *   post:
 *     summary: Start a group savings
 *     tags: [GroupSavings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group started successfully
 */
router.post('/:groupId/start', authenticateToken, groupIdValidation, validateRequest, startGroupSavings);

export default router;
