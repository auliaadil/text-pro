const ALGO = { name: 'AES-GCM', length: 256 } as const;

export async function generateKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(ALGO, true, ['encrypt', 'decrypt']);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importKey(base64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey('raw', raw, ALGO, false, ['decrypt']);
}

export async function encrypt(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherbuf = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherbuf))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decrypt(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const cipherbuf = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const ivbuf = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const plainbuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivbuf },
    key,
    cipherbuf
  );
  return new TextDecoder().decode(plainbuf);
}
