import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '@/types';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateDisplayName(): string;
  isPasswordExpired(): boolean;
}

const userSchema = new Schema<IUserDocument>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false, // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^\+?[\d\s-()]{10,}$/, 'Please enter a valid phone number'],
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(date: Date) {
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear();
        return age >= 18; // Must be at least 18 years old
      },
      message: 'User must be at least 18 years old',
    },
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters'],
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  profilePicture: {
    type: String,
    default: null,
  },
  savingsPlans: [{
    type: Schema.Types.ObjectId,
    ref: 'SavingsPlan',
  }],
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret: any) {
      delete ret?.password;
      delete ret?.__v;
      return ret;
    },
  },
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Pre-save middleware to validate email uniqueness case-insensitively
userSchema.pre('save', async function(next) {
  if (!this.isModified('email')) return next();

  try {
    const existingUser = await User.findOne({
      email: this.email.toLowerCase(),
      _id: { $ne: this._id },
    });

    if (existingUser) {
      const error = new Error('Email already exists') as any;
      error.code = 11000;
      return next(error);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate display name
userSchema.methods.generateDisplayName = function(): string {
  return `${this.firstName} ${this.lastName}`;
};

// Instance method to check if password needs to be updated
userSchema.methods.isPasswordExpired = function(): boolean {
  // Implement password expiry logic if needed
  // For now, passwords don't expire
  return false;
};

// Static method to find by email (case-insensitive)
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

export const User = mongoose.model<IUserDocument>('User', userSchema);
export default User;
