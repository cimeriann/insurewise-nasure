// models/HealthInsurancePlan.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IHealthInsurancePlan extends Document {
  name: string;
  tier: 'basic' | 'standard' | 'premium';
  coverage: {
    hospitalization: boolean;
    outpatient: boolean;
    dental: boolean;
    optical: boolean;
    maternity: boolean;
    preExistingConditions: boolean;
  };
  premium: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };
  maxCoverageAmount: number;
  waitingPeriod: number; // in days
  description: string;
  isActive: boolean;
}

const HealthInsurancePlanSchema = new Schema<IHealthInsurancePlan>({
  name: { type: String, required: true },
  tier: { 
    type: String, 
    enum: ['basic', 'standard', 'premium'],
    required: true 
  },
  coverage: {
    hospitalization: { type: Boolean, default: false },
    outpatient: { type: Boolean, default: false },
    dental: { type: Boolean, default: false },
    optical: { type: Boolean, default: false },
    maternity: { type: Boolean, default: false },
    preExistingConditions: { type: Boolean, default: false }
  },
  premium: {
    monthly: { type: Number, required: true },
    quarterly: { type: Number, required: true },
    yearly: { type: Number, required: true }
  },
  maxCoverageAmount: { type: Number, required: true },
  waitingPeriod: { type: Number, default: 30 }, // 30 days default
  description: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const HealthInsurancePlan = mongoose.model<IHealthInsurancePlan>(
  'HealthInsurancePlan', 
  HealthInsurancePlanSchema
);