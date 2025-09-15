import { CommunicationLogModel, DeliveryStatus } from '../models/CommunicationLog';
import { SentMessageModel } from '../models/SentMessage';
import { CustomerModel } from '../models/Customer';
import { logger } from '../utils/logger';

export interface VendorMessage {
    messageId: string;
    recipientEmail: string;
    recipientName: string;
    message: string;
    subject?: string;
    personalizationData?: any;
}

export interface VendorResponse {
    success: boolean;
    messageId: string;
    status: 'ACCEPTED' | 'REJECTED';
    error?: string;
}

export interface DeliveryReceipt {
    messageId: string;
    status: 'SENT' | 'FAILED';
    deliveredAt: Date;
    errorMessage?: string;
}

/**
 * Simulates a vendor API for message delivery
 * Returns 90% success rate and 10% failure rate
 */
export class VendorApiService {
    private static instance: VendorApiService;
    private deliveryQueue: Map<string, DeliveryReceipt> = new Map();
    private processingInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.startDeliveryProcessor();
    }

    public static getInstance(): VendorApiService {
        if (!VendorApiService.instance) {
            VendorApiService.instance = new VendorApiService();
        }
        return VendorApiService.instance;
    }

    /**
     * Send a message via the vendor API
     * Simulates real-world delivery with success/failure rates
     */
    async sendMessage(message: VendorMessage): Promise<VendorResponse> {
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

            // 90% success rate, 10% failure rate
            const isSuccess = Math.random() < 0.9;
            
            if (isSuccess) {
                // Schedule delivery receipt (simulate real-world delay)
                const deliveryDelay = Math.random() * 5000 + 2000; // 2-7 seconds
                setTimeout(() => {
                    this.scheduleDeliveryReceipt(message.messageId, 'SENT', new Date());
                }, deliveryDelay);

                logger.info(`✅ Vendor API: Message ${message.messageId} accepted for ${message.recipientEmail}`);
                
                return {
                    success: true,
                    messageId: message.messageId,
                    status: 'ACCEPTED'
                };
            } else {
                // Simulate failure scenarios
                const failureReasons = [
                    'Invalid email address',
                    'Recipient mailbox full',
                    'Domain not found',
                    'Recipient blocked sender',
                    'Temporary delivery failure'
                ];
                
                const errorMessage = failureReasons[Math.floor(Math.random() * failureReasons.length)];
                
                // Schedule failure receipt
                const deliveryDelay = Math.random() * 3000 + 1000; // 1-4 seconds
                setTimeout(() => {
                    this.scheduleDeliveryReceipt(message.messageId, 'FAILED', new Date(), errorMessage);
                }, deliveryDelay);

                logger.warn(`❌ Vendor API: Message ${message.messageId} rejected for ${message.recipientEmail} - ${errorMessage}`);
                
                return {
                    success: false,
                    messageId: message.messageId,
                    status: 'REJECTED',
                    error: errorMessage
                };
            }
        } catch (error) {
            logger.error(`❌ Vendor API error for message ${message.messageId}:`, error);
            return {
                success: false,
                messageId: message.messageId,
                status: 'REJECTED',
                error: 'Internal vendor API error'
            };
        }
    }

    /**
     * Schedule a delivery receipt for processing
     */
    private scheduleDeliveryReceipt(
        messageId: string, 
        status: 'SENT' | 'FAILED', 
        deliveredAt: Date, 
        errorMessage?: string
    ) {
        this.deliveryQueue.set(messageId, {
            messageId,
            status,
            deliveredAt,
            errorMessage
        });
        
        logger.info(`📬 Delivery receipt scheduled for message ${messageId}: ${status}`);
    }

    /**
     * Start the delivery processor that handles receipts in batches
     */
    private startDeliveryProcessor() {
        this.processingInterval = setInterval(async () => {
            await this.processDeliveryReceipts();
        }, 2000); // Process every 2 seconds
    }

    /**
     * Process delivery receipts in batches
     */
    private async processDeliveryReceipts() {
        if (this.deliveryQueue.size === 0) return;

        const receipts = Array.from(this.deliveryQueue.values());
        this.deliveryQueue.clear();

        logger.info(`🔄 Processing ${receipts.length} delivery receipts in batch`);

        try {
            // Process receipts in parallel with batching
            const batchSize = 10;
            for (let i = 0; i < receipts.length; i += batchSize) {
                const batch = receipts.slice(i, i + batchSize);
                await Promise.all(batch.map(receipt => this.updateDeliveryStatus(receipt)));
            }
        } catch (error) {
            logger.error('❌ Error processing delivery receipts:', error);
        }
    }

    /**
     * Update delivery status in the database
     */
    private async updateDeliveryStatus(receipt: DeliveryReceipt) {
        try {
            const updateData: any = {
                status: receipt.status as DeliveryStatus,
                updated_at: new Date()
            };

            if (receipt.status === 'SENT') {
                updateData.sent_at = receipt.deliveredAt;
            } else if (receipt.status === 'FAILED') {
                updateData.error_message = receipt.errorMessage;
            }

            await CommunicationLogModel.findOneAndUpdate(
                { vendor_message_id: receipt.messageId },
                updateData
            );

            logger.info(`✅ Updated delivery status for message ${receipt.messageId}: ${receipt.status}`);
        } catch (error) {
            logger.error(`❌ Error updating delivery status for message ${receipt.messageId}:`, error);
        }
    }

    /**
     * Stop the delivery processor
     */
    public stop() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }

    /**
     * Get delivery statistics
     */
    async getDeliveryStats(userId: string, campaignId?: string) {
        try {
            const filter: any = { userId };
            if (campaignId) {
                // For campaign-specific stats, we need to check if the messageId contains the campaign ID
                filter.messageId = { $regex: `campaign_${campaignId}_` };
            }

            const stats = await SentMessageModel.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const result: Record<string, number> = {
                SENT: 0,
                FAILED: 0,
                PENDING: 0
            };
            stats.forEach(stat => {
                result[stat._id] = stat.count;
            });

            return result;
        } catch (error) {
            logger.error('❌ Error getting delivery stats:', error);
            return {};
        }
    }
}
