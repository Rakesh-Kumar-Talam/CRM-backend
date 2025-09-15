import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
	userId: string;
	email: string;
}

export function signJwt(payload: JwtPayload, expiresIn: string | number = '7d'): string {
	return jwt.sign(payload, env.jwtSecret, { expiresIn: expiresIn as any });
}

export function verifyJwt<T = JwtPayload>(token: string): T {
	return jwt.verify(token, env.jwtSecret) as unknown as T;
}
