import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		email: string;
		googleId?: string;
		gmailVerified?: boolean;
	};
}

/**
 * Middleware to ensure user is authenticated via Google OAuth
 * This prevents access by users who were created through other means
 */
export const requireGoogleAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		const userId = req.user?.userId;
		
		if (!userId) {
			return res.status(401).json({ 
				error: 'Authentication required',
				message: 'Please sign in with Google to access this resource'
			});
		}

		// Find user and verify they have Google OAuth
		const user = await UserModel.findById(userId).select('googleId gmailVerified email');
		
		if (!user) {
			return res.status(401).json({ 
				error: 'User not found',
				message: 'Please sign in with Google to access this resource'
			});
		}

		// Ensure user was created via Google OAuth
		if (!user.googleId) {
			logger.warn(`User ${userId} attempted to access protected resource without Google OAuth`);
			return res.status(403).json({ 
				error: 'Google OAuth required',
				message: 'This resource requires Google OAuth authentication. Please sign in with Google.'
			});
		}

		// Add user info to request
		req.user = {
			userId: (user._id as any).toString(),
			email: user.email,
			googleId: user.googleId,
			gmailVerified: user.gmailVerified
		};

		next();
	} catch (error) {
		logger.error('Google auth middleware error:', error);
		res.status(500).json({ 
			error: 'Authentication error',
			message: 'Unable to verify authentication'
		});
	}
};

/**
 * Middleware to ensure user has Gmail access (for email campaigns)
 */
export const requireGmailAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		const userId = req.user?.userId;
		
		if (!userId) {
			return res.status(401).json({ 
				error: 'Authentication required',
				message: 'Please sign in with Google to access this resource'
			});
		}

		const user = await UserModel.findById(userId).select('googleId gmailVerified email');
		
		if (!user || !user.googleId) {
			return res.status(403).json({ 
				error: 'Google OAuth required',
				message: 'Please sign in with Google to access this resource'
			});
		}

		if (!user.gmailVerified) {
			return res.status(403).json({ 
				error: 'Gmail access required',
				message: 'This resource requires Gmail access. Please grant Gmail permissions when signing in with Google.',
				action: 'Please visit /api/auth/google/gmail to grant Gmail access'
			});
		}

		next();
	} catch (error) {
		logger.error('Gmail access middleware error:', error);
		res.status(500).json({ 
			error: 'Authentication error',
			message: 'Unable to verify Gmail access'
		});
	}
};
