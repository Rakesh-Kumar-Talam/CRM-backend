/**
 * @openapi
 * /api/campaigns:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Create a campaign with selected segment
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: List past campaigns (most recent first)
 * /api/campaigns/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get campaign details
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: Update a campaign
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               segment_id:
 *                 type: string
 *                 description: ID of the segment to target
 *                 example: "64a1b2c3d4e5f6789abcdef0"
 *               message:
 *                 type: string
 *                 description: Campaign message content
 *                 minLength: 1
 *                 maxLength: 1000
 *                 example: "Updated campaign message"
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED]
 *                 description: Campaign status
 *                 example: "ACTIVE"
 *             anyOf:
 *               - required: [segment_id]
 *               - required: [message]
 *               - required: [status]
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "64a1b2c3d4e5f6789abcdef0"
 *                 segment_id:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     rules_json:
 *                       type: object
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *                   example: "Updated campaign message"
 *                 status:
 *                   type: string
 *                   enum: [DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED]
 *                   example: "ACTIVE"
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Campaign or segment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Campaign not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to update campaign"
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete a campaign and its associated communication logs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID to delete
 *     responses:
 *       200:
 *         description: Campaign deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Campaign deleted successfully"
 *       404:
 *         description: Campaign not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Campaign not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to delete campaign"
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { campaignCreateSchema, campaignUpdateSchema } from '../schemas/campaign';
import { 
    createCampaign, 
    createCampaignWithVendorAPI,
    listCampaigns, 
    getCampaign, 
    updateCampaign, 
    deleteCampaign, 
    checkGmailStatus
} from '../controllers/campaigns';
import { 
    getCampaignStats, 
    getCampaignsStatsSummary,
    getCampaignStatsWithSegmentBreakdown,
    getAllCampaignsWithSuccessRates
} from '../controllers/campaignStats';

export const campaignsRouter = Router();

campaignsRouter.post('/', requireAuth, validateBody(campaignCreateSchema), createCampaign);
campaignsRouter.post('/vendor-api', requireAuth, validateBody(campaignCreateSchema), createCampaignWithVendorAPI);
campaignsRouter.get('/', requireAuth, listCampaigns);
campaignsRouter.get('/gmail-status', requireAuth, checkGmailStatus);
/**
 * @openapi
 * /api/campaigns/success-rates:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get all campaigns with success rates and segment breakdown
 *     description: Returns all campaigns for the authenticated user with detailed success rate statistics organized by segments
 *     tags:
 *       - Campaigns
 *     responses:
 *       200:
 *         description: List of campaigns with success rates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "507f1f77bcf86cd799439014"
 *                       message:
 *                         type: string
 *                         example: "Special offer just for you!"
 *                       subject:
 *                         type: string
 *                         example: "Campaign Email"
 *                       status:
 *                         type: string
 *                         enum: [DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED]
 *                         example: "COMPLETED"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T11:00:00Z"
 *                       segment:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439013"
 *                           name:
 *                             type: string
 *                             example: "High Value Customers"
 *                           customerCount:
 *                             type: integer
 *                             example: 150
 *                       overallStats:
 *                         type: object
 *                         properties:
 *                           total:
 *                             type: integer
 *                             example: 150
 *                           sent:
 *                             type: integer
 *                             example: 145
 *                           failed:
 *                             type: integer
 *                             example: 3
 *                           pending:
 *                             type: integer
 *                             example: 2
 *                           queued:
 *                             type: integer
 *                             example: 0
 *                           successRate:
 *                             type: number
 *                             example: 96.67
 *                           failureRate:
 *                             type: number
 *                             example: 2.0
 *                       segmentStats:
 *                         type: object
 *                         properties:
 *                           segmentId:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439013"
 *                           segmentName:
 *                             type: string
 *                             example: "High Value Customers"
 *                           totalCustomers:
 *                             type: integer
 *                             example: 150
 *                           messagesSent:
 *                             type: integer
 *                             example: 145
 *                           messagesFailed:
 *                             type: integer
 *                             example: 3
 *                           successRate:
 *                             type: number
 *                             example: 96.67
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
campaignsRouter.get('/success-rates', requireAuth, getAllCampaignsWithSuccessRates);
campaignsRouter.get('/:id', requireAuth, getCampaign);

/**
 * @openapi
 * /api/campaigns/{id}/stats/segment-breakdown:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get detailed campaign statistics with segment breakdown
 *     description: Returns comprehensive campaign statistics including overall stats, segment-specific metrics, and recent activity
 *     tags:
 *       - Campaigns
 *     parameters:
 *       - $ref: '#/components/parameters/campaignId'
 *     responses:
 *       200:
 *         description: Detailed campaign statistics with segment breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 campaignId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439014"
 *                 campaign:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439014"
 *                     message:
 *                       type: string
 *                       example: "Special offer just for you!"
 *                     subject:
 *                       type: string
 *                       example: "Campaign Email"
 *                     status:
 *                       type: string
 *                       enum: [DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED]
 *                       example: "COMPLETED"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T11:00:00Z"
 *                     segment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439013"
 *                         name:
 *                           type: string
 *                           example: "High Value Customers"
 *                         customerCount:
 *                           type: integer
 *                           example: 150
 *                 overallStats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     sent:
 *                       type: integer
 *                       example: 145
 *                     failed:
 *                       type: integer
 *                       example: 3
 *                     pending:
 *                       type: integer
 *                       example: 2
 *                     queued:
 *                       type: integer
 *                       example: 0
 *                     successRate:
 *                       type: number
 *                       example: 96.67
 *                     failureRate:
 *                       type: number
 *                       example: 2.0
 *                 segmentStats:
 *                   type: object
 *                   properties:
 *                     segmentId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439013"
 *                     segmentName:
 *                       type: string
 *                       example: "High Value Customers"
 *                     totalCustomers:
 *                       type: integer
 *                       example: 150
 *                     messagesSent:
 *                       type: integer
 *                       example: 145
 *                     messagesFailed:
 *                       type: integer
 *                       example: 3
 *                     successRate:
 *                       type: number
 *                       example: 96.67
 *                 messageBreakdown:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     sent:
 *                       type: integer
 *                       example: 145
 *                     failed:
 *                       type: integer
 *                       example: 3
 *                     successRate:
 *                       type: number
 *                       example: 96.67
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       customerName:
 *                         type: string
 *                         example: "John Doe"
 *                       customerEmail:
 *                         type: string
 *                         example: "john@example.com"
 *                       status:
 *                         type: string
 *                         enum: [SENT, FAILED, PENDING, QUEUED]
 *                         example: "SENT"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T12:00:00Z"
 *                       errorMessage:
 *                         type: string
 *                         example: null
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Campaign not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
campaignsRouter.get('/:id/stats', requireAuth, getCampaignStats);
campaignsRouter.get('/:id/stats/segment-breakdown', requireAuth, getCampaignStatsWithSegmentBreakdown);
campaignsRouter.post('/stats/summary', requireAuth, getCampaignsStatsSummary);
campaignsRouter.put('/:id', requireAuth, validateBody(campaignUpdateSchema), updateCampaign);
campaignsRouter.delete('/:id', requireAuth, deleteCampaign);

