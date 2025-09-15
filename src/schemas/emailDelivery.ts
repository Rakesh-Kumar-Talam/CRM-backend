import { z } from 'zod';

export const emailTemplateSchema = z.object({
	subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
	text: z.string().min(1, 'Text content is required').max(10000, 'Text content too long'),
	html: z.string().optional(),
	personalization: z.object({
		customerName: z.boolean().optional(),
		customerEmail: z.boolean().optional(),
		customFields: z.array(z.string()).optional()
	}).optional()
});

export const sendSingleEmailSchema = z.object({
	to: z.string().email('Invalid email address'),
	template: emailTemplateSchema
});

