import Papa from "papaparse";
import { maskName, maskRM, maskAddress, maskText } from "../utils/mask";

export interface Patient {
  id: number;
  timestamp: string;
  hariTanggal: string;
  namaPasien: string;
  suku: string;
  noRM: string;
  asalRuangan: string;
  alamat: string;
  tanggalMasuk: string;
  tanggalKeluar: string;
  namaKeluarga: string;
  namaSopir: string;
  photoUrl: string;
  checklist: string[];
  lamaRawat: number;
}

// Published Google Sheet (CSV export) — realtime source
export const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSv31iXfAkwY8c6Tsi9MvvT1ABR8hxQlI-3rmTCYC9z98D4NklxzocQD2o5AmBvjE25qxYMsQTY36qE/pub?gid=965791667&single=true&output=csv";

// Master list of checklist items (canonical labels used for compliance tracking)
export const CHECKLIST_ALL = [
  "Edukasi hal hal yang perlu di perhatikan selama di rumah",
  "Obat -Obatan",
  "Alat kesehatan yang dibawa pulang dan edukasinya",
  "Format edukasi pasien yang di print untuk dibawa pulang pasien",
  "Surat kontrol",
  "Hasil pemeriksaan penunjang",
  "Barang bawaan pasien sudah rapih",
  "Pendamping / keluarga pasien",
  "Resume telah dilengkapi",
  "Maxim ukuran",
  "Mengisi Tabel Daftar Pasien Pulang",
];

// Nice display labels for checklist items
export const CHECKLIST_LABELS: { [k: string]: string } = {
  "Edukasi hal hal yang perlu di perhatikan selama di rumah": "Edukasi perawatan di rumah",
  "Obat -Obatan": "Obat-obatan",
  "Alat kesehatan yang dibawa pulang dan edukasinya": "Alat kesehatan + edukasi",
  "Format edukasi pasien yang di print untuk dibawa pulang pasien": "Format edukasi (print)",
  "Surat kontrol": "Surat kontrol",
  "Hasil pemeriksaan penunjang": "Hasil pemeriksaan penunjang",
  "Barang bawaan pasien sudah rapih": "Barang bawaan rapih",
  "Pendamping / keluarga pasien": "Pendamping / keluarga",
  "Resume telah dilengkapi": "Resume medis lengkap",
  "Maxim ukuran": "Maxim (transport)",
  "Mengisi Tabel Daftar Pasien Pulang": "Tabel 'Sa Antar Ko'",
};

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[""'']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Check whether a patient's raw checklist contains a canonical item
export function hasChecklistItem(patientChecklist: string[], canonical: string): boolean {
  const key = normalize(canonical);
  return patientChecklist.some((c) => normalize(c).includes(key.slice(0, Math.min(key.length, 18))));
}

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim().replace(/\s+/g, " ");

  // DD-MM-YYYY or DD/MM/YYYY
  const m1 = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m1) {
    return new Date(parseInt(m1[3]), parseInt(m1[2]) - 1, parseInt(m1[1]));
  }

  // "DD Bulan YYYY"
  const monthMap: { [key: string]: number } = {
    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
  };
  const m2 = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m2) {
    const month = monthMap[m2[2].toLowerCase()];
    if (month !== undefined) {
      return new Date(parseInt(m2[3]), month, parseInt(m2[1]));
    }
  }
  return null;
}

function calcLOS(masuk: string, keluar: string): number {
  const d1 = parseDate(masuk);
  const d2 = parseDate(keluar);
  if (!d1 || !d2) return 0;
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function splitChecklist(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Get a value from a row by fuzzy header matching
function pick(row: Record<string, string>, ...candidates: string[]): string {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const key = keys.find((k) => normalize(k) === normalize(cand));
    if (key) return (row[key] || "").trim();
  }
  // partial match
  for (const cand of candidates) {
    const key = keys.find((k) => normalize(k).includes(normalize(cand)));
    if (key) return (row[key] || "").trim();
  }
  return "";
}

// CORS proxy chain — Google Sheets CSV endpoint lacks CORS headers
const PROXIES: ((url: string) => string)[] = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://cors.eu.org/?${encodeURIComponent(u)}`,
];

async function fetchCsvText(baseCsvUrl: string): Promise<string> {
  // Attempt direct fetch first (in case CORS is re-enabled or running from a proxy server)
  try {
    const res = await fetch(`${baseCsvUrl}&_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.includes("Timestamp") || text.toLowerCase().includes("nama pasien")) return text;
    throw new Error("Invalid CSV");
  } catch { /* fall through to proxies */ }

  // Try each proxy in order
  let lastErr: Error | null = null;
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(`${baseCsvUrl}&_=${Date.now()}`), { cache: "no-store" });
      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
      const text = await res.text();
      if (text.includes("Timestamp") || text.toLowerCase().includes("nama pasien")) return text;
      throw new Error("Proxy returned invalid data");
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("Semua koneksi gagal — periksa jaringan Anda");
}

export async function fetchPatients(): Promise<Patient[]> {
  const text = await fetchCsvText(CSV_URL);

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data.filter((r) => {
    const name = pick(r, "NAMA PASIEN");
    return name && name.length > 0;
  });

  return rows.map((r, i) => {
    const tanggalMasuk = pick(r, "TANGGAL MASUK RS", "TANGGAL MASUK");
    const tanggalKeluar = pick(r, "TANGGAL KELUAR RS", "TANGGAL KELUAR");
    return {
      id: i + 1,
      timestamp: pick(r, "Timestamp"),
      hariTanggal: pick(r, "HARI / TANGGAL", "HARI/TANGGAL"),
      namaPasien: pick(r, "NAMA PASIEN"),
      suku: pick(r, "SUKU"),
      noRM: pick(r, "NO RM", "NO. RM"),
      asalRuangan: pick(r, "ASAL RUANGAN"),
      alamat: pick(r, "ALAMAT PASIEN", "ALAMAT"),
      tanggalMasuk,
      tanggalKeluar,
      namaKeluarga: pick(r, "NAMA KELUARGA PENDAMPING", "NAMA KELUARGA"),
      namaSopir: pick(r, "NAMA SOPIR & PLAT MOBIL", "NAMA SOPIR"),
      photoUrl: pick(r, "Column 11", "FOTO", "PHOTO"),
      checklist: splitChecklist(pick(r, "Berikan Ceklis Jika Sudah Dilakukan", "Berikan Ceklis")),
      lamaRawat: calcLOS(tanggalMasuk, tanggalKeluar),
    };
  });
}

/**
 * Convert patients array to CSV and trigger browser download.
 */
export function exportPatientsToCsv(
  patients: Patient[],
  maskPII = false,
  filename = "data_pasien_pulang.csv"
): void {
  const headers = [
    "Nama Pasien", "No. RM", "Ruangan", "Alamat",
    "Tgl Masuk", "Tgl Keluar", "Lama Rawat (hari)",
    "Keluarga Pendamping", "Sopir/Plat",
    "Kelengkapan Checklist", "% Lengkap", "Timestamp",
  ];
  const rows = patients.map((p) => {
    const doneC = CHECKLIST_ALL.filter((c) => hasChecklistItem(p.checklist, c)).length;
    const pct = Math.round((doneC / CHECKLIST_ALL.length) * 100);
    const nama = maskPII ? maskName(p.namaPasien) : p.namaPasien;
    const rm = maskPII ? maskRM(p.noRM) : p.noRM;
    const alamat = maskPII ? maskAddress(p.alamat) : p.alamat;
    const keluarga = maskPII ? maskText(p.namaKeluarga) : p.namaKeluarga;
    return [
      `"${nama}"`,
      rm,
      `"${p.asalRuangan}"`,
      `"${alamat}"`,
      p.tanggalMasuk,
      p.tanggalKeluar,
      p.lamaRawat,
      `"${keluarga}"`,
      `"${p.namaSopir}"`,
      `${doneC}/${CHECKLIST_ALL.length}`,
      `${pct}%`,
      p.timestamp,
    ];
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
