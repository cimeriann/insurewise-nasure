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

// Routes

/**
 * @route   GET /api/v1/groups/available
 * @desc    Get available groups to join
 * @access  Private
 */
router.get('/available', authenticateToken, paginationValidation, validateRequest, getAvailableGroups);

/**
 * @route   GET /api/v1/groups/statistics
 * @desc    Get user's group savings statistics
 * @access  Private
 */
router.get('/statistics', authenticateToken, getGroupSavingsStatistics);

/**
 * @route   GET /api/v1/groups
 * @desc    Get user's group savings
 * @access  Private
 */
router.get('/', authenticateToken, paginationValidation, validateRequest, getUserGroupSavings);

/**
 * @route   POST /api/v1/groups
 * @desc    Create new group savings
 * @access  Private
 */
router.post('/', authenticateToken, createGroupValidation, validateRequest, createGroupSavings);

/**
 * @route   GET /api/v1/groups/:groupId
 * @desc    Get group savings details
 * @access  Private
 */
router.get('/:groupId', authenticateToken, groupIdValidation, validateRequest, getGroupSavingsById);

/**
 * @route   POST /api/v1/groups/:groupId/join
 * @desc    Join a group savings
 * @access  Private
 */
router.post('/:groupId/join', authenticateToken, groupIdValidation, validateRequest, joinGroupSavings);

/**
 * @route   POST /api/v1/groups/:groupId/leave
 * @desc    Leave a group savings
 * @access  Private
 */
router.post('/:groupId/leave', authenticateToken, groupIdValidation, validateRequest, leaveGroupSavings);

/**
 * @route   POST /api/v1/groups/:groupId/contribute
 * @desc    Make a contribution to group savings
 * @access  Private
 */
router.post('/:groupId/contribute', authenticateToken, groupIdValidation, validateRequest, makeContribution);

/**
 * @route   POST /api/v1/groups/:groupId/start
 * @desc    Start a group savings (Creator only)
 * @access  Private
 */
router.post('/:groupId/start', authenticateToken, groupIdValidation, validateRequest, startGroupSavings);

export default router;
