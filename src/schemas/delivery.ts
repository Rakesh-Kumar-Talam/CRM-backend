import { z } from 'zod';

export const deliveryReceiptSchema = z.object({
	campaign_id: z.string().min(1),
	customer_id: z.string().min(1),
	status: z.enum(['SENT', 'FAILED']),
	vendor_message_id: z.string().optional(),
	error_message: z.string().optional(),
});

export const vendorSendSchema = z.object({
	campaign_id: z.string().min(1),
	customer_id: z.string().min(1),
	message: z.string().min(1),
	callback_url: z.string().url(),
});

