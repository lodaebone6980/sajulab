import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ version: '20260306-v3', timestamp: new Date().toISOString() });
}
