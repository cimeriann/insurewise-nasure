import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { IClaim } from '@/types';

export interface IClaimModel extends Model<IClaimDocument> {
  findByUser(
    userId: string | Types.ObjectId,
    page?: number,
    limit?: number,
    status?: string
  ): Promise<IClaimDocument[]>;

  getPendingClaims(page?: number, limit?: number): Promise<IClaimDocument[]>;

  getClaimStats(userId?: string): Promise<any>;
}

export interface IClaimDocument extends Omit<IClaim, '_id'>, Document {
  canBeReviewed(): boolean;
  isInReview(): boolean;
  canBeApproved(): boolean;
  markAsUnderReview(reviewerId: string): Promise<void>;
  approve(reviewerId: string, approvedAmount?: number, notes?: string): Promise<void>;
  decline(reviewerId: string, notes: string): Promise<void>;
  formattedAmount: string;
  formattedApprovedAmount?: string | null;
  ageInDays: number;
}

const claimSchema = new Schema<IClaimDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  type: {
    type: String,
    required: [true, 'Claim type is required'],
    enum: ['medical', 'auto', 'home', 'life', 'other'],
  },
  title: {
    type: String,
    required: [true, 'Claim title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Claim description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  amount: {
    type: Number,
    required: [true, 'Claim amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
  },
  currency: {
    type: String,
    required: true,
    default: 'NGN',
    uppercase: true,
    enum: ['NGN', 'USD', 'EUR', 'GBP'],
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'under_review', 'approved', 'declined', 'paid'],
    default: 'pending',
  },
  receiptUrl: {
    type: String,
    validate: {
      validator: function(url: string) {
        if (!url) return true; // Optional field
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Please provide a valid URL for the receipt',
    },
  },
  documents: [{
    type: String,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Please provide valid URLs for documents',
    },
  }],
  mlAnalysisResult: {
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    risk_score: { // Added this field that seeder uses
      type: Number,
      min: 0,
      max: 1,
    },
    categories: [{ // Added this field that seeder uses
      type: String,
    }],
    extracted_amount: { // Added this field that seeder uses
      type: Number,
    },
    verification_status: { // Added this field that seeder uses
      type: String,
      enum: ['verified', 'pending', 'failed'],
    },
    recommendation: {
      type: String,
      enum: ['approve', 'decline', 'manual_review'],
    },
    extractedData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    processedAt: {
      type: Date,
    },
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
  reviewNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Review notes cannot exceed 500 characters'],
  },
  approvedAmount: {
    type: Number,
    min: [0, 'Approved amount cannot be negative'],
  },
  paidAt: {
    type: Date,
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
claimSchema.index({ userId: 1, createdAt: -1 });
claimSchema.index({ status: 1 });
claimSchema.index({ type: 1 });
claimSchema.index({ reviewedBy: 1 });
claimSchema.index({ createdAt: -1 });

// Compound indexes
claimSchema.index({ userId: 1, status: 1 });
claimSchema.index({ status: 1, createdAt: -1 });

// Instance methods
claimSchema.methods.canBeReviewed = function(): boolean {
  return this.status === 'pending';
};

claimSchema.methods.isInReview = function(): boolean {
  return this.status === 'under_review';
};

claimSchema.methods.canBeApproved = function(): boolean {
  return ['pending', 'under_review'].includes(this.status);
};

claimSchema.methods.markAsUnderReview = async function(reviewerId: string): Promise<void> {
  this.status = 'under_review';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  await this.save();
};

claimSchema.methods.approve = async function(
  reviewerId: string, 
  approvedAmount?: number, 
  notes?: string
): Promise<void> {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.approvedAmount = approvedAmount || this.amount;
  if (notes) this.reviewNotes = notes;
  await this.save();
};

claimSchema.methods.decline = async function(reviewerId: string, notes: string): Promise<void> {
  this.status = 'declined';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  await this.save();
};

// Static methods
claimSchema.statics.findByUser = function(userId: string, page = 1, limit = 20, status?: string) {
  const skip = (page - 1) * limit;
  const query: any = { userId };
  
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('reviewedBy', 'firstName lastName email');
};

claimSchema.statics.getPendingClaims = function(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({ status: 'pending' })
    .sort({ createdAt: 1 }) // FIFO for pending claims
    .skip(skip)
    .limit(limit)
    .populate('userId', 'firstName lastName email phoneNumber');
};

claimSchema.statics.getClaimStats = function(userId?: string) {
  const matchStage: any = {};
  if (userId) {
    matchStage.userId = new mongoose.Types.ObjectId(userId);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' },
      },
    },
    {
      $group: {
        _id: null,
        statusBreakdown: {
          $push: {
            status: '$_id',
            count: '$count',
            totalAmount: '$totalAmount',
            averageAmount: '$averageAmount',
          },
        },
        totalClaims: { $sum: '$count' },
        totalClaimValue: { $sum: '$totalAmount' },
      },
    },
  ]);
};

// Virtual for formatted amount
claimSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: this.currency,
  }).format(this.amount);
});

// Virtual for formatted approved amount
claimSchema.virtual('formattedApprovedAmount').get(function() {
  if (!this.approvedAmount) return null;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: this.currency,
  }).format(this.approvedAmount);
});

// Virtual for claim age - REMOVED DUPLICATE, keeping only one
claimSchema.virtual('ageInDays').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

export const Claim = mongoose.model<IClaimDocument, IClaimModel>('Claim', claimSchema);
export default Claim;
