import { z } from 'zod';

export const segmentCreateSchema = z.object({
	name: z.string().min(1, 'Segment name is required'),
	rules_json: z.record(z.string(), z.any()),
});

export const segmentPreviewSchema = z.object({
	id: z.string().min(1),
});

