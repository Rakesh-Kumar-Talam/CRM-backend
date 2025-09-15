import { Request, Response } from 'express';
import { enqueueOrder } from '../queues/orders.queue';
import { OrderModel } from '../models/Order';
import { CustomerModel } from '../models/Customer';
import mongoose from 'mongoose';

export async function ingestOrder(req: Request, res: Response) {
	try {
		console.log('Creating order with data:', JSON.stringify(req.body, null, 2));
		console.log('User ID:', req.userId);

		// Handle customer_id - could be ObjectId, email, or customer name
		let customerId: mongoose.Types.ObjectId | undefined;
		
		if (mongoose.Types.ObjectId.isValid(req.body.customer_id)) {
			// It's a valid ObjectId
			customerId = new mongoose.Types.ObjectId(req.body.customer_id);
			console.log('Using customer ID as ObjectId:', customerId);
		} else {
			// Try to find customer by email or name (only for this user)
			console.log('Looking up customer by email/name:', req.body.customer_id);
			
			// Extract email from format like "kumar (kum@gmail.com)"
			let searchEmail = req.body.customer_id;
			let searchName = req.body.customer_id;
			
			// Check if it's in the format "name (email)"
			const emailMatch = req.body.customer_id.match(/\(([^)]+)\)/);
			if (emailMatch) {
				searchEmail = emailMatch[1];
				searchName = req.body.customer_id.replace(/\s*\([^)]+\)/, '').trim();
			}
			
			console.log('Searching for email:', searchEmail, 'and name:', searchName);
			
			const customer = await CustomerModel.findOne({
				userId: req.userId,
				$or: [
					{ email: searchEmail },
					{ email: req.body.customer_id },
					{ name: { $regex: searchName, $options: 'i' } },
					{ name: { $regex: req.body.customer_id, $options: 'i' } }
				]
			});
			
			if (!customer) {
				console.log('Customer not found for:', req.body.customer_id);
				return res.status(400).json({ 
					error: 'Customer not found', 
					details: `No customer found with ID, email, or name: ${req.body.customer_id}` 
				});
			}
			
			customerId = customer._id as mongoose.Types.ObjectId;
			console.log('Found customer:', customer.name, customer.email);
		}

		// Check if queue is available, but always create order directly for now
		// to ensure consistent response format
		const enqueued = await enqueueOrder(req.body, req.userId);
		if (enqueued) {
			// Queue is available but we'll create directly to ensure proper response
			console.log('Order queued for background processing');
		}

		console.log('Creating order with items:', req.body.items);
		const created = await OrderModel.create({
			userId: req.userId,
			customer_id: customerId,
			amount: req.body.amount,
			items: req.body.items || [],
			date: new Date(req.body.date),
		});
		
		console.log('Order created with ID:', created._id);
		
		// Return the complete order data
		const orderWithCustomer = await OrderModel.findById(created._id)
			.populate('customer_id', 'name email phone')
			.lean();
		
		if (!orderWithCustomer) {
			console.error('Order not found after creation:', created._id);
			return res.status(500).json({ 
				error: 'Order created but could not be retrieved', 
				details: 'Order was created but could not be found in database' 
			});
		}
		
		console.log('Order with customer data:', JSON.stringify(orderWithCustomer, null, 2));
		
		return res.status(201).json({
			id: String(orderWithCustomer._id),
			order: orderWithCustomer,
			message: 'Order created successfully'
		});
	} catch (error) {
		console.error('Error creating order:', error);
		return res.status(500).json({ 
			error: 'Failed to create order', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}

export async function listOrders(req: Request, res: Response) {
	try {
		console.log('Listing orders for user:', req.userId);
		console.log('User ID type:', typeof req.userId);
		
		if (!req.userId) {
			return res.status(401).json({ error: 'User not authenticated' });
		}
		
		// Check if database is connected
		const connectionState = mongoose.connection.readyState;
		if (connectionState !== 1) {
			console.log('Database not connected, waiting...');
			await new Promise(resolve => setTimeout(resolve, 1000));
			if (mongoose.connection.readyState !== 1) {
				return res.status(500).json({ error: 'Database not connected' });
			}
		}
		
		// Convert userId to ObjectId if it's a string
		let userId: mongoose.Types.ObjectId | string = req.userId;
		if (typeof userId === 'string') {
			userId = new mongoose.Types.ObjectId(userId);
		}
		
		console.log('Querying with userId:', userId);
		const items = await OrderModel.find({ userId: userId }).sort({ date: -1 }).limit(200);
		console.log('Found orders:', items.length);
		
		// Prevent caching to ensure fresh data
		res.set({
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		});
		
		res.json({ items });
	} catch (error) {
		console.error('Error listing orders:', error);
		res.status(500).json({ 
			error: 'Failed to fetch orders', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}

export async function getOrder(req: Request, res: Response) {
	try {
		const { id } = req.params;
		
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ error: 'Invalid order ID' });
		}
		
		const order = await OrderModel.findOne({ _id: id, userId: req.userId });
		
		if (!order) {
			return res.status(404).json({ error: 'Order not found' });
		}
		
		// Prevent caching to ensure fresh data
		res.set({
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		});
		
		res.json(order);
	} catch (error) {
		console.error('Error fetching order:', error);
		res.status(500).json({ 
			error: 'Failed to fetch order', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}

export async function updateOrder(req: Request, res: Response) {
	try {
		const { id } = req.params;
		
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ error: 'Invalid order ID' });
		}
		
		// Handle customer_id if provided
		let updateData = { ...req.body };
		
		if (updateData.customer_id) {
			if (mongoose.Types.ObjectId.isValid(updateData.customer_id)) {
				updateData.customer_id = new mongoose.Types.ObjectId(updateData.customer_id);
			} else {
				// Try to find customer by email or name (only for this user)
				const customer = await CustomerModel.findOne({
					userId: req.userId,
					$or: [
						{ email: updateData.customer_id },
						{ name: { $regex: updateData.customer_id, $options: 'i' } }
					]
				});
				
				if (!customer) {
					return res.status(400).json({ 
						error: 'Customer not found', 
						details: `No customer found with ID, email, or name: ${updateData.customer_id}` 
					});
				}
				
				updateData.customer_id = customer._id;
			}
		}
		
		// Convert date if provided
		if (updateData.date) {
			updateData.date = new Date(updateData.date);
		}
		
		const order = await OrderModel.findOneAndUpdate(
			{ _id: id, userId: req.userId },
			updateData,
			{ new: true, runValidators: true }
		);
		
		if (!order) {
			return res.status(404).json({ error: 'Order not found' });
		}
		
		// Prevent caching to ensure fresh data
		res.set({
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		});
		
		res.json(order);
	} catch (error) {
		console.error('Error updating order:', error);
		res.status(500).json({ 
			error: 'Failed to update order', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}

export async function deleteOrder(req: Request, res: Response) {
	try {
		const { id } = req.params;
		
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ error: 'Invalid order ID' });
		}
		
		const order = await OrderModel.findOneAndDelete({ _id: id, userId: req.userId });
		
		if (!order) {
			return res.status(404).json({ error: 'Order not found' });
		}
		
		res.json({ message: 'Order deleted successfully', id: String(order._id) });
	} catch (error) {
		console.error('Error deleting order:', error);
		res.status(500).json({ 
			error: 'Failed to delete order', 
			details: error instanceof Error ? error.message : 'Unknown error' 
		});
	}
}
