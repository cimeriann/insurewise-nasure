import mongoose, { Schema, Document, Types } from 'mongoose';
import { ISavingsPlan } from '@/types';

export interface ISavingsPlanDocument extends ISavingsPlan, Document<Types.ObjectId> {
  _id: Types.ObjectId;
}

const autoSaveSchema = new Schema({
  isEnabled: {
    type: Boolean,
    default: false,
  },
  amount: {
    type: Number,
    required: function(this: any): boolean {
      return this.isEnabled;
    },
    min: 0,
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: function(this: any) {
      return this.isEnabled;
    },
  },
  nextDeduction: {
    type: Date,
    required: function(this: any) {
      return this.isEnabled;
    },
  },
}, { _id: false });

const savingsPlanSchema = new Schema<ISavingsPlanDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['individual', 'group'],
    required: true,
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    default: 'NGN',
    uppercase: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 1, // At least 1 month
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  interestRate: {
    type: Number,
    min: 0,
    max: 100,
  },
  cashbackRate: {
    type: Number,
    min: 0,
    max: 100,
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: function() {
      return this.type === 'group';
    },
  },
  autoSave: autoSaveSchema,
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
savingsPlanSchema.index({ userId: 1 });
savingsPlanSchema.index({ type: 1 });
savingsPlanSchema.index({ isActive: 1 });
savingsPlanSchema.index({ startDate: 1, endDate: 1 });

// Virtual for progress percentage
savingsPlanSchema.virtual('progressPercentage').get(function() {
  if (this.targetAmount === 0) return 0;
  return Math.round((this.currentAmount / this.targetAmount) * 100);
});

// Virtual for remaining amount
savingsPlanSchema.virtual('remainingAmount').get(function() {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

// Virtual for days remaining
savingsPlanSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const endDate = new Date(this.endDate);
  const diffTime = endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate end date if not provided
savingsPlanSchema.pre('save', function(next) {
  if (!this.endDate && this.startDate && this.duration) {
    const startDate = new Date(this.startDate);
    this.endDate = new Date(startDate.setMonth(startDate.getMonth() + this.duration));
  }
  next();
});

// Instance method to check if plan is completed
savingsPlanSchema.methods.isCompleted = function() {
  return this.currentAmount >= this.targetAmount;
};

// Instance method to add contribution
savingsPlanSchema.methods.addContribution = function(amount: number) {
  this.currentAmount += amount;
  return this.save();
};

// Static method to find user's active plans
savingsPlanSchema.statics.findActiveByUser = function(userId: string) {
  return this.find({ userId, isActive: true });
};

export const SavingsPlan = mongoose.model<ISavingsPlanDocument>('SavingsPlan', savingsPlanSchema);
export default SavingsPlan;