/**
 * @openapi
 * /api/campaign-delivery/test:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Test campaign delivery system
 *     description: Test the complete campaign delivery workflow with a sample campaign
 *     tags: [Campaign Delivery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               segment_id:
 *                 type: string
 *                 description: ID of the segment to test with
 *                 example: "64a1b2c3d4e5f6789abcdef0"
 *               message:
 *                 type: string
 *                 description: Test message template with placeholders
 *                 example: "Hi {name}, here's {discount}% off on your next order! Use code {couponCode}."
 *               subject:
 *                 type: string
 *                 description: Campaign subject
 *                 example: "Special Offer for You!"
 *               template_id:
 *                 type: string
 *                 description: Template identifier (optional)
 *                 example: "welcome"
 *               discount_percentage:
 *                 type: number
 *                 description: Discount percentage (optional)
 *                 example: 10
 *               customData:
 *                 type: object
 *                 description: Custom data for personalization (optional)
 *                 properties:
 *                   discount:
 *                     type: string
 *                     example: "10"
 *                   storeName:
 *                     type: string
 *                     example: "Your Store"
 *                   couponCode:
 *                     type: string
 *                     example: "WELCOME10"
 *             required:
 *               - segment_id
 *               - message
 *     responses:
 *       200:
 *         description: Test campaign created and delivery started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Test campaign created and delivery started"
 *                 campaign:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789abcdef0"
 *                     segment_id:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789abcdef0"
 *                     message:
 *                       type: string
 *                       example: "Hi {name}, here's {discount}% off on your next order!"
 *                     subject:
 *                       type: string
 *                       example: "Special Offer for You!"
 *                     status:
 *                       type: string
 *                       example: "ACTIVE"
 *                     template_id:
 *                       type: string
 *                       example: "welcome"
 *                     discount_percentage:
 *                       type: number
 *                       example: 10
 *                     customData:
 *                       type: object
 *                       properties:
 *                         discount:
 *                           type: string
 *                           example: "10"
 *                         storeName:
 *                           type: string
 *                           example: "Your Store"
 *                         couponCode:
 *                           type: string
 *                           example: "WELCOME10"
 *                 delivery_info:
 *                   type: object
 *                   properties:
 *                     vendor_simulation:
 *                       type: string
 *                       example: "90% success rate simulation enabled"
 *                     batch_processing:
 *                       type: string
 *                       example: "Delivery receipts processed in batches every 5 seconds"
 *                     personalization:
 *                       type: string
 *                       example: "Messages personalized with customer data"
 *       400:
 *         description: Bad request or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid message template"
 *                 invalidPlaceholders:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["{invalidField}"]
 *                 availablePlaceholders:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["{customerName}", "{customerEmail}"]
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * /api/campaign-delivery/status:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get delivery system status
 *     description: Get the current status of the delivery system including queue information
 *     tags: [Campaign Delivery]
 *     responses:
 *       200:
 *         description: Delivery system status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 vendor_status:
 *                   type: object
 *                   properties:
 *                     queueLength:
 *                       type: number
 *                       example: 5
 *                     batchSize:
 *                       type: number
 *                       example: 10
 *                     interval:
 *                       type: number
 *                       example: 5000
 *                 system_info:
 *                   type: object
 *                   properties:
 *                     personalization_enabled:
 *                       type: boolean
 *                       example: true
 *                     batch_processing_enabled:
 *                       type: boolean
 *                       example: true
 *                     vendor_simulation_rate:
 *                       type: string
 *                       example: "90% success, 10% failure"
 *       500:
 *         description: Internal server error
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { createCampaign } from '../controllers/campaigns';
import { vendorService } from '../services/vendorService';

const testCampaignSchema = z.object({
	segment_id: z.string().min(1),
	message: z.string().min(1),
	subject: z.string().optional(),
	template_id: z.string().optional(),
	discount_percentage: z.number().optional(),
	customData: z.object({
		discount: z.string().optional(),
		storeName: z.string().optional(),
		couponCode: z.string().optional()
	}).optional(),
});

export const campaignDeliveryRouter = Router();

// Test campaign delivery endpoint
campaignDeliveryRouter.post('/test', requireAuth, validateBody(testCampaignSchema), createCampaign);

// Get delivery system status
campaignDeliveryRouter.get('/status', requireAuth, async (req, res) => {
	try {
		const vendorStatus = vendorService.getQueueStatus();
		
		res.json({
			success: true,
			vendor_status: vendorStatus,
			system_info: {
				personalization_enabled: true,
				batch_processing_enabled: true,
				vendor_simulation_rate: "90% success, 10% failure"
			},
			message: 'Delivery system status retrieved successfully'
		});
	} catch (error) {
		console.error('Error getting delivery status:', error);
		res.status(500).json({ 
			error: 'Failed to get delivery system status',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});
