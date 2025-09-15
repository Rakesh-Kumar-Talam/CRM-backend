import { SentMessageModel, SentMessageStatus } from '../models/SentMessage';
import { CommunicationLogModel, DeliveryStatus } from '../models/CommunicationLog';
import { logger } from '../utils/logger';

export interface QueueMessage {
    messageId: string;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    textContent: string;
    htmlContent?: string;
    userId: string;
    personalizationData?: any;
}

export class MessageQueueService {
    private static instance: MessageQueueService;
    private processingInterval: NodeJS.Timeout | null = null;
    private isProcessing = false;
    private processingDelay = 2000; // Process every 2 seconds
    private messageDelay = 1000; // 1 second delay between individual messages

    private constructor() {
        this.startQueueProcessor();
    }

    public static getInstance(): MessageQueueService {
        if (!MessageQueueService.instance) {
            MessageQueueService.instance = new MessageQueueService();
        }
        return MessageQueueService.instance;
    }

    /**
     * Start the queue processor that processes QUEUED messages one by one
     */
    private startQueueProcessor() {
        this.processingInterval = setInterval(async () => {
            if (!this.isProcessing) {
                await this.processQueue();
            }
        }, this.processingDelay);

        logger.info('🚀 Message queue processor started');
    }

    /**
     * Process QUEUED messages one by one
     */
    private async processQueue() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        try {
            // Get the next QUEUED message
            const queuedMessage = await SentMessageModel.findOne({ 
                status: 'QUEUED' 
            }).sort({ createdAt: 1 }); // Process oldest first

            if (!queuedMessage) {
                this.isProcessing = false;
                return;
            }

            logger.info(`📤 Processing message: ${queuedMessage.messageId} for ${queuedMessage.recipientEmail}`);

            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, this.messageDelay));

            // Determine success/failure with 90:10 ratio
            const isSuccess = Math.random() < 0.9;
            
            let finalStatus: SentMessageStatus;
            let communicationStatus: DeliveryStatus;
            let errorMessage: string | undefined;

            if (isSuccess) {
                finalStatus = 'SENT';
                communicationStatus = 'SENT';
                logger.info(`✅ Message ${queuedMessage.messageId} sent successfully to ${queuedMessage.recipientEmail}`);
            } else {
                finalStatus = 'FAILED';
                communicationStatus = 'FAILED';
                
                const failureReasons = [
                    'Invalid email address',
                    'Recipient mailbox full',
                    'Domain not found',
                    'Recipient blocked sender',
                    'Temporary delivery failure',
                    'Network timeout',
                    'Recipient server unavailable',
                    'Message too large',
                    'Spam filter blocked',
                    'Authentication failed'
                ];
                
                errorMessage = failureReasons[Math.floor(Math.random() * failureReasons.length)];
                logger.warn(`❌ Message ${queuedMessage.messageId} failed to send to ${queuedMessage.recipientEmail}: ${errorMessage}`);
            }

            // Update SentMessage status
            await SentMessageModel.findByIdAndUpdate(queuedMessage._id, {
                status: finalStatus,
                sentAt: new Date(),
                errorMessage: errorMessage,
                updatedAt: new Date()
            });

            // Update CommunicationLog status
            await CommunicationLogModel.findOneAndUpdate(
                { vendor_message_id: queuedMessage.messageId },
                {
                    status: communicationStatus,
                    sent_at: isSuccess ? new Date() : undefined,
                    error_message: errorMessage,
                    updated_at: new Date()
                }
            );

            logger.info(`🔄 Updated message ${queuedMessage.messageId} status to ${finalStatus}`);

        } catch (error) {
            logger.error('❌ Error processing message queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Add a message to the queue
     */
    async addToQueue(message: QueueMessage) {
        try {
            // Create SentMessage entry with QUEUED status
            await SentMessageModel.create({
                userId: message.userId,
                recipientEmail: message.recipientEmail,
                recipientName: message.recipientName,
                subject: message.subject,
                textContent: message.textContent,
                htmlContent: message.htmlContent,
                status: 'QUEUED',
                messageId: message.messageId,
                personalizationData: message.personalizationData,
                sentAt: new Date(), // Will be updated when processed
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Create CommunicationLog entry with QUEUED status
            await CommunicationLogModel.create({
                userId: message.userId,
                vendor_message_id: message.messageId,
                status: 'QUEUED',
                message: message.textContent,
                sent_at: new Date(), // Will be updated when processed
                updated_at: new Date()
            });

            logger.info(`📝 Added message ${message.messageId} to queue for ${message.recipientEmail}`);
        } catch (error) {
            logger.error(`❌ Error adding message ${message.messageId} to queue:`, error);
            throw error;
        }
    }

    /**
     * Get queue statistics
     */
    async getQueueStats() {
        try {
            const stats = await SentMessageModel.aggregate([
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
            logger.error('❌ Error getting queue stats:', error);
            return {};
        }
    }

    /**
     * Get the next message in queue (for debugging)
     */
    async getNextMessage() {
        return await SentMessageModel.findOne({ 
            status: 'QUEUED' 
        }).sort({ createdAt: 1 });
    }

    /**
     * Stop the queue processor
     */
    public stop() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
            logger.info('🛑 Message queue processor stopped');
        }
    }

    /**
     * Set processing delay between messages
     */
    public setMessageDelay(delay: number) {
        this.messageDelay = delay;
        logger.info(`⏱️ Message processing delay set to ${delay}ms`);
    }

    /**
     * Set queue processing interval
     */
    public setProcessingInterval(interval: number) {
        this.processingDelay = interval;
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = setInterval(async () => {
                if (!this.isProcessing) {
                    await this.processQueue();
                }
            }, this.processingDelay);
        }
        logger.info(`⏱️ Queue processing interval set to ${interval}ms`);
    }
}
