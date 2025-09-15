import { Request, Response } from 'express';
import { CampaignModel } from '../models/Campaign';
import { CommunicationLogModel } from '../models/CommunicationLog';
import { CustomerModel } from '../models/Customer';
import { SegmentModel } from '../models/Segment';
import { UserModel } from '../models/User';
import { SentMessageModel } from '../models/SentMessage';
import { evaluateRule, RuleGroup } from '../services/segmentRules';
import { MessagePersonalizationService } from '../services/messagePersonalization';
import { emailDeliveryService } from '../services/emailDeliveryService';
import { campaignDeliveryService } from '../services/campaignDeliveryService';
import { getDeliveryStats, getCampaignLogs, getSentMessages } from './deliveryReceipt';
import mongoose from 'mongoose';
import axios from 'axios';

export async function createCampaign(req: Request, res: Response) {
	const { segment_id, message, subject, customData, template_id, discount_percentage } = req.body;
	if (!segment_id || !message) {
		return res.status(400).json({ error: 'segment_id and message are required' });
	}

	// Validate message template
	const templateValidation = MessagePersonalizationService.validateTemplate(message);
	if (!templateValidation.isValid) {
		return res.status(400).json({ 
			error: 'Invalid message template', 
			invalidPlaceholders: templateValidation.invalidPlaceholders,
			availablePlaceholders: MessagePersonalizationService.getAvailablePlaceholders()
		});
	}

	const segment = await SegmentModel.findOne({ _id: segment_id, userId: req.userId });
	if (!segment) {
		return res.status(404).json({ error: 'Segment not found' });
	}

	// Handle both old and new format for custom data
	const finalCustomData = customData || {
		discount: discount_percentage?.toString() || '10',
		storeName: 'Your Store',
		couponCode: `WELCOME${discount_percentage || '10'}`
	};

	try {
		// Use the new campaign delivery service
		const result = await campaignDeliveryService.createAndDeliverCampaign(
			req.userId!,
			segment_id,
			message,
			subject || 'Campaign Message',
			finalCustomData
		);

		res.status(201).json({
			success: true,
			campaignId: result.campaignId,
			message: `Campaign created and delivery initiated`,
			deliveryStats: {
				totalCustomers: result.totalCustomers,
				messagesQueued: result.messagesQueued,
				messagesSent: result.messagesSent,
				messagesFailed: result.messagesFailed
			},
			deliveryLogs: result.deliveryLogs
		});

	} catch (error) {
		console.error('Error creating campaign:', error);
		res.status(500).json({
			error: 'Failed to create and deliver campaign',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}

/**
 * New campaign creation function that follows the vendor API flow
 * Creates PENDING logs and calls vendor API for each customer
 */
export async function createCampaignWithVendorAPI(req: Request, res: Response) {
	const { segment_id, message, subject, customData, template_id, discount_percentage } = req.body;
	if (!segment_id || !message) {
		return res.status(400).json({ error: 'segment_id and message are required' });
	}

	// Validate message template
	const templateValidation = MessagePersonalizationService.validateTemplate(message);
	if (!templateValidation.isValid) {
		return res.status(400).json({ 
			error: 'Invalid message template', 
			invalidPlaceholders: templateValidation.invalidPlaceholders,
			availablePlaceholders: MessagePersonalizationService.getAvailablePlaceholders()
		});
	}

	const segment = await SegmentModel.findOne({ _id: segment_id, userId: req.userId });
	if (!segment) {
		return res.status(404).json({ error: 'Segment not found' });
	}

	// Handle both old and new format for custom data
	const finalCustomData = customData || {
		discount: discount_percentage?.toString() || '10',
		storeName: 'Your Store',
		couponCode: `WELCOME${discount_percentage || '10'}`
	};

	try {
		// Get customers using segment rules evaluation
		const allCustomers = await CustomerModel.find({ userId: req.userId });
		const matchingCustomers = allCustomers.filter(customer => 
			evaluateRule(customer, segment.rules_json as RuleGroup)
		);

		if (matchingCustomers.length === 0) {
			return res.status(400).json({ 
				error: 'No customers found matching segment rules',
				message: 'Please check your segment rules or add customers to the segment'
			});
		}

		// Create campaign record
		const campaign = await CampaignModel.create({
			userId: new mongoose.Types.ObjectId(req.userId),
			segment_id: new mongoose.Types.ObjectId(segment_id),
			message: message,
			subject: subject || 'Campaign Email',
			status: 'ACTIVE'
		});

		console.log(`📝 Campaign created with ID: ${campaign._id}`);

		// Personalize messages for each customer
		const personalizedMessages = MessagePersonalizationService.personalizeMessages(
			message, 
			matchingCustomers,
			'Valued Customer',
			finalCustomData
		);

		const communicationLogs = [];
		const vendorApiUrl = process.env.VENDOR_API_URL || 'http://localhost:4000/api/vendor/send';

		// Create PENDING logs and call vendor API for each customer
		for (let i = 0; i < matchingCustomers.length; i++) {
			const customer = matchingCustomers[i];
			const personalizedMessage = personalizedMessages[i];
			const messageId = `campaign_${campaign._id}_${customer._id}_${Date.now()}`;

			// Create HTML version of the message
			const htmlMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #333;">${subject || 'Campaign Email'}</h2>
				<div style="line-height: 1.6; color: #555;">
					${personalizedMessage.personalizedMessage.replace(/\n/g, '<br>')}
				</div>
				<div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
					<p style="margin: 0; font-size: 14px; color: #666;">
						Best regards,<br>
						${finalCustomData.storeName || 'Your Store'}
					</p>
				</div>
			</div>`;

			// 1. Create PENDING communication log
			const communicationLog = await CommunicationLogModel.create({
				userId: new mongoose.Types.ObjectId(req.userId),
				campaign_id: campaign._id,
				customer_id: customer._id,
				message: personalizedMessage.personalizedMessage,
				status: 'PENDING',
				vendor_message_id: messageId,
				created_at: new Date(),
				updated_at: new Date()
			});

			// 2. Create PENDING sent message entry
			const sentMessage = await SentMessageModel.create({
				userId: new mongoose.Types.ObjectId(req.userId),
				recipientEmail: customer.email,
				recipientName: customer.name,
				subject: subject || 'Campaign Email',
				textContent: personalizedMessage.personalizedMessage,
				htmlContent: htmlMessage,
				status: 'PENDING',
				messageId: messageId,
				campaignId: campaign._id,
				discountInfo: {
					discount: finalCustomData.discount,
					storeName: finalCustomData.storeName,
					couponCode: finalCustomData.couponCode
				},
				personalizationData: {
					customerName: true,
					customerEmail: true,
					customFields: ['phone', 'spend', 'visits']
				},
				sentAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date()
			});

			communicationLogs.push(communicationLog);

			// 3. Call Vendor API asynchronously
			axios.post(vendorApiUrl, {
				customerId: customer._id,
				campaignId: campaign._id,
				message: personalizedMessage.personalizedMessage,
				messageId: messageId
			}).catch(error => {
				console.error(`❌ Failed to call vendor API for customer ${customer.email}:`, error);
			});

			console.log(`📤 Message queued for ${customer.email} (${messageId})`);
		}

		res.json({
			success: true,
			message: 'Campaign created and vendor API called for all customers',
			campaignId: campaign._id,
			totalCustomers: matchingCustomers.length,
			messagesQueued: communicationLogs.length,
			status: 'PENDING - Vendor API processing messages'
		});

	} catch (error) {
		console.error('Campaign creation error:', error);
		res.status(500).json({ 
			error: 'Failed to create campaign', 
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}

export async function listCampaigns(req: Request, res: Response) {
	const items = await CampaignModel.find({ userId: req.userId })
		.populate('segment_id', 'name rules_json created_at')
		.sort({ created_at: -1 })
		.limit(100);
	
	// Get delivery stats for each campaign
	const campaignsWithStats = await Promise.all(
		items.map(async (campaign) => {
			const stats = await CommunicationLogModel.aggregate([
				{ $match: { campaign_id: campaign._id } },
				{ $group: { _id: '$status', count: { $sum: 1 } } }
			]);
			
			const deliveryStats = {
				sent: 0,
				failed: 0,
				queued: 0
			};
			
			stats.forEach(stat => {
				deliveryStats[stat._id.toLowerCase() as keyof typeof deliveryStats] = stat.count;
			});

			const campaignObj = campaign.toObject();
			return {
				...campaignObj,
				segment_name: (campaignObj.segment_id as any)?.name || 'Unknown Segment',
				delivery_stats: deliveryStats
			};
		})
	);

	// Prevent caching to ensure fresh data
	res.set({
		'Cache-Control': 'no-cache, no-store, must-revalidate',
		'Pragma': 'no-cache',
		'Expires': '0'
	});

	res.json({ items: campaignsWithStats });
}

export async function getCampaign(req: Request, res: Response) {
	const campaign = await CampaignModel.findOne({ _id: req.params.id, userId: req.userId })
		.populate('segment_id', 'name rules_json created_at');
	
	if (!campaign) {
		return res.status(404).json({ error: 'Campaign not found' });
	}

	// Get detailed delivery statistics
	const deliveryStats = await CommunicationLogModel.aggregate([
		{ $match: { campaign_id: campaign._id } },
		{ $group: { _id: '$status', count: { $sum: 1 } } }
	]);

	const stats = {
		sent: 0,
		failed: 0,
		queued: 0
	};
	
	deliveryStats.forEach(stat => {
		stats[stat._id.toLowerCase() as keyof typeof stats] = stat.count;
	});

	// Get recent delivery logs
	const recentLogs = await CommunicationLogModel.find({ campaign_id: campaign._id })
		.populate('customer_id', 'name email')
		.sort({ updated_at: -1 })
		.limit(10);

	const campaignObj = campaign.toObject();
	res.json({
		...campaignObj,
		segment_name: (campaignObj.segment_id as any)?.name || 'Unknown Segment',
		delivery_stats: stats,
		recent_deliveries: recentLogs
	});
}

export async function updateCampaign(req: Request, res: Response) {
	try {
		const campaignId = req.params.id;
		const { segment_id, message, status } = req.body;

		// Check if campaign exists
		const existingCampaign = await CampaignModel.findById(campaignId);
		if (!existingCampaign) {
			return res.status(404).json({ error: 'Campaign not found' });
		}

		// If segment_id is provided, validate it exists
		if (segment_id) {
			const segment = await SegmentModel.findById(segment_id);
			if (!segment) {
				return res.status(404).json({ error: 'Segment not found' });
			}
		}

		// Prepare update data
		const updateData: any = {};
		if (segment_id) updateData.segment_id = new mongoose.Types.ObjectId(segment_id);
		if (message) updateData.message = message;
		if (status) updateData.status = status;

		// Update the campaign - don't run validators for partial updates
		const updatedCampaign = await CampaignModel.findOneAndUpdate(
			{ _id: campaignId, userId: req.userId },
			updateData,
			{ new: true, runValidators: false }
		).populate('segment_id', 'name rules_json created_at');

		const campaignObj = updatedCampaign?.toObject();
		res.json({
			...campaignObj,
			segment_name: (campaignObj?.segment_id as any)?.name || 'Unknown Segment',
			message: 'Campaign updated successfully'
		});
	} catch (error) {
		console.error('Error updating campaign:', error);
		res.status(500).json({ error: 'Failed to update campaign' });
	}
}

export async function deleteCampaign(req: Request, res: Response) {
	try {
		const campaignId = req.params.id;
		
		// Check if campaign exists
		const campaign = await CampaignModel.findOne({ _id: campaignId, userId: req.userId });
		if (!campaign) {
			return res.status(404).json({ error: 'Campaign not found' });
		}

		// Delete associated communication logs first
		await CommunicationLogModel.deleteMany({ campaign_id: campaignId, userId: req.userId });

		// Delete the campaign
		await CampaignModel.findOneAndDelete({ _id: campaignId, userId: req.userId });

		res.json({ message: 'Campaign deleted successfully' });
	} catch (error) {
		console.error('Error deleting campaign:', error);
		res.status(500).json({ error: 'Failed to delete campaign' });
	}
}

export async function checkGmailStatus(req: Request, res: Response) {
	try {
		if (!req.userEmail) {
			return res.status(401).json({ error: 'User email not found in token' });
		}

		const user = await UserModel.findOne({ email: req.userEmail }).select('+gmailVerified');
		
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		const isVerified = user.gmailVerified || false;
		const needsAuth = !isVerified;

		res.json({
			gmailVerified: isVerified,
			needsAuth,
			message: isVerified 
				? 'Gmail is verified and ready for sending campaigns' 
				: 'Gmail authentication required. Please authenticate with Google.',
			authUrl: needsAuth ? '/api/auth/google' : null
		});
	} catch (error) {
		console.error('Error checking Gmail status:', error);
		res.status(500).json({ error: 'Failed to check Gmail status' });
	}
}

export async function deliverCampaign(campaignId: string, segmentId: string, message: string, subject: string, customData?: any) {
	try {
		// Get segment rules
		const segment = await SegmentModel.findById(segmentId);
		if (!segment) {
			console.log('Segment not found for campaign delivery');
			return;
		}

		// Get user email for email delivery
		const user = await UserModel.findById(segment.userId);
		if (!user || !user.email) {
			console.log('User not found or no email for campaign delivery');
			return;
		}

		// Get all customers and filter by segment rules
		const allCustomers = await CustomerModel.find({ userId: segment.userId });
		console.log(`📊 Total customers in database for user: ${allCustomers.length}`);
		
		const matchingCustomers = allCustomers.filter(customer => 
			evaluateRule(customer, segment.rules_json as RuleGroup)
		);

		console.log(`🎯 Customers matching segment rules: ${matchingCustomers.length} out of ${allCustomers.length}`);
		
		if (matchingCustomers.length === 0) {
			console.log('❌ No customers found matching segment rules');
			// Update campaign status to completed even if no customers
			await CampaignModel.findByIdAndUpdate(campaignId, { 
				status: 'COMPLETED',
				updated_at: new Date()
			});
			return;
		}

		console.log(`✅ Found ${matchingCustomers.length} customers for campaign ${campaignId}`);
		console.log(`📧 Customer emails: ${matchingCustomers.map(c => c.email).join(', ')}`);
		
		// Log segment rules for debugging
		console.log(`📋 Segment rules applied:`, JSON.stringify(segment.rules_json, null, 2));

		// Personalize messages for each customer with custom data
		const personalizationData = {
			discount: customData?.discount || '10',
			storeName: customData?.storeName || 'Your Store',
			couponCode: customData?.couponCode || 'WELCOME10'
		};

		const personalizedMessages = MessagePersonalizationService.personalizeMessages(
			message, 
			matchingCustomers,
			'Valued Customer',
			personalizationData
		);

		// Store campaign messages in sent_messages collection (same as individual emails)
		console.log(`Storing ${matchingCustomers.length} campaign messages in sent_messages collection...`);
		
		let successfulMessages = 0;
		let failedMessages = 0;

		// Store messages one by one in the sent_messages collection
		console.log(`🚀 Starting to process ${matchingCustomers.length} customers...`);
		
		for (let i = 0; i < matchingCustomers.length; i++) {
			const customer = matchingCustomers[i];
			const personalizedMessage = personalizedMessages[i];
			
			console.log(`📤 Processing customer ${i + 1}/${matchingCustomers.length}: ${customer.email}`);

			// Note: Simulated failures removed - use vendor API for realistic delivery simulation

			try {
				// Create HTML version of the message
				const htmlMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #333;">${subject}</h2>
					<div style="line-height: 1.6; color: #555;">
						${personalizedMessage.personalizedMessage.replace(/\n/g, '<br>')}
					</div>
					<div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
						<p style="margin: 0; font-size: 14px; color: #666;">
							Best regards,<br>
							${personalizationData.storeName}
						</p>
					</div>
				</div>`;

				// Store message in sent_messages collection (same as individual emails)
				const sentMessage = await SentMessageModel.create({
					userId: segment.userId,
					recipientEmail: customer.email,
					recipientName: customer.name,
					subject: subject,
					textContent: personalizedMessage.personalizedMessage,
					htmlContent: htmlMessage,
					status: 'SENT', // Campaign messages are considered sent
					messageId: `campaign_${campaignId}_${customer._id}_${Date.now()}`,
					sentAt: new Date(),
					campaignId: new mongoose.Types.ObjectId(campaignId),
					discountInfo: {
						discount: personalizationData.discount,
						storeName: personalizationData.storeName,
						couponCode: personalizationData.couponCode
					},
					personalizationData: {
						customerName: true,
						customerEmail: true,
						customFields: ['phone', 'spend', 'visits']
					}
				});

				successfulMessages++;
				console.log(`✅ Campaign message stored for ${customer.email} with ID: ${sentMessage._id}`);

				// Also create communication log for campaign tracking
				await CommunicationLogModel.create({
					userId: segment.userId,
					campaign_id: new mongoose.Types.ObjectId(campaignId),
					customer_id: customer._id,
					message: personalizedMessage.personalizedMessage,
					status: 'SENT',
					vendor_message_id: sentMessage.messageId,
					sent_at: new Date(),
					updated_at: new Date()
				});

			} catch (messageError) {
				failedMessages++;
				console.error(`❌ Error storing message for ${customer.email}:`, messageError);
				
				// Create failed message in sent_messages collection so it appears in the message page
				try {
					await SentMessageModel.create({
						userId: segment.userId,
						recipientEmail: customer.email,
						recipientName: customer.name,
						subject: subject,
						textContent: personalizedMessage.personalizedMessage,
						htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
							<h2 style="color: #333;">${subject}</h2>
							<div style="line-height: 1.6; color: #555;">
								${personalizedMessage.personalizedMessage.replace(/\n/g, '<br>')}
							</div>
							<div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
								<p style="margin: 0; font-size: 14px; color: #666;">
									Best regards,<br>
									${personalizationData.storeName}
								</p>
							</div>
						</div>`,
						status: 'FAILED', // Mark as failed
						messageId: `campaign_${campaignId}_${customer._id}_${Date.now()}_failed`,
						sentAt: new Date(),
						errorMessage: messageError instanceof Error ? messageError.message : 'Unknown error',
						personalizationData: {
							customerName: true,
							customerEmail: true,
							customFields: ['phone', 'spend', 'visits']
						}
					});
					console.log(`❌ Failed message stored for ${customer.email}`);
				} catch (failedMessageError) {
					console.error(`❌ Error storing failed message for ${customer.email}:`, failedMessageError);
				}
				
				// Also create communication log for campaign tracking
				await CommunicationLogModel.create({
					userId: segment.userId,
					campaign_id: new mongoose.Types.ObjectId(campaignId),
					customer_id: customer._id,
					message: personalizedMessage.personalizedMessage,
					status: 'FAILED',
					error_message: messageError instanceof Error ? messageError.message : 'Unknown error',
					updated_at: new Date()
				});
			}

			// Add small delay between processing to avoid overwhelming the database
			if (i < matchingCustomers.length - 1) {
				await new Promise(resolve => setTimeout(resolve, 50));
			}
		}

		console.log(`\n📊 Campaign ${campaignId} delivery summary:`);
		console.log(`   📧 Total customers in segment: ${matchingCustomers.length}`);
		console.log(`   ✅ Successfully processed: ${successfulMessages}`);
		console.log(`   ❌ Failed to process: ${failedMessages}`);
		console.log(`   📈 Success rate: ${((successfulMessages / matchingCustomers.length) * 100).toFixed(1)}%`);

		// Update campaign status to completed after processing
		await CampaignModel.findByIdAndUpdate(campaignId, { 
			status: 'COMPLETED',
			updated_at: new Date()
		});

		console.log(`\n🎉 Campaign ${campaignId} delivery process completed - ALL customers processed!`);

	} catch (error) {
		console.error('Campaign delivery failed:', error);
		
		// Update campaign status to failed
		try {
			await CampaignModel.findByIdAndUpdate(campaignId, { 
				status: 'CANCELLED',
				updated_at: new Date()
			});
		} catch (updateError) {
			console.error('Failed to update campaign status:', updateError);
		}
	}
}

