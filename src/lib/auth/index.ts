import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'saju-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { userId: number; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
  } catch {
    return null;
  }
}

export async function registerUser(email: string, password: string, name: string) {
  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error('이미 등록된 이메일입니다.');
  }

  const hashedPassword = await hashPassword(password);
  const result = createUser(email, hashedPassword, name);

  const token = generateToken(result.lastInsertRowid as number, email);

  return {
    user: {
      id: result.lastInsertRowid as number,
      email,
      name,
    },
    token,
  };
}

export async function loginUser(email: string, password: string) {
  const user = findUserByEmail(email);
  if (!user) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  const token = generateToken(user.id, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    token,
  };
}
