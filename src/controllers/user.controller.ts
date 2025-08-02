import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User from '@/models/User';
import { Wallet } from '@/models/Wallet';
import { catchAsync, AppError } from '@/middleware/errorHandler';
import { logger } from '@/config/logger';
import { AuthenticatedRequest, ApiResponse } from '@/types';

/**
 * Get current user profile
 */
export const getUserProfile = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  // Get user details with populated savings plans
  const user = await User.findById(req.user.id).populate('savingsPlans');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Get user's wallet
  const wallet = await Wallet.findOne({ userId: user._id, isActive: true });

  const response: ApiResponse = {
    status: 'success',
    message: 'User profile retrieved successfully',
    data: {
      user: user.toJSON(),
      wallet: wallet ? {
        id: wallet._id,
        balance: wallet.balance,
        currency: wallet.currency,
        formattedBalance: wallet.formattedBalance,
      } : null,
    },
  };

  res.status(200).json(response);
});

/**
 * Update user profile
 */
export const updateUserProfile = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400));
  }

  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const { firstName, lastName, phoneNumber, dateOfBirth, address } = req.body;

  // Check if phone number is being changed and if it's already taken
  if (phoneNumber) {
    const existingUser = await User.findOne({
      phoneNumber,
      _id: { $ne: req.user.id }
    });

    if (existingUser) {
      return next(new AppError('Phone number is already in use', 409));
    }
  }

  // Update user profile
  const updateData: any = {};
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (phoneNumber) updateData.phoneNumber = phoneNumber;
  if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
  if (address) updateData.address = address;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Log profile update
  logger.info('User profile updated', {
    userId: user._id,
    email: user.email,
    updatedFields: Object.keys(updateData),
    ip: req.ip,
  });

  const response: ApiResponse = {
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user: user.toJSON(),
    },
  };

  res.status(200).json(response);
});

/**
 * Update user profile picture
 */
export const updateProfilePicture = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  // TODO: Implement file upload logic
  // This is a placeholder for multer file upload
  const { profilePictureUrl } = req.body;

  if (!profilePictureUrl) {
    return next(new AppError('Profile picture URL is required', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { profilePicture: profilePictureUrl },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Log profile picture update
  logger.info('Profile picture updated', {
    userId: user._id,
    email: user.email,
    ip: req.ip,
  });

  const response: ApiResponse = {
    status: 'success',
    message: 'Profile picture updated successfully',
    data: {
      user: user.toJSON(),
    },
  };

  res.status(200).json(response);
});

/**
 * Get user's savings plans
 */
export const getUserSavingsPlans = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  // TODO: Implement when SavingsPlan model is created
  // For now, return empty array
  const response: ApiResponse = {
    status: 'success',
    message: 'Savings plans retrieved successfully',
    data: {
      savingsPlans: [],
      totalPlans: 0,
      activePlans: 0,
    },
  };

  res.status(200).json(response);
});

/**
 * Deactivate user account
 */
export const deactivateAccount = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { isActive: false },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Also deactivate user's wallet
  await Wallet.findOneAndUpdate(
    { userId: req.user.id },
    { isActive: false }
  );

  // Log account deactivation
  logger.info('User account deactivated', {
    userId: user._id,
    email: user.email,
    ip: req.ip,
  });

  const response: ApiResponse = {
    status: 'success',
    message: 'Account deactivated successfully',
  };

  res.status(200).json(response);
});

/**
 * Get user by ID (Admin or owner only)
 */
export const getUserById = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { userId } = req.params;

  const user = await User.findById(userId).populate('savingsPlans');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Get user's wallet if requesting own profile or if admin
  let wallet = null;
  if (req.user?.role === 'admin' || req.user?.id === userId) {
    wallet = await Wallet.findOne({ userId: user._id, isActive: true });
  }

  const response: ApiResponse = {
    status: 'success',
    message: 'User retrieved successfully',
    data: {
      user: user.toJSON(),
      wallet: wallet ? {
        id: wallet._id,
        balance: wallet.balance,
        currency: wallet.currency,
        formattedBalance: wallet.formattedBalance,
      } : null,
    },
  };

  res.status(200).json(response);
});

/**
 * Get all users (Admin only)
 */
export const getAllUsers = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;

  const skip = (page - 1) * limit;

  // Build search query
  const searchQuery: any = {};
  if (search) {
    searchQuery.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
    ];
  }

  // Get users with pagination
  const [users, total] = await Promise.all([
    User.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(searchQuery),
  ]);

  const totalPages = Math.ceil(total / limit);

  const response: ApiResponse = {
    status: 'success',
    message: 'Users retrieved successfully',
    data: {
      users,
    },
    pagination: {
      page,
      limit,
      total,
      pages: totalPages,
    },
  };

  res.status(200).json(response);
});

/**
 * Update user role (Admin only)
 */
export const updateUserRole = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400));
  }

  const { userId } = req.params;
  const { role } = req.body;

  // Prevent admin from changing their own role
  if (req.user?.id === userId) {
    return next(new AppError('You cannot change your own role', 403));
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Log role change
  logger.info('User role updated', {
    targetUserId: user._id,
    targetUserEmail: user.email,
    newRole: role,
    updatedBy: req.user?.id,
    ip: req.ip,
  });

  const response: ApiResponse = {
    status: 'success',
    message: 'User role updated successfully',
    data: {
      user: user.toJSON(),
    },
  };

  res.status(200).json(response);
});
