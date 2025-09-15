import crypto from 'crypto';

/**
 * Generate a consistent userId based on email hash
 * This ensures the same email always gets the same userId across login sessions
 * @param email - User's email address
 * @returns Consistent 24-character string that can be used as MongoDB ObjectId
 */
export function generateConsistentUserId(email: string): string {
	const emailHash = crypto.createHash('md5').update(email).digest('hex');
	return emailHash.substring(0, 24); // Take first 24 chars for ObjectId
}

/**
 * Validate if a string is a valid MongoDB ObjectId
 * @param id - String to validate
 * @returns true if valid ObjectId, false otherwise
 */
export function isValidObjectId(id: string): boolean {
	return /^[0-9a-fA-F]{24}$/.test(id);
}
