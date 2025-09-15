import { Request, Response } from 'express';
import { CommunicationLogModel, DeliveryStatus } from '../models/CommunicationLog';
import { SentMessageModel } from '../models/SentMessage';
import { logger } from '../utils/logger';

export interface DeliveryReceiptRequest {
    messageId: string;
    status: 'SENT' | 'FAILED';
    deliveredAt: string;
    errorMessage?: string;
    customerId?: string;
    campaignId?: string;
}

/**
 * Delivery Receipt API endpoint
 * This endpoint is called by the vendor API to update delivery status
 */
export async function handleDeliveryReceipt(req: Request, res: Response) {
    try {
        const { messageId, status, deliveredAt, errorMessage, customerId, campaignId }: DeliveryReceiptRequest = req.body;

        // Validate required fields
        if (!messageId || !status || !deliveredAt) {
            return res.status(400).json({
                error: 'Missing required fields',
                details: 'messageId, status, and deliveredAt are required'
            });
        }

        // Validate status
        if (!['SENT', 'FAILED'].includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                details: 'Status must be either SENT or FAILED'
            });
        }

        // Find the communication log entry by messageId or by customerId/campaignId combination
        let communicationLog;
        if (messageId) {
            communicationLog = await CommunicationLogModel.findOne({
                vendor_message_id: messageId
            });
        } else if (customerId && campaignId) {
            communicationLog = await CommunicationLogModel.findOne({
                customer_id: customerId,
                campaign_id: campaignId
            });
        }

        if (!communicationLog) {
            logger.warn(`⚠️ Delivery receipt received for unknown message: ${messageId || `${customerId}/${campaignId}`}`);
            return res.status(404).json({
                error: 'Message not found',
                details: `No communication log found for message ID: ${messageId || `${customerId}/${campaignId}`}`
            });
        }

        // Update the delivery status in CommunicationLogModel
        const updateData: any = {
            status: status as DeliveryStatus,
            updated_at: new Date()
        };

        if (status === 'SENT') {
            updateData.sent_at = new Date(deliveredAt);
        } else if (status === 'FAILED' && errorMessage) {
            updateData.error_message = errorMessage;
        }

        await CommunicationLogModel.findByIdAndUpdate(
            communicationLog._id,
            updateData
        );

        // Also update the SentMessageModel for consistency
        const sentMessageUpdateData: any = {
            status: status,
            sentAt: new Date(deliveredAt)
        };

        if (status === 'FAILED' && errorMessage) {
            sentMessageUpdateData.errorMessage = errorMessage;
        }

        await SentMessageModel.findOneAndUpdate(
            { messageId: messageId },
            sentMessageUpdateData
        );

        logger.info(`✅ Delivery receipt processed for message ${messageId}: ${status}`);

        res.json({
            success: true,
            message: 'Delivery receipt processed successfully',
            messageId: messageId,
            status: status,
            updatedAt: new Date()
        });

    } catch (error) {
        logger.error('❌ Error processing delivery receipt:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Get delivery statistics for a user
 */
export async function getDeliveryStats(req: Request, res: Response) {
    try {
        const userId = req.userId;
        const { campaignId } = req.query;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const mongoose = require('mongoose');
        const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
        if (campaignId) {
            filter.campaign_id = new mongoose.Types.ObjectId(campaignId);
        }

        // Get delivery statistics from SentMessageModel
        console.log('Debug - Filter for stats query:', filter);
        
        // First, let's check if there are any sent messages at all
        const totalMessages = await SentMessageModel.countDocuments(filter);
        console.log('Debug - Total sent messages found:', totalMessages);
        
        // Get a sample message to see the structure
        const sampleMessage = await SentMessageModel.findOne(filter);
        console.log('Debug - Sample message structure:', sampleMessage ? {
            userId: sampleMessage.userId,
            status: sampleMessage.status,
            messageId: sampleMessage.messageId
        } : 'No messages found');
        
        const stats = await SentMessageModel.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log('Debug - Raw stats from database:', stats);

        // Format stats
        const formattedStats: Record<string, number> = {
            PENDING: 0,
            QUEUED: 0,
            SENT: 0,
            FAILED: 0
        };

        stats.forEach(stat => {
            formattedStats[stat._id] = stat.count;
        });

        const total = Object.values(formattedStats).reduce((sum, count) => sum + count, 0);
        const successRate = total > 0 ? ((formattedStats.SENT / total) * 100).toFixed(2) : '0.00';

        console.log('Debug - Formatted stats:', formattedStats);
        console.log('Debug - Total messages:', total);

        res.json({
            stats: formattedStats,
            total: total,
            successRate: `${successRate}%`,
            campaignId: campaignId || 'all'
        });

    } catch (error) {
        logger.error('❌ Error getting delivery stats:', error);
        res.status(500).json({
            error: 'Failed to get delivery statistics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Get communication logs for a campaign
 */
export async function getCampaignLogs(req: Request, res: Response) {
    try {
        const userId = req.userId;
        const { campaignId } = req.params;
        const { limit = 100, offset = 0 } = req.query;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!campaignId) {
            return res.status(400).json({ error: 'Campaign ID is required' });
        }

        const limitNum = parseInt(limit as string, 10);
        const offsetNum = parseInt(offset as string, 10);

        const mongoose = require('mongoose');
        const logs = await CommunicationLogModel.find({
            campaign_id: new mongoose.Types.ObjectId(campaignId),
            userId: new mongoose.Types.ObjectId(userId)
        })
        .populate('customer_id', 'name email')
        .sort({ created_at: -1 })
        .limit(limitNum)
        .skip(offsetNum);

        const total = await CommunicationLogModel.countDocuments({
            campaign_id: new mongoose.Types.ObjectId(campaignId),
            userId: new mongoose.Types.ObjectId(userId)
        });

        res.json({
            logs: logs,
            pagination: {
                total: total,
                limit: limitNum,
                offset: offsetNum,
                returned: logs.length
            }
        });

    } catch (error) {
        logger.error('❌ Error getting campaign logs:', error);
        res.status(500).json({
            error: 'Failed to get campaign logs',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Get all sent messages for a user
 */
export async function getSentMessages(req: Request, res: Response) {
    try {
        const userId = req.userId;
        const { limit = 100, offset = 0, status } = req.query;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const limitNum = parseInt(limit as string, 10);
        const offsetNum = parseInt(offset as string, 10);

        const mongoose = require('mongoose');
        const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
        if (status) {
            filter.status = status;
        }

        const messages = await SentMessageModel.find(filter)
        .populate('campaignId', 'message subject status created_at')
        .sort({ sentAt: -1 })
        .limit(limitNum)
        .skip(offsetNum);

        const total = await SentMessageModel.countDocuments(filter);

        res.json({
            messages: messages,
            pagination: {
                total: total,
                limit: limitNum,
                offset: offsetNum,
                returned: messages.length
            }
        });

    } catch (error) {
        logger.error('❌ Error getting sent messages:', error);
        res.status(500).json({
            error: 'Failed to get sent messages',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
