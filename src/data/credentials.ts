import Papa from "papaparse";
import { type StoredUser, type Role } from "../auth/session";

/**
 * Credentials Google Sheet tab — published CSV.
 *
 * SETUP INSTRUCTIONS:
 * 1. Open the same Google Sheet used for patient data
 * 2. Create a new tab called "Users" with these columns:
 *    username | salt | sha256Hash | displayName | role | unit | lastChanged
 * 3. Fill in rows with the default user credentials (hashes will be auto-generated)
 * 4. Publish the tab to the web (it shares the same published URL, different gid)
 * 5. Find the gid: open the Users tab in Google Sheets, look at the URL for #gid=XXXXX
 * 6. Update CREDENTIALS_GID below with that number
 *
 * If gid is 0 (placeholder/not yet set), the fetch is skipped and localStorage defaults are used.
 */
export const CREDENTIALS_GID = 0;

// Same published spreadsheet, different tab gid
const CREDENTIALS_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTIgvTkNXKi7oucoWOwaPILA171fXQIjr4vmAKyqIr78El6yUXjy4ThcglzszbhSp9hwzEHiHsH50ll/pub";

export const CREDENTIALS_CSV_URL =
  `${CREDENTIALS_BASE_URL}?gid=${CREDENTIALS_GID}&single=true&output=csv`;

// ── CORS proxy chain (shared with patientData) ──────────────────────────────
const PROXIES: ((url: string) => string)[] = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://cors.eu.org/?${encodeURIComponent(u)}`,
];

async function fetchCsvTextRaw(csvUrl: string): Promise<string> {
  const urlWithCache = `${csvUrl}&_=${Date.now()}`;

  // Direct fetch first
  try {
    const res = await fetch(urlWithCache, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > 10 && !text.includes("<!DOCTYPE") && !text.includes("<html")) return text;
    throw new Error("Invalid CSV");
  } catch { /* fall through */ }

  // Try proxies
  let lastErr: Error | null = null;
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(urlWithCache), { cache: "no-store" });
      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
      const text = await res.text();
      if (text.length > 10 && !text.includes("<!DOCTYPE") && !text.includes("<html")) return text;
      throw new Error("Proxy returned invalid data");
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("Credential sync: semua koneksi gagal");
}

export interface CredentialRow {
  username: string;
  salt: string;
  sha256Hash: string;
  displayName: string;
  role: string;
  unit: string;
  lastChanged: string;
}

/**
 * Fetch user credentials from the Google Sheet "Users" tab.
 * Returns null if CREDENTIALS_GID is 0 (not configured yet).
 */
export async function fetchCredentials(): Promise<StoredUser[] | null> {
  if (CREDENTIALS_GID === 0) return null;

  try {
    const text = await fetchCsvTextRaw(CREDENTIALS_CSV_URL);

    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const validRoles = ["admin", "medis", "petugas"] as const;

    const rows = parsed.data
      .filter((r) => r.username && r.salt && r.sha256Hash)
      .map((r): StoredUser | null => {
        const role = (r.role || "").toLowerCase().trim();
        if (!validRoles.includes(role as any)) return null;
        return {
          username: (r.username || "").trim().toLowerCase(),
          salt: (r.salt || "").trim(),
          sha256Hash: (r.sha256Hash || "").trim(),
          displayName: (r.displayName || "").trim(),
          role: role as Role,
          unit: (r.unit || "").trim(),
          lastChanged: (r.lastChanged || "").trim(),
        };
      })
      .filter((u): u is StoredUser => u !== null);

    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}
