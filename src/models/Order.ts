import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface Order extends Document {
	userId: Types.ObjectId;
	customer_id: Types.ObjectId;
	amount: number;
	items: Array<{ sku: string; name: string; qty: number; price: number }>;
	date: Date;
}

const OrderSchema = new Schema<Order>({
	userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
	customer_id: { type: Schema.Types.ObjectId, ref: 'customers', required: true, index: true },
	amount: { type: Number, required: true },
	items: [{ sku: String, name: String, qty: Number, price: Number }],
	date: { type: Date, required: true },
});

export const OrderModel: Model<Order> = mongoose.model<Order>('orders', OrderSchema);
