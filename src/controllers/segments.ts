import { Request, Response } from 'express';
import { SegmentModel } from '../models/Segment';
import { CustomerModel } from '../models/Customer';
import { evaluateRule, RuleGroup } from '../services/segmentRules';
import { populateSegmentCustomers, getSegmentCustomers as getSegmentCustomersService } from '../services/segmentPopulation';

// Helper function to fix rule structure
function fixRuleStructure(rules: any): any {
	if (rules.and) {
		return {
			and: rules.and.map((rule: any) => ({
				field: rule.field,
				op: rule.operator || rule.op, // Use operator if it exists, otherwise op
				value: rule.value
			})),
			or: rules.or || []
		};
	} else if (rules.or) {
		return {
			and: rules.and || [],
			or: rules.or.map((rule: any) => ({
				field: rule.field,
				op: rule.operator || rule.op,
				value: rule.value
			}))
		};
	} else if (rules.field) {
		return {
			field: rules.field,
			op: rules.operator || rules.op,
			value: rules.value
		};
	}
	return rules;
}

export async function createSegment(req: Request, res: Response) {
	try {
		// Fix the rule structure before saving
		const fixedRules = fixRuleStructure(req.body.rules_json);
		
		const seg = await SegmentModel.create({ 
			userId: req.userId!,
			name: req.body.name, 
			rules_json: fixedRules, 
			created_by: req.userId! 
		});

		// Auto-populate customers for the new segment
		try {
			const customerCount = await populateSegmentCustomers(String(seg._id));
			res.status(201).json({ 
				id: String(seg._id), 
				name: seg.name,
				customer_count: customerCount,
				message: `Segment created with ${customerCount} customers`
			});
		} catch (populateError) {
			console.error('Error populating segment customers:', populateError);
			// Still return success but with a warning
			res.status(201).json({ 
				id: String(seg._id), 
				name: seg.name,
				customer_count: 0,
				warning: 'Segment created but customer population failed'
			});
		}
	} catch (error) {
		console.error('Error creating segment:', error);
		res.status(500).json({ 
			error: 'Failed to create segment', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}

export async function listSegments(req: Request, res: Response) {
	try {
		const segments = await SegmentModel.find({ userId: req.userId }).sort({ created_at: -1 }).limit(200);
		
		// Ensure customer counts are up to date for each segment
		const segmentsWithCounts = await Promise.all(segments.map(async (segment) => {
			// If customer_count is 0 or last_populated_at is old, refresh it
			if (segment.customer_count === 0 || !segment.last_populated_at || 
				Date.now() - segment.last_populated_at.getTime() > 5 * 60 * 1000) { // 5 minutes
				try {
					await populateSegmentCustomers(String(segment._id));
					// Refetch the segment to get updated count
					const updatedSegment = await SegmentModel.findById(segment._id);
					return updatedSegment || segment;
				} catch (populateError) {
					console.error(`Error populating segment ${segment._id}:`, populateError);
					return segment; // Return original segment if population fails
				}
			}
			return segment;
		}));
		
		// Prevent caching to ensure fresh data
		res.set({
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		});
		
		res.json({ items: segmentsWithCounts });
	} catch (error) {
		console.error('Error fetching segments:', error);
		res.status(500).json({ 
			error: 'Failed to fetch segments', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}

export async function getSegment(req: Request, res: Response) {
	try {
		const { id } = req.params;
		
		if (!id) {
			return res.status(400).json({ error: 'Segment ID is required' });
		}
		
		const segment = await SegmentModel.findOne({ _id: id, userId: req.userId });
		
		if (!segment) {
			return res.status(404).json({ error: 'Segment not found' });
		}
		
		// Prevent caching to ensure fresh data
		res.set({
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		});
		
		res.json(segment);
	} catch (error) {
		console.error('Error fetching segment:', error);
		res.status(500).json({ 
			error: 'Failed to fetch segment', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}

export async function updateSegment(req: Request, res: Response) {
	try {
		const { id } = req.params;
		
		if (!id) {
			return res.status(400).json({ error: 'Segment ID is required' });
		}

		// Fix the rule structure if rules_json is being updated
		const updateData = { ...req.body };
		if (updateData.rules_json) {
			updateData.rules_json = fixRuleStructure(updateData.rules_json);
		}
		
		const segment = await SegmentModel.findOneAndUpdate(
			{ _id: id, userId: req.userId },
			updateData,
			{ new: true, runValidators: true }
		);
		
		if (!segment) {
			return res.status(404).json({ error: 'Segment not found' });
		}

		// Re-populate customers if rules were updated
		if (req.body.rules_json) {
			try {
				const customerCount = await populateSegmentCustomers(id);
				// Refetch the segment to get updated customer count
				const updatedSegment = await SegmentModel.findById(id);
				res.json({
					...updatedSegment?.toObject(),
					message: `Segment updated with ${customerCount} customers`
				});
			} catch (populateError) {
				console.error('Error repopulating segment customers:', populateError);
				res.json({
					...segment.toObject(),
					warning: 'Segment updated but customer repopulation failed'
				});
			}
		} else {
			res.json(segment);
		}
		
		// Prevent caching to ensure fresh data
		res.set({
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		});
	} catch (error) {
		console.error('Error updating segment:', error);
		res.status(500).json({ 
			error: 'Failed to update segment', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}

export async function deleteSegment(req: Request, res: Response) {
	try {
		const { id } = req.params;
		
		if (!id) {
			return res.status(400).json({ error: 'Segment ID is required' });
		}
		
		const segment = await SegmentModel.findOneAndDelete({ _id: id, userId: req.userId });
		
		if (!segment) {
			return res.status(404).json({ error: 'Segment not found' });
		}
		
		res.json({ message: 'Segment deleted successfully', id: String(segment._id) });
	} catch (error) {
		console.error('Error deleting segment:', error);
		res.status(500).json({ 
			error: 'Failed to delete segment', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}

export async function previewSegment(req: Request, res: Response) {
	const seg = await SegmentModel.findOne({ _id: req.params.id, userId: req.userId });
	if (!seg) return res.status(404).json({ error: 'Segment not found' });
	const customers = await CustomerModel.find({ userId: req.userId }).limit(5000); // cap for preview
	const count = customers.filter((c) => evaluateRule(c, seg.rules_json as RuleGroup)).length;
	res.json({ count });
}

export async function getSegmentCustomers(req: Request, res: Response) {
	try {
		const { id } = req.params;
		const { limit, offset } = req.query;
		
		if (!id || id === 'undefined') {
			return res.status(400).json({ error: 'Segment ID is required' });
		}

		const limitNum = limit ? parseInt(limit as string, 10) : undefined;
		const offsetNum = offset ? parseInt(offset as string, 10) : undefined;

		const customers = await getSegmentCustomersService(id, limitNum, offsetNum);
		
		// Get total count for pagination info
		const segment = await SegmentModel.findById(id);
		const totalCount = segment?.customer_count || 0;

		res.json({
			customers,
			pagination: {
				total: totalCount,
				limit: limitNum,
				offset: offsetNum || 0,
				returned: customers.length
			}
		});
	} catch (error) {
		console.error('Error getting segment customers:', error);
		res.status(500).json({ 
			error: 'Failed to get segment customers', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}

export async function downloadSegmentCustomers(req: Request, res: Response) {
	try {
		const { id } = req.params;
		
		if (!id) {
			return res.status(400).json({ error: 'Segment ID is required' });
		}

		// Get segment info
		const segment = await SegmentModel.findOne({ _id: id, userId: req.userId });
		if (!segment) {
			return res.status(404).json({ error: 'Segment not found' });
		}

		// Get all customers in the segment
		const customers = await getSegmentCustomersService(id);

		// Create Excel file
		const XLSX = require('xlsx');
		const worksheet = XLSX.utils.json_to_sheet(customers.map(customer => ({
			'Customer ID': String(customer._id),
			'Name': customer.name,
			'Email': customer.email,
			'Phone': customer.phone || '',
			'Total Spend': customer.spend || 0,
			'Total Visits': customer.visits || 0,
			'Last Active': customer.last_active ? new Date(customer.last_active).toLocaleDateString() : 'Never',
			'Created At': new Date(customer.created_at).toLocaleDateString()
		})));

		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

		// Generate buffer
		const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

		// Set headers for file download
		const filename = `${segment.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_customers.xlsx`;
		res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.setHeader('Content-Length', excelBuffer.length);

		res.send(excelBuffer);
	} catch (error) {
		console.error('Error downloading segment customers:', error);
		res.status(500).json({ 
			error: 'Failed to download segment customers', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}
