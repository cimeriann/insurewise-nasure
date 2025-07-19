import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getUserProfile,
  updateUserProfile,
  updateProfilePicture,
  getUserSavingsPlans,
  deactivateAccount,
  getAllUsers,
  getUserById,
  updateUserRole,
} from '@/controllers/user.controller';
import { authenticateToken, requireAdmin, requireOwnershipOrAdmin } from '@/middleware/auth';
import { validateRequest } from '@/middleware/errorHandler';

const router = Router();

// Validation rules
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s-()]{10,}$/)
    .withMessage('Please provide a valid phone number'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
];

const userIdValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
];

const roleUpdateValidation = [
  body('role')
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
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
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
];

// Routes

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, getUserProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, updateProfileValidation, validateRequest, updateUserProfile);

/**
 * @route   PUT /api/v1/users/profile-picture
 * @desc    Update user profile picture
 * @access  Private
 */
router.put('/profile-picture', authenticateToken, updateProfilePicture);

/**
 * @route   GET /api/v1/users/savings-plans
 * @desc    Get user's savings plans
 * @access  Private
 */
router.get('/savings-plans', authenticateToken, getUserSavingsPlans);

/**
 * @route   DELETE /api/v1/users/deactivate
 * @desc    Deactivate user account
 * @access  Private
 */
router.delete('/deactivate', authenticateToken, deactivateAccount);

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user by ID
 * @access  Private (Admin or Owner)
 */
router.get('/:userId', authenticateToken, userIdValidation, validateRequest, requireOwnershipOrAdmin('userId'), getUserById);

// Admin-only routes

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticateToken, requireAdmin, paginationValidation, validateRequest, getAllUsers);

/**
 * @route   PUT /api/v1/users/:userId/role
 * @desc    Update user role (Admin only)
 * @access  Private (Admin)
 */
router.put('/:userId/role', authenticateToken, requireAdmin, userIdValidation, roleUpdateValidation, validateRequest, updateUserRole);

export default router;
