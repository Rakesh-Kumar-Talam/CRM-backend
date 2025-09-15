import { Worker, WorkerOptions } from 'bullmq';
import { redis } from '../queues/connection';
import { OrderModel } from '../models/Order';
import { CustomerModel } from '../models/Customer';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

if (redis) {
	new Worker(
		'orders',
		async (job) => {
			if (job.name === 'create') {
				const data = job.data as any;
				
				// Handle customer_id - could be ObjectId, email, or customer name
				let customerId: mongoose.Types.ObjectId | undefined;
				
				if (mongoose.Types.ObjectId.isValid(data.customer_id)) {
					// It's a valid ObjectId
					customerId = new mongoose.Types.ObjectId(data.customer_id);
				} else {
					// Try to find customer by email or name (only for this user)
					const customer = await CustomerModel.findOne({
						userId: data.userId,
						$or: [
							{ email: data.customer_id },
							{ name: { $regex: data.customer_id, $options: 'i' } }
						]
					});
					
					if (!customer) {
						throw new Error(`Customer not found: ${data.customer_id}`);
					}
					
					customerId = customer._id as mongoose.Types.ObjectId;
				}

				const created = await OrderModel.create({
					userId: data.userId,
					customer_id: customerId,
					amount: data.amount,
					items: data.items || [],
					date: new Date(data.date),
				});
				
				// Return the complete order data with populated customer
				const orderWithCustomer = await OrderModel.findById(created._id)
					.populate('customer_id', 'name email phone')
					.lean();
				
				if (!orderWithCustomer) {
					throw new Error('Order not found after creation');
				}
				
				return {
					id: String(orderWithCustomer._id),
					order: orderWithCustomer,
					message: 'Order created successfully'
				};
			}
		},
		{ connection: redis } as WorkerOptions
	).on('failed', (job, err) => logger.error(`orders.worker failed job ${job?.id}: ${err.message}`));
}
