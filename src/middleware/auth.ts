import { Request, Response, NextFunction } from 'express';
import { verifyJwt, JwtPayload } from '../utils/jwt';
import { generateConsistentUserId } from '../utils/userId';
import mongoose from 'mongoose';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
	const auth = req.headers.authorization || '';
	const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
	if (!token) return res.status(401).json({ error: 'Unauthorized' });
	try {
		const payload = verifyJwt<JwtPayload>(token);
		
		// Generate consistent userId based on email hash to ensure data persistence
		// This ensures the same user always gets the same userId regardless of login method
		const userId = generateConsistentUserId(payload.email || 'unknown@example.com');
		
		// Validate that the generated userId is a valid ObjectId
		if (!mongoose.Types.ObjectId.isValid(userId)) {
			console.error('Generated invalid userId from email hash:', userId);
			return res.status(401).json({ error: 'Invalid user ID generated' });
		}
		
		req.userId = userId;
		req.userEmail = payload.email;
		console.log(`🔐 Authentication successful: ${payload.email} -> ${userId} (consistent hash-based ID)`);
		next();
	} catch (error) {
		console.error('Authentication error:', error);
		return res.status(401).json({ error: 'Invalid token' });
	}
}
