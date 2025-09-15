import { Customer } from '../models/Customer';

export interface PersonalizationData {
	customerName: string;
	customerEmail: string;
	customerPhone?: string;
	customerSpend?: number;
	customerVisits?: number;
	lastActive?: string;
	discount?: string;
	storeName?: string;
	couponCode?: string;
}

export interface PersonalizedMessage {
	originalMessage: string;
	personalizedMessage: string;
	personalizationData: PersonalizationData;
}

export class MessagePersonalizationService {
	/**
	 * Personalize a message for a specific customer
	 */
	public static personalizeMessage(
		message: string, 
		customer: Customer, 
		fallbackName: string = 'Valued Customer',
		customData: { discount?: string; storeName?: string; couponCode?: string } = {}
	): PersonalizedMessage {
		const personalizationData: PersonalizationData = {
			customerName: customer.name || fallbackName,
			customerEmail: customer.email,
			customerPhone: customer.phone,
			customerSpend: customer.spend || 0,
			customerVisits: customer.visits || 0,
			lastActive: customer.last_active ? new Date(customer.last_active).toLocaleDateString() : 'Never',
			discount: customData.discount || '10',
			storeName: customData.storeName || 'Our Store',
			couponCode: customData.couponCode || 'WELCOME10'
		};

		let personalizedMessage = message;

		// Replace placeholders with customer data
		personalizedMessage = personalizedMessage.replace(/\{customerName\}/g, personalizationData.customerName);
		personalizedMessage = personalizedMessage.replace(/\{customerEmail\}/g, personalizationData.customerEmail);
		personalizedMessage = personalizedMessage.replace(/\{customerPhone\}/g, personalizationData.customerPhone || 'N/A');
		personalizedMessage = personalizedMessage.replace(/\{customerSpend\}/g, (personalizationData.customerSpend || 0).toString());
		personalizedMessage = personalizedMessage.replace(/\{customerVisits\}/g, (personalizationData.customerVisits || 0).toString());
		personalizedMessage = personalizedMessage.replace(/\{lastActive\}/g, personalizationData.lastActive || 'Never');

		// Handle common variations
		personalizedMessage = personalizedMessage.replace(/\{name\}/g, personalizationData.customerName);
		personalizedMessage = personalizedMessage.replace(/\{Name\}/g, personalizationData.customerName);
		personalizedMessage = personalizedMessage.replace(/\{email\}/g, personalizationData.customerEmail);
		personalizedMessage = personalizedMessage.replace(/\{phone\}/g, personalizationData.customerPhone || 'N/A');

		// Handle custom placeholders
		personalizedMessage = personalizedMessage.replace(/\{discount\}/g, personalizationData.discount || '10');
		personalizedMessage = personalizedMessage.replace(/\{storeName\}/g, personalizationData.storeName || 'Our Store');
		personalizedMessage = personalizedMessage.replace(/\{couponCode\}/g, personalizationData.couponCode || 'WELCOME10');

		// Add greeting if message doesn't start with one
		if (!personalizedMessage.toLowerCase().startsWith('hi ') && 
			!personalizedMessage.toLowerCase().startsWith('hello ') &&
			!personalizedMessage.toLowerCase().startsWith('dear ')) {
			personalizedMessage = `Hi ${personalizationData.customerName}, ${personalizedMessage}`;
		}

		return {
			originalMessage: message,
			personalizedMessage,
			personalizationData
		};
	}

	/**
	 * Personalize multiple messages for multiple customers
	 */
	public static personalizeMessages(
		message: string, 
		customers: Customer[], 
		fallbackName: string = 'Valued Customer',
		customData: { discount?: string; storeName?: string; couponCode?: string } = {}
	): PersonalizedMessage[] {
		return customers.map(customer => 
			this.personalizeMessage(message, customer, fallbackName, customData)
		);
	}

	/**
	 * Get available placeholders for a message template
	 */
	public static getAvailablePlaceholders(): string[] {
		return [
			'{customerName}',
			'{customerEmail}',
			'{customerPhone}',
			'{customerSpend}',
			'{customerVisits}',
			'{lastActive}',
			'{name}',
			'{Name}',
			'{email}',
			'{phone}',
			'{discount}',
			'{storeName}',
			'{couponCode}'
		];
	}

	/**
	 * Validate if a message template has valid placeholders
	 */
	public static validateTemplate(message: string): { isValid: boolean; invalidPlaceholders: string[] } {
		const availablePlaceholders = this.getAvailablePlaceholders();
		const placeholderRegex = /\{[^}]+\}/g;
		const foundPlaceholders = message.match(placeholderRegex) || [];
		
		const invalidPlaceholders = foundPlaceholders.filter(
			placeholder => !availablePlaceholders.includes(placeholder)
		);

		return {
			isValid: invalidPlaceholders.length === 0,
			invalidPlaceholders
		};
	}
}
