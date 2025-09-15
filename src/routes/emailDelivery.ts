/**
 * @openapi
 * /api/email/send-single:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Send a single email to an individual customer
 *     description: Sends a personalized email to a single recipient
 *     tags: [Email Delivery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address
 *                 example: "customer@example.com"
 *               template:
 *                 type: object
 *                 properties:
 *                   subject:
 *                     type: string
 *                     description: Email subject line
 *                     example: "Special Offer for {customerName}!"
 *                   text:
 *                     type: string
 *                     description: Plain text email content
 *                     example: "Hello {customerName}, we have a special offer just for you!"
 *                   html:
 *                     type: string
 *                     description: HTML email content (optional)
 *                     example: "<h1>Hello {customerName}!</h1><p>We have a special offer just for you!</p>"
 *                   personalization:
 *                     type: object
 *                     properties:
 *                       customerName:
 *                         type: boolean
 *                         description: Replace {customerName} with actual customer name
 *                       customerEmail:
 *                         type: boolean
 *                         description: Replace {customerEmail} with actual customer email
 *                       customFields:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Additional fields to personalize
 *                         example: ["phone", "spend"]
 *             required:
 *               - to
 *               - template
 *     responses:
 *       200:
 *         description: Email sent successfully
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
 *                   example: "Email sent successfully to customer@example.com"
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalEmails:
 *                       type: number
 *                       example: 1
 *                     successful:
 *                       type: number
 *                       example: 1
 *                     failed:
 *                       type: number
 *                       example: 0
 *                     needsReauth:
 *                       type: boolean
 *                       example: false
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: string
 *                         example: "customer@example.com"
 *                       success:
 *                         type: boolean
 *                         example: true
 *                       error:
 *                         type: string
 *                         example: null
 *                       messageId:
 *                         type: string
 *                         example: "gmail_message_id_123"
 *       400:
 *         description: Bad request or email delivery failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendSingleEmail, getSentMessages, getSentMessageById, getSentMessageStats } from '../controllers/emailDelivery';
import { sendSingleEmailSchema } from '../schemas/emailDelivery';

export const emailDeliveryRouter = Router();

// Email delivery endpoints - only individual customer messaging
emailDeliveryRouter.post('/send-single', requireAuth, validateBody(sendSingleEmailSchema), sendSingleEmail);

// Sent messages retrieval endpoints
emailDeliveryRouter.get('/sent-messages', requireAuth, getSentMessages);
emailDeliveryRouter.get('/sent-messages/stats', requireAuth, getSentMessageStats);
emailDeliveryRouter.get('/sent-messages/:messageId', requireAuth, getSentMessageById);

