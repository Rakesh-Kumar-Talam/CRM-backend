import { SegmentModel } from '../models/Segment';
import { CustomerModel } from '../models/Customer';
import { evaluateRule, RuleGroup } from './segmentRules';

/**
 * Populates a segment with customers that match the segment rules
 * @param segmentId - The ID of the segment to populate
 * @returns Promise with the count of customers added to the segment
 */
export async function populateSegmentCustomers(segmentId: string): Promise<number> {
	try {
		const segment = await SegmentModel.findById(segmentId);
		if (!segment) {
			throw new Error('Segment not found');
		}

		// Get all customers from the database (only for the user who created the segment)
		const allCustomers = await CustomerModel.find({ userId: segment.userId }).lean();
		
		// Filter customers based on segment rules
		const matchingCustomers = allCustomers.filter(customer => 
			evaluateRule(customer, segment.rules_json as RuleGroup)
		);

		// Extract customer IDs
		const customerIds = matchingCustomers.map(customer => String(customer._id));

		// Update segment with customer IDs and count
		await SegmentModel.findByIdAndUpdate(segmentId, {
			customer_ids: customerIds,
			customer_count: customerIds.length,
			last_populated_at: new Date()
		});

		return customerIds.length;
	} catch (error) {
		console.error('Error populating segment customers:', error);
		throw error;
	}
}

/**
 * Gets customers that belong to a specific segment
 * @param segmentId - The ID of the segment
 * @param limit - Maximum number of customers to return (optional)
 * @param offset - Number of customers to skip (optional)
 * @returns Promise with array of customer objects
 */
export async function getSegmentCustomers(
	segmentId: string, 
	limit?: number, 
	offset?: number
): Promise<any[]> {
	try {
		if (!segmentId || segmentId === 'undefined') {
			throw new Error('Segment ID is required');
		}
		
		const segment = await SegmentModel.findById(segmentId);
		if (!segment) {
			throw new Error('Segment not found');
		}

		// If segment is not populated or is stale, repopulate it
		if (segment.customer_ids.length === 0 || !segment.last_populated_at) {
			await populateSegmentCustomers(segmentId);
			// Refetch the segment after population
			const updatedSegment = await SegmentModel.findById(segmentId);
			if (!updatedSegment) {
				throw new Error('Segment not found after population');
			}
			segment.customer_ids = updatedSegment.customer_ids;
		}

		// Get customer IDs with pagination
		let customerIds = segment.customer_ids;
		if (offset) {
			customerIds = customerIds.slice(offset);
		}
		if (limit) {
			customerIds = customerIds.slice(0, limit);
		}

		// Fetch customer details (only for the user who created the segment)
		const customers = await CustomerModel.find({
			_id: { $in: customerIds },
			userId: segment.userId
		}).lean();

		return customers;
	} catch (error) {
		console.error('Error getting segment customers:', error);
		throw error;
	}
}

/**
 * Refreshes all segments by repopulating their customers
 * This is useful for batch updates or when customer data changes significantly
 */
export async function refreshAllSegments(userId?: string): Promise<void> {
	try {
		const filter: any = {};
		if (userId) filter.userId = userId;
		
		const segments = await SegmentModel.find(filter);
		
		for (const segment of segments) {
			await populateSegmentCustomers(String(segment._id));
		}
	} catch (error) {
		console.error('Error refreshing all segments:', error);
		throw error;
	}
}
