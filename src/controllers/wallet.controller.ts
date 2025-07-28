import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Wallet } from '@/models/Wallet';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { catchAsync, AppError } from '@/middleware/errorHandler';
import { logger } from '@/config/logger';
import { AuthenticatedRequest, ApiResponse, ITransaction } from '@/types';

export interface ITransactionWithVirtuals extends ITransaction {
  formattedAmount: string;
  ageInDays: number;
}

/**
 * Get wallet balance and basic info
 */
export const getWalletBalance = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const wallet = await Wallet.findOne({ userId: req.user.id, isActive: true });
  if (!wallet) {
    return next(new AppError('Wallet not found', 404));
  }

  const response: ApiResponse = {
    status: 'success',
    message: 'Wallet balance retrieved successfully',
    data: {
      wallet: {
        id: wallet._id,
        balance: wallet.balance,
        currency: wallet.currency,
        formattedBalance: wallet.formattedBalance,
        isActive: wallet.isActive,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
    },
  };

  res.status(200).json(response);
});

/**
 * Get wallet transaction history
 */
export const getTransactionHistory = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const type = req.query.type as string; // 'credit' or 'debit'
  const status = req.query.status as string;

  const wallet = await Wallet.findOne({ userId: req.user.id, isActive: true });
  if (!wallet) {
    return next(new AppError('Wallet not found', 404));
  }

  // Build query
  const query: any = { walletId: wallet._id };
  if (type) query.type = type;
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  // Get transactions with pagination
  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  const response: ApiResponse = {
    status: 'success',
    message: 'Transaction history retrieved successfully',
    data: {
      transactions,
      wallet: {
        id: wallet._id,
        balance: wallet.balance,
        currency: wallet.currency,
        formattedBalance: wallet.formattedBalance,
      },
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
 * Fund wallet (mock implementation - to be integrated with Paystack)
 */
export const fundWallet = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400));
  }

  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const { amount, paymentMethod = 'paystack' } = req.body;

  if (amount <= 0) {
    return next(new AppError('Amount must be greater than 0', 400));
  }

  const wallet = await Wallet.findOne({ userId: req.user.id, isActive: true });
  if (!wallet) {
    return next(new AppError('Wallet not found', 404));
  }

  // Generate transaction reference
  const reference = `WF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create pending transaction
  const transaction = new Transaction({
    walletId: wallet._id,
    userId: req.user.id,
    type: 'credit',
    amount,
    currency: wallet.currency,
    description: 'Wallet funding',
    reference,
    status: 'pending',
    paymentMethod,
    metadata: {
      fundingType: 'wallet_funding',
      initiatedAt: new Date(),
    },
  });

  await transaction.save();

  // TODO: Integrate with Paystack payment initialization
  // For now, we'll simulate successful payment
  // In production, this would redirect to Paystack or return payment URL

  // Mock successful payment (remove this in production)
  setTimeout(async () => {
    try {
      await wallet.credit(amount, 'Wallet funding', reference);
      await transaction.markAsSuccessful();
      
      logger.info('Wallet funded successfully', {
        userId: req.user?.id,
        amount,
        reference,
        paymentMethod,
      });
    } catch (error) {
      logger.error('Error processing wallet funding:', error);
      await transaction.markAsFailed('Processing error');
    }
  }, 1000);

  const response: ApiResponse = {
    status: 'success',
    message: 'Wallet funding initiated successfully',
    data: {
      transaction: {
        id: transaction._id,
        reference: transaction.reference,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
      },
      // In production, include payment gateway URL
      paymentUrl: `https://checkout.paystack.com/${reference}`, // Mock URL
    },
  };

  res.status(202).json(response);
});

/**
 * Transfer funds to another wallet (internal transfer)
 */
export const transferFunds = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400));
  }

  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const { recipientEmail, amount, description = 'Wallet transfer' } = req.body;

  if (amount <= 0) {
    return next(new AppError('Amount must be greater than 0', 400));
  }

  // Find recipient user
  const recipient = await User.findOne({ email: recipientEmail.toLowerCase(), isActive: true });
  if (!recipient) {
    return next(new AppError('Recipient not found', 404));
  }

  // Prevent self-transfer
  if (recipient._id.toString() === req.user.id) {
    return next(new AppError('Cannot transfer to yourself', 400));
  }

  // Get sender's wallet
  const senderWallet = await Wallet.findOne({ userId: req.user.id, isActive: true });
  if (!senderWallet) {
    return next(new AppError('Sender wallet not found', 404));
  }

  // Get recipient's wallet
  const recipientWallet = await Wallet.findOne({ userId: recipient._id, isActive: true });
  if (!recipientWallet) {
    return next(new AppError('Recipient wallet not found', 404));
  }

  // Check if sender has sufficient balance
  if (!senderWallet.canDebit(amount)) {
    return next(new AppError('Insufficient wallet balance', 400));
  }

  // Generate transfer reference
  const transferReference = `WT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Debit sender's wallet
    const debitSuccess = await senderWallet.debit(amount, `Transfer to ${recipient.email}`, transferReference);
    if (!debitSuccess) {
      return next(new AppError('Transfer failed - insufficient funds', 400));
    }

    // Credit recipient's wallet
    await recipientWallet.credit(amount, `Transfer from ${req.user.email}`, transferReference);

    // Log successful transfer
    logger.info('Wallet transfer completed', {
      senderId: req.user.id,
      senderEmail: req.user.email,
      recipientId: recipient._id,
      recipientEmail: recipient.email,
      amount,
      reference: transferReference,
      ip: req.ip,
    });

    const response: ApiResponse = {
      status: 'success',
      message: 'Transfer completed successfully',
      data: {
        transfer: {
          reference: transferReference,
          amount,
          currency: senderWallet.currency,
          recipient: {
            name: `${recipient.firstName} ${recipient.lastName}`,
            email: recipient.email,
          },
          senderNewBalance: senderWallet.balance,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Transfer failed:', error);
    return next(new AppError('Transfer failed', 500));
  }
});

/**
 * Get transaction summary/statistics
 */
export const getTransactionSummary = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const { startDate, endDate } = req.query;

  // Parse dates
  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;

  // Get transaction summary
  const summary = await Transaction.getTransactionSummary(req.user.id, start, end);

  const response: ApiResponse = {
    status: 'success',
    message: 'Transaction summary retrieved successfully',
    data: {
      summary: summary[0] || {
        transactions: [],
        totalCredit: 0,
        totalDebit: 0,
        totalTransactions: 0,
        netBalance: 0,
      },
      period: {
        startDate: start,
        endDate: end,
      },
    },
  };

  res.status(200).json(response);
});

/**
 * Get single transaction details
 */
export const getTransactionById = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not found in request', 401));
  }

  const { transactionId } = req.params;

  const transaction = await Transaction.findOne({
    _id: transactionId,
    userId: req.user.id,
  }).populate('walletId', 'currency');

  if (!transaction) {
    return next(new AppError('Transaction not found', 404));
  }

  const transactionObj = transaction.toObject({ virtuals: true }) as unknown as ITransactionWithVirtuals;

const response: ApiResponse = {
  status: 'success',
  message: 'Transaction retrieved successfully',
  data: {
    transaction: {
      ...transactionObj,
      formattedAmount: transactionObj.formattedAmount,
      ageInDays: transactionObj.ageInDays,
    },
  },
};




  res.status(200).json(response);
});
