// controllers/healthInsuranceSubscription.controller.ts

import { Request, Response, NextFunction } from "express";
import { HealthInsurancePlan } from "@/models/InsurancePlan";
import { HealthInsuranceSubscription } from "@/models/HealthInsuranceSubscription";
import { Wallet } from "@/models/Wallet";
import { Transaction } from "@/models/Transaction";
import { logger } from "@/config/logger";
import { AuthenticatedRequest } from "@/types";
import { catchAsync, AppError } from "@/middleware/errorHandler";

/**
 * Subscribe to a health insurance plan
 */
export const subscribeToHealthInsurancePlan = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { planId } = req.params;
    const { frequency, paymentMethod } = req.body;
    const userId = req.user!.id;

    const plan = await HealthInsurancePlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        status: "error",
        message: "Health insurance plan not found or inactive",
      });
    }

    type Frequency = "monthly" | "quarterly" | "yearly";
    const validFrequencies: Frequency[] = ["monthly", "quarterly", "yearly"];

    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid frequency selected",
      });
    }

    const premiumAmount = plan.premium[frequency as Frequency];
    if (!premiumAmount) {
      return res.status(400).json({
        status: "error",
        message: "Invalid frequency selected",
      });
    }

    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.getBalance() < premiumAmount) {
        return res.status(400).json({
          status: "error",
          message: "Insufficient wallet balance",
        });
      }

      await wallet.debit(premiumAmount, `Health plan: ${plan.name}`);
    } else {
      return res.status(400).json({
        status: "error",
        message: "Only wallet payment supported for now",
      });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (frequency === "monthly") endDate.setMonth(endDate.getMonth() + 1);
    if (frequency === "quarterly") endDate.setMonth(endDate.getMonth() + 3);
    if (frequency === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await HealthInsuranceSubscription.create({
      userId,
      planId,
      frequency,
      premiumAmount,
      startDate,
      endDate,
      isActive: true,
      isClaimed: false,
    });

    logger.info("Health insurance plan subscribed", {
      userId,
      planId,
      subscriptionId: subscription._id,
    });

    return res.status(201).json({
      status: "success",
      message: "Health insurance subscription successful",
      data: { subscription },
    });
  }
);

/**
 * Get user's health insurance subscriptions
 */
export const getUserHealthSubscriptions = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const subscriptions = await HealthInsuranceSubscription.find({
      userId,
      isActive: true,
    }).populate("planId");

    res.status(200).json({
      status: "success",
      results: subscriptions.length,
      data: { subscriptions },
    });
  }
);

/**
 * Cancel a health subscription
 */
export const cancelHealthInsurance = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { subscriptionId } = req.params;

    const subscription = await HealthInsuranceSubscription.findOne({
      _id: subscriptionId,
      userId,
    });

    if (!subscription) {
      return res.status(404).json({
        status: "error",
        message: "Subscription not found",
      });
    }

    subscription.isActive = false;
    await subscription.save();

    return res.status(200).json({
      status: "success",
      message: "Subscription cancelled successfully",
    });
  }
);
