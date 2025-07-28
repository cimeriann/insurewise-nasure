import { Request } from 'express';
import mongoose, { Types } from 'mongoose';

// User related types
export interface IUser {
 /*  _id: Types.ObjectId; */
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth?: Date;
  address?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  role: 'user' | 'admin';
  profilePicture?: string;
  savingsPlans: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Wallet related types
export interface IWallet {
  /* _id: Types.ObjectId; */
  userId: Types.ObjectId;
  balance: number;
  currency: string;
  transactions: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  formattedBalance?: string;
}

export interface ITransaction {
  /* _id: Types.ObjectId; */
  user:mongoose.Types.ObjectId;
  walletId: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description: string;
  reference: string;
  status: 'pending' | 'successful' | 'failed' | 'cancelled';
  category: 'wallet_funding' | 'wallet_withdrawal' | string;
  paymentMethod?: 'paystack' | 'bank_transfer' | 'card' | 'ussd';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Claims related types
export interface IClaim {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'medical' | 'auto' | 'home' | 'life' | 'other';
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: 'pending' | 'under_review' | 'approved' | 'declined' | 'paid';
  receiptUrl?: string;
  documents: string[];
  mlAnalysisResult?: {
    confidence: number;
    recommendation: 'approve' | 'decline' | 'manual_review';
    extractedData: Record<string, any>;
    processedAt: Date;
  };
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  approvedAmount?: number;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Group Savings related types
export interface IGroupSavings {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  contributionFrequency: 'daily' | 'weekly' | 'monthly';
  contributionAmount: number;
  maxMembers: number;
  currentMembers: number;
  members: IGroupMember[];
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGroupMember {
  userId: Types.ObjectId;
  joinedAt: Date;
  totalContributed: number;
  lastContribution?: Date;
  isActive: boolean;
  position?: number; // For ajo-style rotation
}

export interface IGroupContribution {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  currency: string;
  transactionId: Types.ObjectId;
  contributionDate: Date;
  period: string; // e.g., "2024-01" for monthly contributions
  createdAt: Date;
}

// Savings Plan related types
export interface ISavingsPlan {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description?: string;
  type: 'individual' | 'group';
  targetAmount: number;
  currentAmount: number;
  currency: string;
  duration: number; // in months
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  interestRate?: number;
  cashbackRate?: number;
  groupId?: Types.ObjectId;
  autoSave?: {
    isEnabled: boolean;
    amount: number;
    frequency: 'daily' | 'weekly' | 'monthly';
    nextDeduction: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Cashback related types
export interface ICashback {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  amount: number;
  currency: string;
  type: '3_months' | '6_months' | 'completion';
  percentage: number;
  baseAmount: number;
  status: 'pending' | 'credited' | 'expired';
  eligibleDate: Date;
  creditedAt?: Date;
  transactionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Payment related types
export interface IPayment {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  currency: string;
  type: 'wallet_funding' | 'savings_contribution' | 'claim_payment' | 'cashback';
  status: 'pending' | 'successful' | 'failed' | 'cancelled';
  paymentMethod: 'paystack' | 'bank_transfer' | 'card' | 'ussd';
  reference: string;
  externalReference?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IIndividualContribution extends Document {
  userId: Types.ObjectId;
  savingsPlanId: Types.ObjectId; // Reference to ISavingsPlan
  amount: number;
  currency: string;
  transactionId?: Types.ObjectId;
  contributionDate: Date;
  status: 'pending' | 'paid' | 'failed';
  source:'individual'|'group';
  groupId: Types.ObjectId;
}


// Authentication related types
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ML Analysis types
export interface MLAnalysisRequest {
  receiptUrl: string;
  claimType: string;
  amount: number;
}

export interface MLAnalysisResponse {
  confidence: number;
  recommendation: 'approve' | 'decline' | 'manual_review';
  extractedData: {
    merchant?: string;
    date?: string;
    amount?: number;
    items?: string[];
    category?: string;
  };
  flags?: string[];
}

// File upload types
export interface FileUploadResult {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimetype: string;
  url: string;
}

// Environment variables type
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  BCRYPT_SALT_ROUNDS: number;
  PAYSTACK_SECRET_KEY: string;
  PAYSTACK_PUBLIC_KEY: string;
  CASHBACK_3_MONTHS_PERCENTAGE: number;
  CASHBACK_6_MONTHS_PERCENTAGE: number;
}
