// models/HealthInsurancePlan.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHealthInsurancePlan extends Document {
  _id: Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const HealthInsurancePlanSchema = new Schema<IHealthInsurancePlan>({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
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
    monthly: { type: Number, required: true, min: 0 },
    quarterly: { type: Number, required: true, min: 0 },
    yearly: { type: Number, required: true, min: 0 }
  },
  maxCoverageAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  waitingPeriod: { 
    type: Number, 
    default: 30,
    min: 0
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      const { __v, ...rest } = ret;
      return rest;
    },
  }
});

// Indexes
HealthInsurancePlanSchema.index({ tier: 1 });
HealthInsurancePlanSchema.index({ isActive: 1 });
HealthInsurancePlanSchema.index({ 'premium.monthly': 1 });

// Virtual for coverage count
HealthInsurancePlanSchema.virtual('coverageCount').get(function() {
  return Object.values(this.coverage).filter(Boolean).length;
});

export const HealthInsurancePlan = mongoose.model<IHealthInsurancePlan>(
  'HealthInsurancePlan', 
  HealthInsurancePlanSchema
);

export default HealthInsurancePlan;