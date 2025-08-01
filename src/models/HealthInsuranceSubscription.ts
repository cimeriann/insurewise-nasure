// models/HealthInsuranceSubscription.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IHealthInsuranceSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  frequency: 'weekly' | 'monthly';
  premiumAmount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isClaimed: boolean;
}

const HealthInsuranceSubscriptionSchema = new Schema<IHealthInsuranceSubscription>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  planId: { type: Schema.Types.ObjectId, ref: 'HealthInsurancePlan', required: true },
  frequency: { type: String, enum: ['monthly', 'quarterly', 'yearly'], required: true },
  premiumAmount: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  isClaimed: { type: Boolean, default: false },
}, { timestamps: true });

export const HealthInsuranceSubscription = mongoose.model<IHealthInsuranceSubscription>(
  'HealthInsuranceSubscription',
  HealthInsuranceSubscriptionSchema
);
