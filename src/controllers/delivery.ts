import { Request, Response } from 'express';
import { CommunicationLogModel } from '../models/CommunicationLog';
import mongoose from 'mongoose';

export async function deliveryReceipt(req: Request, res: Response) {
	const { campaign_id, customer_id, status, vendor_message_id, error_message } = req.body || {};
	
	if (!campaign_id || !customer_id || !status) {
		return res.status(400).json({ 
			error: 'Missing required fields: campaign_id, customer_id, status' 
		});
	}

	if (!['SENT', 'FAILED'].includes(status)) {
		return res.status(400).json({ 
			error: 'Invalid status. Must be SENT or FAILED' 
		});
	}

	try {
		const log = await CommunicationLogModel.findOneAndUpdate(
			{
				campaign_id: new mongoose.Types.ObjectId(campaign_id),
				customer_id: new mongoose.Types.ObjectId(customer_id),
			},
			{
				status,
				vendor_message_id,
				error_message,
				updated_at: new Date(),
				...(status === 'SENT' && { sent_at: new Date() })
			},
			{ new: true }
		);

		if (!log) {
			return res.status(404).json({ 
				error: 'Communication log not found for this campaign and customer' 
			});
		}

		console.log(`Delivery receipt processed: Campaign ${campaign_id}, Customer ${customer_id}, Status: ${status}`);

		res.json({ 
			success: true,
			id: String(log._id), 
			status: log.status,
			message: 'Delivery receipt processed successfully'
		});

	} catch (error) {
		console.error('Error processing delivery receipt:', error);
		res.status(500).json({ 
			error: 'Failed to process delivery receipt',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}
