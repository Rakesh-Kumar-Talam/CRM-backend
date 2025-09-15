import { ZodObject, ZodRawShape } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validateBody(schema: ZodObject<ZodRawShape>) {
	return (req: Request, res: Response, next: NextFunction) => {
		console.log('Validating request body:', JSON.stringify(req.body, null, 2));
		const result = schema.safeParse(req.body);
		if (!result.success) {
			console.log('Validation failed:', result.error.issues);
			return res.status(400).json({ 
				error: 'ValidationError', 
				details: result.error.flatten(),
				issues: result.error.issues
			});
		}
		req.body = result.data;
		next();
	};
}
