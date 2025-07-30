import mongoose, { Schema, Document, Types } from 'mongoose';
import { IWallet } from '@/types';

export interface IWalletDocument extends IWallet, Document<Types.ObjectId> {
  _id: Types.ObjectId;
  credit(amount: number, description: string, reference?: string): Promise<void>;
  debit(amount: number, description: string, reference?: string): Promise<boolean>;
  getBalance(): number;
  canDebit(amount: number): boolean;
}

const walletSchema = new Schema<IWalletDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Keep this for field-level uniqueness
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Balance cannot be negative'],
  },
  currency: {
    type: String,
    required: true,
    default: 'NGN',
    uppercase: true,
    enum: ['NGN', 'USD', 'EUR', 'GBP'],
  },
  transactions: [{
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: {
  transform: function (doc, ret: Partial<IWalletDocument & { __v?: number }>) {
    if ('__v' in ret) {
      delete ret.__v;
    }
    return ret;
  },
}
});

// Instance method to credit wallet
walletSchema.methods.credit = async function(
  amount: number, 
  description: string, 
  reference?: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Credit amount must be positive');
  }

  // Create transaction record
  const Transaction = mongoose.model('Transaction');
  const transaction = new Transaction({
    walletId: this._id,
    userId: this.userId, 
    type: 'credit',
    amount,
    currency: this.currency,
    description,
    reference: reference || `CR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
    status: 'successful', 
    category: 'wallet_funding', 
  });

  await transaction.save();

  // Update wallet balance and add transaction reference
  this.balance += amount;
  this.transactions.push(transaction._id);
  await this.save();
};

// Instance method to debit wallet
walletSchema.methods.debit = async function(
  amount: number, 
  description: string, 
  reference?: string
): Promise<boolean> {
  if (amount <= 0) {
    throw new Error('Debit amount must be positive');
  }

  if (this.balance < amount) {
    return false; // Insufficient funds
  }

  // Create transaction record
  const Transaction = mongoose.model('Transaction');
  const transaction = new Transaction({
    walletId: this._id,
    userId: this.userId, // Fixed: using userId instead of user
    type: 'debit',
    amount,
    currency: this.currency,
    description,
    reference: reference || `DR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
    status: 'successful', // Fixed: using 'successful' instead of 'completed'
    category: 'other', // Added required category
  });

  await transaction.save();

  // Update wallet balance and add transaction reference
  this.balance -= amount;
  this.transactions.push(transaction._id);
  await this.save();

  return true;
};

// Instance method to get current balance
walletSchema.methods.getBalance = function(): number {
  return this.balance;
};

// Instance method to check if wallet can be debited
walletSchema.methods.canDebit = function(amount: number): boolean {
  return this.isActive && this.balance >= amount && amount > 0;
};

// Static method to find wallet by user ID
walletSchema.statics.findByUserId = function(userId: string) {
  return this.findOne({ userId, isActive: true });
};

// Static method to get wallet with transactions
walletSchema.statics.findWithTransactions = function(userId: string, limit = 10) {
  return this.findOne({ userId, isActive: true })
    .populate({
      path: 'transactions',
      options: { 
        sort: { createdAt: -1 },
        limit,
      },
    });
};

// Pre-save middleware to ensure balance is not negative
walletSchema.pre('save', function(next) {
  if (this.balance < 0) {
    const error = new Error('Wallet balance cannot be negative');
    return next(error);
  }
  next();
});

// Virtual for formatted balance
walletSchema.virtual('formattedBalance').get(function() {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: this.currency,
  }).format(this.balance);
});

export const Wallet = mongoose.model<IWalletDocument>('Wallet', walletSchema);
export default Wallet;
