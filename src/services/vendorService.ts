import { CommunicationLogModel } from '../models/CommunicationLog';
import mongoose from 'mongoose';

export interface VendorMessage {
	campaignId: string;
	customerId: string;
	message: string;
	callbackUrl: string;
}

export interface VendorResponse {
	accepted: boolean;
	vendorMessageId: string;
	status: 'SENT' | 'FAILED';
}

export interface DeliveryReceipt {
	campaignId: string;
	customerId: string;
	status: 'SENT' | 'FAILED';
	vendorMessageId: string;
	errorMessage?: string;
}

export class VendorService {
	private static instance: VendorService;
	private receiptQueue: DeliveryReceipt[] = [];
	private batchProcessor: NodeJS.Timeout | null = null;
	private readonly BATCH_SIZE = 10;
	private readonly BATCH_INTERVAL = 5000; // 5 seconds

	private constructor() {
		this.startBatchProcessor();
	}

	public static getInstance(): VendorService {
		if (!VendorService.instance) {
			VendorService.instance = new VendorService();
		}
		return VendorService.instance;
	}

	/**
	 * Send a message to the vendor API
	 * Simulates 90% success rate
	 */
	public async sendMessage(messageData: VendorMessage): Promise<VendorResponse> {
		// Simulate 90% success rate
		const success = Math.random() < 0.9;
		const vendorMessageId = `vendor_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
		
		const status = success ? 'SENT' : 'FAILED';
		const errorMessage = success ? undefined : 'Vendor delivery failed - simulated error';

		// Simulate async processing delay
		await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

		// Queue the delivery receipt for batch processing
		this.queueDeliveryReceipt({
			campaignId: messageData.campaignId,
			customerId: messageData.customerId,
			status,
			vendorMessageId,
			errorMessage
		});

		return {
			accepted: true,
			vendorMessageId,
			status
		};
	}

	/**
	 * Send multiple messages in batch
	 */
	public async sendBatchMessages(messages: VendorMessage[]): Promise<VendorResponse[]> {
		const results = await Promise.all(
			messages.map(message => this.sendMessage(message))
		);
		return results;
	}

	/**
	 * Queue a delivery receipt for batch processing
	 */
	private queueDeliveryReceipt(receipt: DeliveryReceipt): void {
		this.receiptQueue.push(receipt);
		console.log(`Queued delivery receipt for campaign ${receipt.campaignId}, customer ${receipt.customerId}, status: ${receipt.status}`);
	}

	/**
	 * Start the batch processor for delivery receipts
	 */
	private startBatchProcessor(): void {
		this.batchProcessor = setInterval(async () => {
			if (this.receiptQueue.length > 0) {
				await this.processBatchReceipts();
			}
		}, this.BATCH_INTERVAL);
	}

	/**
	 * Process a batch of delivery receipts
	 */
	private async processBatchReceipts(): Promise<void> {
		if (this.receiptQueue.length === 0) return;

		// Take up to BATCH_SIZE receipts
		const batch = this.receiptQueue.splice(0, this.BATCH_SIZE);
		
		console.log(`Processing batch of ${batch.length} delivery receipts`);

		try {
			// Prepare bulk operations
			const bulkOps = batch.map(receipt => ({
				updateOne: {
					filter: {
						campaign_id: new mongoose.Types.ObjectId(receipt.campaignId),
						customer_id: new mongoose.Types.ObjectId(receipt.customerId)
					},
					update: {
						$set: {
							status: receipt.status,
							vendor_message_id: receipt.vendorMessageId,
							updated_at: new Date(),
							...(receipt.status === 'SENT' && { sent_at: new Date() }),
							...(receipt.errorMessage && { error_message: receipt.errorMessage })
						}
					}
				}
			}));

			// Execute bulk update
			const result = await CommunicationLogModel.bulkWrite(bulkOps);
			console.log(`Batch processed: ${result.modifiedCount} records updated`);

		} catch (error) {
			console.error('Error processing batch receipts:', error);
			// Re-queue failed receipts for retry
			this.receiptQueue.unshift(...batch);
		}
	}

	/**
	 * Get current queue status
	 */
	public getQueueStatus(): { queueLength: number; batchSize: number; interval: number } {
		return {
			queueLength: this.receiptQueue.length,
			batchSize: this.BATCH_SIZE,
			interval: this.BATCH_INTERVAL
		};
	}

	/**
	 * Process remaining receipts immediately (for testing/shutdown)
	 */
	public async flushQueue(): Promise<void> {
		console.log('Flushing remaining delivery receipts...');
		while (this.receiptQueue.length > 0) {
			await this.processBatchReceipts();
		}
	}

	/**
	 * Stop the batch processor
	 */
	public stopBatchProcessor(): void {
		if (this.batchProcessor) {
			clearInterval(this.batchProcessor);
			this.batchProcessor = null;
		}
	}
}

// Export singleton instance
export const vendorService = VendorService.getInstance();
