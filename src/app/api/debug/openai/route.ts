import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const hasKey = !!process.env.OPENAI_API_KEY;
  const keyPrefix = process.env.OPENAI_API_KEY?.substring(0, 8) || 'NOT SET';

  let testResult = 'not tested';
  let testError = '';

  if (hasKey) {
    try {
      const { getOpenAIClient } = await import('@/lib/ai/openai-client');
      const client = getOpenAIClient();
      const resp = await client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
        max_tokens: 10,
      });
      testResult = resp.choices[0]?.message?.content || 'empty response';
    } catch (err: any) {
      testResult = 'FAILED';
      testError = err?.message || String(err);
    }
  }

  return NextResponse.json({ hasKey, keyPrefix, testResult, testError });
}
