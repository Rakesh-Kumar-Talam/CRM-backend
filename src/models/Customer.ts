import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface Customer extends Document {
	userId: Types.ObjectId;
	name: string;
	email: string;
	phone?: string;
	spend?: number;
	visits?: number;
	last_active?: Date;
	created_at: Date;
}

const CustomerSchema = new Schema<Customer>({
	userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
	name: { type: String, required: true },
	email: { type: String, required: true, index: true },
	phone: { type: String },
	spend: { type: Number, default: 0 },
	visits: { type: Number, default: 0 },
	last_active: { type: Date },
	created_at: { type: Date, default: () => new Date() },
});

export const CustomerModel: Model<Customer> = mongoose.model<Customer>('customers', CustomerSchema);
