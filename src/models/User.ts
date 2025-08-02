import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '@/types';

// 1. Enhanced Document Interface
export interface IUserDocument extends IUser, Document<Types.ObjectId> {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateDisplayName(): string;
  isPasswordExpired(): boolean;
  fullName: string;
  age: number | null;
}

// 2. Model Static Methods Interface
interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
  findActive(): Promise<IUserDocument[]>;
}

// 3. Schema Definition with Type Assertion
const userSchemaFields: Record<string, any> = {
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
    select: false,
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
      validator: function(this: IUserDocument, date: Date): boolean {
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear();
        return age >= 18;
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
  healthInsurancePlans: [{
    type: Schema.Types.ObjectId,
    ref: 'HealthInsurancePlan',
  }],
  savingsPlans: [{
    type: Schema.Types.ObjectId,
    ref: 'SavingsPlan',
  }],
};

const userSchema = new Schema<IUserDocument, IUserModel>(userSchemaFields, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret: Record<string, any>) {
      const { password, __v, ...rest } = ret;
      return rest;
    },
  },
  toObject: {
    virtuals: true,
  },
});

// 4. Type-safe Virtuals and Methods
userSchema.virtual('fullName').get(function(this: IUserDocument): string {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('age').get(function(this: IUserDocument): number | null {
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

// 5. Type-safe Pre-save Hooks
userSchema.pre<IUserDocument>('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    if (this.password) {
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 6. Type-safe Instance Methods
userSchema.methods.comparePassword = async function(
  this: IUserDocument,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// 7. Create and Export Model
const User = mongoose.model<IUserDocument, IUserModel>('User', userSchema);
export default User;