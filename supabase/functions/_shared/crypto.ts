/**
 * Déchiffrement de la clé OpenRouter BYOK (AES-GCM).
 *
 * La clé personnelle de l'utilisateur est stockée chiffrée dans
 * `user_secrets.openrouter_key_encrypted` (jamais en clair, jamais côté client).
 * Le format attendu est `base64(iv).base64(ciphertext)` où le ciphertext inclut
 * le tag d'authentification GCM (sortie standard de WebCrypto).
 *
 * La clé de chiffrement maître provient de l'env serveur `BYOK_ENCRYPTION_KEY`
 * (32 octets en base64). L'endpoint d'enregistrement de la clé (hors scope de ce
 * moteur) doit utiliser le même format ; voir `encryptByokKey` pour référence.
 */

import { decodeBase64, encodeBase64 } from '@std/encoding/base64'

const IV_BYTES = 12 // taille standard d'un nonce AES-GCM

async function importMasterKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('BYOK_ENCRYPTION_KEY')
  if (!raw) {
    throw new Error('BYOK_ENCRYPTION_KEY manquante (chiffrement BYOK indisponible)')
  }
  const keyBytes = decodeBase64(raw)
  if (keyBytes.byteLength !== 32) {
    throw new Error('BYOK_ENCRYPTION_KEY doit faire 32 octets (base64)')
  }
  return await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

/** Déchiffre une clé BYOK au format `base64(iv).base64(ciphertext)`. */
export async function decryptByokKey(encrypted: string): Promise<string> {
  const [ivPart, dataPart] = encrypted.split('.')
  if (!ivPart || !dataPart) {
    throw new Error('Format de clé chiffrée invalide')
  }
  const key = await importMasterKey()
  const iv = decodeBase64(ivPart)
  const ciphertext = decodeBase64(dataPart)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plain)
}

/**
 * Chiffre une clé BYOK (référence pour l'endpoint d'enregistrement, non utilisé
 * par le council). Génère un IV aléatoire à chaque appel.
 */
export async function encryptByokKey(plaintext: string): Promise<string> {
  const key = await importMasterKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const data = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return `${encodeBase64(iv)}.${encodeBase64(new Uint8Array(ciphertext))}`
}
