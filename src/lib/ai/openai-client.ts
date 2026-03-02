import OpenAI from 'openai';

// OpenAI 클라이언트 (API 키는 환경변수에서 가져옴)
let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
