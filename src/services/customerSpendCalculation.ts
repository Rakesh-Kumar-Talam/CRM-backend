import { CustomerModel } from '../models/Customer';
import { OrderModel } from '../models/Order';

/**
 * Calculates total spend for a specific customer from their orders
 * @param customerId - The ID of the customer
 * @returns Promise with the total spend amount
 */
export async function calculateCustomerSpend(customerId: string, userId?: string): Promise<number> {
	try {
		const filter: any = { customer_id: customerId };
		if (userId) filter.userId = userId;
		
		const orders = await OrderModel.find(filter);
		const totalSpend = orders.reduce((sum, order) => sum + order.amount, 0);
		return totalSpend;
	} catch (error) {
		console.error('Error calculating customer spend:', error);
		throw error;
	}
}

/**
 * Updates the spend field for a specific customer based on their orders
 * @param customerId - The ID of the customer
 * @returns Promise with the updated customer and total spend
 */
export async function updateCustomerSpend(customerId: string, userId?: string): Promise<{ customer: any; totalSpend: number }> {
	try {
		const totalSpend = await calculateCustomerSpend(customerId, userId);
		
		const filter: any = { _id: customerId };
		if (userId) filter.userId = userId;
		
		const customer = await CustomerModel.findOneAndUpdate(
			filter,
			{ spend: totalSpend },
			{ new: true }
		);

		if (!customer) {
			throw new Error('Customer not found');
		}

		return { customer, totalSpend };
	} catch (error) {
		console.error('Error updating customer spend:', error);
		throw error;
	}
}

/**
 * Updates spend for all customers based on their orders
 * @returns Promise with array of updated customers and their spend totals
 */
export async function updateAllCustomersSpend(userId?: string): Promise<Array<{ customer: any; totalSpend: number }>> {
	try {
		const filter: any = {};
		if (userId) filter.userId = userId;
		
		const customers = await CustomerModel.find(filter);
		const results = [];

		for (const customer of customers) {
			const result = await updateCustomerSpend(String(customer._id), userId);
			results.push(result);
		}

		return results;
	} catch (error) {
		console.error('Error updating all customers spend:', error);
		throw error;
	}
}

/**
 * Gets customers with their calculated spend from orders
 * @param limit - Maximum number of customers to return (optional)
 * @param offset - Number of customers to skip (optional)
 * @returns Promise with array of customers and their calculated spend
 */
export async function getCustomersWithCalculatedSpend(limit?: number, offset?: number, userId?: string): Promise<any[]> {
	try {
		// Use aggregation to calculate spend from orders
		const pipeline: any[] = [
			{
				$match: userId ? { userId: new (require('mongoose')).Types.ObjectId(userId) } : {}
			},
			{
				$lookup: {
					from: 'orders',
					localField: '_id',
					foreignField: 'customer_id',
					as: 'orders'
				}
			},
			{
				$addFields: {
					calculated_spend: {
						$sum: '$orders.amount'
					}
				}
			},
			{
				$project: {
					orders: 0 // Exclude the orders array from the result
				}
			},
			{
				$sort: { created_at: -1 as 1 | -1 }
			}
		];

		// Add pagination if specified
		if (offset) {
			pipeline.push({ $skip: offset });
		}
		if (limit) {
			pipeline.push({ $limit: limit });
		}

		const customers = await CustomerModel.aggregate(pipeline);
		return customers;
	} catch (error) {
		console.error('Error getting customers with calculated spend:', error);
		throw error;
	}
}

/**
 * Refreshes spend calculations for all customers and updates their spend field
 * @returns Promise with summary of the refresh operation
 */
export async function refreshAllCustomersSpend(userId?: string): Promise<{
	updated: number;
	totalCustomers: number;
	results: Array<{ customerId: string; name: string; calculatedSpend: number }>;
}> {
	try {
		const results = await updateAllCustomersSpend(userId);
		
		const summary = {
			updated: results.length,
			totalCustomers: results.length,
			results: results.map(r => ({
				customerId: String(r.customer._id),
				name: r.customer.name,
				calculatedSpend: r.totalSpend
			}))
		};

		return summary;
	} catch (error) {
		console.error('Error refreshing all customers spend:', error);
		throw error;
	}
}
