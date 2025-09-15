import { z } from 'zod';

export const aiRulesSchema = z.object({
	input: z.string().min(1),
});

export const aiMessagesSchema = z.object({
	goal: z.string().min(1),
});

export const aiCampaignMessagesSchema = z.object({
	goal: z.string().min(1, 'Campaign goal is required'),
	segmentType: z.string().optional(),
	customerType: z.string().optional(),
});

export const aiSummarySchema = z.object({
	sent: z.number().int().min(0),
	failed: z.number().int().min(0),
});

export const aiParseSegmentSchema = z.object({
	description: z.string().min(1, 'Description is required').optional(),
	input: z.string().min(1, 'Input is required').optional(),
}).refine((data) => data.description || data.input, {
	message: "Either description or input is required",
	path: ["description"]
});

