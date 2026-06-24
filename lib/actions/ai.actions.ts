'use server';

import { getNews, fetchJSON } from '@/lib/actions/finnhub.actions';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const GEMINI_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'];
const MAX_RETRIES_PER_MODEL = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type FinnhubQuote = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
};

export type StockSummary = {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral' | string;
  bullets: string[];
};

class GeminiOverloadedError extends Error {}

async function callGeminiModel(model: string, apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 503 || res.status === 429) {
      throw new GeminiOverloadedError(`Gemini ${model} transient ${res.status}`);
    }
    throw new Error(`Gemini request failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p: { text?: string }) => p?.text || '').join('') : '';
  return text;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  let lastTransient: unknown = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const text = await callGeminiModel(model, apiKey, prompt);
        if (text.trim()) return text;
        lastTransient = new Error('Empty Gemini response');
      } catch (err) {
        if (err instanceof GeminiOverloadedError) {
          lastTransient = err;
          await sleep(500 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
  }

  throw new GeminiOverloadedError(
    `All Gemini models are busy: ${lastTransient instanceof Error ? lastTransient.message : 'unknown'}`
  );
}

function parseSummary(raw: string): StockSummary {
  // Strip markdown fences
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  console.log('Gemini raw response:', cleaned);

  // Try to extract JSON from anywhere in the string
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const bullets = Array.isArray(parsed?.bullets)
        ? parsed.bullets.map((b: unknown) => String(b)).filter(Boolean).slice(0, 3)
        : [];
      if (bullets.length > 0) {
        return { sentiment: String(parsed?.sentiment || 'Neutral'), bullets };
      }
    } catch {
      // fall through
    }
  }

  // Fallback: split into lines
  const bullets = cleaned
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);

  return { sentiment: 'Neutral', bullets };
}

export async function getStockSummary(symbol: string): Promise<{ success: boolean; data?: StockSummary; error?: string }> {
  const sym = (symbol || '').trim().toUpperCase();
  if (!sym) return { success: false, error: 'Symbol is required' };

  try {
    const token = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';

    const [quote, news] = await Promise.all([
      token
        ? fetchJSON<FinnhubQuote>(`${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(sym)}&token=${token}`, 60).catch(() => ({} as FinnhubQuote))
        : Promise.resolve({} as FinnhubQuote),
      getNews([sym]).catch(() => []),
    ]);

    const headlines = (news || [])
      .slice(0, 5)
      .map((n, i) => `${i + 1}. ${n.headline}${n.summary ? ` — ${n.summary}` : ''}`)
      .join('\n');

    const priceLine =
      quote?.c != null
        ? `Current price: $${quote.c}${quote.dp != null ? ` (${quote.dp > 0 ? '+' : ''}${quote.dp.toFixed(2)}% today)` : ''}. Day range: $${quote.l ?? '?'} - $${quote.h ?? '?'}. Previous close: $${quote.pc ?? '?'}.`
        : 'Live price data is unavailable.';

    const prompt = `You are a concise financial analyst. Summarize what is happening with the stock ${sym} for a retail investor.

Market data:
${priceLine}

Recent news headlines:
${headlines || 'No recent news available.'}

INSTRUCTIONS:
- Write exactly 3 short bullet points in plain English, each one sentence.
- Classify overall short-term sentiment as exactly one of: "Bullish", "Bearish", or "Neutral".
- Return ONLY this exact JSON with no extra text, no markdown fences, no explanation:
{"sentiment":"Neutral","bullets":["bullet 1","bullet 2","bullet 3"]}`;

    const raw = await callGemini(prompt);
    const summary = parseSummary(raw);

    if (summary.bullets.length === 0) {
      return { success: false, error: 'Could not generate a summary right now' };
    }

    return { success: true, data: summary };
  } catch (err) {
    console.error('getStockSummary error:', err);
    const message =
      err instanceof GeminiOverloadedError
        ? 'AI is busy right now (high demand). Please try again in a moment.'
        : 'Failed to generate AI summary';
    return { success: false, error: message };
  }
}