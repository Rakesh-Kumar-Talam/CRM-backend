import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface Campaign extends Document {
	userId: Types.ObjectId;
	segment_id: Types.ObjectId;
	message: string;
	subject?: string;
	status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
	created_at: Date;
}

const CampaignSchema = new Schema<Campaign>({
	userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
	segment_id: { type: Schema.Types.ObjectId, ref: 'segments', required: true, index: true },
	message: { type: String, required: true },
	subject: { type: String, default: 'Campaign Email' },
	status: { 
		type: String, 
		enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'], 
		default: 'DRAFT',
		required: true 
	},
	created_at: { type: Date, default: () => new Date() },
});

export const CampaignModel: Model<Campaign> = mongoose.model<Campaign>('campaigns', CampaignSchema);
