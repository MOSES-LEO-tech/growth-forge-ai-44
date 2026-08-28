/**
 * Local chat history storage (P1).
 *
 * Persists SmartBuddy conversations in IndexedDB, encrypted at rest with
 * Web Crypto (AES-GCM). The per-user AES key is derived via PBKDF2 from a
 * device fingerprint and stored (as JWK) next to the record, so the data is
 * obfuscated against casual extraction while remaining usable offline and
 * across page reloads. In non-secure contexts where `crypto.subtle` is
 * unavailable, storage transparently falls back to plaintext IndexedDB rows.
 *
 * Storage layout (IndexedDB `smartbuddy-chat` / v1 / store `conversations`):
 *   key: userId
 *   value: { userId, updatedAt, salt, jwk, iv, data }
 *     - data: ciphertext (ArrayBuffer) of JSON-serialized ChatMessage[]
 *     - when plain:true, data is the raw JSON string
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export const MAX_MESSAGES = 500;

const DB_NAME = "smartbuddy-chat";
const STORE = "conversations";
const PBKDF2_ITERATIONS = 100_000;

type ConversationRecord = {
  userId: string;
  updatedAt: string;
  /** PBKDF2 salt used to derive the AES key (kept for re-derivation). */
  salt: Uint8Array;
  /** Exported AES-GCM key (JWK). Empty when `plain` fallback is used. */
  jwk: JsonWebKey;
  /** AES-GCM initialization vector. */
  iv: Uint8Array;
  /** Ciphertext of JSON-encoded messages, or plaintext string when `plain`. */
  data: ArrayBuffer | string;
  /** True when Web Crypto was unavailable and the payload is stored raw. */
  plain?: boolean;
};

interface ChatDb extends DBSchema {
  conversations: {
    key: string;
    value: ConversationRecord;
  };
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let dbPromise: Promise<IDBPDatabase<ChatDb>> | null = null;

function getDb(): Promise<IDBPDatabase<ChatDb>> {
  if (!dbPromise) {
    dbPromise = openDB<ChatDb>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: "userId" });
      },
    });
  }
  return dbPromise;
}

/** Stable-ish device fingerprint used as the PBKDF2 passphrase material. */
function getDeviceFingerprint(): string {
  return [
    navigator.userAgent,
    `${window.screen.width}x${window.screen.height}`,
    navigator.language,
  ].join("|");
}

function isSecureCrypto(): boolean {
  return typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined";
}

async function deriveKey(userId: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(`${getDeviceFingerprint()}:${userId}`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function getRecord(userId: string): Promise<ConversationRecord | undefined> {
  const db = await getDb();
  return db.get(STORE, userId);
}

/**
 * Persist the user's conversation. Messages beyond `MAX_MESSAGES` (oldest
 * first) are dropped to bound storage size.
 */
export async function saveChatHistory(userId: string, messages: ChatMessage[]): Promise<void> {
  const capped = messages.slice(-MAX_MESSAGES);
  const now = new Date().toISOString();
  const db = await getDb();
  const existing = await getRecord(userId);
  const salt = existing?.salt ? new Uint8Array(existing.salt) : crypto.getRandomValues(new Uint8Array(16));

  if (isSecureCrypto()) {
    try {
      const key = existing?.jwk
        ? await crypto.subtle.importKey("jwk", existing.jwk, { name: "AES-GCM" }, false, [
            "encrypt",
          ])
        : await deriveKey(userId, salt);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        textEncoder.encode(JSON.stringify(capped))
      );
      const jwk = existing?.jwk ?? (await crypto.subtle.exportKey("jwk", key));
      await db.put(STORE, { userId, updatedAt: now, salt, jwk, iv, data });
      return;
    } catch (error) {
      console.error("chatHistory: encryption failed, falling back to plaintext", error);
    }
  }

  await db.put(STORE, {
    userId,
    updatedAt: now,
    salt,
    jwk: {},
    iv: new Uint8Array(0),
    data: JSON.stringify(capped),
    plain: true,
  });
}

/** Load and decrypt the user's conversation. Returns [] when absent or corrupt. */
export async function getChatHistory(userId: string): Promise<ChatMessage[]> {
  const record = await getRecord(userId);
  if (!record) return [];

  try {
    if (record.plain) {
      return JSON.parse(record.data as string) as ChatMessage[];
    }
    const key = await crypto.subtle.importKey("jwk", record.jwk, { name: "AES-GCM" }, false, [
      "decrypt",
    ]);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(record.iv) },
      key,
      record.data as ArrayBuffer
    );
    return JSON.parse(textDecoder.decode(decrypted)) as ChatMessage[];
  } catch (error) {
    console.error("chatHistory: failed to decrypt history", error);
    return [];
  }
}

/** Remove the user's locally stored conversation. */
export async function clearChatHistory(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, userId);
}

/** Serialize the user's conversation for download as a portable JSON file. */
export async function exportChatHistory(userId: string): Promise<string> {
  const messages = await getChatHistory(userId);
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), userId, messages },
    null,
    2
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    typeof candidate.createdAt === "string"
  );
}

/**
 * Import a previously exported conversation file. Validates the shape,
 * enforces a matching userId, and replaces the local history.
 */
export async function importChatHistory(userId: string, json: string): Promise<ChatMessage[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON — the file could not be parsed.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid chat export — expected a JSON object.");
  }

  const exportRecord = parsed as { version?: unknown; userId?: unknown; messages?: unknown };
  if (!Array.isArray(exportRecord.messages)) {
    throw new Error("Invalid chat export — no messages array found.");
  }
  if (typeof exportRecord.userId === "string" && exportRecord.userId !== userId) {
    throw new Error("This chat export belongs to a different account.");
  }

  const messages = exportRecord.messages.filter(isChatMessage);
  await saveChatHistory(userId, messages);
  return messages;
}
