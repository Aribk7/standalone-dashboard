import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt } from "node:crypto";
import { appSecret } from "./env";

// One APP_SECRET, separate derived keys per purpose.
function derive(purpose: string): Buffer {
  return Buffer.from(hkdfSync("sha256", appSecret(), Buffer.alloc(0), `loop-dashboard:${purpose}`, 32));
}

let keys: { enc: Buffer; pin: Buffer; fingerprint: Buffer; ip: Buffer } | null = null;
function k() {
  keys ??= { enc: derive("api-key-encryption"), pin: derive("pin-index"), fingerprint: derive("key-fingerprint"), ip: derive("ip-hash") };
  return keys;
}

/** AES-256-GCM. Output: "v1." + base64url(iv | tag | ciphertext). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k().enc, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1.${Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64url")}`;
}

export function decrypt(payload: string): string {
  if (!payload.startsWith("v1.")) throw new Error("Unknown ciphertext version");
  const buf = Buffer.from(payload.slice(3), "base64url");
  const decipher = createDecipheriv("aes-256-gcm", k().enc, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

const hmac = (key: Buffer, value: string) => createHmac("sha256", key).update(value).digest("base64url");

/** Deterministic, secret-keyed lookup value for a PIN. The PIN itself is never stored. */
export const pinIndex = (pin: string) => hmac(k().pin, pin);
/** Identifies an API key without storing it in the clear. */
export const keyFingerprint = (apiKey: string) => hmac(k().fingerprint, apiKey);
export const ipHash = (ip: string) => hmac(k().ip, ip);

export const sessionTokenHash = (token: string) => createHash("sha256").update(token).digest("base64url");
export const newSessionToken = () => randomBytes(32).toString("base64url");

export const PIN_LENGTH = 8;
export function generatePin(): string {
  let pin = "";
  for (let i = 0; i < PIN_LENGTH; i++) pin += randomInt(0, 10).toString();
  return pin;
}
