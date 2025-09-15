import mongoose, { Schema, Document, Model } from 'mongoose';

export interface User extends Document {
	email: string;
	name?: string;
	googleId?: string;
	gmailAccessToken?: string;
	gmailRefreshToken?: string;
	gmailVerified?: boolean;
	googleProfilePicture?: string;
	lastGoogleLogin?: Date;
	created_at: Date;
}

const UserSchema = new Schema<User>({
	email: { type: String, required: true, unique: true, index: true },
	name: { type: String },
	googleId: { type: String, index: true },
	gmailAccessToken: { type: String, select: false }, // Don't include in queries by default for security
	gmailRefreshToken: { type: String, select: false }, // Don't include in queries by default for security
	gmailVerified: { type: Boolean, default: false },
	googleProfilePicture: { type: String },
	lastGoogleLogin: { type: Date },
	created_at: { type: Date, default: () => new Date() },
});

export const UserModel: Model<User> = mongoose.model<User>('users', UserSchema);
