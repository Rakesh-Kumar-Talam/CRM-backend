import { Request, Response } from 'express';
import { CommunicationLogModel } from '../models/CommunicationLog';
import { CampaignModel } from '../models/Campaign';
import { SegmentModel } from '../models/Segment';
import { SentMessageModel } from '../models/SentMessage';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

/**
 * Get real campaign statistics from communication logs
 * This replaces frontend random number generation with actual DB data
 */
export async function getCampaignStats(req: Request, res: Response) {
    try {
        const { campaignId } = req.params;
        const userId = req.userId;

        if (!campaignId) {
            return res.status(400).json({
                error: 'Campaign ID is required'
            });
        }

        if (!userId) {
            return res.status(401).json({
                error: 'User not authenticated'
            });
        }

        // Get real counts from communication logs
        const total = await CommunicationLogModel.countDocuments({ 
            campaign_id: campaignId,
            userId: userId 
        });

        const sent = await CommunicationLogModel.countDocuments({ 
            campaign_id: campaignId,
            userId: userId,
            status: 'SENT'
        });

        const failed = await CommunicationLogModel.countDocuments({ 
            campaign_id: campaignId,
            userId: userId,
            status: 'FAILED'
        });

        const pending = await CommunicationLogModel.countDocuments({ 
            campaign_id: campaignId,
            userId: userId,
            status: 'PENDING'
        });

        const queued = await CommunicationLogModel.countDocuments({ 
            campaign_id: campaignId,
            userId: userId,
            status: 'QUEUED'
        });

        // Calculate rates
        const deliveryRate = total > 0 ? ((sent + failed) / total) * 100 : 0;
        const successRate = total > 0 ? (sent / total) * 100 : 0;
        const failureRate = total > 0 ? (failed / total) * 100 : 0;

        // Get recent activity (last 10 log entries)
        const recentActivity = await CommunicationLogModel.find({
            campaign_id: campaignId,
            userId: userId
        })
        .populate('customer_id', 'name email')
        .sort({ updated_at: -1 })
        .limit(10)
        .select('status customer_id updated_at error_message');

        const stats = {
            total,
            sent,
            failed,
            pending,
            queued,
            deliveryRate: Math.round(deliveryRate * 100) / 100, // Round to 2 decimal places
            successRate: Math.round(successRate * 100) / 100,
            failureRate: Math.round(failureRate * 100) / 100,
            recentActivity: recentActivity.map(log => ({
                customerName: (log.customer_id as any)?.name || 'Unknown',
                customerEmail: (log.customer_id as any)?.email || 'Unknown',
                status: log.status,
                updatedAt: log.updated_at,
                errorMessage: log.error_message
            }))
        };

        logger.info(`📊 Campaign stats for ${campaignId}: Total=${total}, Sent=${sent}, Failed=${failed}, Pending=${pending}`);

        res.json({
            success: true,
            campaignId,
            stats
        });

    } catch (error) {
        logger.error('❌ Error getting campaign stats:', error);
        res.status(500).json({
            error: 'Failed to get campaign statistics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Get campaign stats summary for multiple campaigns
 */
export async function getCampaignsStatsSummary(req: Request, res: Response) {
    try {
        const userId = req.userId;
        const { campaignIds } = req.body;

        if (!userId) {
            return res.status(401).json({
                error: 'User not authenticated'
            });
        }

        if (!campaignIds || !Array.isArray(campaignIds)) {
            return res.status(400).json({
                error: 'Campaign IDs array is required'
            });
        }

        const campaignsStats = [];

        for (const campaignId of campaignIds) {
            const total = await CommunicationLogModel.countDocuments({ 
                campaign_id: campaignId,
                userId: userId 
            });

            const sent = await CommunicationLogModel.countDocuments({ 
                campaign_id: campaignId,
                userId: userId,
                status: 'SENT'
            });

            const failed = await CommunicationLogModel.countDocuments({ 
                campaign_id: campaignId,
                userId: userId,
                status: 'FAILED'
            });

            const pending = await CommunicationLogModel.countDocuments({ 
                campaign_id: campaignId,
                userId: userId,
                status: 'PENDING'
            });

            const successRate = total > 0 ? (sent / total) * 100 : 0;

            campaignsStats.push({
                campaignId,
                total,
                sent,
                failed,
                pending,
                successRate: Math.round(successRate * 100) / 100
            });
        }

        res.json({
            success: true,
            campaigns: campaignsStats
        });

    } catch (error) {
        logger.error('❌ Error getting campaigns stats summary:', error);
        res.status(500).json({
            error: 'Failed to get campaigns statistics summary',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Get comprehensive campaign statistics with segment breakdown
 * Shows success rate for each campaign with respect to messages sent and failed, organized by segments
 */
export async function getCampaignStatsWithSegmentBreakdown(req: Request, res: Response) {
    try {
        const { campaignId } = req.params;
        const userId = req.userId;

        console.log('🔍 Debug - Campaign ID from params:', campaignId);
        console.log('🔍 Debug - User ID:', userId);
        console.log('🔍 Debug - Full params:', req.params);

        if (!campaignId) {
            return res.status(400).json({
                error: 'Campaign ID is required'
            });
        }

        if (!userId) {
            return res.status(401).json({
                error: 'User not authenticated'
            });
        }

        // Get campaign details with segment information
        const campaign = await CampaignModel.findOne({ 
            _id: campaignId, 
            userId: userId 
        }).populate('segment_id', 'name rules_json customer_count');

        if (!campaign) {
            return res.status(404).json({
                error: 'Campaign not found'
            });
        }

        // Get overall campaign statistics
        const overallStats = await getOverallCampaignStats(campaignId, userId);

        // Get segment-specific statistics
        const segmentStats = await getSegmentSpecificStats(campaignId, userId, campaign.segment_id._id);

        // Get detailed message breakdown by status
        const messageBreakdown = await getMessageBreakdown(campaignId, userId);

        // Get recent activity
        const recentActivity = await CommunicationLogModel.find({
            campaign_id: campaignId,
            userId: userId
        })
        .populate('customer_id', 'name email')
        .sort({ updated_at: -1 })
        .limit(10)
        .select('status customer_id updated_at error_message');

        const response = {
            success: true,
            campaignId,
            campaign: {
                id: campaign._id,
                message: campaign.message,
                subject: campaign.subject,
                status: campaign.status,
                createdAt: campaign.created_at,
                segment: {
                    id: campaign.segment_id._id,
                    name: (campaign.segment_id as any).name || 'Unknown Segment',
                    customerCount: (campaign.segment_id as any).customer_count || 0
                }
            },
            overallStats,
            segmentStats,
            messageBreakdown,
            recentActivity: recentActivity.map(log => ({
                customerName: (log.customer_id as any)?.name || 'Unknown',
                customerEmail: (log.customer_id as any)?.email || 'Unknown',
                status: log.status,
                updatedAt: log.updated_at,
                errorMessage: log.error_message
            }))
        };

        logger.info(`📊 Enhanced campaign stats for ${campaignId}: Total=${overallStats.total}, Sent=${overallStats.sent}, Failed=${overallStats.failed}, Success Rate=${overallStats.successRate}%`);

        res.json(response);

    } catch (error) {
        logger.error('❌ Error getting enhanced campaign stats:', error);
        res.status(500).json({
            error: 'Failed to get enhanced campaign statistics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Get all campaigns with their success rates and segment information
 */
export async function getAllCampaignsWithSuccessRates(req: Request, res: Response) {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({
                error: 'User not authenticated'
            });
        }

        // Get all campaigns for the user with segment information
        const campaigns = await CampaignModel.find({ userId: userId })
            .populate('segment_id', 'name customer_count')
            .sort({ created_at: -1 });

        const campaignsWithStats = await Promise.all(
            campaigns.map(async (campaign) => {
                const stats = await getOverallCampaignStats((campaign._id as any).toString(), userId);
                const segmentId = campaign.segment_id ? (campaign.segment_id as any)._id || campaign.segment_id : null;
                const segmentStats = segmentId ? await getSegmentSpecificStats((campaign._id as any).toString(), userId, segmentId) : null;

                return {
                    id: campaign._id,
                    message: campaign.message,
                    subject: campaign.subject,
                    status: campaign.status,
                    createdAt: campaign.created_at,
                    segment: {
                        id: segmentId || 'Unknown',
                        name: (campaign.segment_id as any)?.name || 'Unknown Segment',
                        customerCount: (campaign.segment_id as any)?.customer_count || 0
                    },
                    overallStats: stats,
                    segmentStats: segmentStats || {
                        segmentId: 'Unknown',
                        segmentName: 'Unknown Segment',
                        totalCustomers: 0,
                        messagesSent: 0,
                        messagesFailed: 0,
                        messagesPending: 0,
                        messagesQueued: 0,
                        totalMessages: 0,
                        successRate: 0,
                        failureRate: 0
                    }
                };
            })
        );

        res.json({
            success: true,
            campaigns: campaignsWithStats
        });

    } catch (error) {
        logger.error('❌ Error getting all campaigns with success rates:', error);
        res.status(500).json({
            error: 'Failed to get campaigns with success rates',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Helper function to get overall campaign statistics
 */
async function getOverallCampaignStats(campaignId: string, userId: string) {
    const total = await CommunicationLogModel.countDocuments({ 
        campaign_id: campaignId,
        userId: userId 
    });

    const sent = await CommunicationLogModel.countDocuments({ 
        campaign_id: campaignId,
        userId: userId,
        status: 'SENT'
    });

    const failed = await CommunicationLogModel.countDocuments({ 
        campaign_id: campaignId,
        userId: userId,
        status: 'FAILED'
    });

    const pending = await CommunicationLogModel.countDocuments({ 
        campaign_id: campaignId,
        userId: userId,
        status: 'PENDING'
    });

    const queued = await CommunicationLogModel.countDocuments({ 
        campaign_id: campaignId,
        userId: userId,
        status: 'QUEUED'
    });

    // Calculate rates
    const deliveryRate = total > 0 ? ((sent + failed) / total) * 100 : 0;
    const successRate = total > 0 ? (sent / total) * 100 : 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    return {
        total,
        sent,
        failed,
        pending,
        queued,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100
    };
}

/**
 * Helper function to get segment-specific statistics
 */
async function getSegmentSpecificStats(campaignId: string, userId: string, segmentId: mongoose.Types.ObjectId) {
    // Get segment details
    const segment = await SegmentModel.findById(segmentId);
    if (!segment) {
        return {
            segmentId: segmentId.toString(),
            segmentName: 'Unknown Segment',
            totalCustomers: 0,
            messagesSent: 0,
            messagesFailed: 0,
            messagesPending: 0,
            successRate: 0,
            failureRate: 0
        };
    }

    // Get statistics for this specific segment
    const segmentStats = await CommunicationLogModel.aggregate([
        {
            $match: {
                campaign_id: new mongoose.Types.ObjectId(campaignId),
                userId: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: 'customers',
                localField: 'customer_id',
                foreignField: '_id',
                as: 'customer'
            }
        },
        {
            $unwind: '$customer'
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const stats = {
        sent: 0,
        failed: 0,
        pending: 0,
        queued: 0
    };

    segmentStats.forEach(stat => {
        stats[stat._id.toLowerCase() as keyof typeof stats] = stat.count;
    });

    const total = stats.sent + stats.failed + stats.pending + stats.queued;
    const successRate = total > 0 ? (stats.sent / total) * 100 : 0;
    const failureRate = total > 0 ? (stats.failed / total) * 100 : 0;

    return {
        segmentId: segmentId.toString(),
        segmentName: segment.name,
        totalCustomers: segment.customer_count || 0,
        messagesSent: stats.sent,
        messagesFailed: stats.failed,
        messagesPending: stats.pending,
        messagesQueued: stats.queued,
        totalMessages: total,
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100
    };
}

/**
 * Helper function to get detailed message breakdown
 */
async function getMessageBreakdown(campaignId: string, userId: string) {
    // Get breakdown from SentMessage collection (more detailed)
    const sentMessageStats = await SentMessageModel.aggregate([
        {
            $match: {
                campaignId: new mongoose.Types.ObjectId(campaignId),
                userId: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const stats = {
        sent: 0,
        failed: 0,
        pending: 0,
        queued: 0
    };

    sentMessageStats.forEach(stat => {
        stats[stat._id.toLowerCase() as keyof typeof stats] = stat.count;
    });

    const total = stats.sent + stats.failed + stats.pending + stats.queued;
    const successRate = total > 0 ? (stats.sent / total) * 100 : 0;
    const failureRate = total > 0 ? (stats.failed / total) * 100 : 0;

    return {
        total,
        sent: stats.sent,
        failed: stats.failed,
        pending: stats.pending,
        queued: stats.queued,
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100
    };
}
