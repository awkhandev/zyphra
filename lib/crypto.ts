import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const KEY_HEX = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16;

// ── Startup validation — fail fast if key is missing or wrong length ──────────
function validateEncryptionKey(): Buffer {
  if (!KEY_HEX) {
    throw new Error(
      "[crypto] FATAL: ENCRYPTION_KEY environment variable is not set. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  if (KEY_HEX.length !== 64) {
    throw new Error(
      `[crypto] FATAL: ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ` +
        `Got ${KEY_HEX.length} characters.`,
    );
  }
  if (!/^[0-9a-f]{64}$/i.test(KEY_HEX)) {
    throw new Error(
      "[crypto] FATAL: ENCRYPTION_KEY must contain only hexadecimal characters [0-9a-f].",
    );
  }
  return Buffer.from(KEY_HEX, "hex");
}

// Validate at module load time — if this fails, the app won't start
const _keyBuffer = validateEncryptionKey();

function getKey(): Buffer {
  return _keyBuffer;
}

/**
 * Encrypt a plaintext string.
 * Returns a single base64 string: iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack: [12 bytes IV][16 bytes tag][N bytes ciphertext]
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt a base64 string produced by encrypt().
 */
export function decrypt(packed: string): string {
  const key = getKey();
  const buf = Buffer.from(packed, "base64");

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGO, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

/**
 * SHA-256 hash a sub-key for DB lookup (we never store raw sub-keys).
 */
export async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hash).toString("hex");
}
