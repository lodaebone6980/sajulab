import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ version: '20260306-v5', timestamp: new Date().toISOString() });
}
