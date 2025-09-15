import { Worker, WorkerOptions } from 'bullmq';
import { redis } from '../queues/connection';
import { CustomerModel } from '../models/Customer';
import { logger } from '../utils/logger';

if (redis) {
	new Worker(
		'customers',
		async (job) => {
			if (job.name === 'create') {
				const data = job.data as any;
				const created = await CustomerModel.create({
					...data,
					userId: data.userId, // Ensure userId is included
					last_active: data.last_active ? new Date(data.last_active) : undefined,
				});
				return { id: String(created._id) };
			}
		},
		{ connection: redis } as WorkerOptions
	).on('failed', (job, err) => logger.error(`customers.worker failed job ${job?.id}: ${err.message}`));
}
