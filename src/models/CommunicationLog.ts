import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'QUEUED';

export interface CommunicationLog extends Document {
	userId: Types.ObjectId;
	campaign_id?: Types.ObjectId; // Optional for individual emails
	customer_id?: Types.ObjectId; // Optional for individual emails
	status: DeliveryStatus;
	sent_at?: Date;
	updated_at?: Date;
	message: string;
	vendor_message_id?: string;
	error_message?: string;
}

const CommunicationLogSchema = new Schema<CommunicationLog>({
	userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
	campaign_id: { type: Schema.Types.ObjectId, ref: 'campaigns', required: false, index: true }, // Optional for individual emails
	customer_id: { type: Schema.Types.ObjectId, ref: 'customers', required: false, index: true }, // Optional for individual emails
	status: { type: String, enum: ['PENDING', 'SENT', 'FAILED', 'QUEUED'], default: 'PENDING' },
	sent_at: { type: Date },
	updated_at: { type: Date, default: () => new Date() },
	message: { type: String, required: true },
	vendor_message_id: { type: String },
	error_message: { type: String },
});

export const CommunicationLogModel: Model<CommunicationLog> = mongoose.model<CommunicationLog>('communication_log', CommunicationLogSchema);
