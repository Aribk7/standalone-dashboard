import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isProduction, supabaseConfig } from "./env";

// Persistence for accounts (encrypted API key + PIN index), sessions and
// sign-in attempts. Supabase in production; an in-memory store for local
// development when Supabase is not configured.

export interface Account {
  id: string;
  pinIndex: string;
  keyFingerprint: string;
  keyCiphertext: string;
  demo: boolean;
}

export class PinTakenError extends Error {}

export interface Store {
  getAccount(id: string): Promise<Account | null>;
  findAccountByPin(pinIndex: string): Promise<Account | null>;
  findAccountByFingerprint(fingerprint: string): Promise<Account | null>;
  createAccount(a: Omit<Account, "id">): Promise<Account>;
  updateAccount(id: string, patch: Partial<Pick<Account, "pinIndex" | "keyFingerprint" | "keyCiphertext">>): Promise<void>;
  createSession(tokenHash: string, accountId: string, userAgent: string | null): Promise<void>;
  getSession(tokenHash: string): Promise<{ accountId: string; lastSeenAt: number } | null>;
  touchSession(tokenHash: string): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessionsForAccount(accountId: string): Promise<void>;
  recordAttempt(ipHash: string, kind: string, success: boolean): Promise<void>;
  countFailures(kind: string, sinceMs: number, ipHash?: string): Promise<number>;
}

// ---------- Supabase ----------

interface AccountRow {
  id: string;
  pin_index: string;
  key_fingerprint: string;
  key_ciphertext: string;
  demo: boolean;
}

const toAccount = (r: AccountRow): Account => ({
  id: r.id,
  pinIndex: r.pin_index,
  keyFingerprint: r.key_fingerprint,
  keyCiphertext: r.key_ciphertext,
  demo: r.demo,
});

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(`Database error: ${res.error.message}`);
  return res.data;
}

class SupabaseStore implements Store {
  constructor(private db: SupabaseClient) {}

  private async oneAccount(column: string, value: string) {
    const row = check(await this.db.from("accounts").select("*").eq(column, value).maybeSingle<AccountRow>());
    return row ? toAccount(row) : null;
  }

  getAccount(id: string) {
    return this.oneAccount("id", id);
  }
  findAccountByPin(pinIndex: string) {
    return this.oneAccount("pin_index", pinIndex);
  }
  findAccountByFingerprint(fingerprint: string) {
    return this.oneAccount("key_fingerprint", fingerprint);
  }

  async createAccount(a: Omit<Account, "id">) {
    const res = await this.db
      .from("accounts")
      .insert({ pin_index: a.pinIndex, key_fingerprint: a.keyFingerprint, key_ciphertext: a.keyCiphertext, demo: a.demo })
      .select("*")
      .single<AccountRow>();
    if (res.error?.code === "23505" && res.error.message.includes("pin_index")) throw new PinTakenError();
    const row = check(res);
    if (!row) throw new Error("Database error: account was not created");
    return toAccount(row);
  }

  async updateAccount(id: string, patch: Partial<Pick<Account, "pinIndex" | "keyFingerprint" | "keyCiphertext">>) {
    const row: Record<string, string> = { updated_at: new Date().toISOString() };
    if (patch.pinIndex) row.pin_index = patch.pinIndex;
    if (patch.keyFingerprint) row.key_fingerprint = patch.keyFingerprint;
    if (patch.keyCiphertext) row.key_ciphertext = patch.keyCiphertext;
    const res = await this.db.from("accounts").update(row).eq("id", id);
    if (res.error?.code === "23505" && res.error.message.includes("pin_index")) throw new PinTakenError();
    check(res);
  }

  async createSession(tokenHash: string, accountId: string, userAgent: string | null) {
    check(await this.db.from("sessions").insert({ token_hash: tokenHash, account_id: accountId, user_agent: userAgent?.slice(0, 300) ?? null }));
  }

  async getSession(tokenHash: string) {
    const row = check(
      await this.db.from("sessions").select("account_id,last_seen_at").eq("token_hash", tokenHash).maybeSingle<{ account_id: string; last_seen_at: string }>(),
    );
    return row ? { accountId: row.account_id, lastSeenAt: new Date(row.last_seen_at).getTime() } : null;
  }

  async touchSession(tokenHash: string) {
    check(await this.db.from("sessions").update({ last_seen_at: new Date().toISOString() }).eq("token_hash", tokenHash));
  }

  async deleteSession(tokenHash: string) {
    check(await this.db.from("sessions").delete().eq("token_hash", tokenHash));
  }

  async deleteSessionsForAccount(accountId: string) {
    check(await this.db.from("sessions").delete().eq("account_id", accountId));
  }

  async recordAttempt(ipHash: string, kind: string, success: boolean) {
    check(await this.db.from("auth_attempts").insert({ ip_hash: ipHash, kind, success }));
    // Opportunistic cleanup of old rows (roughly 1 in 50 calls).
    if (Math.random() < 0.02) {
      await this.db.from("auth_attempts").delete().lt("created_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
    }
  }

  async countFailures(kind: string, sinceMs: number, ipHash?: string) {
    let q = this.db
      .from("auth_attempts")
      .select("id", { count: "exact", head: true })
      .eq("kind", kind)
      .eq("success", false)
      .gte("created_at", new Date(sinceMs).toISOString());
    if (ipHash) q = q.eq("ip_hash", ipHash);
    const res = await q;
    if (res.error) throw new Error(`Database error: ${res.error.message}`);
    return res.count ?? 0;
  }
}

// ---------- In-memory (local development only) ----------

class MemoryStore implements Store {
  accounts = new Map<string, Account>();
  sessions = new Map<string, { accountId: string; lastSeenAt: number }>();
  attempts: { ipHash: string; kind: string; success: boolean; at: number }[] = [];

  async getAccount(id: string) {
    return this.accounts.get(id) ?? null;
  }
  async findAccountByPin(pinIndex: string) {
    return [...this.accounts.values()].find((a) => a.pinIndex === pinIndex) ?? null;
  }
  async findAccountByFingerprint(fingerprint: string) {
    return [...this.accounts.values()].find((a) => a.keyFingerprint === fingerprint) ?? null;
  }
  async createAccount(a: Omit<Account, "id">) {
    if (await this.findAccountByPin(a.pinIndex)) throw new PinTakenError();
    const account = { ...a, id: crypto.randomUUID() };
    this.accounts.set(account.id, account);
    return account;
  }
  async updateAccount(id: string, patch: Partial<Account>) {
    const a = this.accounts.get(id);
    if (!a) return;
    if (patch.pinIndex && [...this.accounts.values()].some((o) => o.id !== id && o.pinIndex === patch.pinIndex)) throw new PinTakenError();
    this.accounts.set(id, { ...a, ...patch });
  }
  async createSession(tokenHash: string, accountId: string) {
    this.sessions.set(tokenHash, { accountId, lastSeenAt: Date.now() });
  }
  async getSession(tokenHash: string) {
    return this.sessions.get(tokenHash) ?? null;
  }
  async touchSession(tokenHash: string) {
    const s = this.sessions.get(tokenHash);
    if (s) s.lastSeenAt = Date.now();
  }
  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }
  async deleteSessionsForAccount(accountId: string) {
    for (const [h, s] of this.sessions) if (s.accountId === accountId) this.sessions.delete(h);
  }
  async recordAttempt(ipHash: string, kind: string, success: boolean) {
    this.attempts.push({ ipHash, kind, success, at: Date.now() });
  }
  async countFailures(kind: string, sinceMs: number, ipHash?: string) {
    return this.attempts.filter((a) => a.kind === kind && !a.success && a.at >= sinceMs && (!ipHash || a.ipHash === ipHash)).length;
  }
}

const globalStore = globalThis as unknown as { __loopStore?: Store };

export function store(): Store {
  if (globalStore.__loopStore) return globalStore.__loopStore;
  const cfg = supabaseConfig();
  if (cfg) {
    globalStore.__loopStore = new SupabaseStore(
      createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false } }),
    );
  } else {
    if (isProduction) throw new Error("Supabase is not configured (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)");
    globalStore.__loopStore = new MemoryStore();
  }
  return globalStore.__loopStore;
}
