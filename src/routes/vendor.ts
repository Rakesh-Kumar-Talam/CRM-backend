import express from 'express';
import axios from 'axios';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Dummy Vendor API that simulates message sending
 * Simulates 90% success, 10% failure rate
 */
router.post('/send', async (req, res) => {
    try {
        const { customerId, campaignId, message, messageId } = req.body;

        // Validate required fields
        if (!customerId || !campaignId || !message || !messageId) {
            return res.status(400).json({
                error: 'Missing required fields',
                details: 'customerId, campaignId, message, and messageId are required'
            });
        }

        logger.info(`📤 Vendor API received message for customer ${customerId}, campaign ${campaignId}`);

        // Simulate processing delay (1-3 seconds)
        const processingDelay = Math.random() * 2000 + 1000;
        await new Promise(resolve => setTimeout(resolve, processingDelay));

        // Simulate 90% success, 10% failure
        const isSuccess = Math.random() < 0.9;
        const status = isSuccess ? 'SENT' : 'FAILED';
        
        // Generate realistic error messages for failures
        const errorMessages = [
            'Invalid email address',
            'Recipient mailbox full',
            'Domain not found',
            'Recipient blocked sender',
            'Temporary delivery failure',
            'Network timeout',
            'Recipient server unavailable',
            'Message too large',
            'Spam filter blocked',
            'Authentication failed'
        ];

        const errorMessage = !isSuccess ? errorMessages[Math.floor(Math.random() * errorMessages.length)] : undefined;

        logger.info(`🎲 Vendor API simulation result: ${status} for message ${messageId}`);

        // Call Delivery Receipt API to update the status
        try {
            const deliveryReceiptUrl = process.env.DELIVERY_RECEIPT_URL || 'http://localhost:4000/api/delivery-receipt';
            
            await axios.post(deliveryReceiptUrl, {
                messageId: messageId,
                status: status,
                deliveredAt: new Date().toISOString(),
                errorMessage: errorMessage
            });

            logger.info(`✅ Delivery receipt sent for message ${messageId}: ${status}`);
        } catch (receiptError) {
            logger.error(`❌ Failed to send delivery receipt for message ${messageId}:`, receiptError);
            // Don't fail the vendor API call if delivery receipt fails
        }

        res.json({ 
            success: true, 
            simulatedStatus: status,
            messageId: messageId,
            processedAt: new Date().toISOString(),
            errorMessage: errorMessage
        });

    } catch (error) {
        logger.error('❌ Vendor API error:', error);
        res.status(500).json({
            error: 'Vendor API error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Health check endpoint for vendor API
 */
router.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'Vendor API',
        timestamp: new Date().toISOString()
    });
});

export default router;