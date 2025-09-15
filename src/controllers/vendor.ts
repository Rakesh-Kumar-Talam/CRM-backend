import { Request, Response } from 'express';
import { vendorService } from '../services/vendorService';

export async function vendorSendMock(req: Request, res: Response) {
	const { campaign_id, customer_id, message, callback_url } = req.body || {};
	
	if (!campaign_id || !customer_id || !message || !callback_url) {
		return res.status(400).json({ 
			error: 'Missing required fields: campaign_id, customer_id, message, callback_url' 
		});
	}

	try {
		const result = await vendorService.sendMessage({
			campaignId: campaign_id,
			customerId: customer_id,
			message,
			callbackUrl: callback_url
		});

		res.json({
			success: true,
			accepted: result.accepted,
			vendor_message_id: result.vendorMessageId,
			status: result.status,
			message: 'Message sent to vendor successfully'
		});

	} catch (error) {
		console.error('Error sending message to vendor:', error);
		res.status(500).json({ 
			error: 'Failed to send message to vendor',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}

export async function getVendorStatus(req: Request, res: Response) {
	try {
		const status = vendorService.getQueueStatus();
		res.json({
			success: true,
			status,
			message: 'Vendor service status retrieved successfully'
		});
	} catch (error) {
		console.error('Error getting vendor status:', error);
		res.status(500).json({ 
			error: 'Failed to get vendor status',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}
