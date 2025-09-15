import { CampaignModel } from '../models/Campaign';
import { SegmentModel } from '../models/Segment';
import { CustomerModel } from '../models/Customer';
import { CommunicationLogModel, DeliveryStatus } from '../models/CommunicationLog';
import { SentMessageModel } from '../models/SentMessage';
import { VendorApiService, VendorMessage } from './vendorApiService';
import { MessageQueueService } from './messageQueueService';
import { evaluateRule, RuleGroup } from './segmentRules';
import { MessagePersonalizationService } from './messagePersonalization';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

export interface CampaignDeliveryResult {
    campaignId: string;
    totalCustomers: number;
    messagesQueued: number;
    messagesSent: number;
    messagesFailed: number;
    deliveryLogs: Array<{
        customerId: string;
        customerEmail: string;
        status: DeliveryStatus;
        messageId: string;
        error?: string;
    }>;
}

export class CampaignDeliveryService {
    private vendorApi: VendorApiService;
    private messageQueue: MessageQueueService;

    constructor() {
        this.vendorApi = VendorApiService.getInstance();
        this.messageQueue = MessageQueueService.getInstance();
    }

    /**
     * Create and deliver a campaign to a segment
     */
    async createAndDeliverCampaign(
        userId: string,
        segmentId: string,
        message: string,
        subject?: string,
        personalizationData?: any
    ): Promise<CampaignDeliveryResult> {
        try {
            logger.info(`🚀 Starting campaign delivery for segment ${segmentId}`);

            // Get segment and customers
            const segment = await SegmentModel.findById(segmentId);
            if (!segment || segment.userId.toString() !== userId) {
                throw new Error('Segment not found or access denied');
            }

            // Get customers using segment rules evaluation
            const customers = await this.getCustomersForSegment(segment);
            logger.info(`🎯 Customers matching segment rules: ${customers.length} out of ${customers.length}`);

            if (customers.length === 0) {
                logger.warn('No customers found for segment');
                return {
                    campaignId: '',
                    totalCustomers: 0,
                    messagesQueued: 0,
                    messagesSent: 0,
                    messagesFailed: 0,
                    deliveryLogs: []
                };
            }

            // Create campaign record
            const campaign = await CampaignModel.create({
                userId: new mongoose.Types.ObjectId(userId),
                segment_id: new mongoose.Types.ObjectId(segmentId),
                message: message,
                subject: subject || 'Campaign Email',
                status: 'ACTIVE'
            });

            logger.info(`📝 Campaign created with ID: ${campaign._id}`);

            // Process each customer
            const deliveryLogs: Array<{
                customerId: string;
                customerEmail: string;
                status: DeliveryStatus;
                messageId: string;
                error?: string;
            }> = [];

            let messagesQueued = 0;
            let messagesSent = 0;
            let messagesFailed = 0;

            for (const customer of customers) {
                try {
                    // Personalize message using the MessagePersonalizationService
                    const personalizedMessages = MessagePersonalizationService.personalizeMessages(
                        message, 
                        [customer],
                        'Valued Customer',
                        personalizationData
                    );
                    const personalizedMessage = personalizedMessages[0];
                    const personalizedSubject = subject ? this.personalizeMessage(subject, customer, personalizationData) : 'Campaign Email';

                    // Generate unique message ID
                    const messageId = `campaign_${campaign._id}_${customer._id}_${Date.now()}`;

                    // Create HTML version of the message
                    const htmlMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">${personalizedSubject}</h2>
                        <div style="line-height: 1.6; color: #555;">
                            ${personalizedMessage.personalizedMessage.replace(/\n/g, '<br>')}
                        </div>
                        <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                            <p style="margin: 0; font-size: 14px; color: #666;">
                                Best regards,<br>
                                ${personalizationData?.storeName || 'Your Store'}
                            </p>
                        </div>
                    </div>`;

                    // Add message to queue for processing
                    await this.messageQueue.addToQueue({
                        messageId: messageId,
                        recipientEmail: customer.email,
                        recipientName: customer.name,
                        subject: personalizedSubject,
                        textContent: personalizedMessage.personalizedMessage,
                        htmlContent: htmlMessage,
                        userId: userId,
                        personalizationData: {
                            customerName: true,
                            customerEmail: true,
                            customFields: ['phone', 'spend', 'visits']
                        }
                    });

                    deliveryLogs.push({
                        customerId: String(customer._id),
                        customerEmail: customer.email,
                        status: 'QUEUED',
                        messageId: messageId
                    });

                    messagesQueued++;
                    logger.info(`📤 Message queued for ${customer.email} (${messageId})`);

                } catch (error) {
                    logger.error(`❌ Error processing customer ${customer.email}:`, error);
                    deliveryLogs.push({
                        customerId: String(customer._id),
                        customerEmail: customer.email,
                        status: 'FAILED',
                        messageId: `campaign_${campaign._id}_${customer._id}_${Date.now()}`,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    messagesFailed++;
                }
            }

            logger.info(`✅ Campaign delivery completed: ${messagesQueued} messages queued`);

            return {
                campaignId: String(campaign._id),
                totalCustomers: customers.length,
                messagesQueued,
                messagesSent: 0, // Will be updated by queue processor
                messagesFailed: 0, // Will be updated by queue processor
                deliveryLogs
            };

        } catch (error) {
            logger.error('❌ Campaign delivery failed:', error);
            throw error;
        }
    }

    /**
     * Get customers for a segment using rules evaluation
     */
    private async getCustomersForSegment(segment: any) {
        try {
            // Get all customers for the user
            const allCustomers = await CustomerModel.find({ userId: segment.userId });
            
            if (!segment.rules_json) {
                logger.warn('No rules found for segment, returning empty array');
                return [];
            }

            // Evaluate rules against each customer
            const matchingCustomers = allCustomers.filter(customer => {
                try {
                    return evaluateRule(customer, segment.rules_json);
                } catch (error) {
                    logger.error(`Error evaluating rule for customer ${customer.email}:`, error);
                    return false;
                }
            });

            logger.info(`🎯 Found ${matchingCustomers.length} customers matching segment rules`);
            return matchingCustomers;

        } catch (error) {
            logger.error('❌ Error getting customers for segment:', error);
            return [];
        }
    }

    /**
     * Personalize a message with customer data
     */
    private personalizeMessage(message: string, customer: any, personalizationData?: any): string {
        let personalizedMessage = message;

        // Replace customer name
        personalizedMessage = personalizedMessage.replace(/{customerName}/g, customer.name || 'Customer');
        personalizedMessage = personalizedMessage.replace(/{customerEmail}/g, customer.email || '');
        personalizedMessage = personalizedMessage.replace(/{customerPhone}/g, customer.phone || '');
        personalizedMessage = personalizedMessage.replace(/{customerSpend}/g, customer.spend?.toString() || '0');
        personalizedMessage = personalizedMessage.replace(/{customerVisits}/g, customer.visits?.toString() || '0');

        // Replace store-specific placeholders
        if (personalizationData) {
            personalizedMessage = personalizedMessage.replace(/{storeName}/g, personalizationData.storeName || 'Your Store');
            personalizedMessage = personalizedMessage.replace(/{storeAddress}/g, personalizationData.storeAddress || '');
            personalizedMessage = personalizedMessage.replace(/{storePhone}/g, personalizationData.storePhone || '');
        }

        return personalizedMessage;
    }

    /**
     * Get delivery statistics for a campaign
     */
    async getCampaignStats(campaignId: string, userId: string) {
        try {
            const stats = await SentMessageModel.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId),
                        messageId: { $regex: `campaign_${campaignId}_` }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const result: Record<string, number> = {
                QUEUED: 0,
                SENT: 0,
                FAILED: 0,
                PENDING: 0
            };

            stats.forEach(stat => {
                result[stat._id] = stat.count;
            });

            return result;
        } catch (error) {
            logger.error('❌ Error getting campaign stats:', error);
            return {};
        }
    }

    /**
     * Get all campaigns for a user
     */
    async getCampaigns(userId: string, limit: number = 50, page: number = 1) {
        try {
            const skip = (page - 1) * limit;
            const campaigns = await CampaignModel.find({ userId })
                .populate('segmentId', 'name customer_count')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await CampaignModel.countDocuments({ userId });

            return {
                campaigns,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            logger.error('❌ Error getting campaigns:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const campaignDeliveryService = new CampaignDeliveryService();