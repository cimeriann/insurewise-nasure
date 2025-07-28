import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from '@/types';
import { ITransaction } from '@/types';

export interface IGroupMember {
  user: mongoose.Types.ObjectId | User;
  position: number; // Position in the rotation
  joinedAt: Date;
  isActive: boolean;
  contributionsMade: number;
  lastContributionDate?: Date;
  receivedPayout?: Date;
}

export interface IContribution {
  member: mongoose.Types.ObjectId | User;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  transactionId?: mongoose.Types.ObjectId | ITransaction;
  status: 'pending' | 'paid' | 'overdue';
  cycle: number; // Which cycle this contribution is for
}

export interface IGroupSavings extends Document {
  name: string;
  description?: string;
  creator: mongoose.Types.ObjectId | User;
  members: IGroupMember[];
  contributionAmount: number;
  frequency: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  currentCycle: number;
  currentRecipient?: mongoose.Types.ObjectId | User;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  maxMembers: number;
  contributions: IContribution[];
  totalContributed: number;
  totalPaidOut: number;
  nextContributionDate: Date;
  nextPayoutDate: Date;
  rules: {
    allowEarlyWithdrawal: boolean;
    penaltyAmount: number;
    minimumContributions: number;
    autoKickInactive: boolean;
  };
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addMember(userId: mongoose.Types.ObjectId): Promise<boolean>;
  removeMember(userId: mongoose.Types.ObjectId): Promise<boolean>;
  recordContribution(memberId: mongoose.Types.ObjectId, amount: number, transactionId?: mongoose.Types.ObjectId): Promise<IContribution>;
  processPayout(): Promise<boolean>;
  calculateNextRecipient(): mongoose.Types.ObjectId | null;
  isReadyForPayout(): boolean;
  getMemberPosition(userId: mongoose.Types.ObjectId): number;
  getMemberContributions(userId: mongoose.Types.ObjectId): IContribution[];
  canMemberJoin(): boolean;
  updateContributionSchedule(): void;
  getOverdueContributions(): IContribution[];
  getMemberStats(userId: mongoose.Types.ObjectId): {
    totalContributed: number;
    contributionsMade: number;
    position: number;
    hasReceived: boolean;
    nextPayoutDate?: Date;
  };
}

const GroupMemberSchema = new Schema<IGroupMember>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  position: {
    type: Number,
    required: true,
    min: 1,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  contributionsMade: {
    type: Number,
    default: 0,
  },
  lastContributionDate: {
    type: Date,
  },
  receivedPayout: {
    type: Date,
  },
});

const ContributionSchema = new Schema<IContribution>({
  member: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  paidDate: {
    type: Date,
  },
  transactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending',
  },
  cycle: {
    type: Number,
    required: true,
    min: 1,
  },
}, {
  timestamps: true,
});

const GroupSavingsSchema = new Schema<IGroupSavings>({
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
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [GroupMemberSchema],
  contributionAmount: {
    type: Number,
    required: true,
    min: 1000, // Minimum ₦1,000
  },
  frequency: {
    type: String,
    enum: ['weekly', 'monthly'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  currentCycle: {
    type: Number,
    default: 1,
    min: 1,
  },
  currentRecipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft',
  },
  maxMembers: {
    type: Number,
    required: true,
    min: 2,
    max: 50,
  },
  contributions: [ContributionSchema],
  totalContributed: {
    type: Number,
    default: 0,
  },
  totalPaidOut: {
    type: Number,
    default: 0,
  },
  nextContributionDate: {
    type: Date,
    required: true,
  },
  nextPayoutDate: {
    type: Date,
    required: true,
  },
  rules: {
    allowEarlyWithdrawal: {
      type: Boolean,
      default: false,
    },
    penaltyAmount: {
      type: Number,
      default: 0,
    },
    minimumContributions: {
      type: Number,
      default: 1,
    },
    autoKickInactive: {
      type: Boolean,
      default: true,
    },
  },
}, {
  timestamps: true,
});

// Indexes
GroupSavingsSchema.index({ creator: 1 });
GroupSavingsSchema.index({ status: 1 });
GroupSavingsSchema.index({ 'members.user': 1 });
GroupSavingsSchema.index({ nextContributionDate: 1 });
GroupSavingsSchema.index({ nextPayoutDate: 1 });

// Virtual to check if group is full
GroupSavingsSchema.virtual('isFull').get(function() {
  return this.members.filter(m => m.isActive).length >= this.maxMembers;
});

// Pre-save middleware to update end date based on cycles
GroupSavingsSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('startDate') || this.isModified('maxMembers') || this.isModified('frequency')) {
    const cycles = this.maxMembers;
    const startDate = new Date(this.startDate);
    
    if (this.frequency === 'weekly') {
      this.endDate = new Date(startDate.getTime() + (cycles * 7 * 24 * 60 * 60 * 1000));
    } else {
      this.endDate = new Date(startDate.getFullYear(), startDate.getMonth() + cycles, startDate.getDate());
    }
  }
  next();
});

// Instance Methods

GroupSavingsSchema.methods.addMember = async function(userId: mongoose.Types.ObjectId): Promise<boolean> {
  try {
    // Check if user is already a member
    const existingMember = this.members.find((m:IGroupMember) => m.user.toString() === userId.toString());
    if (existingMember) {
      return false;
    }

    // Check if group is full
    if (this.isFull) {
      return false;
    }

    // Check if group is still accepting members
    if (this.status !== 'draft') {
      return false;
    }

    // Add member with next position
    const position = Math.max(...this.members.map((m: IGroupMember) => m.position), 0) + 1;
    
    this.members.push({
      user: userId,
      position,
      joinedAt: new Date(),
      isActive: true,
      contributionsMade: 0,
    });

    await this.save();
    return true;
  } catch (error) {
    return false;
  }
};

GroupSavingsSchema.methods.removeMember = async function(userId: mongoose.Types.ObjectId): Promise<boolean> {
  try {
    const memberIndex = this.members.findIndex((m: IGroupMember) => m.user.toString() === userId.toString());
    if (memberIndex === -1) {
      return false;
    }

    // Can't remove member if group is active and they've made contributions
    if (this.status === 'active' && this.members[memberIndex].contributionsMade > 0) {
      return false;
    }

    this.members.splice(memberIndex, 1);
    
    // Reorder positions if in draft
    if (this.status === 'draft') {
      this.members.forEach((member:IGroupMember, index:number) => {
        member.position = index + 1;
      });
    }

    await this.save();
    return true;
  } catch (error) {
    return false;
  }
};

GroupSavingsSchema.methods.recordContribution = async function(
  memberId: mongoose.Types.ObjectId, 
  amount: number, 
  transactionId?: mongoose.Types.ObjectId
): Promise<IContribution | null> {
  try {
    if (amount !== this.contributionAmount) {
      throw new Error('Contribution amount must match group requirement');
    }

    const member = this.members.find((m:IGroupMember) => m.user.toString() === memberId.toString());
    if (!member || !member.isActive) {
      throw new Error('Member not found or inactive');
    }

    // Create contribution record
    const contribution: IContribution = {
      member: memberId,
      amount,
      dueDate: this.nextContributionDate,
      paidDate: new Date(),
      transactionId,
      status: 'paid',
      cycle: this.currentCycle,
    };

    this.contributions.push(contribution);
    this.totalContributed += amount;
    
    // Update member stats
    member.contributionsMade += 1;
    member.lastContributionDate = new Date();

    await this.save();
    return contribution;
  } catch (error) {
    return null;
  }
};

GroupSavingsSchema.methods.processPayout = async function(): Promise<boolean> {
  try {
    if (!this.isReadyForPayout()) {
      return false;
    }

    const recipient = this.calculateNextRecipient();
    if (!recipient) {
      return false;
    }

    const payoutAmount = this.contributionAmount * this.members.filter((m : IGroupMember)=> m.isActive).length;
    
    // Update recipient
    const recipientMember = this.members.find((m: IGroupMember) => m.user.toString() === recipient.toString());
    if (recipientMember) {
      recipientMember.receivedPayout = new Date();
    }

    this.currentRecipient = recipient;
    this.totalPaidOut += payoutAmount;
    this.currentCycle += 1;
    
    // Update next dates
    this.updateContributionSchedule();

    // Check if group is completed
    const allMembersReceived = this.members.every((m:IGroupMember) => m.receivedPayout);
    if (allMembersReceived) {
      this.status = 'completed';
    }

    await this.save();
    return true;
  } catch (error) {
    return false;
  }
};

GroupSavingsSchema.methods.calculateNextRecipient = function(): mongoose.Types.ObjectId | null {
  // Find member with lowest position who hasn't received payout
  const eligibleMembers = this.members
    .filter((m: IGroupMember) => m.isActive && !m.receivedPayout)
    .sort((a: { position: number; }, b: { position: number; }) => a.position - b.position);
  
  return eligibleMembers.length > 0 ? eligibleMembers[0].user as mongoose.Types.ObjectId : null;
};

GroupSavingsSchema.methods.isReadyForPayout = function(): boolean {
  const activeMembers = this.members.filter((m: IGroupMember) => m.isActive);
  const currentCycleContributions = this.contributions.filter(
    (c:IContribution) => c.cycle === this.currentCycle && c.status === 'paid'
  );
  
  return currentCycleContributions.length === activeMembers.length;
};

GroupSavingsSchema.methods.getMemberPosition = function(userId: mongoose.Types.ObjectId): number {
  const member = this.members.find((m:IGroupMember) => m.user.toString() === userId.toString());
  return member ? member.position : -1;
};

GroupSavingsSchema.methods.getMemberContributions = function(userId: mongoose.Types.ObjectId): IContribution[] {
  return this.contributions.filter((c:IContribution) => c.member.toString() === userId.toString());
};

GroupSavingsSchema.methods.canMemberJoin = function(): boolean {
  return this.status === 'draft' && !this.isFull;
};

GroupSavingsSchema.methods.updateContributionSchedule = function(): void {
  const now = new Date();
  
  if (this.frequency === 'weekly') {
    this.nextContributionDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    this.nextPayoutDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  } else {
    this.nextContributionDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    this.nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
};

GroupSavingsSchema.methods.getOverdueContributions = function(): IContribution[] {
  const now = new Date();
  return this.contributions.filter(
    (c:IContribution) => c.status === 'pending' && c.dueDate < now
  ).map((c:IContribution) => ({ ...c, status: 'overdue' as const }));
};

GroupSavingsSchema.methods.getMemberStats = function(userId: mongoose.Types.ObjectId) {
  const member = this.members.find((m:IGroupMember) => m.user.toString() === userId.toString());
  const memberContributions = this.getMemberContributions(userId);
  
  if (!member) {
    return {
      totalContributed: 0,
      contributionsMade: 0,
      position: -1,
      hasReceived: false,
    };
  }

  const totalContributed = memberContributions
    .filter((c:IContribution) => c.status === 'paid')
    .reduce((sum:number, c:IContribution) => sum + c.amount, 0);

  return {
    totalContributed,
    contributionsMade: member.contributionsMade,
    position: member.position,
    hasReceived: !!member.receivedPayout,
    nextPayoutDate: member.receivedPayout ? undefined : this.nextPayoutDate,
  };
};

export const GroupSavings = mongoose.model<IGroupSavings>('GroupSavings', GroupSavingsSchema);
