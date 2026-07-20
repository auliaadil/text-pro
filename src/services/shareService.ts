// src/services/shareService.ts
import { supabase } from './supabaseClient';
import { generateKey, exportKey, importKey, encrypt, decrypt } from './cryptoService';
import { ToolType, SharePayload, ShareResult } from '../types';

const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createShare(
  tool: ToolType,
  state: Record<string, string>
): Promise<string> {
  const payload: SharePayload = { tool, state };
  const key = await generateKey();
  const { ciphertext, iv } = await encrypt(key, JSON.stringify(payload));
  const expires_at = new Date(Date.now() + SHARE_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from('shares')
    .insert({ ciphertext, iv, expires_at })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create share');

  const keyBase64 = await exportKey(key);
  return `${window.location.origin}/s/${data.id}#${keyBase64}`;
}

export async function resolveShare(
  id: string,
  keyBase64: string
): Promise<ShareResult> {
  const { data, error } = await supabase
    .from('shares')
    .select('ciphertext, iv')
    .eq('id', id)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return { type: 'error', reason: 'not-found' };

  try {
    const key = await importKey(keyBase64);
    const json = await decrypt(key, data.ciphertext, data.iv);
    const parsed = JSON.parse(json) as SharePayload;

    if (!parsed.tool || !Object.values(ToolType).includes(parsed.tool)) {
      return { type: 'error', reason: 'unknown-tool' };
    }
    if (!parsed.state || typeof parsed.state !== 'object' || Array.isArray(parsed.state)) {
      return { type: 'error', reason: 'corrupt' };
    }
    if (!Object.values(parsed.state).every(v => typeof v === 'string')) {
      return { type: 'error', reason: 'corrupt' };
    }

    return { type: 'payload', data: parsed };
  } catch {
    return { type: 'error', reason: 'corrupt' };
  }
}
