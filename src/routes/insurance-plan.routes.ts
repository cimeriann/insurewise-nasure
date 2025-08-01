import express from 'express';
import { getInsurancePlans, getInsurancePlanDetails } from '@/controllers/insurance-plan.controller';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: InsurancePlans
 *   description: Browse available health insurance plans
 */

/**
 * @swagger
 * /api/v1/insurance-plans:
 *   get:
 *     summary: Get all active insurance plans
 *     tags: [InsurancePlans]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Optional category filter (e.g., 'family', 'individual', etc.)
 *     responses:
 *       200:
 *         description: A list of active insurance plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: number
 *                   example: 2
 *                 data:
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/HealthInsurancePlan'
 */
router.get('/', getInsurancePlans);

/**
 * @swagger
 * /api/v1/insurance-plans/{planId}:
 *   get:
 *     summary: Get details of a specific insurance plan
 *     tags: [InsurancePlans]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the insurance plan
 *     responses:
 *       200:
 *         description: Insurance plan details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       $ref: '#/components/schemas/HealthInsurancePlan'
 *       404:
 *         description: Plan not found
 */
router.get('/:planId', getInsurancePlanDetails);

export default router;
