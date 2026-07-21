/**
 * BYO-model provider for the ask-box — single-file layout (ai-patterns
 * skill's "Layout A"): one model category (text generation), via the
 * Vercel AI SDK. No embeddings/multimodal needed — search() (mcp/tools.ts)
 * is fuse.js-based, not vector-based, matching this framework's "BYO
 * everything, no required infrastructure" posture.
 *
 * DOCS_AI_PROVIDER (not the skill's generic AI_PROVIDER) matches the naming
 * already documented in every template's pre-existing /api/ask stub.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

const PROVIDER = process.env.DOCS_AI_PROVIDER || 'anthropic';

const MODELS = {
  anthropic: process.env.DOCS_AI_MODEL || 'claude-haiku-4-5-20251001',
  openai: process.env.DOCS_AI_MODEL || 'gpt-4o-mini',
  google: process.env.DOCS_AI_MODEL || 'gemini-2.5-flash',
} as const;

export function getModel() {
  switch (PROVIDER) {
    case 'openai':
      return createOpenAI()(MODELS.openai);
    case 'google':
      return createGoogleGenerativeAI()(MODELS.google);
    case 'anthropic':
    default:
      return createAnthropic()(MODELS.anthropic);
  }
}
