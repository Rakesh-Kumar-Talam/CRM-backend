import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { 
    handleDeliveryReceipt, 
    getDeliveryStats, 
    getCampaignLogs, 
    getSentMessages 
} from '../controllers/deliveryReceipt';

export const deliveryRouter = Router();

// Delivery receipt endpoint (called by vendor API) - no auth required
deliveryRouter.post('/receipt', handleDeliveryReceipt);

// Get delivery statistics - requires auth
deliveryRouter.get('/stats', requireAuth, getDeliveryStats);

// Get communication logs for a specific campaign - requires auth
deliveryRouter.get('/campaigns/:campaignId/logs', requireAuth, getCampaignLogs);

// Get all sent messages for a user - requires auth
deliveryRouter.get('/messages', requireAuth, getSentMessages);
