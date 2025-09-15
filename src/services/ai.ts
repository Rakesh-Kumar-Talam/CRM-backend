import { GoogleGenerativeAI } from '@google/generative-ai';
import { RuleGroup } from './segmentRules';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI('AIzaSyDoy6LdFff7lqgdL1V699vykAqB5JvZpaY');

/**
 * Enhanced AI-powered natural language to segment rules parser using Gemini API
 */
export async function parseNaturalLanguageToSegmentRules(description: string): Promise<{
	name: string;
	rules: any;
}> {
	try {
		const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

		const prompt = `You are a CRM assistant that converts natural language into customer segment rules.

Available customer fields:
- spend (number): Total amount spent
- visits (number): Number of visits
- last_active (date): Last activity date
- created_at (date): Account creation date
- name (string): Customer name
- email (string): Customer email
- phone (string): Customer phone

Available operators:
- ">" (greater than)
- ">=" (greater than or equal)
- "<" (less than)
- "<=" (less than or equal)
- "=" (equals)
- "!=" (not equals)
- "contains" (for string fields)
- "starts_with" (for string fields)
- "ends_with" (for string fields)

For date fields, you can use:
- "last_active_days" (number): Days since last activity
- "created_days_ago" (number): Days since account creation

Convert the following natural language into a JSON object with fields: name (string), and rules (object).

Rules structure:
- For simple conditions: { field, op, value }
- For AND conditions: { and: [{ field, op, value }, ...] }
- For OR conditions: { or: [{ field, op, value }, ...] }
- For complex conditions: { and: [...], or: [...] }

Examples:
Input: "Find customers who spent more than 400 and name it Value Customers"
Output:
{
  "name": "Value Customers",
  "rules": { "field": "spend", "op": ">", "value": 400 }
}

Input: "Customers inactive for 90 days OR spent more than 10,000"
Output:
{
  "name": "Inactive or High Value Customers",
  "rules": {
    "or": [
      { "field": "last_active_days", "op": ">", "value": 90 },
      { "field": "spend", "op": ">", "value": 10000 }
    ]
  }
}

Input: "High spenders with multiple visits"
Output:
{
  "name": "High Spenders with Multiple Visits",
  "rules": {
    "and": [
      { "field": "spend", "op": ">", "value": 1000 },
      { "field": "visits", "op": ">", "value": 5 }
    ]
  }
}

Now parse this: "${description}"

Return ONLY the JSON object, no additional text or formatting.`;

		const result = await model.generateContent(prompt);
		const response = await result.response;
		const text = response.text();

		// Clean up the response to extract JSON
		let jsonText = text.trim();
		
		// Remove markdown code blocks if present
		if (jsonText.includes('```json')) {
			jsonText = jsonText.split('```json')[1].split('```')[0].trim();
		} else if (jsonText.includes('```')) {
			jsonText = jsonText.split('```')[1].split('```')[0].trim();
		}

		// Remove any leading/trailing text that's not JSON
		const jsonStart = jsonText.indexOf('{');
		const jsonEnd = jsonText.lastIndexOf('}') + 1;
		if (jsonStart !== -1 && jsonEnd > jsonStart) {
			jsonText = jsonText.substring(jsonStart, jsonEnd);
		}

		const parsed = JSON.parse(jsonText);
		
		// Validate the response structure
		if (!parsed.name || !parsed.rules) {
			throw new Error('Invalid response structure from AI');
		}

		return parsed;

	} catch (error) {
		console.error('Error parsing natural language to segment rules:', error);
		
		// Fallback to basic parsing
		return parseNaturalLanguageToRulesFallback(description);
	}
}

/**
 * Fallback function for basic natural language parsing
 */
export function parseNaturalLanguageToRules(input: string): RuleGroup {
	const lowered = input.toLowerCase();
	const rules: any[] = [];
	const and: any[] = [];
	if (lowered.includes('inactive')) {
		const daysMatch = lowered.match(/(\d+)\s*(days|day|months|month|weeks|week)/);
		let days = 90;
		if (daysMatch) {
			const num = parseInt(daysMatch[1], 10);
			const unit = daysMatch[2];
			if (unit.startsWith('month')) days = num * 30;
			else if (unit.startsWith('week')) days = num * 7;
			else days = num;
		}
		and.push({ field: 'last_active_days', op: '>', value: days });
	}
	const spendMatch = lowered.match(/spent?\s*[>><=]+\s*([\d,\.kK]+)/) || lowered.match(/spend\s*[>><=]+\s*([\d,\.kK]+)/);
	if (spendMatch) {
		const val = parseAmount(spendMatch[1]);
		and.push({ field: 'spend', op: '>', value: val });
	}
	const visitsMatch = lowered.match(/visits?\s*[<>=]+\s*(\d+)/);
	if (visitsMatch) and.push({ field: 'visits', op: '<', value: parseInt(visitsMatch[1], 10) });
	if (and.length === 0) and.push({ field: 'spend', op: '>', value: 0 });
	return { and } as any;
}

/**
 * Fallback function for AI parsing errors
 */
function parseNaturalLanguageToRulesFallback(description: string): { name: string; rules: any } {
	const lowered = description.toLowerCase();
	
	// Extract name from description
	let name = 'Unnamed Segment';
	if (lowered.includes('name it') || lowered.includes('call it')) {
		const nameMatch = description.match(/(?:name it|called?)\s+["']?([^"']+)["']?/i);
		if (nameMatch) {
			name = nameMatch[1].trim();
		}
	} else if (lowered.includes('customers')) {
		// Try to extract a meaningful name
		const words = description.split(/\s+/).slice(0, 3);
		name = words.join(' ').replace(/[^\w\s]/g, '').trim() || 'Custom Segment';
	}

	// Basic rule parsing
	const rules = parseNaturalLanguageToRules(description);
	
	return { name, rules };
}

function parseAmount(token: string): number {
	let t = token.replace(/,/g, '').toLowerCase();
	if (t.endsWith('k')) return parseFloat(t) * 1000;
	return parseFloat(t);
}

/**
 * Generate AI-powered campaign message suggestions using Gemini API
 */
export async function generateAIMessages(goal: string): Promise<string[]> {
	try {
		const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

		const prompt = `You are a marketing expert creating email campaign messages for customer retention and engagement.

Campaign Goal: "${goal}"

Generate 3 different, compelling email message options that will attract customers and encourage them to take action. Each message should:

1. Be personalized and engaging
2. Include a clear call-to-action
3. Offer value (discount, free shipping, exclusive offer, etc.)
4. Be between 20-50 words
5. Use a friendly, professional tone
6. Include placeholders like {customerName}, {discount}, {couponCode}, {storeName} for personalization

Format your response as a JSON array of strings, like this:
["Message 1", "Message 2", "Message 3"]

Focus on the goal: ${goal}`;

		const result = await model.generateContent(prompt);
		const response = await result.response;
		const text = response.text();

		// Try to parse JSON response (handle markdown code blocks)
		try {
			// Remove markdown code blocks if present
			let jsonText = text;
			if (text.includes('```json')) {
				jsonText = text.split('```json')[1].split('```')[0].trim();
			} else if (text.includes('```')) {
				jsonText = text.split('```')[1].split('```')[0].trim();
			}
			
			const messages = JSON.parse(jsonText);
			if (Array.isArray(messages) && messages.length > 0) {
				return messages.slice(0, 3); // Ensure we return max 3 messages
			}
		} catch (parseError) {
			console.log('Failed to parse JSON, extracting messages from text:', text);
		}

		// Fallback: Extract messages from text if JSON parsing fails
		const lines = text.split('\n').filter(line => line.trim().length > 0);
		const messages = lines
			.filter(line => line.includes('"') || line.includes("'"))
			.map(line => line.replace(/^[\d\.\-\*\s]*/, '').replace(/^["']|["']$/g, '').trim())
			.filter(msg => msg.length > 10 && msg.length < 200)
			.slice(0, 3);

		if (messages.length > 0) {
			return messages;
		}

		// Final fallback to basic suggestions
		return getFallbackMessages(goal);

	} catch (error) {
		console.error('Error generating AI messages:', error);
		return getFallbackMessages(goal);
	}
}

/**
 * Fallback messages when AI generation fails
 */
function getFallbackMessages(goal: string): string[] {
	const g = goal.trim().toLowerCase();
	
	if (g.includes('inactive') || g.includes('bring back')) {
		return [
			`We miss you, {customerName}! Come back and enjoy 20% off your next order with code WELCOME20.`,
			`Haven't shopped in a while? We've got something special for you - free delivery on orders over $50!`,
			`{customerName}, we've saved your spot! Get 15% off + free shipping when you return to {storeName}.`
		];
	} else if (g.includes('promote') || g.includes('sale') || g.includes('offer')) {
		return [
			`{customerName}, don't miss out! Get up to 30% off on our best-selling items - limited time only!`,
			`Exclusive offer for you: Buy 2 get 1 free on selected items. Use code B2G1FREE at checkout.`,
			`Flash sale alert! Save big on your favorites - up to 50% off ends tonight. Shop now!`
		];
	} else if (g.includes('new') || g.includes('launch') || g.includes('product')) {
		return [
			`{customerName}, we're excited to share our latest collection! Get early access + 10% off.`,
			`Something new is here! Be the first to discover our latest arrivals with free shipping.`,
			`Introducing our newest products! {customerName}, enjoy 15% off your first order of new arrivals.`
		];
	} else {
		return [
			`{customerName}, we have something special for you! Enjoy 20% off your next order with code SPECIAL20.`,
			`Don't miss out on this exclusive offer! Get free shipping + 15% off when you shop today.`,
			`{customerName}, thank you for being a valued customer! Here's 25% off as our way of saying thanks.`
		];
	}
}

/**
 * Legacy function for backward compatibility
 */
export function suggestMessages(goal: string): string[] {
	return getFallbackMessages(goal);
}

export function summarizePerformance(stats: { sent: number; failed: number }): string {
	const total = stats.sent + stats.failed;
	const rate = total ? Math.round((stats.sent / total) * 100) : 0;
	return `Delivered ${stats.sent}/${total} (${rate}%) with ${stats.failed} failures. Consider retrying failures and refining audience.`;
}
