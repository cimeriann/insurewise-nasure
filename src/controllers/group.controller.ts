import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { GroupSavings } from '@/models/GroupSavings';
import { Wallet } from '@/models/Wallet';
import { Transaction } from '@/models/Transaction';
import { logger } from '@/config/logger';
import { AuthenticatedRequest } from '@/types';
import { Types } from 'mongoose';


/**
 * Create a new group savings
 */
export const createGroupSavings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const {
      name,
      description,
      contributionAmount,
      frequency,
      startDate,
      maxMembers,
      rules,
    } = req.body;

    const userId = new Types.ObjectId(req.user!.id);

    // Create group savings
    const groupSavings = new GroupSavings({
      name,
      description,
      creator: userId,
      contributionAmount,
      frequency,
      startDate: new Date(startDate),
      maxMembers,
      rules: {
        allowEarlyWithdrawal: rules?.allowEarlyWithdrawal || false,
        penaltyAmount: rules?.penaltyAmount || 0,
        minimumContributions: rules?.minimumContributions || 1,
        autoKickInactive: rules?.autoKickInactive || true,
      },
      nextContributionDate: new Date(startDate),
      nextPayoutDate: new Date(startDate),
    });

   

    // Add creator as first member
    await groupSavings.addMember(userId);

    await groupSavings.save();

    logger.info('Group savings created', {
      groupId: groupSavings._id,
      creator: userId,
      name,
      maxMembers,
    });

    res.status(201).json({
      success: true,
      message: 'Group savings created successfully',
      data: {
        groupSavings: {
          id: groupSavings._id,
          name: groupSavings.name,
          description: groupSavings.description,
          contributionAmount: groupSavings.contributionAmount,
          frequency: groupSavings.frequency,
          startDate: groupSavings.startDate,
          maxMembers: groupSavings.maxMembers,
          currentMembers: groupSavings.members.length,
          status: groupSavings.status,
          rules: groupSavings.rules,
          createdAt: groupSavings.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error('Error creating group savings', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get user's group savings
 */
export const getUserGroupSavings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = new Types.ObjectId(req.user!.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      'members.user': userId,
    };

    if (status) {
      query.status = status;
    }

    const [groupSavings, total] = await Promise.all([
      GroupSavings.find(query)
        .populate('creator', 'firstName lastName email')
        .populate('members.user', 'firstName lastName email')
        .populate('currentRecipient', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      GroupSavings.countDocuments(query),
    ]);

    const groupsWithStats = groupSavings.map(group => {
      const memberStats = group.getMemberStats(userId);
      return {
        id: group._id,
        name: group.name,
        description: group.description,
        contributionAmount: group.contributionAmount,
        frequency: group.frequency,
        startDate: group.startDate,
        endDate: group.endDate,
        currentCycle: group.currentCycle,
        maxMembers: group.maxMembers,
        currentMembers: group.members.filter(m => m.isActive).length,
        status: group.status,
        creator: group.creator,
        currentRecipient: group.currentRecipient,
        nextContributionDate: group.nextContributionDate,
        nextPayoutDate: group.nextPayoutDate,
        totalContributed: group.totalContributed,
        totalPaidOut: group.totalPaidOut,
        rules: group.rules,
        memberStats,
        createdAt: group.createdAt,
      };
    });

    res.json({
      success: true,
      data: {
        groupSavings: groupsWithStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching user group savings', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get group savings details
 */
export const getGroupSavingsById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = new Types.ObjectId(req.user!.id);

    const groupSavings = await GroupSavings.findById(groupId)
      .populate('creator', 'firstName lastName email phone')
      .populate('members.user', 'firstName lastName email phone')
      .populate('currentRecipient', 'firstName lastName email phone')
      .populate('contributions.member', 'firstName lastName email')
      .populate('contributions.transactionId');

    if (!groupSavings) {
      res.status(404).json({
        success: false,
        message: 'Group savings not found',
      });
      return;
    }

    // Check if user is a member
    const isMember = groupSavings.members.some(m => m.user.toString() === userId.toString());
    if (!isMember) {
      res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
      return;
    }

    const memberStats = groupSavings.getMemberStats(userId);
    const overdueContributions = groupSavings.getOverdueContributions();

    res.json({
      success: true,
      data: {
        groupSavings: {
          id: groupSavings._id,
          name: groupSavings.name,
          description: groupSavings.description,
          creator: groupSavings.creator,
          members: groupSavings.members,
          contributionAmount: groupSavings.contributionAmount,
          frequency: groupSavings.frequency,
          startDate: groupSavings.startDate,
          endDate: groupSavings.endDate,
          currentCycle: groupSavings.currentCycle,
          currentRecipient: groupSavings.currentRecipient,
          status: groupSavings.status,
          maxMembers: groupSavings.maxMembers,
          contributions: groupSavings.contributions,
          totalContributed: groupSavings.totalContributed,
          totalPaidOut: groupSavings.totalPaidOut,
          nextContributionDate: groupSavings.nextContributionDate,
          nextPayoutDate: groupSavings.nextPayoutDate,
          rules: groupSavings.rules,
          memberStats,
          overdueContributions,
          isReadyForPayout: groupSavings.isReadyForPayout(),
          createdAt: groupSavings.createdAt,
          updatedAt: groupSavings.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching group savings details', { error, groupId: req.params.groupId, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Join a group savings
 */
export const joinGroupSavings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = new Types.ObjectId(req.user!.id);

    const groupSavings = await GroupSavings.findById(groupId);

    if (!groupSavings) {
      res.status(404).json({
        success: false,
        message: 'Group savings not found',
      });
      return;
    }

    if (!groupSavings.canMemberJoin()) {
      res.status(400).json({
        success: false,
        message: 'Cannot join this group. It may be full or no longer accepting members.',
      });
      return;
    }

    const success = await groupSavings.addMember(userId);

    if (!success) {
      res.status(400).json({
        success: false,
        message: 'Failed to join group. You may already be a member.',
      });
      return;
    }

    logger.info('User joined group savings', {
      groupId,
      userId,
      groupName: groupSavings.name,
    });

    res.json({
      success: true,
      message: 'Successfully joined the group',
      data: {
        position: groupSavings.getMemberPosition(userId),
        totalMembers: groupSavings.members.length,
      },
    });
  } catch (error) {
    logger.error('Error joining group savings', { error, groupId: req.params.groupId, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Leave a group savings
 */
export const leaveGroupSavings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = new Types.ObjectId(req.user!.id);

    const groupSavings = await GroupSavings.findById(groupId);

    if (!groupSavings) {
      res.status(404).json({
        success: false,
        message: 'Group savings not found',
      });
      return;
    }

    const success = await groupSavings.removeMember(userId);

    if (!success) {
      res.status(400).json({
        success: false,
        message: 'Cannot leave group. You may have already made contributions or are not a member.',
      });
      return;
    }

    logger.info('User left group savings', {
      groupId,
      userId,
      groupName: groupSavings.name,
    });

    res.json({
      success: true,
      message: 'Successfully left the group',
    });
  } catch (error) {
    logger.error('Error leaving group savings', { error, groupId: req.params.groupId, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Make a contribution to group savings
 */
export const makeContribution = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = new Types.ObjectId(req.user!.id);

    const groupSavings = await GroupSavings.findById(groupId);

    if (!groupSavings) {
      res.status(404).json({
        success: false,
        message: 'Group savings not found',
      });
      return;
    }

    // Check if user is an active member
    const member = groupSavings.members.find(m => m.user.toString() === userId.toString());
    if (!member || !member.isActive) {
      res.status(403).json({
        success: false,
        message: 'You are not an active member of this group',
      });
      return;
    }

    // Check if group is active
    if (groupSavings.status !== 'active') {
      res.status(400).json({
        success: false,
        message: 'Group is not active for contributions',
      });
      return;
    }

    // Check if user has already contributed for this cycle
    const existingContribution = groupSavings.contributions.find(
      c => c.member.toString() === userId.toString() && 
           c.cycle === groupSavings.currentCycle && 
           c.status === 'paid'
    );

    if (existingContribution) {
      res.status(400).json({
        success: false,
        message: 'You have already contributed for this cycle',
      });
      return;
    }

    // Get user's wallet
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      res.status(400).json({
        success: false,
        message: 'Wallet not found',
      });
      return;
    }

    // Check if user has sufficient balance
    if (!wallet.canDebit(groupSavings.contributionAmount)) {
      res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        data: {
          required: groupSavings.contributionAmount,
          available: wallet.balance,
        },
      });
      return;
    }

    // Create transaction
    const transaction = new Transaction({
      user: userId,
      type: 'debit',
      amount: groupSavings.contributionAmount,
      description: `Group savings contribution - ${groupSavings.name}`,
      category: 'group_savings',
      status: 'completed',
      metadata: {
        groupId: groupSavings._id,
        cycle: groupSavings.currentCycle,
      },
    });

    // Debit wallet
    await wallet.debit(groupSavings.contributionAmount, `Group contribution - ${groupSavings.name}`);
    await transaction.save();

    // Record contribution
    const contribution = await groupSavings.recordContribution(userId, groupSavings.contributionAmount, transaction._id);

    if (!contribution) {
      res.status(500).json({
        success: false,
        message: 'Failed to record contribution',
      });
      return;
    }

    // Check if ready for payout
    if (groupSavings.isReadyForPayout()) {
      await groupSavings.processPayout();
      
      // Process actual payout to recipient's wallet
      const recipientWallet = await Wallet.findOne({ user: groupSavings.currentRecipient });
      if (recipientWallet) {
        const payoutAmount = groupSavings.contributionAmount * groupSavings.members.filter(m => m.isActive).length;
        await recipientWallet.credit(payoutAmount, `Group savings payout - ${groupSavings.name}`);
        
        // Create payout transaction
        const payoutTransaction = new Transaction({
          user: groupSavings.currentRecipient,
          type: 'credit',
          amount: payoutAmount,
          description: `Group savings payout - ${groupSavings.name}`,
          category: 'group_savings_payout',
          status: 'completed',
          metadata: {
            groupId: groupSavings._id,
            cycle: groupSavings.currentCycle - 1,
          },
        });
        await payoutTransaction.save();
      }
    }

    logger.info('Group savings contribution made', {
      groupId,
      userId,
      amount: groupSavings.contributionAmount,
      cycle: groupSavings.currentCycle,
      transactionId: transaction._id,
    });

    res.json({
      success: true,
      message: 'Contribution made successfully',
      data: {
        contribution: {
          amount: contribution.amount,
          cycle: contribution.cycle,
          paidDate: contribution.paidDate,
          transactionId: contribution.transactionId,
        },
        groupStatus: {
          isReadyForPayout: groupSavings.isReadyForPayout(),
          currentRecipient: groupSavings.currentRecipient,
          nextContributionDate: groupSavings.nextContributionDate,
          nextPayoutDate: groupSavings.nextPayoutDate,
        },
        walletBalance: wallet.getBalance(),
      },
    });
  } catch (error) {
    logger.error('Error making group contribution', { error, groupId: req.params.groupId, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Start a group savings (for creator only)
 */
export const startGroupSavings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = req.user!.id;

    const groupSavings = await GroupSavings.findById(groupId);

    if (!groupSavings) {
      res.status(404).json({
        success: false,
        message: 'Group savings not found',
      });
      return;
    }

    // Check if user is the creator
    if (groupSavings.creator.toString() !== userId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Only the group creator can start the group',
      });
      return;
    }

    // Check if group can be started
    if (groupSavings.status !== 'draft') {
      res.status(400).json({
        success: false,
        message: 'Group cannot be started from its current status',
      });
      return;
    }

    if (groupSavings.members.length < 2) {
      res.status(400).json({
        success: false,
        message: 'Group must have at least 2 members to start',
      });
      return;
    }

    groupSavings.status = 'active';
    groupSavings.updateContributionSchedule();
    await groupSavings.save();

    logger.info('Group savings started', {
      groupId,
      creator: userId,
      members: groupSavings.members.length,
    });

    res.json({
      success: true,
      message: 'Group savings started successfully',
      data: {
        status: groupSavings.status,
        nextContributionDate: groupSavings.nextContributionDate,
        nextPayoutDate: groupSavings.nextPayoutDate,
        activeMembers: groupSavings.members.filter(m => m.isActive).length,
      },
    });
  } catch (error) {
    logger.error('Error starting group savings', { error, groupId: req.params.groupId, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get group savings statistics
 */
export const getGroupSavingsStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [
      totalGroups,
      activeGroups,
      completedGroups,
      totalContributed,
      totalReceived,
    ] = await Promise.all([
      GroupSavings.countDocuments({ 'members.user': userId }),
      GroupSavings.countDocuments({ 'members.user': userId, status: 'active' }),
      GroupSavings.countDocuments({ 'members.user': userId, status: 'completed' }),
      GroupSavings.aggregate([
        { $match: { 'members.user': userId } },
        { $unwind: '$contributions' },
        { $match: { 'contributions.member': userId, 'contributions.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$contributions.amount' } } },
      ]),
      GroupSavings.aggregate([
        { $match: { 'members.user': userId, currentRecipient: userId } },
        { $group: { _id: null, total: { $sum: '$totalPaidOut' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        statistics: {
          totalGroups,
          activeGroups,
          completedGroups,
          totalContributed: totalContributed[0]?.total || 0,
          totalReceived: totalReceived[0]?.total || 0,
          netSavings: (totalReceived[0]?.total || 0) - (totalContributed[0]?.total || 0),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching group savings statistics', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get available groups to join
 */
export const getAvailableGroups = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Find groups that are in draft status and not full
    const [groups, total] = await Promise.all([
      GroupSavings.find({
        status: 'draft',
        'members.user': { $ne: userId }, // Exclude groups user is already in
      })
        .populate('creator', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      GroupSavings.countDocuments({
        status: 'draft',
        'members.user': { $ne: userId },
      }),
    ]);

    const availableGroups = groups.filter(group => group.canMemberJoin()).map(group => ({
      id: group._id,
      name: group.name,
      description: group.description,
      creator: group.creator,
      contributionAmount: group.contributionAmount,
      frequency: group.frequency,
      startDate: group.startDate,
      maxMembers: group.maxMembers,
      currentMembers: group.members.length,
      spotsRemaining: group.maxMembers - group.members.length,
      rules: group.rules,
      createdAt: group.createdAt,
    }));

    res.json({
      success: true,
      data: {
        groups: availableGroups,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching available groups', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
