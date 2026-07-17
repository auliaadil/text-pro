import LZString from 'lz-string';
import { ToolType, SharePayload, ShareResult } from '../types';

const HASH_PREFIX = 'share=';

export function encode(tool: ToolType, state: Record<string, string>): string {
  const payload: SharePayload = { tool, state };
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

export function buildShareUrl(tool: ToolType, state: Record<string, string>): string {
  const compressed = encode(tool, state);
  return `${window.location.origin}${window.location.pathname}#${HASH_PREFIX}${compressed}`;
}

export function parseShareHash(): ShareResult {
  const hash = window.location.hash;
  if (!hash.startsWith(`#${HASH_PREFIX}`)) {
    return { type: 'none' };
  }

  const compressed = hash.slice(HASH_PREFIX.length + 1); // +1 for '#'
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (json === null) return { type: 'error', reason: 'corrupt' };

    const parsed = JSON.parse(json) as SharePayload;

    if (!parsed.tool || !Object.values(ToolType).includes(parsed.tool)) {
      return { type: 'error', reason: 'unknown-tool' };
    }

    if (!parsed.state || typeof parsed.state !== 'object' || Array.isArray(parsed.state)) {
      return { type: 'error', reason: 'corrupt' };
    }

    return { type: 'payload', data: parsed };
  } catch {
    return { type: 'error', reason: 'corrupt' };
  }
}
