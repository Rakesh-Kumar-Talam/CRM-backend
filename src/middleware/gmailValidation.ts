import { Request, Response, NextFunction } from 'express';
import { gmailValidationService } from '../services/gmailValidation';
import { logger } from '../utils/logger';

export interface GmailValidationRequest extends Request {
	gmailValidation?: {
		isValid: boolean;
		exists: boolean;
		error?: string;
		details?: any;
	};
}

/**
 * Middleware to validate Gmail addresses during signup
 * Only allows Gmail addresses to register
 */
export const validateGmailForSignup = async (req: GmailValidationRequest, res: Response, next: NextFunction) => {
	try {
		const { email } = req.body;

		if (!email) {
			return res.status(400).json({
				error: 'Email is required',
				message: 'Please provide a valid email address'
			});
		}

		// Validate the Gmail address
		const validationResult = await gmailValidationService.validateGmailAddress(email);

		// Store validation result in request for potential use in controller
		req.gmailValidation = validationResult;

		if (!validationResult.isValid) {
			logger.warn(`Gmail validation failed for email: ${email}`, validationResult);
			
			return res.status(400).json({
				error: 'Invalid Gmail address',
				message: validationResult.error || 'Please provide a valid Gmail address',
				details: {
					email,
					requirements: gmailValidationService.getValidationRequirements(),
					validationResult: validationResult.details
				}
			});
		}

		// Log successful validation
		logger.info(`Gmail validation successful for email: ${email}`);
		next();

	} catch (error) {
		logger.error('Gmail validation middleware error:', error);
		res.status(500).json({
			error: 'Gmail validation failed',
			message: 'Unable to validate Gmail address. Please try again.',
			details: {
				email: req.body.email,
				error: error instanceof Error ? error.message : 'Unknown error'
			}
		});
	}
};

/**
 * Middleware to validate Gmail addresses for any email field
 * Can be used for profile updates, etc.
 */
export const validateGmailAddress = async (req: GmailValidationRequest, res: Response, next: NextFunction) => {
	try {
		const { email } = req.body;

		if (!email) {
			// If no email provided, skip validation
			return next();
		}

		// Only validate if it's a Gmail address
		if (!gmailValidationService.isGmailDomain(email)) {
			// If it's not Gmail, allow it (for existing users, etc.)
			return next();
		}

		// Validate Gmail address
		const validationResult = await gmailValidationService.validateGmailAddress(email);
		req.gmailValidation = validationResult;

		if (!validationResult.isValid) {
			return res.status(400).json({
				error: 'Invalid Gmail address',
				message: validationResult.error || 'Please provide a valid Gmail address',
				details: validationResult.details
			});
		}

		next();

	} catch (error) {
		logger.error('Gmail address validation error:', error);
		res.status(500).json({
			error: 'Email validation failed',
			message: 'Unable to validate email address. Please try again.'
		});
	}
};

/**
 * Middleware to check if user is trying to use Gmail (for signup only)
 * This ensures only Gmail addresses can be used for new registrations
 */
export const requireGmailForSignup = async (req: GmailValidationRequest, res: Response, next: NextFunction) => {
	try {
		const { email } = req.body;

		if (!email) {
			return res.status(400).json({
				error: 'Email is required',
				message: 'Please provide a valid email address'
			});
		}

		// Check if it's a Gmail address
		if (!gmailValidationService.isGmailDomain(email)) {
			return res.status(400).json({
				error: 'Gmail required',
				message: 'Only Gmail addresses are allowed for registration. Please use a Gmail account.',
				details: {
					email,
					allowedDomains: ['gmail.com'],
					suggestion: 'Please use a Gmail address or sign in with Google OAuth'
				}
			});
		}

		// Proceed with Gmail validation
		next();

	} catch (error) {
		logger.error('Gmail requirement check error:', error);
		res.status(500).json({
			error: 'Email validation failed',
			message: 'Unable to validate email address. Please try again.'
		});
	}
};
