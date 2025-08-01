import express from 'express';
import {
  subscribeToHealthInsurancePlan,
  getUserHealthSubscriptions,
  cancelHealthInsurance,
} from '@/controllers/health-insurance-subscription.controller';
import { authenticateToken } from '@/middleware/auth';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: HealthInsurance
 *   description: Manage health insurance subscriptions
 */

/**
 * @swagger
 * /api/v1/insurance-subscriptions/subscribe/{planId}:
 *   post:
 *     summary: Subscribe to a health insurance plan
 *     tags: [HealthInsurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the insurance plan to subscribe to
 *     responses:
 *       200:
 *         description: Successfully subscribed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Plan not found
 */
router.post('/subscribe/:planId', authenticateToken, subscribeToHealthInsurancePlan);

/**
 * @swagger
 * /api/v1/insurance-subscriptions/my-subscriptions:
 *   get:
 *     summary: Get all of the current user's health insurance subscriptions
 *     tags: [HealthInsurance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subscriptions returned
 *       401:
 *         description: Unauthorized
 */
router.get('/my-subscriptions', authenticateToken, getUserHealthSubscriptions);

/**
 * @swagger
 * /api/v1/insurance-subscriptions/cancel/{subscriptionId}:
 *   patch:
 *     summary: Cancel a health insurance subscription
 *     tags: [HealthInsurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the subscription to cancel
 *     responses:
 *       200:
 *         description: Subscription cancelled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 */
router.patch('/cancel/:subscriptionId', authenticateToken, cancelHealthInsurance);

export default router;
