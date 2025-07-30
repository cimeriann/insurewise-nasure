import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Wallet } from '@/models/Wallet';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { logger } from '@/config/logger';
import { AuthenticatedRequest } from '@/types';
import crypto from 'crypto';

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_your_secret_key';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_your_public_key';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: null | string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    fees_breakdown: null | any;
    log: null | any;
    fees: number;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: null | string;
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      metadata: any;
      risk_action: string;
      international_format_phone: null | string;
    };
    plan: null | any;
    order_id: null | string;
    paidAt: string;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: null | any;
    source: null | any;
    fees_split: null | any;
  };
}

/**
 * Initialize Paystack payment
 */
export const initializePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const { amount, email, metadata } = req.body;
    const userId = req.user!.id;

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Generate unique reference
    const reference = `INS_${Date.now()}_${userId.toString().slice(-6)}`;

    // Create pending transaction
    const transaction = new Transaction({
      user: userId,
      type: 'credit',
      amount: amount / 100, // Convert from kobo to naira
      description: 'Wallet funding via Paystack',
      category: 'wallet_funding',
      status: 'pending',
      reference,
      metadata: {
        paymentMethod: 'paystack',
        email: email || user.email,
        ...metadata,
      },
    });

    await transaction.save();

    // Mock Paystack initialization (replace with actual Paystack API call)
    const paystackResponse: PaystackInitializeResponse = {
      status: true,
      message: 'Authorization URL created',
      data: {
        authorization_url: `https://checkout.paystack.com/${reference}`,
        access_code: `access_code_${reference}`,
        reference,
      },
    };

    logger.info('Payment initialization successful', {
      userId,
      amount,
      reference,
      transactionId: transaction._id,
    });

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        authorization_url: paystackResponse.data.authorization_url,
        access_code: paystackResponse.data.access_code,
        reference: paystackResponse.data.reference,
        amount,
        transaction: {
          id: transaction._id,
          reference: transaction.reference,
          status: transaction.status,
        },
      },
    });
  } catch (error) {
    logger.error('Error initializing payment', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Verify Paystack payment
 */
export const verifyPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reference } = req.params;
    const userId = req.user!.id;

    // Find the transaction
    const transaction = await Transaction.findOne({ reference, user: userId });
    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    // Check if already processed
    if (transaction.status === 'successful') {
      res.status(400).json({
        success: false,
        message: 'Transaction already processed',
      });
      return;
    }

    // Mock Paystack verification (replace with actual Paystack API call)
    const paystackResponse: PaystackVerifyResponse = {
      status: true,
      message: 'Verification successful',
      data: {
        id: 123456789,
        domain: 'test',
        status: 'success',
        reference,
        amount: transaction.amount * 100, // Convert to kobo
        message: null,
        gateway_response: 'Successful',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        channel: 'card',
        currency: 'NGN',
        ip_address: '127.0.0.1',
        metadata: transaction.metadata,
        fees_breakdown: null,
        log: null,
        fees: 150, // Mock fees
        authorization: {
          authorization_code: 'AUTH_72btv547',
          bin: '408408',
          last4: '4081',
          exp_month: '12',
          exp_year: '2030',
          channel: 'card',
          card_type: 'visa ',
          bank: 'TEST BANK',
          country_code: 'NG',
          brand: 'visa',
          reusable: true,
          signature: 'SIG_uSYN4fv1adlAuoduLkQA',
          account_name: null,
        },
        customer: {
          id: 84312,
          first_name: '',
          last_name: '',
          email: transaction.metadata?.email || '',
          customer_code: 'CUS_xnxdt6s1zg5f4tx',
          phone: '',
          metadata: {},
          risk_action: 'default',
          international_format_phone: null,
        },
        plan: null,
        order_id: null,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        requested_amount: transaction.amount * 100,
        pos_transaction_data: null,
        source: null,
        fees_split: null,
      },
    };

    if (paystackResponse.status && paystackResponse.data.status === 'success') {
      // Get user's wallet
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        res.status(404).json({
          success: false,
          message: 'Wallet not found',
        });
        return;
      }

      // Credit wallet
      await wallet.credit(transaction.amount, 'Paystack payment verification');
      
      // Update transaction
      transaction.status = 'successful';
      transaction.metadata = {
        ...transaction.metadata,
        paystackData: paystackResponse.data,
        completedAt: new Date(),
      };
      await transaction.save();

      logger.info('Payment verification successful', {
        userId,
        reference,
        amount: transaction.amount,
        transactionId: transaction._id,
      });

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          transaction: {
            id: transaction._id,
            reference: transaction.reference,
            amount: transaction.amount,
            status: transaction.status,
            completedAt: transaction.metadata.completedAt,
          },
          wallet: {
            balance: wallet.getBalance(),
          },
          paystack: {
            gateway_response: paystackResponse.data.gateway_response,
            paid_at: paystackResponse.data.paid_at,
          },
        },
      });
    } else {
      // Payment failed
      transaction.status = 'failed';
      transaction.metadata = {
        ...transaction.metadata,
        paystackData: paystackResponse.data,
        failedAt: new Date(),
      };
      await transaction.save();

      logger.warn('Payment verification failed', {
        userId,
        reference,
        paystackResponse: paystackResponse.data,
      });

      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        data: {
          transaction: {
            id: transaction._id,
            reference: transaction.reference,
            status: transaction.status,
          },
          paystack: {
            gateway_response: paystackResponse.data.gateway_response,
            status: paystackResponse.data.status,
          },
        },
      });
    }
  } catch (error) {
    logger.error('Error verifying payment', { error, reference: req.params.reference, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Paystack webhook handler
 */
export const paystackWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
      res.status(400).json({
        success: false,
        message: 'Invalid signature',
      });
      return;
    }

    const { event, data } = req.body;

    logger.info('Paystack webhook received', { event, reference: data?.reference });

    switch (event) {
      case 'charge.success':
        await handleChargeSuccess(data);
        break;
      case 'charge.failed':
        await handleChargeFailed(data);
        break;
      case 'transfer.success':
        await handleTransferSuccess(data);
        break;
      case 'transfer.failed':
        await handleTransferFailed(data);
        break;
      default:
        logger.info('Unhandled webhook event', { event });
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    logger.error('Error processing webhook', { error, body: req.body });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Handle successful charge webhook
 */
const handleChargeSuccess = async (data: any): Promise<void> => {
  try {
    const { reference, amount, customer } = data;

    const transaction = await Transaction.findOne({ reference });
    if (!transaction) {
      logger.warn('Transaction not found for successful charge', { reference });
      return;
    }

    if (transaction.status === 'successful') {
      logger.info('Transaction already processed', { reference });
      return;
    }

    const wallet = await Wallet.findOne({ userId: transaction.userId });
    if (!wallet) {
      logger.error('Wallet not found for successful charge', { reference, userId: transaction.userId });
      return;
    }

    // Credit wallet
    await wallet.credit(amount / 100, 'Paystack webhook - charge success'); // Convert from kobo

    // Update transaction
    transaction.status = 'successful';
    transaction.metadata = {
      ...transaction.metadata,
      webhookData: data,
      completedAt: new Date(),
    };
    await transaction.save();

    logger.info('Charge success processed', {
      reference,
      amount: amount / 100,
      userId: transaction.userId,
    });
  } catch (error) {
    logger.error('Error handling charge success', { error, data });
  }
};

/**
 * Handle failed charge webhook
 */
const handleChargeFailed = async (data: any): Promise<void> => {
  try {
    const { reference, gateway_response } = data;

    const transaction = await Transaction.findOne({ reference });
    if (!transaction) {
      logger.warn('Transaction not found for failed charge', { reference });
      return;
    }

    transaction.status = 'failed';
    transaction.metadata = {
      ...transaction.metadata,
      webhookData: data,
      failedAt: new Date(),
      failureReason: gateway_response,
    };
    await transaction.save();

    logger.warn('Charge failed processed', {
      reference,
      gateway_response,
      userId: transaction.userId,
    });
  } catch (error) {
    logger.error('Error handling charge failed', { error, data });
  }
};

/**
 * Handle successful transfer webhook
 */
const handleTransferSuccess = async (data: any): Promise<void> => {
  try {
    const { reference, amount } = data;

    const transaction = await Transaction.findOne({ reference });
    if (!transaction) {
      logger.warn('Transaction not found for successful transfer', { reference });
      return;
    }

    transaction.status = 'successful';
    transaction.metadata = {
      ...transaction.metadata,
      webhookData: data,
      completedAt: new Date(),
    };
    await transaction.save();

    logger.info('Transfer success processed', {
      reference,
      amount: amount / 100,
      userId: transaction.userId,
    });
  } catch (error) {
    logger.error('Error handling transfer success', { error, data });
  }
};

/**
 * Handle failed transfer webhook
 */
const handleTransferFailed = async (data: any): Promise<void> => {
  try {
    const { reference, gateway_response } = data;

    const transaction = await Transaction.findOne({ reference });
    if (!transaction) {
      logger.warn('Transaction not found for failed transfer', { reference });
      return;
    }

    transaction.status = 'failed';
    transaction.metadata = {
      ...transaction.metadata,
      webhookData: data,
      failedAt: new Date(),
      failureReason: gateway_response,
    };
    await transaction.save();

    logger.warn('Transfer failed processed', {
      reference,
      gateway_response,
      userId: transaction.userId,
    });
  } catch (error) {
    logger.error('Error handling transfer failed', { error, data });
  }
};

/**
 * Get payment history
 */
export const getPaymentHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string;
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      user: userId,
      category: { $in: ['wallet_funding', 'wallet_withdrawal'] },
    };

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          status: t.status,
          reference: t.reference,
          category: t.category,
          metadata: t.metadata,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching payment history', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get payment configuration
 */
export const getPaymentConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        paystack: {
          publicKey: PAYSTACK_PUBLIC_KEY,
          currency: 'NGN',
          supportedChannels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        },
        fees: {
          local: {
            percentage: 1.5,
            cap: 2000, // ₦20 cap
            threshold: 2500, // Below ₦25, flat ₦10
            flatFee: 1000, // ₦10 flat fee
          },
          international: {
            percentage: 3.9,
            flatFee: 10000, // $0.50 equivalent
          },
        },
        limits: {
          minimum: 10000, // ₦100 minimum
          maximum: 100000000, // ₦1M maximum per transaction
          daily: 500000000, // ₦5M daily limit
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching payment config', { error });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
