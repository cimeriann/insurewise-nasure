import mongoose, { Schema,Types, model, Document } from 'mongoose';
import { ITransaction } from '@/types';

export interface ITransactionDocument extends ITransaction, Document<Types.ObjectId> {
  _id: Types.ObjectId;
  isSuccessful(): boolean;
  isPending(): boolean;
  isFailed(): boolean;
  markAsSuccessful(): Promise<void>;
  markAsFailed(reason?: string): Promise<void>;
} 

export interface ITransactionModel extends mongoose.Model<ITransactionDocument> {
  getTransactionSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]>;
}


const transactionSchema = new Schema<ITransactionDocument>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true
   },
  walletId: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: [true, 'Wallet ID is required'],
  },
  /* userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  }, */
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: ['credit', 'debit'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
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
    required: [true, 'Transaction description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
  },
  reference: {
    type: String,
    required: [true, 'Transaction reference is required'],
    unique: true,
    trim: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'successful', 'failed', 'cancelled'],
    default: 'pending',
  },
  category: {
    type: String,
    required: true,
    enum: ['wallet_funding', 'wallet_withdrawal']
  },
  paymentMethod: {
    type: String,
    enum: ['paystack', 'bank_transfer', 'card', 'ussd'],
    required: false,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes for better query performance
transactionSchema.index({ walletId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

// Compound indexes
transactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ walletId: 1, type: 1, createdAt: -1 });

// Instance methods
transactionSchema.methods.isSuccessful = function(): boolean {
  return this.status === 'successful';
};

transactionSchema.methods.isPending = function(): boolean {
  return this.status === 'pending';
};

transactionSchema.methods.isFailed = function(): boolean {
  return this.status === 'failed';
};

transactionSchema.methods.markAsSuccessful = async function(): Promise<void> {
  this.status = 'successful';
  await this.save();
};

transactionSchema.methods.markAsFailed = async function(reason?: string): Promise<void> {
  this.status = 'failed';
  if (reason) {
    this.metadata = { ...this.metadata, failureReason: reason };
  }
  await this.save();
};

// Static methods
transactionSchema.statics.findByReference = function(reference: string) {
  return this.findOne({ reference });
};

transactionSchema.statics.findByWallet = function(
  walletId: string, 
  page = 1, 
  limit = 20,
  status?: string
) {
  const skip = (page - 1) * limit;
  const query: any = { walletId };
  
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'firstName lastName email');
};

transactionSchema.statics.findByUser = function(
  userId: string, 
  page = 1, 
  limit = 20,
  type?: string
) {
  const skip = (page - 1) * limit;
  const query: any = { userId };
  
  if (type) {
    query.type = type;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('walletId');
};

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
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        averageAmount: { $avg: '$amount' },
      },
    },
    {
      $group: {
        _id: null,
        transactions: {
          $push: {
            type: '$_id',
            totalAmount: '$totalAmount',
            count: '$count',
            averageAmount: '$averageAmount',
          },
        },
        totalCredit: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'credit'] }, '$totalAmount', 0],
          },
        },
        totalDebit: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'debit'] }, '$totalAmount', 0],
          },
        },
        totalTransactions: { $sum: '$count' },
      },
    },
    {
      $addFields: {
        netBalance: { $subtract: ['$totalCredit', '$totalDebit'] },
      },
    },
  ]);
};

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  const sign = this.type === 'credit' ? '+' : '-';
  return `${sign}${new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: this.currency,
  }).format(this.amount)}`;
});

// Virtual for transaction age
transactionSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

export const Transaction = mongoose.model<ITransactionDocument, ITransactionModel>('Transaction', transactionSchema);
export default Transaction;
