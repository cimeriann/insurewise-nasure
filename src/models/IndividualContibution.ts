import mongoose, { Schema } from 'mongoose';
import { IIndividualContribution } from '@/types'; // Adjust path if needed

const IndividualContributionSchema = new Schema<IIndividualContribution>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  savingsPlanId: {
    type: Schema.Types.ObjectId,
    ref: 'SavingsPlan',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    default: 'NGN',
  },
  transactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
  },
  contributionDate: {
    type: Date,
    default: Date.now,
  },
  contributionType:{
    type: String,
    enum:['weekly', 'monthly'],
    default: 'weekly',
    required:true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  source: {
  type: String,
  enum: ['individual', 'group'],
  default: 'individual',
  required: true,
},
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: false,
  },
}, {
  timestamps: true,
});

export const IndividualContribution = mongoose.model<IIndividualContribution>(
  'IndividualContribution',
  IndividualContributionSchema
);
