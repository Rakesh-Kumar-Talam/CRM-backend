import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type SentMessageStatus = 'SENT' | 'FAILED' | 'PENDING' | 'QUEUED';

export interface SentMessage extends Document {
	userId: Types.ObjectId;
	recipientEmail: string;
	recipientName?: string;
	subject: string;
	textContent: string;
	htmlContent?: string;
	status: SentMessageStatus;
	sentAt: Date;
	messageId?: string; // Gmail message ID
	errorMessage?: string;
	campaignId?: Types.ObjectId; // Reference to campaign if sent via campaign
	discountInfo?: {
		discount?: string;
		storeName?: string;
		couponCode?: string;
	};
	personalizationData?: {
		customerName?: boolean;
		customerEmail?: boolean;
		customFields?: string[];
	};
	createdAt: Date;
	updatedAt: Date;
}

const SentMessageSchema = new Schema<SentMessage>({
	userId: { 
		type: Schema.Types.ObjectId, 
		ref: 'users', 
		required: true, 
		index: true 
	},
	recipientEmail: { 
		type: String, 
		required: true, 
		index: true 
	},
	recipientName: { 
		type: String 
	},
	subject: { 
		type: String, 
		required: true 
	},
	textContent: { 
		type: String, 
		required: true 
	},
	htmlContent: { 
		type: String 
	},
	status: { 
		type: String, 
		enum: ['SENT', 'FAILED', 'PENDING', 'QUEUED'], 
		default: 'PENDING',
		index: true
	},
	sentAt: { 
		type: Date, 
		default: Date.now,
		index: true
	},
	messageId: { 
		type: String,
		index: true
	},
	errorMessage: { 
		type: String 
	},
	campaignId: { 
		type: Schema.Types.ObjectId, 
		ref: 'campaigns',
		index: true
	},
	discountInfo: {
		discount: { type: String },
		storeName: { type: String },
		couponCode: { type: String }
	},
	personalizationData: {
		customerName: { type: Boolean },
		customerEmail: { type: Boolean },
		customFields: [{ type: String }]
	},
	createdAt: { 
		type: Date, 
		default: Date.now 
	},
	updatedAt: { 
		type: Date, 
		default: Date.now 
	}
});

// Update the updatedAt field before saving
SentMessageSchema.pre('save', function(next) {
	this.updatedAt = new Date();
	next();
});

// Indexes for better query performance
SentMessageSchema.index({ userId: 1, sentAt: -1 });
SentMessageSchema.index({ recipientEmail: 1, sentAt: -1 });
SentMessageSchema.index({ status: 1, sentAt: -1 });

export const SentMessageModel: Model<SentMessage> = mongoose.model<SentMessage>('sent_messages', SentMessageSchema);

