import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Claim } from '@/models/Claim';
import { User } from '@/models/User';
import { catchAsync, AppError } from '@/middleware/errorHandler';
import { logger } from '@/config/logger';
import { AuthenticatedRequest, ApiResponse } from '@/types';

/**
 * Helper to format amount with currency
 */
function formatAmount(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
}

/**
 * Submit a new insurance claim
 */
export const submitClaim = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400));
  }

  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const { type, title, description, amount, receiptUrl, documents = [] } = req.body;

  // Create new claim
  const claim = new Claim({
    userId: req.user.id,
    type,
    title,
    description,
    amount,
    currency: 'NGN', // Default currency
    receiptUrl,
    documents,
    status: 'pending',
  });

  await claim.save();

  // TODO: Trigger ML analysis for claim
  // This would be done asynchronously
  setTimeout(async () => {
    try {
      const mlResult = await mockMLAnalysis(claim);
      claim.mlAnalysisResult = mlResult;
      await claim.save();
      
      logger.info('ML analysis completed for claim', {
        claimId: claim._id,
        userId: req.user?.id,
        confidence: mlResult.confidence,
        recommendation: mlResult.recommendation,
      });
    } catch (error) {
      logger.error('ML analysis failed for claim:', error);
    }
  }, 2000);

  // Log claim submission
  logger.info('Insurance claim submitted', {
    claimId: claim._id,
    userId: req.user.id,
    type,
    amount,
    ip: req.ip,
  });

  const response: ApiResponse = {
    status: 'success',
    message: 'Claim submitted successfully',
    data: {
      claim: {
        formattedAmount: formatAmount(claim.amount, claim.currency),
        type: claim.type,
        title: claim.title,
        description: claim.description,
        amount: claim.amount,
        currency: claim.currency,
        status: claim.status,
        createdAt: claim.createdAt,
      },
    },
  };

  res.status(201).json(response);
});

/**
 * Get user's claims
 */
export const getUserClaims = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;

  // Get claims with pagination
  const [claims, total] = await Promise.all([
    Claim.findByUser(req.user.id, page, limit, status),
    Claim.countDocuments({ 
      userId: req.user.id,
      ...(status && { status })
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const response: ApiResponse = {
    status: 'success',
    message: 'Claims retrieved successfully',
    data: {
      claims: claims.map(claim => ({
        ...claim.toJSON(),
        formattedAmount: claim.formattedAmount,
        formattedApprovedAmount: claim.formattedApprovedAmount,
        ageInDays: claim.ageInDays,
      })),
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
 * Get single claim details
 */
export const getClaimById = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const { claimId } = req.params;

  // Build query based on user role
  const query: any = { _id: claimId };
  if (req.user.role !== 'admin') {
    query.userId = req.user.id; // Non-admin users can only see their own claims
  }

  const claim = await Claim.findOne(query)
    .populate('userId', 'firstName lastName email phoneNumber')
    .populate('reviewedBy', 'firstName lastName email');

  if (!claim) {
    return next(new AppError('Claim not found', 404));
  }

  const response: ApiResponse = {
    status: 'success',
    message: 'Claim retrieved successfully',
    data: {
      claim: {
        ...claim.toJSON(),
        formattedAmount: claim.formattedAmount,
        formattedApprovedAmount: claim.formattedApprovedAmount,
        ageInDays: claim.ageInDays,
      },
    },
  };

  res.status(200).json(response);
});

/**
 * Update claim status (Admin only)
 */
export const updateClaimStatus = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400));
  }

  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const { claimId } = req.params;
  const { status, notes, approvedAmount } = req.body;

  const claim = await Claim.findById(claimId);
  if (!claim) {
    return next(new AppError('Claim not found', 404));
  }

  // Handle different status updates
  switch (status) {
    case 'under_review':
      if (!claim.canBeReviewed()) {
        return next(new AppError('Claim cannot be marked as under review', 400));
      }
      await claim.markAsUnderReview(req.user.id);
      break;

    case 'approved':
      if (!claim.canBeApproved()) {
        return next(new AppError('Claim cannot be approved', 400));
      }
      await claim.approve(req.user.id, approvedAmount, notes);
      break;

    case 'declined':
      if (!claim.canBeApproved()) {
        return next(new AppError('Claim cannot be declined', 400));
      }
      if (!notes) {
        return next(new AppError('Notes are required when declining a claim', 400));
      }
      await claim.decline(req.user.id, notes);
      break;

    default:
      return next(new AppError('Invalid status update', 400));
  }

  // Log status update
  logger.info('Claim status updated', {
    claimId: claim._id,
    userId: claim.userId,
    newStatus: status,
    reviewedBy: req.user.id,
    notes,
    approvedAmount,
    ip: req.ip,
  });

  const response: ApiResponse = {
    status: 'success',
    message: 'Claim status updated successfully',
    data: {
      claim: {
        ...claim.toJSON(),
        formattedAmount: claim.formattedAmount,
        formattedApprovedAmount: claim.formattedApprovedAmount,
        ageInDays: claim.ageInDays,
      },
    },
  };

  res.status(200).json(response);
});

/**
 * Get all pending claims (Admin only)
 */
export const getPendingClaims = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  // Get pending claims with pagination
  const [claims, total] = await Promise.all([
    Claim.getPendingClaims(page, limit),
    Claim.countDocuments({ status: 'pending' }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const response: ApiResponse = {
    status: 'success',
    message: 'Pending claims retrieved successfully',
    data: {
      claims: claims.map(claim => ({
        ...claim.toJSON(),
        formattedAmount: claim.formattedAmount,
        ageInDays: claim.ageInDays,
      })),
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
 * Upload additional documents for a claim
 */
export const uploadClaimDocuments = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const { claimId } = req.params;
  const { documentUrls } = req.body;

  if (!documentUrls || !Array.isArray(documentUrls) || documentUrls.length === 0) {
    return next(new AppError('Document URLs are required', 400));
  }

  // Find claim (user can only upload to their own claims)
  const claim = await Claim.findOne({ 
    _id: claimId, 
    userId: req.user.id,
    status: { $in: ['pending', 'under_review'] } // Can only upload to active claims
  });

  if (!claim) {
    return next(new AppError('Claim not found or cannot be modified', 404));
  }

  // Add new documents to existing ones
  claim.documents.push(...documentUrls);
  await claim.save();

  // Log document upload
  logger.info('Documents uploaded to claim', {
    claimId: claim._id,
    userId: req.user.id,
    documentCount: documentUrls.length,
    ip: req.ip,
  });

  const response: ApiResponse = {
    status: 'success',
    message: 'Documents uploaded successfully',
    data: {
      claim: {
        id: claim._id,
        documents: claim.documents,
        totalDocuments: claim.documents.length,
      },
    },
  };

  res.status(200).json(response);
});

/**
 * Get claim statistics
 */
export const getClaimStatistics = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  // Get stats based on user role
  const userId = req.user.role === 'admin' ? undefined : req.user.id;
  const stats = await Claim.getClaimStats(userId);

  const response: ApiResponse = {
    status: 'success',
    message: 'Claim statistics retrieved successfully',
    data: {
      statistics: stats[0] || {
        statusBreakdown: [],
        totalClaims: 0,
        totalClaimValue: 0,
      },
    },
  };

  res.status(200).json(response);
});

/**
 * Mock ML analysis function
 * In production, this would call an actual ML service
 */
async function mockMLAnalysis(claim: any) {
  // Simulate ML processing time
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock analysis based on claim amount and type
  const confidence = Math.random() * 0.4 + 0.6; // Between 0.6 and 1.0
  
  let recommendation: 'approve' | 'decline' | 'manual_review';
  if (confidence > 0.8 && claim.amount < 100000) {
    recommendation = 'approve';
  } else if (confidence < 0.7 || claim.amount > 500000) {
    recommendation = 'manual_review';
  } else {
    recommendation = Math.random() > 0.7 ? 'approve' : 'manual_review';
  }

  return {
    confidence,
    recommendation,
    extractedData: {
      merchant: 'Sample Merchant',
      date: new Date().toISOString().split('T')[0],
      amount: claim.amount,
      category: claim.type,
      items: ['Service/Product'],
    },
    processedAt: new Date(),
  };
}
