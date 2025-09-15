import { Router } from 'express';
import { authRouter } from './auth';
import { customersRouter } from './customers';
import { ordersRouter } from './orders';
import { segmentsRouter } from './segments';
import { campaignsRouter } from './campaigns';
import { emailDeliveryRouter } from './emailDelivery';
import vendorRouter from './vendor';
import { aiRouter } from './ai';
import { campaignDeliveryRouter } from './campaignDelivery';
import { deliveryRouter } from './delivery';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/segments', segmentsRouter);
apiRouter.use('/campaigns', campaignsRouter);
apiRouter.use('/email', emailDeliveryRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/vendor', vendorRouter);
apiRouter.use('/campaign-delivery', campaignDeliveryRouter);
apiRouter.use('/delivery', deliveryRouter);
