import mongoose, { Schema, Document, Types } from 'mongoose';
import { ITransaction } from '@/types';

export interface ITransactionDocument extends ITransaction, Document<Types.ObjectId> {
  _id: Types.ObjectId;
  markAsSuccessful(): Promise<void>;
  markAsFailed(reason?: string): Promise<void>;
  markAsPending(): Promise<void>;
  canBeUpdated(): boolean;
  formattedAmount: string;
  ageInDays: number;
}

export interface ITransactionModel extends mongoose.Model<ITransactionDocument> {
  getTransactionSummary(userId: string, startDate?: Date, endDate?: Date): Promise<any[]>;
  findByReference(reference: string): Promise<ITransactionDocument | null>;
}

const transactionSchema = new Schema<ITransactionDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  walletId: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['credit', 'debit'],
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be positive'],
  },
  currency: {
    type: String,
    required: true,
    default: 'NGN',
    uppercase: true,
    enum: ['NGN', 'USD', 'EUR', 'GBP'],
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  reference: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'successful', 'failed', 'cancelled'],
    default: 'pending',
  },
  category: {
    type: String,
    required: false,
    enum: ['wallet_funding', 'premium_payment', 'claim_payout', 'group_contribution', 'cashback', 'refund', 'transfer', 'other'],
    default: 'other',
  },
  paymentMethod: {
    type: String,
    enum: ['paystack', 'flutterwave', 'bank_transfer', 'card', 'wallet', 'other'],
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  failureReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Failure reason cannot exceed 500 characters'],
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      const { __v, ...rest } = ret;
      return rest;
    },
  },
});

// Indexes
transactionSchema.index({ userId: 1 });
transactionSchema.index({ walletId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ reference: 1 }, { unique: true });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 }); // Added for better query performance

// Instance Methods
transactionSchema.methods.markAsSuccessful = async function(): Promise<void> {
  if (this.status !== 'pending') {
    throw new Error(`Cannot mark ${this.status} transaction as successful. Only pending transactions can be marked as successful.`);
  }
  
  this.status = 'successful';
  this.failureReason = undefined; // Clear any previous failure reason
  await this.save();
};

transactionSchema.methods.markAsFailed = async function(reason?: string): Promise<void> {
  if (this.status !== 'pending') {
    throw new Error(`Cannot mark ${this.status} transaction as failed. Only pending transactions can be marked as failed.`);
  }
  
  this.status = 'failed';
  if (reason) {
    this.failureReason = reason;
  }
  await this.save();
};

transactionSchema.methods.markAsPending = async function(): Promise<void> {
  if (!['failed', 'cancelled'].includes(this.status)) {
    throw new Error(`Cannot mark ${this.status} transaction as pending. Only failed or cancelled transactions can be marked as pending.`);
  }
  
  this.status = 'pending';
  this.failureReason = undefined;
  await this.save();
};

transactionSchema.methods.canBeUpdated = function(): boolean {
  return this.status === 'pending';
};

// Static Methods
transactionSchema.statics.getTransactionSummary = function(userId: string, startDate?: Date, endDate?: Date) {
  const matchStage: any = { userId: new mongoose.Types.ObjectId(userId) };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        transactions: { $push: '$$ROOT' },
        totalCredit: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$type', 'credit'] }, { $eq: ['$status', 'successful'] }] },
              '$amount',
              0
            ]
          }
        },
        totalDebit: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$type', 'debit'] }, { $eq: ['$status', 'successful'] }] },
              '$amount',
              0
            ]
          }
        },
        totalTransactions: { $sum: 1 },
        successfulTransactions: {
          $sum: {
            $cond: [{ $eq: ['$status', 'successful'] }, 1, 0]
          }
        },
        pendingTransactions: {
          $sum: {
            $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
          }
        },
        failedTransactions: {
          $sum: {
            $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
          }
        },
        cancelledTransactions: {
          $sum: {
            $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
          }
        }
      }
    },
    {
      $addFields: {
        netBalance: { $subtract: ['$totalCredit', '$totalDebit'] },
        successRate: {
          $cond: [
            { $eq: ['$totalTransactions', 0] },
            0,
            { $divide: ['$successfulTransactions', '$totalTransactions'] }
          ]
        }
      }
    }
  ]);
};

transactionSchema.statics.findByReference = function(reference: string) {
  return this.findOne({ reference: reference.toUpperCase() });
};

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: this.currency,
  }).format(this.amount);
});

// Virtual for transaction age
transactionSchema.virtual('ageInDays').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON output
transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

// Pre-save middleware to generate reference if not provided
transactionSchema.pre('save', function(next) {
  if (!this.reference) {
    this.reference = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

export const Transaction = mongoose.model<ITransactionDocument, ITransactionModel>('Transaction', transactionSchema);
export default Transaction;
