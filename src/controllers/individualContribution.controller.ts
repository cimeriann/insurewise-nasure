import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { IndividualContribution } from '@/models/IndividualContibution';
import { Wallet } from '@/models/Wallet';
import { logger } from '@/config/logger';
import { catchAsync, AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest, ApiResponse } from '@/types';

/**
 * Submit a new individual contribution
 */
export const submitContribution = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400));
  }

  const { amount, contributionType, reference, metadata } = req.body;

  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  // Optional: Check if user has wallet and balance
  const wallet = await Wallet.findOne({ userId: req.user.id });
  if (!wallet || wallet.balance < amount) {
    return next(new AppError('Insufficient wallet balance', 400));
  }

  // Debit wallet
  await wallet.debit(amount, 'Individual contribution');

  // Create contribution record
  const contribution = new IndividualContribution({
    userId: req.user.id,
    amount,
    currency: 'NGN',
    contributionType,
    reference,
    status: 'completed',
    metadata,
  });

  await contribution.save();

  logger.info('Individual contribution recorded', {
    contributionId: contribution._id,
    userId: req.user.id,
    amount,
    type: contributionType,
    reference,
  });

  const response: ApiResponse = {
    status: 'success',
    message: 'Contribution submitted successfully',
    data: {
      contribution: {
        id: contribution._id,
        amount: contribution.amount,
        currency: contribution.currency,
        type: contribution.contributionType,
        status: contribution.status,
        contributionDate: contribution.contributionDate,
      },
    },
  };

  res.status(201).json(response);
});

/**
 * Get user's contribution history
 */
export const getContributionHistory = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const type = req.query.type as string;

  const query: any = { userId: req.user.id };
  if (type) query.contributionType = type;

  const [contributions, total] = await Promise.all([
    IndividualContribution.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    IndividualContribution.countDocuments(query),
  ]);

  const response: ApiResponse = {
    status: 'success',
    message: 'Contributions retrieved successfully',
    data: {
      contributions,
    },
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      total: total,
      limit: limit,
    },
  };

  res.status(200).json(response);
});
