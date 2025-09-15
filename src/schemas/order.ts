import { z } from 'zod';

// Schema for individual order items - handles both frontend formats
const orderItemSchema = z.object({
	// Support both frontend formats
	sku: z.string().min(1).optional(),
	SKU: z.string().min(1).optional(),
	name: z.string().min(1).optional(),
	'PRODUCT NAME': z.string().min(1).optional(),
	qty: z.union([z.number().int().positive(), z.string().transform(val => parseInt(val)).pipe(z.number().int().positive())]).optional(),
	QUANTITY: z.union([z.number().int().positive(), z.string().transform(val => parseInt(val)).pipe(z.number().int().positive())]).optional(),
	price: z.union([z.number().nonnegative(), z.string().transform(val => parseFloat(val)).pipe(z.number().nonnegative())]).optional(),
	'UNIT PRICE ($)': z.union([z.number().nonnegative(), z.string().transform(val => parseFloat(val)).pipe(z.number().nonnegative())]).optional(),
}).transform((data) => {
	// Normalize to standard format
	return {
		sku: data.sku || data.SKU || '',
		name: data.name || data['PRODUCT NAME'] || '',
		qty: data.qty || data.QUANTITY || 1,
		price: data.price || data['UNIT PRICE ($)'] || 0,
	};
}).pipe(z.object({
	sku: z.string().min(1),
	name: z.string().min(1),
	qty: z.number().int().positive(),
	price: z.number().nonnegative(),
}));

export const orderCreateSchema = z.object({
	customer_id: z.string().min(1),
	amount: z.union([z.number().positive(), z.string().transform(val => parseFloat(val)).pipe(z.number().positive())]),
	items: z.array(orderItemSchema).default([]),
	date: z.union([
		z.string().datetime(),
		z.string().transform(val => new Date(val).toISOString()).pipe(z.string().datetime())
	]),
});
