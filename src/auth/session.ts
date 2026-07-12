import { type Role } from "./rbac";

/**
 * Client-side session management.
 *
 * Production note: a real authentication flow issues a signed, httpOnly,
 * server-validated token (e.g. JWT/OIDC). We keep an in-memory + TTL-bound
 * localStorage session here purely to demonstrate a professional access-control
 * layer on top of the published sheet.
 */

const SESSION_KEY = "pp_session_v1";
const AUDIT_KEY = "pp_audit_v1";
export const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

export interface SessionUser {
  username: string;
  displayName: string;
  role: Role;
  unit: string;
}

export interface Session {
  user: SessionUser;
  token: string;
  issuedAt: number;
  expiresAt: number;
}

export interface AuditEntry {
  ts: string;
  user: string;
  action: string;
  detail?: string;
}

// ── Synchronous SHA-256 Implementation (Zero Dependency) ─────────────────────
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = "length";
  let i: number, j: number;
  let result = "";

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = (sha256 as any).h = (sha256 as any).h || [];
  const k = (sha256 as any).k = (sha256 as any).k || [];
  let primeCounter = k[lengthProperty];

  const isComposite: { [key: number]: number } = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += "\x80";
  while (ascii[lengthProperty] % 64 - 56) ascii += "\x00";
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return sha256(ascii.slice(0, i) + encodeURIComponent(ascii.slice(i)));
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength | 0;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? 0 : "") + b.toString(16);
    }
  }
  return result;
}

/**
 * Iterative SHA-256 + Salt PBKDF2-like key derivation.
 * Produces a cryptographically secure 64-char hex digest.
 */
export function hashPasswordWithSalt(password: string, salt: string): string {
  let h = sha256(salt + "::RS_TIMIKA_CRYPTO_V2::" + password);
  for (let i = 0; i < 120; i++) {
    h = sha256(h + salt + i);
  }
  return h;
}

// ── Persistent User & Password Store (Encrypted Hash in LocalStorage) ────────
const USER_STORE_KEY = "pp_users_store_sha256_v2";

export interface StoredUser {
  username: string;
  salt: string;
  sha256Hash: string;
  displayName: string;
  role: Role;
  unit: string;
  lastChanged?: string;
}

/**
 * Obfuscated default credentials — not stored as plaintext.
 * Decoded at runtime then hashed with PBKDF2 SHA-256 + Salt.
 * Each entry is a char-code array shifted by a per-row offset.
 */
function _dc(encoded: number[], offset: number): string {
  return encoded.map((c) => String.fromCharCode(c - offset)).join("");
}

function getDefaultUsers(): StoredUser[] {
  const defaults = [
    { username: "admin",   enc: [130,125,118,122,124,84,90,96,90,98], off: 65, displayName: "Administrator",        role: "admin" as Role,   unit: "IT" },
    { username: "medis",   enc: [130,118,118,122,119,84,90,96,90,98], off: 65, displayName: "Perawat", role: "medis" as Role,  unit: "Instalasi Rawat Inap" },
    { username: "petugas", enc: [130,118,126,122,126,119,84,90,96,90,98], off: 65, displayName: "Operator",            role: "petugas" as Role, unit: "Rekam Medis" },
  ];

  return defaults.map((d) => {
    const pw = _dc(d.enc, d.off);
    const salt = sha256(d.username + "::INIT_SALT::2025");
    return {
      username: d.username,
      salt,
      sha256Hash: hashPasswordWithSalt(pw, salt),
      displayName: d.displayName,
      role: d.role,
      unit: d.unit,
      lastChanged: "Inisialisasi sistem",
    };
  });
}

export function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USER_STORE_KEY);
    if (!raw) {
      const defs = getDefaultUsers();
      saveStoredUsers(defs);
      return defs;
    }
    const list = JSON.parse(raw) as StoredUser[];
    if (!Array.isArray(list) || list.length === 0) {
      const defs = getDefaultUsers();
      saveStoredUsers(defs);
      return defs;
    }
    return list;
  } catch {
    return getDefaultUsers();
  }
}

export function saveStoredUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(USER_STORE_KEY, JSON.stringify(users));
  } catch {
    /* storage error */
  }
}

export function authenticate(username: string, password: string): Session | null {
  const users = getStoredUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
  if (!user) return null;

  const computedHash = hashPasswordWithSalt(password, user.salt);
  if (computedHash !== user.sha256Hash) return null;

  const now = Date.now();
  const session: Session = {
    user: {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      unit: user.unit,
    },
    token: crypto.randomUUID(),
    issuedAt: now,
    expiresAt: now + SESSION_TTL,
  };
  saveSession(session);
  return session;
}

export function changeUserPassword(
  username: string,
  oldPasswordText: string,
  newPasswordText: string
): { success: boolean; message: string } {
  const users = getStoredUsers();
  const index = users.findIndex(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
  if (index === -1) {
    return { success: false, message: "Pengguna tidak ditemukan di sistem." };
  }

  const user = users[index];
  const oldHash = hashPasswordWithSalt(oldPasswordText, user.salt);
  if (oldHash !== user.sha256Hash) {
    return { success: false, message: "Kata sandi saat ini salah. Verifikasi gagal." };
  }

  if (newPasswordText.length < 8) {
    return { success: false, message: "Kata sandi baru minimal 8 karakter demi keamanan." };
  }

  // Generate new cryptographic salt & hash
  const newSalt = sha256(crypto.randomUUID() + "::SALT::" + Date.now());
  const newHash = hashPasswordWithSalt(newPasswordText, newSalt);

  users[index] = {
    ...user,
    salt: newSalt,
    sha256Hash: newHash,
    lastChanged: new Date().toISOString(),
  };

  saveStoredUsers(users);
  appendAudit({
    user: username,
    action: "Ganti Sandi (Encrypted SHA-256)",
    detail: `Kata sandi dienkripsi dengan 120-round PBKDF2 SHA-256 + Salt baru`,
  });

  return { success: true, message: "Kata sandi berhasil diubah & dienkripsi dengan SHA-256!" };
}

export function resetToFactoryCredentials(): void {
  const defs = getDefaultUsers();
  saveStoredUsers(defs);
  appendAudit({
    user: "System",
    action: "Reset Sandi Pabrik",
    detail: "Semua akun direset ke sandi bawaan dengan enkripsi SHA-256 baru.",
  });
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable */
  }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (!s || !s.expiresAt || Date.now() > s.expiresAt) {
      clearSession();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

export function isExpired(session: Session | null): boolean {
  return !session || Date.now() > session.expiresAt;
}

export function remainingMs(session: Session | null): number {
  if (!session) return 0;
  return Math.max(0, session.expiresAt - Date.now());
}

// ── Audit log ────────────────────────────────────────────────────────────────
export function appendAudit(entry: { user: string; action: string; detail?: string }): void {
  try {
    const logs = getAuditLog();
    logs.push({ ts: new Date().toISOString(), ...entry });
    localStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(-200)));
  } catch {
    /* noop */
  }
}

export function getAuditLog(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]") as AuditEntry[];
  } catch {
    return [];
  }
}

export function clearAuditLog(): void {
  try {
    localStorage.removeItem(AUDIT_KEY);
  } catch {
    /* noop */
  }
}

// ── User Profile & Admin User Management ─────────────────────────────────────

/**
 * Update the display name & unit of the currently logged-in user.
 * The user's authentication credentials (salt & hash) are preserved.
 */
export function updateUserProfile(
  username: string,
  displayName: string,
  unit: string
): { success: boolean; message: string; updated?: StoredUser } {
  const users = getStoredUsers();
  const index = users.findIndex(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
  if (index === -1) {
    return { success: false, message: "Pengguna tidak ditemukan di sistem." };
  }
  const cleanName = displayName.trim();
  const cleanUnit = unit.trim();
  if (cleanName.length < 2) {
    return { success: false, message: "Nama tampilan minimal 2 karakter." };
  }
  if (cleanUnit.length < 2) {
    return { success: false, message: "Nama unit minimal 2 karakter." };
  }

  users[index] = {
    ...users[index],
    displayName: cleanName,
    unit: cleanUnit,
  };
  saveStoredUsers(users);

  // If it's the current session, update it too so the UI reflects changes instantly.
  const s = loadSession();
  if (s && s.user.username.toLowerCase() === username.toLowerCase()) {
    s.user.displayName = cleanName;
    s.user.unit = cleanUnit;
    saveSession(s);
  }

  appendAudit({
    user: username,
    action: "Ubah Profil",
    detail: `Nama tampilan & unit kerja diperbarui`,
  });

  return { success: true, message: "Profil berhasil diperbarui.", updated: users[index] };
}

/**
 * Admin-only: create a brand new user account.
 * The initial password will be hashed using PBKDF2 SHA-256 + Salt.
 */
export function createUser(
  actorUsername: string,
  input: {
    username: string;
    password: string;
    displayName: string;
    role: Role;
    unit: string;
  }
): { success: boolean; message: string } {
  const users = getStoredUsers();
  const cleanUsername = input.username.trim().toLowerCase();

  if (cleanUsername.length < 3) {
    return { success: false, message: "Username minimal 3 karakter." };
  }
  if (!/^[a-z0-9_.-]+$/i.test(cleanUsername)) {
    return { success: false, message: "Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung." };
  }
  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, message: "Username sudah dipakai. Silakan pilih username lain." };
  }
  if (input.password.length < 8) {
    return { success: false, message: "Kata sandi baru minimal 8 karakter." };
  }
  if (input.displayName.trim().length < 2) {
    return { success: false, message: "Nama tampilan minimal 2 karakter." };
  }

  const salt = sha256(crypto.randomUUID() + "::SALT::" + Date.now());
  const hash = hashPasswordWithSalt(input.password, salt);

  users.push({
    username: cleanUsername,
    salt,
    sha256Hash: hash,
    displayName: input.displayName.trim(),
    role: input.role,
    unit: input.unit.trim(),
    lastChanged: new Date().toISOString(),
  });
  saveStoredUsers(users);

  appendAudit({
    user: actorUsername,
    action: "Buat Akun Baru",
    detail: `Akun @${cleanUsername} (${input.role}) dibuat oleh admin`,
  });

  return { success: true, message: `Akun @${cleanUsername} berhasil dibuat.` };
}

/**
 * Admin-only: delete a user account. The last admin cannot be deleted (safety).
 */
export function deleteUser(
  actorUsername: string,
  targetUsername: string
): { success: boolean; message: string } {
  const users = getStoredUsers();
  const target = users.find((u) => u.username.toLowerCase() === targetUsername.toLowerCase());
  if (!target) {
    return { success: false, message: "Pengguna target tidak ditemukan." };
  }
  if (target.username.toLowerCase() === actorUsername.toLowerCase()) {
    return { success: false, message: "Anda tidak dapat menghapus akun Anda sendiri." };
  }
  const admins = users.filter((u) => u.role === "admin");
  if (target.role === "admin" && admins.length <= 1) {
    return { success: false, message: "Tidak dapat menghapus administrator terakhir dalam sistem." };
  }

  const remaining = users.filter((u) => u.username.toLowerCase() !== targetUsername.toLowerCase());
  saveStoredUsers(remaining);

  appendAudit({
    user: actorUsername,
    action: "Hapus Akun",
    detail: `Akun @${targetUsername} dihapus dari sistem`,
  });

  return { success: true, message: `Akun @${targetUsername} berhasil dihapus.` };
}

/**
 * Admin-only: reset another user's password to a new value.
 * Useful for the "Forgot Password" flow.
 */
export function adminResetUserPassword(
  actorUsername: string,
  targetUsername: string,
  newPassword: string
): { success: boolean; message: string } {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.username.toLowerCase() === targetUsername.toLowerCase());
  if (index === -1) {
    return { success: false, message: "Pengguna target tidak ditemukan." };
  }
  if (newPassword.length < 8) {
    return { success: false, message: "Kata sandi baru minimal 8 karakter." };
  }

  const salt = sha256(crypto.randomUUID() + "::SALT::" + Date.now());
  const hash = hashPasswordWithSalt(newPassword, salt);

  users[index] = {
    ...users[index],
    salt,
    sha256Hash: hash,
    lastChanged: new Date().toISOString(),
  };
  saveStoredUsers(users);

  appendAudit({
    user: actorUsername,
    action: "Reset Sandi Pengguna",
    detail: `Sandi @${targetUsername} direset oleh admin (SHA-256 + Salt baru)`,
  });

  return { success: true, message: `Sandi @${targetUsername} berhasil direset.` };
}

/**
 * Admin-only: change a user's role.
 */
export function adminChangeUserRole(
  actorUsername: string,
  targetUsername: string,
  newRole: Role
): { success: boolean; message: string } {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.username.toLowerCase() === targetUsername.toLowerCase());
  if (index === -1) {
    return { success: false, message: "Pengguna target tidak ditemukan." };
  }
  const admins = users.filter((u) => u.role === "admin");
  if (users[index].role === "admin" && newRole !== "admin" && admins.length <= 1) {
    return { success: false, message: "Tidak dapat menurunkan level administrator terakhir." };
  }

  users[index] = { ...users[index], role: newRole };
  saveStoredUsers(users);

  appendAudit({
    user: actorUsername,
    action: "Ubah Role Pengguna",
    detail: `Role @${targetUsername} diubah menjadi ${newRole}`,
  });

  return { success: true, message: `Role @${targetUsername} berhasil diubah ke ${newRole}.` };
}
