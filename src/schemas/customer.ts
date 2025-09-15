import { z } from 'zod';

export const customerCreateSchema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	phone: z.string().optional(),
	spend: z.number().optional(),
	visits: z.number().int().optional(),
	last_active: z.string().optional(),
});
