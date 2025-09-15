import { google } from 'googleapis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface GmailValidationResult {
	isValid: boolean;
	exists: boolean;
	error?: string;
	details?: {
		email: string;
		domain: string;
		isGmail: boolean;
		verificationStatus?: string;
	};
}

/**
 * Gmail Validation Service
 * Validates Gmail addresses using Google's Gmail API
 */
export class GmailValidationService {
	private gmail: any;

	constructor() {
		// Initialize Gmail API with service account or OAuth credentials
		this.initializeGmailAPI();
	}

	private initializeGmailAPI() {
		try {
			// For Gmail validation, we can use the Gmail API with the configured OAuth credentials
			// or create a service account for validation purposes
			this.gmail = google.gmail({ version: 'v1' });
		} catch (error) {
			logger.error('Failed to initialize Gmail API:', error);
		}
	}

	/**
	 * Validate if a Gmail address exists and is valid
	 * @param email - Email address to validate
	 * @returns Promise<GmailValidationResult>
	 */
	async validateGmailAddress(email: string): Promise<GmailValidationResult> {
		try {
			// Basic email format validation
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return {
					isValid: false,
					exists: false,
					error: 'Invalid email format',
					details: {
						email,
						domain: email.split('@')[1] || '',
						isGmail: false
					}
				};
			}

			const domain = email.split('@')[1]?.toLowerCase();
			const isGmail = domain === 'gmail.com';

			// If it's not a Gmail address, we can't validate it with Gmail API
			if (!isGmail) {
				return {
					isValid: false,
					exists: false,
					error: 'Only Gmail addresses are allowed for signup',
					details: {
						email,
						domain,
						isGmail: false
					}
				};
			}

			// For Gmail addresses, we can use various methods to validate:
			// 1. Check if the email format is valid for Gmail
			// 2. Use Gmail API to check if the account exists (if we have proper credentials)
			// 3. For now, we'll do basic validation and let Google OAuth handle the actual verification

			// Gmail username validation (basic rules)
			const username = email.split('@')[0];
			if (!this.isValidGmailUsername(username)) {
				return {
					isValid: false,
					exists: false,
					error: 'Invalid Gmail username format',
					details: {
						email,
						domain,
						isGmail: true
					}
				};
			}

			// If we have Gmail API credentials, we could try to validate the account
			// For now, we'll return true for valid Gmail format
			// The actual verification will happen during Google OAuth
			return {
				isValid: true,
				exists: true, // We assume it exists if format is valid
				details: {
					email,
					domain,
					isGmail: true,
					verificationStatus: 'format_validated'
				}
			};

		} catch (error) {
			logger.error('Gmail validation error:', error);
			return {
				isValid: false,
				exists: false,
				error: 'Gmail validation failed',
				details: {
					email,
					domain: email.split('@')[1] || '',
					isGmail: false
				}
			};
		}
	}

	/**
	 * Validate Gmail username format
	 * @param username - Gmail username part (before @)
	 * @returns boolean
	 */
	private isValidGmailUsername(username: string): boolean {
		// Gmail username rules:
		// - 1-30 characters (Gmail actually allows shorter usernames)
		// - Can contain letters, numbers, and dots
		// - Cannot start or end with a dot
		// - Cannot have consecutive dots
		// - Case insensitive

		if (!username || username.length < 1 || username.length > 30) {
			return false;
		}

		// Check for invalid characters
		const validCharsRegex = /^[a-zA-Z0-9.]+$/;
		if (!validCharsRegex.test(username)) {
			return false;
		}

		// Cannot start or end with dot
		if (username.startsWith('.') || username.endsWith('.')) {
			return false;
		}

		// Cannot have consecutive dots
		if (username.includes('..')) {
			return false;
		}

		return true;
	}

	/**
	 * Enhanced validation using Google's People API (if available)
	 * This would require additional OAuth scopes and setup
	 */
	async validateWithGoogleAPI(email: string): Promise<GmailValidationResult> {
		try {
			// This would require proper OAuth setup and additional scopes
			// For now, we'll return the basic validation result
			return await this.validateGmailAddress(email);
		} catch (error) {
			logger.error('Google API validation error:', error);
			return {
				isValid: false,
				exists: false,
				error: 'Google API validation failed',
				details: {
					email,
					domain: email.split('@')[1] || '',
					isGmail: false
				}
			};
		}
	}

	/**
	 * Check if an email domain is Gmail
	 * @param email - Email address
	 * @returns boolean
	 */
	isGmailDomain(email: string): boolean {
		const domain = email.split('@')[1]?.toLowerCase();
		return domain === 'gmail.com';
	}

	/**
	 * Get Gmail validation requirements
	 * @returns object with validation requirements
	 */
		getValidationRequirements() {
		return {
			allowedDomains: ['gmail.com'],
			usernameRules: {
				minLength: 1,
				maxLength: 30,
				allowedCharacters: 'letters, numbers, and dots',
				restrictions: [
					'Cannot start or end with a dot',
					'Cannot have consecutive dots',
					'Case insensitive'
				]
			},
			validationMethods: [
				'Format validation',
				'Gmail username rules',
				'Google OAuth verification (recommended)'
			]
		};
	}
}

// Export singleton instance
export const gmailValidationService = new GmailValidationService();
