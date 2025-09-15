import { z } from 'zod';

export const campaignCreateSchema = z.object({
	segment_id: z.string().min(1),
	message: z.string().min(1).max(1000),
	subject: z.string().min(1).max(200).optional(),
	status: z.string().optional().transform((val) => {
		if (!val) return 'DRAFT'; // Default to DRAFT if not provided
		// Convert to uppercase for consistency
		const upperVal = val.toUpperCase();
		if (['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'].includes(upperVal)) {
			return upperVal as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
		}
		throw new Error(`Invalid status: ${val}. Must be one of: DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED`);
	}),
});

export const campaignGetSchema = z.object({
	id: z.string().min(1),
});

export const campaignUpdateSchema = z.object({
	segment_id: z.string().min(1).optional(),
	message: z.string().min(1).max(1000).optional(),
	subject: z.string().min(1).max(200).optional(),
	status: z.string().optional().transform((val) => {
		if (!val) return val;
		// Convert to uppercase for consistency
		const upperVal = val.toUpperCase();
		if (['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'].includes(upperVal)) {
			return upperVal as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
		}
		throw new Error(`Invalid status: ${val}. Must be one of: DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED`);
	}),
}).refine((data) => {
	// At least one field must be provided
	return data.segment_id !== undefined || data.message !== undefined || data.subject !== undefined || data.status !== undefined;
}, {
	message: "At least one field (segment_id, message, subject, or status) must be provided for update"
});

