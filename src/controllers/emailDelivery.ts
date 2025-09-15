import { Request, Response } from 'express';
import { emailDeliveryService, EmailTemplate } from '../services/emailDeliveryService';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

// Validation schemas
const emailTemplateSchema = z.object({
	subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
	text: z.string().min(1, 'Text content is required').max(10000, 'Text content too long'),
	html: z.string().optional(),
	personalization: z.object({
		customerName: z.boolean().optional(),
		customerEmail: z.boolean().optional(),
		customFields: z.array(z.string()).optional()
	}).optional()
});

const sendSingleEmailSchema = z.object({
	to: z.string().email('Invalid email address'),
	template: emailTemplateSchema
});


/**
 * Send a single email to an individual customer
 */
export async function sendSingleEmail(req: Request, res: Response) {
	try {
		console.log('🔍 EmailDelivery Controller: Starting sendSingleEmail');
		console.log('🔍 User email from token:', req.userEmail);
		console.log('🔍 User ID from token:', req.userId);
		
		if (!req.userEmail) {
			console.log('❌ No user email found in token');
			return res.status(401).json({ error: 'User email not found in token' });
		}

		// Debug logging
		console.log('Received request body:', JSON.stringify(req.body, null, 2));
		
		const { to, template } = req.body;

		const result = await emailDeliveryService.sendSingleEmail(
			req.userEmail,
			to,
			template as EmailTemplate
		);

		if (!result.success) {
			return res.status(400).json({
				error: 'Email delivery failed',
				details: result.results[0]?.error || 'Unknown error',
				stats: {
					totalEmails: result.totalEmails,
					successful: result.successful,
					failed: result.failed
				}
			});
		}

		res.json({
			success: true,
			message: `Email sent successfully to ${to}`,
			stats: {
				totalEmails: result.totalEmails,
				successful: result.successful,
				failed: result.failed,
				needsReauth: result.needsReauth
			},
			results: result.results
		});

	} catch (error) {
		console.error('Send single email error:', error);
		res.status(500).json({ 
			error: 'Internal server error',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}

/**
 * Get sent messages for the authenticated user
 */
export async function getSentMessages(req: Request, res: Response) {
	try {
		if (!req.userEmail) {
			return res.status(401).json({ error: 'User email not found in token' });
		}

		const {
			page = '1',
			limit = '20',
			status,
			recipientEmail,
			startDate,
			endDate
		} = req.query;

		const options = {
			page: parseInt(page as string, 10),
			limit: parseInt(limit as string, 10),
			status: status as any,
			recipientEmail: recipientEmail as string,
			startDate: startDate ? new Date(startDate as string) : undefined,
			endDate: endDate ? new Date(endDate as string) : undefined
		};

		// Get user ID first
		const { UserModel } = await import('../models/User');
		const user = await UserModel.findOne({ email: req.userEmail });
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		const result = await emailDeliveryService.getSentMessages(String(user._id), options.limit, options.page);

		res.json({
			success: true,
			messages: result.messages,
			pagination: {
				page: result.page,
				limit: result.limit,
				total: result.total,
				pages: result.totalPages
			}
		});

	} catch (error) {
		console.error('Get sent messages error:', error);
		res.status(500).json({ 
			error: 'Internal server error',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}

/**
 * Get a specific sent message by ID
 */
export async function getSentMessageById(req: Request, res: Response) {
	try {
		if (!req.userEmail) {
			return res.status(401).json({ error: 'User email not found in token' });
		}

		const { messageId } = req.params;

		if (!messageId) {
			return res.status(400).json({ error: 'Message ID is required' });
		}

		// Get user ID first
		const { UserModel } = await import('../models/User');
		const user = await UserModel.findOne({ email: req.userEmail });
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Get message by ID
		const { SentMessageModel } = await import('../models/SentMessage');
		const message = await SentMessageModel.findOne({
			_id: messageId,
			userId: user._id
		}).populate('campaignId', 'message subject status created_at');

		if (!message) {
			return res.status(404).json({ error: 'Message not found' });
		}

		res.json({
			success: true,
			message: message
		});

	} catch (error) {
		console.error('Get sent message by ID error:', error);
		res.status(500).json({ 
			error: 'Internal server error',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}

/**
 * Get sent message statistics for the authenticated user
 */
export async function getSentMessageStats(req: Request, res: Response) {
	try {
		if (!req.userEmail) {
			return res.status(401).json({ error: 'User email not found in token' });
		}

		const { startDate, endDate } = req.query;

		// Get user ID first
		const { UserModel } = await import('../models/User');
		const user = await UserModel.findOne({ email: req.userEmail });
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		const result = await emailDeliveryService.getDeliveryStats(String(user._id));

		res.json({
			success: true,
			stats: result
		});

	} catch (error) {
		console.error('Get sent message stats error:', error);
		res.status(500).json({ 
			error: 'Internal server error',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}


