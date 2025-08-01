// routes/healthInsuranceSubscriptionRoutes.ts

import express from 'express';
import {
  subscribeToHealthInsurancePlan,
  getUserHealthSubscriptions,
  cancelHealthInsurance
} from '@/controllers/health-insurance-subscription.controller';
import { authenticateToken } from '@/middleware/auth';

const router = express.Router();

router.post('/subscribe/:planId', authenticateToken, subscribeToHealthInsurancePlan);
router.get('/my-subscriptions', authenticateToken, getUserHealthSubscriptions);
router.patch('/cancel/:subscriptionId', authenticateToken, cancelHealthInsurance);

export default router;
