import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { aiRulesSchema, aiMessagesSchema, aiCampaignMessagesSchema, aiSummarySchema, aiParseSegmentSchema } from '../schemas/ai';
import { parseNaturalLanguageToRules, generateAIMessages, summarizePerformance, parseNaturalLanguageToSegmentRules } from '../services/ai';
import { createSegment } from '../controllers/segments';

export const aiRouter = Router();

aiRouter.post('/rules', requireAuth, validateBody(aiRulesSchema), (req, res) => {
	const { input } = req.body;
	res.json({ rules_json: parseNaturalLanguageToRules(input) });
});

aiRouter.post('/messages', requireAuth, validateBody(aiMessagesSchema), async (req, res) => {
	try {
		const { goal } = req.body;
		console.log('Generating AI messages for goal:', goal);
		
		const suggestions = await generateAIMessages(goal);
		console.log('Generated suggestions:', suggestions);
		
		res.json({ 
			success: true,
			suggestions,
			goal,
			count: suggestions.length
		});
	} catch (error) {
		console.error('Error generating AI messages:', error);
		res.status(500).json({ 
			success: false,
			error: 'Failed to generate AI messages',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

/**
 * Generate AI campaign message suggestions
 * POST /api/ai/generate-message
 */
aiRouter.post('/generate-message', requireAuth, validateBody(aiCampaignMessagesSchema), async (req, res) => {
	try {
		const { goal, segmentType, customerType } = req.body;
		console.log('Generating AI campaign messages for goal:', goal);
		
		// Enhance the goal with additional context
		let enhancedGoal = goal;
		if (segmentType) {
			enhancedGoal += ` for ${segmentType} customers`;
		}
		if (customerType) {
			enhancedGoal += ` (${customerType})`;
		}
		
		const suggestions = await generateAIMessages(enhancedGoal);
		console.log('Generated campaign suggestions:', suggestions);
		
		res.json({ 
			success: true,
			suggestions,
			goal: enhancedGoal,
			count: suggestions.length,
			message: 'AI campaign messages generated successfully'
		});
	} catch (error) {
		console.error('Error generating AI campaign messages:', error);
		res.status(500).json({ 
			success: false,
			error: 'Failed to generate AI campaign messages',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

aiRouter.post('/summary', requireAuth, validateBody(aiSummarySchema), (req, res) => {
	const { sent, failed } = req.body;
	res.json({ summary: summarizePerformance({ sent, failed }) });
});

/**
 * @openapi
 * /api/ai/parse-segment:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Parse natural language description into segment rules using AI
 *     description: Convert natural language descriptions into machine-readable segment rules using Gemini AI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: Natural language description of the customer segment
 *                 example: "Find customers who spent more than 400 and name it Value Customers"
 *     responses:
 *       200:
 *         description: Successfully parsed segment rules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 name:
 *                   type: string
 *                   description: Generated segment name
 *                   example: "Value Customers"
 *                 rules_json:
 *                   type: object
 *                   description: Parsed segment rules
 *                   example: {"field": "spend", "op": ">", "value": 400}
 *                 description:
 *                   type: string
 *                   description: Original input description
 *                 message:
 *                   type: string
 *                   example: "Segment rules parsed successfully"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Description is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to parse segment description"
 *                 details:
 *                   type: string
 *                   example: "AI service unavailable"
 */
aiRouter.post('/parse-segment', requireAuth, validateBody(aiParseSegmentSchema), async (req, res) => {
	try {
		const { description, input } = req.body;
		const segmentDescription = description || input;
		console.log('Parsing segment description:', segmentDescription);
		
		const result = await parseNaturalLanguageToSegmentRules(segmentDescription);
		console.log('Parsed segment rules:', result);
		
		res.json({
			success: true,
			name: result.name,
			rules_json: result.rules,
			description: segmentDescription,
			message: 'Segment rules parsed successfully'
		});
	} catch (error) {
		console.error('Error parsing segment description:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to parse segment description',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

/**
 * @openapi
 * /api/ai/create-segment:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Create segment from natural language description using AI
 *     description: Parse natural language description and create a segment in one step using Gemini AI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: Natural language description of the customer segment
 *                 example: "VIP customers who spent over 2000 dollars"
 *     responses:
 *       201:
 *         description: Segment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Created segment ID
 *                   example: "507f1f77bcf86cd799439013"
 *                 name:
 *                   type: string
 *                   description: Generated segment name
 *                   example: "VIP Customers"
 *                 customer_count:
 *                   type: integer
 *                   description: Number of customers matching the segment
 *                   example: 42
 *                 message:
 *                   type: string
 *                   example: "Segment created with 42 customers"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Description is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to create segment from description"
 *                 details:
 *                   type: string
 *                   example: "AI service unavailable"
 */
aiRouter.post('/create-segment', requireAuth, validateBody(aiParseSegmentSchema), async (req, res) => {
	try {
		const { description, input } = req.body;
		const segmentDescription = description || input;
		console.log('Creating segment from description:', segmentDescription);
		
		// Parse the natural language description
		const parsedResult = await parseNaturalLanguageToSegmentRules(segmentDescription);
		console.log('Parsed segment rules:', parsedResult);
		
		// Create the segment using the existing createSegment controller
		const segmentRequest = {
			...req,
			body: {
				name: parsedResult.name,
				rules_json: parsedResult.rules
			}
		};
		
		// Call the existing createSegment function
		await createSegment(segmentRequest as any, res);
		
	} catch (error) {
		console.error('Error creating segment from description:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create segment from description',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

/**
 * Create segment from pre-parsed rules (for frontend workflow)
 * POST /api/ai/create-segment-from-rules
 */
aiRouter.post('/create-segment-from-rules', requireAuth, async (req, res) => {
	try {
		const { name, rules_json } = req.body;
		console.log('Creating segment from pre-parsed rules:', { name, rules_json });
		
		// Validate required fields
		if (!name || !rules_json) {
			return res.status(400).json({
				success: false,
				error: 'Name and rules_json are required'
			});
		}
		
		// Create the segment using the existing createSegment controller
		const segmentRequest = {
			...req,
			body: {
				name,
				rules_json
			}
		};
		
		// Call the existing createSegment function
		await createSegment(segmentRequest as any, res);
		
	} catch (error) {
		console.error('Error creating segment from rules:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create segment from rules',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

