import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface Segment extends Document {
	userId: Types.ObjectId;
	name: string;
	rules_json: Record<string, unknown>;
	created_by: string;
	created_at: Date;
	customer_ids: string[];
	customer_count: number;
	last_populated_at?: Date;
}

const SegmentSchema = new Schema<Segment>({
	userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
	name: { type: String, required: true },
	rules_json: { type: Schema.Types.Mixed, required: true },
	created_by: { type: String, required: true },
	created_at: { type: Date, default: () => new Date() },
	customer_ids: { type: [String], default: [] },
	customer_count: { type: Number, default: 0 },
	last_populated_at: { type: Date }
});

export const SegmentModel: Model<Segment> = mongoose.model<Segment>('segments', SegmentSchema);
