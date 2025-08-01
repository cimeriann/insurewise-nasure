// controllers/insurancePlan.controller.ts
import { Request, Response } from 'express';
import { HealthInsurancePlan } from '@/models/InsurancePlan';
import { logger } from '@/config/logger';
import { catchAsync } from '@/middleware/errorHandler';

export const getInsurancePlans = catchAsync(async (req: Request, res: Response) => {
  const { category } = req.query;
  
  const filter: any = { isActive: true };
  if (category) filter.category = category;

  const plans = await HealthInsurancePlan.find(filter);

  return res.status(200).json({
    status: 'success',
    results: plans.length,
    data: { plans }
  });
});

export const getInsurancePlanDetails = catchAsync(async (req: Request, res: Response) => {
  const plan = await HealthInsurancePlan.findById(req.params.planId);
  
  if (!plan) {
    return res.status(404).json({
      status: 'error',
      message: 'Insurance plan not found'
    });
  }

  return res.status(200).json({
    status: 'success',
    data: { plan }
  });
});