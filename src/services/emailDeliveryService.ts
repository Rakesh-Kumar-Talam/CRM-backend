import { gmailService } from './gmailService';
import { CustomerModel } from '../models/Customer';
import { UserModel } from '../models/User';
import { SentMessageModel, SentMessageStatus } from '../models/SentMessage';
import { CommunicationLogModel } from '../models/CommunicationLog';
import { VendorApiService, VendorMessage } from './vendorApiService';
import { MessageQueueService } from './messageQueueService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface EmailTemplate {
	subject: string;
	text: string;
	html?: string;
	personalization?: {
		customerName?: boolean;
		customerEmail?: boolean;
		customFields?: string[];
	};
}

export interface EmailDeliveryResult {
	success: boolean;
	totalEmails: number;
	successful: number;
	failed: number;
	needsReauth: boolean;
	results: Array<{
		email: string;
		success: boolean;
		error?: string;
		messageId?: string;
		retries?: number;
	}>;
}

export class EmailDeliveryService {
	private vendorApi: VendorApiService;
	private messageQueue: MessageQueueService;

	constructor() {
		this.vendorApi = VendorApiService.getInstance();
		this.messageQueue = MessageQueueService.getInstance();
	}

	/**
	 * Send a single email to an individual customer
	 */
	async sendSingleEmail(
		userEmail: string,
		to: string,
		template: EmailTemplate
	): Promise<EmailDeliveryResult> {
		try {
			console.log('🔍 EmailDeliveryService: Starting sendSingleEmail for:', userEmail, 'to:', to);
			
			// Find or create user
			let user = await UserModel.findOne({ email: userEmail }).select('+gmailVerified');
			if (!user) {
				console.log('👤 Creating new user for:', userEmail);
				user = await UserModel.create({
					email: userEmail,
					name: userEmail.split('@')[0],
					gmailVerified: userEmail.includes('@gmail.com')
				});
			}
			console.log('👤 User found/created:', user._id, 'Gmail verified:', user.gmailVerified);
			
			// For development, allow storing messages even without Gmail verification
			// In production, you might want to enforce Gmail verification
			if (!user.gmailVerified && process.env.NODE_ENV === 'production') {
				throw new Error('Gmail not verified. Please authenticate with Google first.');
			}

			// Get customer for personalization (only for the user)
			const customer = await CustomerModel.findOne({ email: to, userId: user._id });
			const personalizedTemplate = customer ? 
				this.personalizeTemplate(template, customer) : 
				template;
			
			console.log('Customer found for email', to, ':', customer ? customer.name : 'No customer found');

			// Generate unique message ID
			const messageId = `individual_${user._id}_${Date.now()}`;

			// Add message to queue for processing
			console.log('📤 Adding message to queue:', messageId);
			await this.messageQueue.addToQueue({
				messageId: messageId,
				recipientEmail: to,
				recipientName: customer?.name || to.split('@')[0],
				subject: personalizedTemplate.subject,
				textContent: personalizedTemplate.text,
				htmlContent: personalizedTemplate.html,
				userId: String(user._id),
				personalizationData: template.personalization
			});

			// For backward compatibility, also send via Gmail if verified (but don't update status)
			if (user.gmailVerified) {
				try {
					await gmailService.sendEmail(userEmail, {
						to,
						subject: personalizedTemplate.subject,
						text: personalizedTemplate.text,
						html: personalizedTemplate.html
					});
					console.log('Gmail email sent successfully');
				} catch (gmailError) {
					console.log('Gmail send failed (queue will handle delivery):', gmailError);
				}
			}

			// Return success immediately as message is queued
			return {
				success: true,
				totalEmails: 1,
				successful: 1,
				failed: 0,
				needsReauth: false,
				results: [{
					email: to,
					success: true,
					messageId: messageId
				}]
			};
		} catch (error) {
			console.error('❌ Single email delivery failed:', error);
			logger.error('Single email delivery failed:', error);
			
			// If we have a user, try to update the sent message record
			try {
				const user = await UserModel.findOne({ email: userEmail });
				if (user) {
					await SentMessageModel.findOneAndUpdate(
						{ userId: user._id, recipientEmail: to, status: 'PENDING' },
						{
							status: 'FAILED',
							errorMessage: error instanceof Error ? error.message : 'Unknown error',
							sentAt: new Date()
						},
						{ sort: { createdAt: -1 } }
					);
				}
			} catch (dbError) {
				console.error('❌ Failed to update sent message record:', dbError);
				logger.error('Failed to update sent message record:', dbError);
			}

			return {
				success: false,
				totalEmails: 1,
				successful: 0,
				failed: 1,
				needsReauth: false,
				results: [{
					email: to,
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				}]
			};
		}
	}

	/**
	 * Send emails to multiple customers
	 */
	async sendBulkEmails(
		userEmail: string,
		customers: any[],
		template: EmailTemplate
	): Promise<EmailDeliveryResult> {
		try {
			// Find or create user
			let user = await UserModel.findOne({ email: userEmail }).select('+gmailVerified');
			if (!user) {
				user = await UserModel.create({
					email: userEmail,
					name: userEmail.split('@')[0],
					gmailVerified: userEmail.includes('@gmail.com')
				});
			}

			// For development, allow storing messages even without Gmail verification
			if (!user.gmailVerified && process.env.NODE_ENV === 'production') {
				throw new Error('Gmail not verified. Please authenticate with Google first.');
			}

			const results: any[] = [];
			let successful = 0;
			let failed = 0;

			// Process each customer
			for (const customer of customers) {
				try {
					const personalizedTemplate = this.personalizeTemplate(template, customer);
					const messageId = `bulk_${user._id}_${customer._id}_${Date.now()}`;

					// Add to queue
					await this.messageQueue.addToQueue({
						messageId: messageId,
						recipientEmail: customer.email,
						recipientName: customer.name,
						subject: personalizedTemplate.subject,
						textContent: personalizedTemplate.text,
						htmlContent: personalizedTemplate.html,
						userId: String(user._id),
						personalizationData: template.personalization
					});

					results.push({
						email: customer.email,
						success: true,
						messageId: messageId
					});
					successful++;

				} catch (error) {
					results.push({
						email: customer.email,
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
					failed++;
				}
			}

			return {
				success: true,
				totalEmails: customers.length,
				successful,
				failed,
				needsReauth: false,
				results
			};

		} catch (error) {
			logger.error('Bulk email delivery failed:', error);
			return {
				success: false,
				totalEmails: customers.length,
				successful: 0,
				failed: customers.length,
				needsReauth: false,
				results: customers.map(customer => ({
					email: customer.email,
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				}))
			};
		}
	}

	/**
	 * Get delivery statistics
	 */
	async getDeliveryStats(userId: string, campaignId?: string) {
		return await this.vendorApi.getDeliveryStats(userId, campaignId);
	}

	/**
	 * Get sent messages
	 */
	async getSentMessages(userId: string, limit: number = 50, page: number = 1) {
		try {
			const skip = (page - 1) * limit;
			const messages = await SentMessageModel.find({ userId })
				.populate('campaignId', 'message subject status created_at')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit);

			const total = await SentMessageModel.countDocuments({ userId });

			return {
				messages,
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit)
			};
		} catch (error) {
			logger.error('Error getting sent messages:', error);
			throw error;
		}
	}

	/**
	 * Personalize email template with customer data
	 */
	private personalizeTemplate(template: EmailTemplate, customer: any): EmailTemplate {
		let personalizedSubject = template.subject;
		let personalizedText = template.text;
		let personalizedHtml = template.html;

		if (template.personalization?.customerName) {
			personalizedSubject = personalizedSubject.replace(/{customerName}/g, customer.name || 'Customer');
			personalizedText = personalizedText.replace(/{customerName}/g, customer.name || 'Customer');
			personalizedHtml = personalizedHtml?.replace(/{customerName}/g, customer.name || 'Customer');
		}

		if (template.personalization?.customerEmail) {
			personalizedSubject = personalizedSubject.replace(/{customerEmail}/g, customer.email || '');
			personalizedText = personalizedText.replace(/{customerEmail}/g, customer.email || '');
			personalizedHtml = personalizedHtml?.replace(/{customerEmail}/g, customer.email || '');
		}

		// Handle custom fields
		if (template.personalization?.customFields && customer) {
			template.personalization.customFields.forEach((field: string) => {
				const value = customer[field] || '';
				personalizedSubject = personalizedSubject.replace(new RegExp(`{${field}}`, 'g'), value);
				personalizedText = personalizedText.replace(new RegExp(`{${field}}`, 'g'), value);
				personalizedHtml = personalizedHtml?.replace(new RegExp(`{${field}}`, 'g'), value);
			});
		}

		return {
			subject: personalizedSubject,
			text: personalizedText,
			html: personalizedHtml,
			personalization: template.personalization
		};
	}
}

// Export singleton instance
export const emailDeliveryService = new EmailDeliveryService();