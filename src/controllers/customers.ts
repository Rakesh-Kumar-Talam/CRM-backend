import { Request, Response } from 'express';
import { enqueueCustomer } from '../queues/customers.queue';
import { CustomerModel } from '../models/Customer';
import { 
	getCustomersWithCalculatedSpend, 
	updateCustomerSpend, 
	refreshAllCustomersSpend as refreshAllCustomersSpendService 
} from '../services/customerSpendCalculation';

export async function ingestCustomer(req: Request, res: Response) {
	const enqueued = await enqueueCustomer(req.body, req.userId);
	if (enqueued) return res.status(202).json({ status: 'queued' });
	const created = await CustomerModel.create({
		...req.body,
		userId: req.userId,
		last_active: req.body.last_active ? new Date(req.body.last_active) : undefined,
	});
	return res.status(201).json({ id: String(created._id) });
}

export async function listCustomers(req: Request, res: Response) {
	try {
		const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
		const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10), 1), 100);
		const skip = (page - 1) * limit;
		const useCalculatedSpend = req.query.calculated_spend === 'true';
		
		let items, total;
		
		if (useCalculatedSpend) {
			// Use calculated spend from orders
			const filter: Record<string, unknown> = { userId: req.userId };
			if (req.query.email) filter.email = req.query.email;
			
			// Get customers with calculated spend
			items = await getCustomersWithCalculatedSpend(limit, skip, req.userId);
			
			// Get total count
			total = await CustomerModel.countDocuments(filter);
		} else {
			// Use regular customer listing
			const filter: Record<string, unknown> = { userId: req.userId };
			if (req.query.email) filter.email = req.query.email;
			
			[items, total] = await Promise.all([
				CustomerModel.find(filter).skip(skip).limit(limit).sort({ created_at: -1 }),
				CustomerModel.countDocuments(filter),
			]);
		}
		
		// Prevent caching to ensure fresh data
		res.set({
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		});
		
		res.json({ items, page, limit, total, calculated_spend: useCalculatedSpend });
	} catch (error) {
		console.error('Error listing customers:', error);
		res.status(500).json({ error: 'Failed to list customers' });
	}
}

export async function updateCustomer(req: Request, res: Response) {
	const { id } = req.params;
	const updateData = { ...req.body };
	
	// Convert last_active to Date if provided
	if (updateData.last_active) {
		updateData.last_active = new Date(updateData.last_active);
	}
	
	try {
		const customer = await CustomerModel.findOneAndUpdate(
			{ _id: id, userId: req.userId },
			updateData,
			{ new: true, runValidators: true }
		);
		
		if (!customer) {
			return res.status(404).json({ error: 'Customer not found' });
		}
		
		// Prevent caching to ensure fresh data
		res.set({
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		});
		
		res.json(customer);
	} catch (error) {
		console.error('Error updating customer:', error);
		res.status(400).json({ error: 'Failed to update customer' });
	}
}

export async function deleteCustomer(req: Request, res: Response) {
	const { id } = req.params;
	
	try {
		const customer = await CustomerModel.findOneAndDelete({ _id: id, userId: req.userId });
		
		if (!customer) {
			return res.status(404).json({ error: 'Customer not found' });
		}
		
		// Prevent caching to ensure fresh data
		res.set({
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		});
		
		res.json({ message: 'Customer deleted successfully', id: customer._id });
	} catch (error) {
		console.error('Error deleting customer:', error);
		res.status(400).json({ error: 'Failed to delete customer' });
	}
}

export async function refreshCustomerSpend(req: Request, res: Response) {
	try {
		const { id } = req.params;
		
		if (!id) {
			return res.status(400).json({ error: 'Customer ID is required' });
		}

		const result = await updateCustomerSpend(id, req.userId);
		
		res.json({
			message: 'Customer spend updated successfully',
			customer: result.customer,
			totalSpend: result.totalSpend
		});
	} catch (error) {
		console.error('Error refreshing customer spend:', error);
		res.status(500).json({ 
			error: 'Failed to refresh customer spend', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}

export async function refreshAllCustomersSpend(req: Request, res: Response) {
	try {
		const result = await refreshAllCustomersSpendService(req.userId);
		
		res.json({
			message: 'All customers spend refreshed successfully',
			updated: result.updated,
			totalCustomers: result.totalCustomers,
			results: result.results
		});
	} catch (error) {
		console.error('Error refreshing all customers spend:', error);
		res.status(500).json({ 
			error: 'Failed to refresh all customers spend', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}
