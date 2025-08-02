import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { Claim } from '../models/Claim';
import { GroupSavings } from '../models/GroupSavings';
import logger from '../config/logger';
import dotenv from 'dotenv';
dotenv.config();

export const seedDatabase = async () => {
  try {
    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Wallet.deleteMany({}),
      Transaction.deleteMany({}),
      Claim.deleteMany({}),
      GroupSavings.deleteMany({})
    ]);

    logger.info('Cleared existing data');

    // Create demo users
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const users = await User.create([
      {
        email: 'john.doe@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+2348012345678',
        dateOfBirth: new Date('1990-05-15'),
        address: '123 Lagos Street, Victoria Island, Lagos',
        isEmailVerified: true,
        isPhoneVerified: true,
        role: 'user'
      },
      {
        email: 'jane.smith@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+2348087654321',
        dateOfBirth: new Date('1985-08-22'),
        address: '456 Abuja Close, Wuse 2, Abuja',
        isEmailVerified: true,
        isPhoneVerified: false,
        role: 'user'
      },
      {
        email: 'admin@insurewise.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        phoneNumber: '+2348011111111',
        dateOfBirth: new Date('1980-01-01'),
        address: '789 Admin Avenue, Ikoyi, Lagos',
        isEmailVerified: true,
        isPhoneVerified: true,
        role: 'admin'
      },
      {
        email: 'mike.johnson@example.com',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Johnson',
        phoneNumber: '+2348055555555',
        dateOfBirth: new Date('1992-12-10'),
        address: '321 Port Harcourt Road, GRA, Port Harcourt',
        isEmailVerified: false,
        isPhoneVerified: true,
        role: 'user'
      },
      {
        email: 'sarah.wilson@example.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Wilson',
        phoneNumber: '+2348033333333',
        dateOfBirth: new Date('1988-03-25'),
        address: '654 Kano Street, Sabon Gari, Kano',
        isEmailVerified: true,
        isPhoneVerified: true,
        role: 'user'
      }
    ]);

    logger.info(`Created ${users.length} demo users`);

    // Create wallets for users
    const wallets = await Promise.all(
      users.map(user => 
        Wallet.create({
          userId: user._id,
          balance: Math.floor(Math.random() * 50000) + 10000, // Random balance between 10k-60k
          currency: 'NGN'
        })
      )
    );

    logger.info(`Created ${wallets.length} wallets`);

    // Create sample transactions
    const transactions = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const wallet = wallets[i];

      // Funding transactions
      for (let j = 0; j < 3; j++) {
        transactions.push({
          userId: user._id, // Fixed: using userId instead of user
          walletId: wallet._id,
          type: 'credit',
          amount: Math.floor(Math.random() * 20000) + 5000,
          currency: 'NGN',
          description: `Wallet funding via Paystack - Transaction ${j + 1}`,
          status: 'successful', // Fixed: changed from 'completed' to 'successful'
          reference: `REF_${Date.now()}_${i}_${j}`, // Fixed: uppercase reference
          paymentMethod: 'paystack',
          category: 'wallet_funding', // Fixed: added required category
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
      }

      // Spending transactions
      for (let j = 0; j < 2; j++) {
        transactions.push({
          userId: user._id, // Fixed: using userId instead of user
          walletId: wallet._id,
          type: 'debit',
          amount: Math.floor(Math.random() * 5000) + 1000,
          currency: 'NGN',
          description: `Insurance premium payment - Policy ${j + 1}`,
          status: 'successful', // Fixed: changed from 'completed' to 'successful'
          reference: `PREMIUM_${Date.now()}_${i}_${j}`, // Fixed: uppercase reference
          category: 'premium_payment', // Fixed: added required category
          createdAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000)
        });
      }
    }

    await Transaction.create(transactions);
    logger.info(`Created ${transactions.length} transactions`);

    // Create sample claims - FIXED CLAIM TYPES
    const claimTypes = ['medical', 'auto', 'home', 'life', 'other'] as const; // Fixed: using exact enum values
    type ClaimType = typeof claimTypes[number];
    const claimStatuses = ['pending', 'under_review', 'approved', 'declined'];
    
    const claims = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      for (let j = 0; j < 2; j++) {
        const type = claimTypes[Math.floor(Math.random() * claimTypes.length)] as ClaimType;
        const status = claimStatuses[Math.floor(Math.random() * claimStatuses.length)];
        const amount = Math.floor(Math.random() * 100000) + 10000;
        
        // Map claim types to more descriptive titles
        const claimTitles: Record<ClaimType, string> = {
          medical: 'Medical Treatment',
          auto: 'Vehicle Accident',
          home: 'Property Damage',
          life: 'Life Insurance',
          other: 'General Insurance'
        };
        
        const claimDescriptions: Record<ClaimType, string> = {
          medical: 'Medical expenses for hospital treatment and medication',
          auto: 'Vehicle repair costs due to accident or damage',
          home: 'Property damage due to fire, theft, or natural disaster',
          life: 'Life insurance claim for beneficiary',
          other: 'General insurance claim for various incidents'
        };
        
        claims.push({
          userId: user._id,
          type,
          title: `${claimTitles[type]} Claim ${j + 1}`,
          description: claimDescriptions[type],
          amount,
          currency: 'NGN',
          status,
          receiptUrl: `https://example.com/receipts/receipt_${i}_${j}.pdf`,
          documents: [`https://example.com/docs/doc1_${i}_${j}.pdf`],
          mlAnalysisResult: {
            confidence: Math.random(),
            risk_score: Math.random(),
            categories: [type],
            extracted_amount: amount,
            verification_status: 'verified'
          },
          reviewedBy: status !== 'pending' ? users[2]._id : undefined, // Admin user
          reviewedAt: status !== 'pending' ? new Date() : undefined,
          reviewNotes: status !== 'pending' ? `Claim ${status} after review` : undefined,
          approvedAmount: status === 'approved' ? Math.floor(amount * 0.9) : undefined,
          createdAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000)
        });
      }
    }

    await Claim.create(claims);
    logger.info(`Created ${claims.length} claims`);

    // Create sample group savings
    const groupSavings = await GroupSavings.create([
      {
        name: 'Lagos Young Professionals Savings Group',
        description: 'A savings group for young professionals in Lagos to save for emergency funds',
        creator: users[0]._id,
        contributionAmount: 50000,
        currency: 'NGN',
        maxMembers: 10,
        frequency: 'monthly',
        totalCycles: 10,
        currentCycle: 3,
        status: 'active',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Started 60 days ago
        endDate: new Date(Date.now() + 210 * 24 * 60 * 60 * 1000), // Ends in 210 days (7 more cycles)
        nextContributionDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        nextPayoutDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        members: [
          {
            user: users[0]._id,
            position: 1,
            joinedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            isActive: true,
            contributionsMade: 3
          },
          {
            user: users[1]._id,
            position: 2,
            joinedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
            isActive: true,
            contributionsMade: 3
          },
          {
            user: users[3]._id,
            position: 3,
            joinedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
            isActive: true,
            contributionsMade: 2
          }
        ],
        contributions: [
          // Cycle 1 contributions - Fixed field names and added required fields
          {
            member: users[0]._id, // Fixed: using 'member' instead of 'user'
            amount: 50000,
            cycle: 1,
            dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // When it was paid
            status: 'paid'
          },
          {
            member: users[1]._id, // Fixed: using 'member' instead of 'user'
            amount: 50000,
            cycle: 1,
            dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 59 * 24 * 60 * 60 * 1000),
            status: 'paid'
          },
          {
            member: users[3]._id, // Fixed: using 'member' instead of 'user'
            amount: 50000,
            cycle: 1,
            dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000),
            status: 'paid'
          },
          // Cycle 2 contributions
          {
            member: users[0]._id,
            amount: 50000,
            cycle: 2,
            dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            status: 'paid'
          },
          {
            member: users[1]._id,
            amount: 50000,
            cycle: 2,
            dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
            status: 'paid'
          },
          {
            member: users[3]._id,
            amount: 50000,
            cycle: 2,
            dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
            status: 'paid'
          },
          // Cycle 3 contributions
          {
            member: users[0]._id,
            amount: 50000,
            cycle: 3,
            dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            status: 'paid'
          },
          {
            member: users[1]._id,
            amount: 50000,
            cycle: 3,
            dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            status: 'paid'
          }
        ]
      },
      {
        name: 'Abuja Investment Circle',
        description: 'Investment-focused savings group for Abuja residents',
        creator: users[1]._id,
        contributionAmount: 100000,
        currency: 'NGN',
        maxMembers: 5,
        frequency: 'monthly',
        totalCycles: 5,
        currentCycle: 1,
        status: 'draft',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Starts in 7 days
        endDate: new Date(Date.now() + 157 * 24 * 60 * 60 * 1000), // Ends in ~5 months
        nextContributionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // First contribution in 7 days
        nextPayoutDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // First payout in ~37 days
        members: [
          {
            user: users[1]._id,
            position: 1,
            joinedAt: new Date(),
            isActive: true,
            contributionsMade: 0
          }
        ],
        contributions: [] // Empty for draft group
      },
      {
        name: 'Weekly Savers Club',
        description: 'Fast-paced weekly savings for quick returns',
        creator: users[4]._id,
        contributionAmount: 10000,
        currency: 'NGN',
        maxMembers: 4,
        frequency: 'weekly',
        totalCycles: 4,
        currentCycle: 2,
        status: 'active',
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Started 2 weeks ago
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Ends in 2 weeks
        nextContributionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Next contribution in 3 days
        nextPayoutDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Next payout in 5 days
        members: [
          {
            user: users[4]._id,
            position: 1,
            joinedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            isActive: true,
            contributionsMade: 2
          },
          {
            user: users[0]._id,
            position: 2,
            joinedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            isActive: true,
            contributionsMade: 2
          },
          {
            user: users[1]._id,
            position: 3,
            joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            isActive: true,
            contributionsMade: 1
          }
        ],
        contributions: [
          // Week 1 contributions
          {
            member: users[4]._id, // Fixed: using 'member' instead of 'user'
            amount: 10000,
            cycle: 1,
            dueDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            status: 'paid'
          },
          {
            member: users[0]._id,
            amount: 10000,
            cycle: 1,
            dueDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
            status: 'paid'
          },
          {
            member: users[1]._id,
            amount: 10000,
            cycle: 1,
            dueDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            status: 'paid'
          },
          // Week 2 contributions
          {
            member: users[4]._id,
            amount: 10000,
            cycle: 2,
            dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            status: 'paid'
          },
          {
            member: users[0]._id,
            amount: 10000,
            cycle: 2,
            dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Added required dueDate
            paidDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            status: 'paid'
          }
        ]
      }
    ]);

    logger.info(`Created ${groupSavings.length} group savings`);

    logger.info('✅ Demo data seeded successfully!');
    
    // Return summary for reference
    return {
      users: users.length,
      wallets: wallets.length,
      transactions: transactions.length,
      claims: claims.length,
      groupSavings: groupSavings.length,
      demoCredentials: {
        regularUser: { email: 'john.doe@example.com', password: 'password123' },
        adminUser: { email: 'admin@insurewise.com', password: 'password123' }
      }
    };

  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
};

// Script to run seeder
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insurewise')
    .then(() => {
      logger.info('Connected to MongoDB');
      return seedDatabase();
    })
    .then((summary) => {
      console.log('\n🎉 Database seeded successfully!');
      console.log('Summary:', summary);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}