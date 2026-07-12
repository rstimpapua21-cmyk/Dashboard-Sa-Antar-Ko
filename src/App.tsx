import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList,
} from "recharts";
import {
  Users, Building2, ClipboardCheck, CalendarDays, Search,
  TrendingUp, Activity, Home, ChevronRight, X, Eye, CheckCircle2,
  XCircle, Clock, Filter, BarChart2, RefreshCw, Stethoscope,
  FileText, Car, AlertCircle, Loader2, Wifi, WifiOff,
  Download, Sun, Moon, Lock, LogIn, ShieldCheck,
  Printer, AlertTriangle, FileWarning, CheckSquare,
} from "lucide-react";
import {
  fetchPatients, hasChecklistItem, CHECKLIST_ALL, CHECKLIST_LABELS, parseDate,
  exportPatientsToCsv,
  type Patient,
} from "./data/patientData";
import { can, ROLES, type Role } from "./auth/rbac";
import {
  loadSession, clearSession, appendAudit,
  type Session,
} from "./auth/session";
import { protect } from "./utils/mask";
import LoginGate from "./auth/LoginGate";
import SecurityPanel from "./auth/SecurityPanel";
import PrintablePatientReport from "./components/PrintablePatientReport";
import { useToast } from "./components/Toast";

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const RUANGAN_COLORS: { [key: string]: string } = {
  Kasuari: "#ef4444",
  Pipit: "#3b82f6",
  "Bangsal Pipit": "#f59e0b",
  Mambruk: "#8b5cf6",
};

function ElegantTooltip({
  active,
  payload,
  label,
  dark,
  labelFormatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  dark: boolean;
  labelFormatter?: (value: string | number | undefined) => string;
}) {
  if (!active || !payload?.length) return null;
  const displayLabel = labelFormatter ? labelFormatter(label) : String(label ?? "");

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${dark ? "border-slate-700 bg-slate-950/95 text-slate-100" : "border-white/70 bg-white/95 text-slate-900"}`}>
      <p className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${dark ? "text-slate-400" : "text-slate-500"}`}>
        {displayLabel}
      </p>
      <div className="space-y-1.5">
        {payload.slice(0, 3).map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span className={`flex items-center gap-2 ${dark ? "text-slate-200" : "text-slate-700"}`}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color || COLORS[index % COLORS.length] }} />
              {entry.name || entry.dataKey || "Nilai"}
            </span>
            <span className="font-bold tabular-nums" style={{ color: entry.color || COLORS[index % COLORS.length] }}>
              {typeof entry.value === "number" ? entry.value.toLocaleString("id-ID") : String(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getRuanganColor(r: string) {
  if (RUANGAN_COLORS[r]) return RUANGAN_COLORS[r];
  // deterministic color for unknown rooms
  let h = 0;
  for (let i = 0; i < r.length; i++) h = r.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function getInitials(name: string) {
  const clean = name.replace(/^(Tn\.|Ny\.|Nn\.|An\.|Anak\.)\s*/i, "").trim();
  return (clean || name)
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatLOS(days: number) {
  if (days === 0) return "-";
  return `${days} hari`;
}

function checklistLabel(item: string) {
  return CHECKLIST_LABELS[item] || item;
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, dark }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; dark?: boolean }) {
  return (
    <div className={`rounded-2xl shadow-md p-5 flex items-center gap-4 border-l-4 transition-colors ${dark ? "bg-gray-800" : "bg-white"}`} style={{ borderLeftColor: color }}>
      <div className="rounded-xl p-3 flex-shrink-0" style={{ background: color + "18" }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className={`text-xs font-medium uppercase tracking-wide ${dark ? "text-gray-400" : "text-gray-500"}`}>{label}</p>
        <p className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-800"}`}>{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Checklist Badge ─────────────────────────────────────────────────────────
function ChecklistBadge({ item, done }: { item: string; done: boolean }) {
  const label = checklistLabel(item);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${done ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
      {done ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {label}
    </span>
  );
}

// ─── Patient Modal ────────────────────────────────────────────────────────────
function PatientModal({
  patient,
  onClose,
  canViewPII,
  dark,
  onPrint,
}: {
  patient: Patient;
  onClose: () => void;
  canViewPII: boolean;
  dark: boolean;
  onPrint?: (p: Patient) => void;
}) {
  const totalChecklist = CHECKLIST_ALL.length;
  const done = CHECKLIST_ALL.filter((c) => hasChecklistItem(patient.checklist, c)).length;
  const percent = Math.round((done / totalChecklist) * 100);
  const masked = !canViewPII;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${dark ? "bg-gray-800" : "bg-white"}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b sticky top-0 rounded-t-2xl ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{ background: getRuanganColor(patient.asalRuangan) }}>
              {getInitials(patient.namaPasien)}
            </div>
            <div>
              <h2 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-800"}`}>
                {protect(patient.namaPasien, canViewPII, "name")}
                {masked && <Lock size={14} className="inline ml-2 text-amber-500" />}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ background: getRuanganColor(patient.asalRuangan) }}>
                  {patient.asalRuangan || "N/A"}
                </span>
                <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>No. RM: {protect(patient.noRM, canViewPII, "rm")}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onPrint && (
              <button
                onClick={() => onPrint(patient)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
                title="Cetak Dokumen Bukti Kepulangan"
              >
                <Printer size={15} />
                <span>Cetak Lembar Bukti</span>
              </button>
            )}
            <button onClick={onClose} className={`transition-colors p-1.5 rounded-full hover:bg-gray-100 ${dark ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700" : "text-gray-400 hover:text-gray-600"}`}>
              <X size={22} />
            </button>
          </div>
        </div>

        {masked && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg px-3 py-2">
            <Lock size={13} className="flex-shrink-0" />
            Data pribadi (nama, No. RM, alamat) disamarkan sesuai hak akses Anda.
          </div>
        )}

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Info Pasien */}
          <div className="space-y-3">
            <h3 className={`font-semibold text-sm uppercase tracking-wide ${dark ? "text-gray-300" : "text-gray-700"}`}>Informasi Pasien</h3>
            <div className="space-y-2">
              <InfoRow icon={<Home size={14} />} label="Alamat" value={protect(patient.alamat, canViewPII, "address")} dark={dark} />
              <InfoRow icon={<CalendarDays size={14} />} label="Tanggal Masuk" value={patient.tanggalMasuk || "-"} dark={dark} />
              <InfoRow icon={<CalendarDays size={14} />} label="Tanggal Keluar" value={patient.tanggalKeluar || "-"} dark={dark} />
              <InfoRow icon={<Clock size={14} />} label="Lama Rawat" value={formatLOS(patient.lamaRawat)} dark={dark} />
              <InfoRow icon={<Users size={14} />} label="Keluarga Pendamping" value={protect(patient.namaKeluarga, canViewPII, "text")} dark={dark} />
              <InfoRow icon={<Car size={14} />} label="Sopir / Plat" value={patient.namaSopir || "-"} dark={dark} />
            </div>
          </div>

          {/* Checklist Progress */}
          <div className="space-y-3">
            <h3 className={`font-semibold text-sm uppercase tracking-wide ${dark ? "text-gray-300" : "text-gray-700"}`}>Kelengkapan Dokumen</h3>
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex-1 rounded-full h-2.5 ${dark ? "bg-gray-700" : "bg-gray-100"}`}>
                <div className="h-2.5 rounded-full transition-all" style={{ width: `${percent}%`, background: percent >= 80 ? "#10b981" : percent >= 50 ? "#f59e0b" : "#ef4444" }} />
              </div>
              <span className="text-sm font-bold" style={{ color: percent >= 80 ? "#10b981" : percent >= 50 ? "#f59e0b" : "#ef4444" }}>{percent}%</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CHECKLIST_ALL.map((item) => (
                <ChecklistBadge key={item} item={item} done={hasChecklistItem(patient.checklist, item)} />
              ))}
            </div>
            {patient.photoUrl && canViewPII && (
              <a href={patient.photoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 mt-2">
                <Eye size={13} /> Lihat foto dokumentasi
              </a>
            )}
            {patient.photoUrl && !canViewPII && (
              <p className="inline-flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                <Lock size={12} /> Foto dokumentasi terkunci
              </p>
            )}
          </div>
        </div>

        <div className={`px-6 pb-6 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          <p className="text-xs">Form disubmit: {patient.timestamp || "-"}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, dark }: { icon: React.ReactNode; label: string; value: string; dark?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 flex-shrink-0 ${dark ? "text-gray-500" : "text-gray-400"}`}>{icon}</span>
      <div>
        <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{label}</p>
        <p className={`text-sm font-medium ${dark ? "text-gray-200" : "text-gray-700"}`}>{value}</p>
      </div>
    </div>
  );
}

type Tab = "overview" | "patients" | "analytics";

export default function App() {
  const toast = useToast();

  // ── Auth / session state ──
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [printingPatient, setPrintingPatient] = useState<Patient | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // When not logged in, the app operates in PUBLIC mode:
  // only aggregate summary & analytics are visible; patient data is protected.
  const role: Role = session?.user.role ?? "public";
  const isPublic = !session;
  const canViewPII = can(role, "view_patient_pii");
  const canExport = can(role, "export_data");
  const canViewList = can(role, "view_patient_list");

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [filterRuangan, setFilterRuangan] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [sortKey, setSortKey] = useState<"namaPasien" | "tanggalKeluar" | "lamaRawat" | "asalRuangan">("tanggalKeluar");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Realtime data state ──
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Date filter state ──
  type DatePreset = "all" | "today" | "7d" | "thisMonth" | "lastMonth" | "custom";
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  /** Helper – get discharge date (or entry date as fallback) for a patient */
  const getDischargeDate = useCallback((p: Patient): Date | null => {
    return parseDate(p.tanggalKeluar) || parseDate(p.hariTanggal) || parseDate(p.tanggalMasuk);
  }, []);

  /** Convert "YYYY-MM-DD" (HTML input) to Date at start of day */
  const inputToDate = (s: string): Date | null => {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  /** Compute the effective from/to dates based on preset + custom inputs */
  const effectiveRange = useMemo((): { from: Date | null; to: Date | null; label: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    switch (datePreset) {
      case "today":
        return { from: todayStart, to: today, label: "Hari ini" };
      case "7d": {
        const from = new Date(todayStart);
        from.setDate(from.getDate() - 6);
        return { from, to: today, label: "7 hari terakhir" };
      }
      case "thisMonth": {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from, to: today, label: now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) };
      }
      case "lastMonth": {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { from, to, label: from.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) };
      }
      case "custom":
        return { from: inputToDate(dateFrom), to: dateTo ? new Date(inputToDate(dateTo)!.setHours(23, 59, 59)) : null, label: "Kustom" };
      default:
        return { from: null, to: null, label: "Semua data" };
    }
  }, [datePreset, dateFrom, dateTo]);

  /** Apply date filter to full patient list – this drives ALL tabs (KPI, charts, list) */
  const dateFilteredPatients = useMemo(() => {
    const { from, to } = effectiveRange;
    if (!from && !to) return patients;
    return patients.filter((p) => {
      const d = getDischargeDate(p);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [patients, effectiveRange, getDischargeDate]);

  function handlePreset(preset: DatePreset) {
    setDatePreset(preset);
    if (preset !== "custom") {
      setDateFrom("");
      setDateTo("");
    }
  }

  function resetDateFilter() {
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
  }

  /** Format Indonesian short date: 18 Jul 2025 */
  function fmtShort(d: Date | null): string {
    if (!d) return "-";
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  // ── Auto-refresh toggle ──
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ── Dark mode ──
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("darkMode");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try { localStorage.setItem("darkMode", String(darkMode)); } catch { /* noop */ }
  }, [darkMode]);

  // ── Missing Checklist Report State & Memo ──
  const [missingFilter, setMissingFilter] = useState<string>("");
  const incompletePatients = useMemo(() => {
    return dateFilteredPatients.filter((p) => {
      const missing = CHECKLIST_ALL.filter((c) => !hasChecklistItem(p.checklist, c));
      if (missing.length === 0) return false;
      if (missingFilter && !missing.includes(missingFilter)) return false;
      return true;
    }).map((p) => {
      return {
        ...p,
        missingItems: CHECKLIST_ALL.filter((c) => !hasChecklistItem(p.checklist, c)),
      };
    });
  }, [dateFilteredPatients, missingFilter]);

  // ── Transport Analytics ("Sa Antar Ko" & Maxim) ──
  const transportStats = useMemo(() => {
    let saAntarKo = 0;
    let maxim = 0;
    let pribadi = 0;
    dateFilteredPatients.forEach((p) => {
      const isMaxim = p.checklist.some((c) => c.toLowerCase().includes("maxim")) || (p.namaSopir && p.namaSopir.toLowerCase().includes("maxim"));
      if (isMaxim) {
        maxim++;
      } else if (p.namaSopir && p.namaSopir.trim().length > 1 && !p.namaSopir.toLowerCase().includes("pribadi") && !p.namaSopir.toLowerCase().includes("sendiri")) {
        saAntarKo++;
      } else {
        pribadi++;
      }
    });
    const total = saAntarKo + maxim + pribadi || 1;
    return [
      { name: "Program 'Sa Antar Ko' (RSUD)", count: saAntarKo, percent: Math.round((saAntarKo / total) * 100), color: "#3b82f6", desc: "Diantar pengemudi resmi rumah sakit" },
      { name: "Layanan Maxim Transport", count: maxim, percent: Math.round((maxim / total) * 100), color: "#10b981", desc: "Transportasi online terintegrasi" },
      { name: "Kendaraan Pribadi / Mandiri", count: pribadi, percent: Math.round((pribadi / total) * 100), color: "#f59e0b", desc: "Dijemput keluarga atau kendaraan mandiri" },
    ];
  }, [dateFilteredPatients]);

  // ── Day-of-week analysis ──
  const byDayOfWeek = useMemo(() => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const map: number[] = [0, 0, 0, 0, 0, 0, 0];
    dateFilteredPatients.forEach((p) => {
      const d = getDischargeDate(p);
      if (d && !isNaN(d.getTime())) {
        map[d.getDay()]++;
      }
    });
    return days.map((name, i) => ({
      name: name.slice(0, 3),
      fullName: name,
      count: map[i],
      day: i,
    })).sort((a, b) => a.day - b.day);
  }, [dateFilteredPatients, getDischargeDate]);

  // ── Monthly trend ──
  const byMonth = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const map: { [key: string]: number } = {};
    dateFilteredPatients.forEach((p) => {
      const d = getDischargeDate(p);
      if (d && !isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        map[key] = (map[key] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [y, m] = key.split("-");
        return {
          month: `${monthNames[parseInt(m) - 1]} ${y}`,
          key,
          count,
        };
      });
  }, [dateFilteredPatients, getDischargeDate]);

  // ── Export CSV ──
  function handleExportCsv() {
    const filteredPatients = filtered.length > 0 ? filtered : dateFilteredPatients;
    if (filteredPatients.length === 0) {
      toast.warning("Tidak Ada Data untuk Diekspor", "Silakan sesuaikan filter Anda terlebih dahulu.");
      return;
    }
    const hasFilter = search || filterRuangan || datePreset !== "all";
    const label = hasFilter ? "_filtered" : "";
    exportPatientsToCsv(
      filteredPatients,
      !canViewPII, // mask PII for roles without permission
      `pasien_pulang${label}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    if (session) {
      appendAudit({
        user: session.user.username,
        action: "Ekspor Data",
        detail: `${filteredPatients.length} baris${!canViewPII ? " (PII disamarkan)" : ""}`,
      });
    }
    toast.success(
      "CSV Berhasil Diunduh",
      `${filteredPatients.length} baris data pasien telah diekspor${!canViewPII ? " (data pribadi disamarkan)" : ""}.`
    );
  }

  function openDetail(p: Patient) {
    if (session) {
      appendAudit({
        user: session.user.username,
        action: "Buka Detail Pasien",
        detail: canViewPII ? `No. RM ${p.noRM}` : `ID #${p.id} (PII disamarkan)`,
      });
    }
    setSelectedPatient(p);
  }

  const loadData = useCallback(async (isRefresh = false, silent = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchPatients();
      const previousCount = patients.length;
      setPatients(data);
      setLastUpdated(new Date());
      // Manual refresh (bukan auto interval) → beri notifikasi sukses
      if (isRefresh && !silent) {
        const delta = data.length - previousCount;
        toast.success(
          "Data Diperbarui dari Google Sheets",
          delta > 0
            ? `${data.length} pasien dimuat (+${delta} baris baru)`
            : `${data.length} pasien terverifikasi & sinkron`
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan saat memuat data";
      setError(msg);
      if (isRefresh && !silent) {
        toast.error("Gagal Memuat Data", msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients.length]);

  useEffect(() => {
    loadData();
    if (!autoRefresh) return;
    const interval = setInterval(() => loadData(true, true), 60000);
    return () => clearInterval(interval);
  }, [loadData, autoRefresh]);

  // ── Auth handlers & session lifecycle ──
  function handleLogin(s: Session) {
    appendAudit({ user: s.user.username, action: "Login", detail: `Masuk sebagai ${ROLES[s.user.role].label}` });
    setLoginMsg(null);
    setSession(s);
    toast.success(
      `Selamat datang, ${s.user.displayName.split(" ")[0]}!`,
      `Anda berhasil login sebagai ${ROLES[s.user.role].label}.`
    );
  }

  function handleLogout(reason?: string) {
    if (session) {
      appendAudit({ user: session.user.username, action: "Logout", detail: reason });
    }
    clearSession();
    setSession(null);
    setShowSecurity(false);
    if (reason) {
      setLoginMsg(reason);
      toast.warning("Sesi Berakhir", reason);
    } else {
      toast.info("Logout Berhasil", "Anda telah keluar dari sistem dengan aman.");
    }
  }

  // auto-logout when session expires
  useEffect(() => {
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) {
      handleLogout("Sesi telah berakhir. Silakan masuk kembali.");
      return;
    }
    const t = setTimeout(() => handleLogout("Sesi telah berakhir. Silakan masuk kembali."), remaining);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // 1-second tick to drive the session countdown
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function sessionSecondsLeft(): number {
    if (!session) return 0;
    return Math.max(0, Math.floor((session.expiresAt - nowTick) / 1000));
  }

  // reset to an accessible tab if current tab becomes restricted
  useEffect(() => {
    const allowed: Record<Tab, boolean> = {
      overview: can(role, "view_dashboard"),
      patients: can(role, "view_patient_list"),
      analytics: can(role, "view_analytics"),
    };
    if (!allowed[activeTab]) {
      const first = (Object.keys(allowed) as Tab[]).find((k) => allowed[k]);
      if (first) setActiveTab(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, activeTab]);

  const ruanganList = useMemo(
    () => [...new Set(patients.map((p) => p.asalRuangan).filter((r) => r))].sort(),
    [patients]
  );

  const filtered = useMemo(() => {
    let list = [...dateFilteredPatients];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.namaPasien.toLowerCase().includes(q) ||
        p.noRM.includes(q) ||
        p.asalRuangan.toLowerCase().includes(q) ||
        p.namaKeluarga.toLowerCase().includes(q) ||
        p.alamat.toLowerCase().includes(q)
      );
    }
    if (filterRuangan) list = list.filter((p) => p.asalRuangan === filterRuangan);
    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [dateFilteredPatients, search, filterRuangan, sortKey, sortDir]);

  const byDate = useMemo(() => {
    const map: { [d: string]: number } = {};
    dateFilteredPatients.forEach((p) => {
      const d = p.hariTanggal || (p.timestamp ? p.timestamp.split(" ")[0] : "?");
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(0, 5), count }));
  }, [dateFilteredPatients]);

  const byRuangan = useMemo(() => {
    const map: { [r: string]: number } = {};
    dateFilteredPatients.forEach((p) => {
      const r = p.asalRuangan || "Tidak Diketahui";
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [dateFilteredPatients]);

  const byLOS = useMemo(() => {
    const bins: { [k: string]: number } = { "1-3 hari": 0, "4-7 hari": 0, "8-14 hari": 0, ">14 hari": 0 };
    dateFilteredPatients.forEach((p) => {
      if (p.lamaRawat <= 0) return;
      if (p.lamaRawat <= 3) bins["1-3 hari"]++;
      else if (p.lamaRawat <= 7) bins["4-7 hari"]++;
      else if (p.lamaRawat <= 14) bins["8-14 hari"]++;
      else bins[">14 hari"]++;
    });
    return Object.entries(bins).map(([name, value]) => ({ name, value }));
  }, [dateFilteredPatients]);

  const checklistStats = useMemo(() => {
    return CHECKLIST_ALL.map((item) => {
      const count = dateFilteredPatients.filter((p) => hasChecklistItem(p.checklist, item)).length;
      return {
        name: checklistLabel(item),
        fullName: checklistLabel(item),
        count,
        percent: dateFilteredPatients.length ? Math.round((count / dateFilteredPatients.length) * 100) : 0,
      };
    });
  }, [dateFilteredPatients]);

  const totalPatients = dateFilteredPatients.length;
  const losPatients = dateFilteredPatients.filter((p) => p.lamaRawat > 0);
  const avgLOS = losPatients.length ? Math.round(losPatients.reduce((s, p) => s + p.lamaRawat, 0) / losPatients.length) : 0;
  const maxLOS = dateFilteredPatients.length ? Math.max(...dateFilteredPatients.map((p) => p.lamaRawat), 0) : 0;
  const uniqueRuangan = new Set(dateFilteredPatients.map((p) => p.asalRuangan).filter(Boolean)).size;

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  // only show tabs the role is allowed to access
  const ALL_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Ringkasan", icon: <Activity size={16} /> },
    { key: "patients", label: "Data Pasien", icon: <Users size={16} /> },
    { key: "analytics", label: "Analitik", icon: <BarChart2 size={16} /> },
  ];
  const availableTabs = ALL_TABS.filter((t) => {
    if (t.key === "overview") return can(role, "view_dashboard");
    if (t.key === "patients") return can(role, "view_patient_list");
    if (t.key === "analytics") return can(role, "view_analytics");
    return false;
  });

  const timeAgo = lastUpdated
    ? lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "-";

  if (printingPatient) {
    return (
      <PrintablePatientReport
        patient={printingPatient}
        onClose={() => setPrintingPatient(null)}
        canViewPII={canViewPII}
      />
    );
  }

  // Login is now an on-demand overlay (staff access). Public users see the
  // aggregate dashboard without authentication.
  if (showLogin && !session) {
    return (
      <LoginGate
        onLogin={(s) => {
          handleLogin(s);
          setShowLogin(false);
        }}
        initialMessage={loginMsg}
        onCancel={() => setShowLogin(false)}
      />
    );
  }

  return (
    <div
      className={`min-h-screen relative isolate overflow-hidden transition-colors ${darkMode ? "dark bg-slate-900" : "bg-slate-50"}`}
      style={{
        backgroundImage: darkMode
          ? "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)"
          : "linear-gradient(135deg, #eff6ff 0%, #ffffff 40%, #f0f9ff 100%)",
      }}
    >
      {/* ── HEADER ── */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${darkMode ? "border-blue-500/10 bg-slate-900/85 shadow-lg shadow-blue-950/40" : "border-blue-100 bg-white/80 shadow-[0_10px_30px_rgba(37,99,235,0.08)]"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-gradient-to-br from-blue-600 to-sky-500 shadow-lg shadow-blue-500/30">
              <Stethoscope className="text-white" size={22} />
            </div>
            <div>
              <h1 className={`font-bold text-lg leading-tight ${darkMode ? "text-white" : "text-slate-900"}`}>Dashboard Pasien Pulang</h1>
              <p className={`text-xs flex items-center gap-1.5 ${darkMode ? "text-blue-200" : "text-blue-600"}`}>
                Dokumen Kepulangan Pasien • RS Timika
                <span className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${darkMode ? "bg-blue-500/15 text-blue-100 border-blue-400/20" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                  {isPublic ? <><ShieldCheck size={9} /> Publik</> : <><Lock size={9} /> {ROLES[role].short}</>}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition-colors ${darkMode ? "bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 border border-blue-400/20" : "bg-blue-50 hover:bg-blue-100 text-blue-700"}`}
              title={darkMode ? "Mode Terang" : "Mode Gelap"}
            >
              {darkMode ? <Sun size={13} /> : <Moon size={13} />}
            </button>

            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                autoRefresh
                  ? darkMode ? "bg-blue-600/85 hover:bg-blue-500 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                  : darkMode ? "bg-white/10 hover:bg-white/20 text-white/70 border border-white/10" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
              title={autoRefresh ? "Auto-refresh aktif (60 detik)" : "Auto-refresh nonaktif"}
            >
              {autoRefresh ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span className="hidden md:inline">Auto</span>
            </button>

            {/* Export CSV (permission-gated) */}
            {canExport && !loading && patients.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full transition-colors"
                title={canViewPII ? "Unduh data sebagai CSV" : "Unduh CSV (PII disamarkan)"}
              >
                <Download size={13} />
                <span className="hidden sm:inline">CSV</span>
              </button>
            )}

            {/* Live indicator + Refresh */}
            <div className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${darkMode ? "bg-blue-500/15 border border-blue-400/20" : "bg-blue-50 border border-blue-100"}`}>
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${!error ? "animate-ping" : ""}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${error ? "bg-red-400" : "bg-emerald-400"}`} />
              </span>
              <span className={`font-medium ${darkMode ? "text-blue-50" : "text-blue-700"}`}>{error ? "Offline" : "Live"}</span>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-60 ${
                darkMode ? "bg-white/10 hover:bg-white/20 text-white border border-white/10" : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{refreshing ? "Memuat..." : "Perbarui"}</span>
            </button>

            {/* Session / user security area */}
            <div className="flex items-center gap-2 pl-1 border-l border-white/20 ml-1">
              {session ? (
                <button
                  onClick={() => setShowSecurity(true)}
                  className="flex items-center gap-2 text-xs bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-full transition-colors"
                  title="Keamanan & akses"
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                    style={{ background: ROLES[session.user.role].color }}
                  >
                    {session.user.displayName.charAt(0)}
                  </span>
                  <span className="hidden md:flex flex-col items-start leading-tight">
                    <span className="font-medium">{session.user.displayName.split(" ").slice(-1)[0]}</span>
                    <span className="text-[10px] text-blue-100">
                      {String(Math.floor(sessionSecondsLeft() / 60)).padStart(2, "0")}:
                      {String(sessionSecondsLeft() % 60).padStart(2, "0")}
                    </span>
                  </span>
                  <Lock size={12} className="text-blue-100" />
                </button>
              ) : (
                <button
                  onClick={() => { setLoginMsg(null); setShowLogin(true); }}
                  className="flex items-center gap-1.5 text-xs bg-white text-blue-700 hover:bg-blue-50 font-semibold px-3 py-1.5 rounded-full transition-colors shadow-sm"
                  title="Masuk sebagai staf untuk mengakses data pasien"
                >
                  <LogIn size={13} />
                  <span>Login Staf</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 pb-0 overflow-x-auto">
          {availableTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap ${
                activeTab === t.key ? "bg-gray-50 text-blue-700" : "text-blue-100 hover:bg-white/10"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Realtime status bar */}
      <div className={`border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Wifi size={12} className={error ? "text-red-400" : "text-green-500"} />
            <span>Sumber data langsung dari Google Sheets • Auto-refresh {autoRefresh ? "aktif (60 detik)" : "nonaktif"}</span>
          </div>
          <span className="hidden sm:block">Diperbarui: {timeAgo}</span>
        </div>
      </div>

      {/* ── LOADING STATE ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
          <Loader2 size={44} className="animate-spin text-blue-500 mb-4" />
          <p className="font-medium text-gray-600">Memuat data realtime...</p>
          <p className="text-sm">Mengambil data langsung dari Google Sheets</p>
        </div>
      )}

      {/* ── ERROR STATE ── */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <div className="bg-red-50 rounded-full p-4 mb-4">
            <AlertCircle size={40} className="text-red-400" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">Gagal Memuat Data</p>
          <p className="text-sm text-gray-500 mb-4 max-w-md">{error}</p>
          <button onClick={() => loadData()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw size={15} /> Coba Lagi
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      {!loading && !error && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Session / PII protection notice */}
          {isPublic && (
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2.5">
              <ShieldCheck size={15} className="flex-shrink-0 text-slate-500" />
              <span>
                Anda melihat <b>Dashboard Publik</b> — hanya ringkasan &amp; analitik agregat yang ditampilkan.
                Data pasien terlindungi dan memerlukan <b>login staf</b>.
              </span>
            </div>
          )}
          {!isPublic && !canViewPII && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-2.5">
              <Lock size={15} className="flex-shrink-0" />
              <span>
                Mode perlindungan data aktif: identitas pasien (nama, No. RM, alamat, keluarga) disamarkan
                sesuai hak akses <b>{ROLES[role].label}</b>.
              </span>
            </div>
          )}
          {sessionSecondsLeft() > 0 && sessionSecondsLeft() < 60 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>Sesi akan berakhir dalam {sessionSecondsLeft()} detik. Buka menu keamanan untuk tetap masuk.</span>
            </div>
          )}

          {/* ── GLOBAL DATE FILTER BAR ── */}
          <div className={`rounded-2xl shadow-md p-4 border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"}`}>
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-500" />
                <h3 className={`font-semibold text-sm ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Filter Periode</h3>
                {datePreset !== "all" && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {effectiveRange.label}
                    {datePreset === "custom" && effectiveRange.from && ` • ${fmtShort(effectiveRange.from)}`}
                    {datePreset === "custom" && effectiveRange.to && ` s/d ${fmtShort(effectiveRange.to)}`}
                  </span>
                )}
              </div>
              {(datePreset !== "all" || dateFrom || dateTo) && (
                  <button onClick={resetDateFilter} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium">
                  <X size={12} /> Reset Filter
                </button>
              )}
            </div>

            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {([
                { key: "all", label: "Semua" },
                { key: "today", label: "Hari Ini" },
                { key: "7d", label: "7 Hari Terakhir" },
                { key: "thisMonth", label: "Bulan Ini" },
                { key: "lastMonth", label: "Bulan Lalu" },
                { key: "custom", label: "Kustom" },
              ] as { key: DatePreset; label: string }[]).map((p) => (
                <button
                  key={p.key}
                  onClick={() => handlePreset(p.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    datePreset === p.key
                      ? "bg-blue-600 text-white shadow-sm"
                      : darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date range inputs */}
            {datePreset === "custom" && (
              <div className={`flex flex-wrap items-end gap-3 mt-4 pt-3 border-t ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                <div>
                  <label className={`block text-xs mb-1 font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Tanggal Dari</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-200"}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Tanggal Sampai</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-200"}`}
                  />
                </div>
                {dateFrom && (
                  <div className={`text-xs pb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Menampilkan data tgl <b className={darkMode ? "text-gray-200" : "text-gray-700"}>{fmtShort(inputToDate(dateFrom))}</b>
                    {dateTo && <> s/d <b className={darkMode ? "text-gray-200" : "text-gray-700"}>{fmtShort(inputToDate(dateTo))}</b></>}
                  </div>
                )}
              </div>
            )}

            {/* Summary count */}
            {totalPatients !== patients.length && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-1.5">
                <Filter size={12} className="text-blue-500" />
                Menampilkan <b className="text-blue-600">{totalPatients}</b> dari <b>{patients.length}</b> total pasien
              </div>
            )}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Users size={22} />} label="Total Pasien" value={totalPatients} sub="Pasien pulang" color="#2563eb" dark={darkMode} />
                <StatCard icon={<Building2 size={22} />} label="Ruangan" value={uniqueRuangan} sub="Bangsal aktif" color="#3b82f6" dark={darkMode} />
                <StatCard icon={<Clock size={22} />} label="Rata-rata LOS" value={`${avgLOS} hari`} sub="Length of Stay" color="#0ea5e9" dark={darkMode} />
                <StatCard icon={<ClipboardCheck size={22} />} label="LOS Terpanjang" value={`${maxLOS} hari`} sub="Maks perawatan" color="#1d4ed8" dark={darkMode} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`rounded-2xl shadow-md p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={18} className="text-blue-600" />
                    <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Pasien Pulang per Tanggal</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byDate} barCategoryGap="28%">
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e3a8a" : "#dbeafe"} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: darkMode ? "#93c5fd" : "#475569" }} />
                      <YAxis tick={{ fontSize: 11, fill: darkMode ? "#93c5fd" : "#475569" }} allowDecimals={false} />
                      <Tooltip content={<ElegantTooltip dark={darkMode} />} />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={22}>
                        {byDate.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        <LabelList dataKey="count" position="top" fill={darkMode ? "#cbd5e1" : "#475569"} fontSize={11} fontWeight={700} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className={`rounded-2xl shadow-md p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 size={18} className="text-blue-600" />
                    <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Distribusi Ruangan</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={byRuangan}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={78}
                        paddingAngle={3}
                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {byRuangan.map((entry, i) => (
                          <Cell key={i} fill={getRuanganColor(entry.name)} stroke={darkMode ? "#1f2937" : "#fff"} strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<ElegantTooltip dark={darkMode} />} />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`rounded-2xl shadow-md p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardCheck size={18} className="text-purple-500" />
                  <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Kelengkapan Checklist Kepulangan</h2>
                </div>
                <div className="space-y-3">
                    {checklistStats.map((item) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <p className={`text-xs w-56 flex-shrink-0 truncate ${darkMode ? "text-gray-300" : "text-gray-600"}`} title={item.fullName}>{item.fullName}</p>
                        <div className={`flex-1 rounded-full h-2 ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                          <div className="h-2 rounded-full transition-all" style={{ width: `${item.percent}%`, background: item.percent >= 90 ? "#10b981" : item.percent >= 70 ? "#3b82f6" : "#f59e0b" }} />
                        </div>
                        <span className={`text-xs font-bold w-24 text-right ${darkMode ? "text-gray-300" : "text-gray-600"}`}>{item.count}/{totalPatients} ({item.percent}%)</span>
                      </div>
                    ))}
                </div>
              </div>

              {canViewList ? (
              <div className={`rounded-2xl shadow-md p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-blue-500" />
                    <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Pasien Terbaru</h2>
                  </div>
                  <button onClick={() => setActiveTab("patients")} className="text-blue-500 text-xs font-medium flex items-center gap-1 hover:text-blue-400">
                    Lihat Semua <ChevronRight size={14} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`text-xs uppercase border-b ${darkMode ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-100"}`}>
                        <th className="text-left pb-2 font-semibold">Nama Pasien {!canViewPII && <Lock size={10} className="inline text-amber-500" />}</th>
                        <th className="text-left pb-2 font-semibold">No. RM {!canViewPII && <Lock size={10} className="inline text-amber-500" />}</th>
                        <th className="text-left pb-2 font-semibold">Ruangan</th>
                        <th className="text-left pb-2 font-semibold">Keluar RS</th>
                        <th className="text-left pb-2 font-semibold">LOS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dateFilteredPatients.slice(-6).reverse().map((p) => (
                        <tr key={p.id} className={`border-b transition-colors cursor-pointer ${darkMode ? "border-gray-700 hover:bg-gray-700" : "border-gray-50 hover:bg-gray-50"}`} onClick={() => openDetail(p)}>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: getRuanganColor(p.asalRuangan) }}>
                                {getInitials(protect(p.namaPasien, canViewPII, "name"))}
                              </div>
                              <span className={`font-medium ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{protect(p.namaPasien, canViewPII, "name")}</span>
                            </div>
                          </td>
                          <td className={`py-2.5 font-mono text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{protect(p.noRM, canViewPII, "rm")}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-xs text-white font-medium" style={{ background: getRuanganColor(p.asalRuangan) }}>
                              {p.asalRuangan || "N/A"}
                            </span>
                          </td>
                          <td className={`py-2.5 text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>{p.tanggalKeluar}</td>
                          <td className={`py-2.5 text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>{formatLOS(p.lamaRawat)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              ) : (
                <div className={`rounded-2xl shadow-md p-6 border-2 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-3 ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                      <Lock size={22} className="text-slate-400" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Data Pasien Terlindungi</h3>
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Daftar &amp; detail pasien hanya dapat diakses oleh staf yang berwenang setelah login.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setLoginMsg(null); setShowLogin(true); }}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
                  >
                    <LogIn size={15} /> Login Staf
                  </button>
                </div>
              )}
            </>
          )}

          {/* PATIENTS TAB */}
          {activeTab === "patients" && canViewList && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari nama pasien, No. RM, ruangan, alamat..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-200"}`}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterRuangan}
                    onChange={(e) => setFilterRuangan(e.target.value)}
                    className={`pl-8 pr-8 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm appearance-none ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-200"}`}
                  >
                    <option value="">Semua Ruangan</option>
                    {ruanganList.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Menampilkan <span className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>{filtered.length}</span> dari {totalPatients} pasien</p>
                <div className={`flex items-center gap-2 text-xs flex-wrap ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  <span>Urutkan:</span>
                  {(["namaPasien", "tanggalKeluar", "lamaRawat", "asalRuangan"] as const).map((k) => (
                    <button key={k} onClick={() => handleSort(k)} className={`px-2 py-1 rounded-lg border transition-colors ${sortKey === k ? "bg-blue-100 border-blue-300 text-blue-700 font-semibold" : darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"}`}>
                      {k === "namaPasien" ? "Nama" : k === "tanggalKeluar" ? "Tgl Keluar" : k === "lamaRawat" ? "LOS" : "Ruangan"}
                      {sortKey === k && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => {
                  const doneC = CHECKLIST_ALL.filter((c) => hasChecklistItem(p.checklist, c)).length;
                  const pct = Math.round((doneC / CHECKLIST_ALL.length) * 100);
                  return (
                    <div key={p.id} className={`rounded-2xl shadow-md p-5 hover:shadow-lg transition-all cursor-pointer border group ${darkMode ? "bg-gray-800 border-gray-700 hover:border-blue-500" : "bg-white border-transparent hover:border-blue-200"}`} onClick={() => openDetail(p)}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0" style={{ background: getRuanganColor(p.asalRuangan) }}>
                            {getInitials(protect(p.namaPasien, canViewPII, "name"))}
                          </div>
                          <div>
                            <p className={`font-semibold text-sm leading-tight flex items-center gap-1 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                              {protect(p.namaPasien, canViewPII, "name")}
                              {!canViewPII && <Lock size={11} className="text-amber-500" />}
                            </p>
                            <p className={`text-xs font-mono ${darkMode ? "text-gray-500" : "text-gray-400"}`}>No. RM: {protect(p.noRM, canViewPII, "rm")}</p>
                          </div>
                        </div>
                        <Eye size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                      </div>

                      <div className="space-y-1.5 mb-3">
                        <div className={`flex items-center gap-1.5 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          <Building2 size={11} />
                          <span className="px-1.5 py-0.5 rounded-full text-white text-xs" style={{ background: getRuanganColor(p.asalRuangan) }}>{p.asalRuangan || "N/A"}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          <CalendarDays size={11} />
                          <span>{p.tanggalMasuk || "?"} → {p.tanggalKeluar || "?"}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          <Clock size={11} />
                          <span>Lama rawat: {formatLOS(p.lamaRawat)}</span>
                        </div>
                          <div className={`flex items-center gap-1.5 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          <Users size={11} />
                          <span className="truncate">{protect(p.namaKeluarga, canViewPII, "text")}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>Kelengkapan</span>
                          <span className="text-xs font-bold" style={{ color: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>{pct}%</span>
                        </div>
                        <div className={`rounded-full h-1.5 ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Search size={40} className="mb-3 opacity-30" />
                  <p className="font-medium">Tidak ada pasien ditemukan</p>
                  <p className="text-sm">Coba ubah filter atau kata kunci pencarian</p>
                </div>
              )}
            </>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`rounded-2xl shadow-md p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={18} className="text-blue-600" />
                    <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Tren Kepulangan Harian</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byDate} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e3a8a" : "#dbeafe"} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: darkMode ? "#93c5fd" : "#475569" }} />
                      <YAxis tick={{ fontSize: 11, fill: darkMode ? "#93c5fd" : "#475569" }} allowDecimals={false} />
                      <Tooltip content={<ElegantTooltip dark={darkMode} />} />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={18}>
                        {byDate.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        <LabelList dataKey="count" position="top" fill={darkMode ? "#cbd5e1" : "#475569"} fontSize={11} fontWeight={700} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className={`rounded-2xl shadow-md p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={18} className="text-orange-500" />
                    <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Distribusi Lama Rawat (LOS)</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byLOS} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e3a8a" : "#dbeafe"} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: darkMode ? "#93c5fd" : "#475569" }} />
                      <YAxis tick={{ fontSize: 11, fill: darkMode ? "#93c5fd" : "#475569" }} allowDecimals={false} />
                      <Tooltip content={<ElegantTooltip dark={darkMode} />} />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                        {byLOS.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        <LabelList dataKey="value" position="top" fill={darkMode ? "#cbd5e1" : "#475569"} fontSize={12} fontWeight={700} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className={`rounded-2xl shadow-md p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 size={18} className="text-purple-500" />
                    <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Distribusi Pasien per Ruangan</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={byRuangan}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={78}
                        paddingAngle={3}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine
                      >
                        {byRuangan.map((entry, i) => (
                          <Cell key={i} fill={getRuanganColor(entry.name)} stroke={darkMode ? "#1f2937" : "#fff"} strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<ElegantTooltip dark={darkMode} />} />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className={`rounded-2xl shadow-md p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardCheck size={18} className="text-rose-500" />
                    <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Tingkat Kepatuhan Checklist</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={checklistStats} layout="vertical" barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e3a8a" : "#dbeafe"} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: darkMode ? "#93c5fd" : "#475569" }} unit="%" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: darkMode ? "#93c5fd" : "#475569" }} width={130} />
                      <Tooltip content={<ElegantTooltip dark={darkMode} />} />
                      <Bar dataKey="percent" radius={[0, 6, 6, 0]}>
                        {checklistStats.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                        <LabelList dataKey="percent" position="right" fill={darkMode ? "#cbd5e1" : "#475569"} fontSize={10} fontWeight={700} formatter={(v: any) => `${v}%`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Day-of-week analysis */}
                <div className={`rounded-2xl shadow-md p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarDays size={18} className="text-emerald-500" />
                    <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Pasien Pulang per Hari dalam Minggu</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byDayOfWeek}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e3a8a" : "#dbeafe"} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: darkMode ? "#93c5fd" : "#475569" }} />
                      <YAxis tick={{ fontSize: 11, fill: darkMode ? "#93c5fd" : "#475569" }} allowDecimals={false} />
                      <Tooltip content={<ElegantTooltip dark={darkMode} labelFormatter={(label) => `Hari ${byDayOfWeek.find(d => d.name === label)?.fullName || label}`} />} />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]} maxBarSize={40}>
                        {byDayOfWeek.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                        <LabelList dataKey="count" position="top" fill={darkMode ? "#cbd5e1" : "#475569"} fontSize={11} fontWeight={700} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {(() => {
                    const peakDay = byDayOfWeek.reduce((max, d) => d.count > max.count ? d : max, byDayOfWeek[0]);
                    return peakDay && peakDay.count > 0 && (
                      <div className={`mt-2 text-xs text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Hari tersibuk: <b className={darkMode ? "text-gray-200" : "text-gray-700"}>{peakDay.fullName}</b> ({peakDay.count} pasien)
                      </div>
                    );
                  })()}
                </div>

                {/* Monthly trend */}
                {byMonth.length > 1 && (
                  <div className={`rounded-2xl shadow-md p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={18} className="text-fuchsia-500" />
                      <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Pasien Pulang per Bulan</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={byMonth} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e3a8a" : "#dbeafe"} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: darkMode ? "#93c5fd" : "#475569" }} />
                        <YAxis tick={{ fontSize: 11, fill: darkMode ? "#93c5fd" : "#475569" }} allowDecimals={false} />
                        <Tooltip content={<ElegantTooltip dark={darkMode} />} />
                        <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={20}>
                          {byMonth.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          <LabelList dataKey="count" position="top" fill={darkMode ? "#cbd5e1" : "#475569"} fontSize={11} fontWeight={700} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className={`rounded-2xl shadow-md overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                {/* Header tetap di atas */}
                <div className={`flex items-center gap-2 px-5 pt-5 pb-3 border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                  <FileText size={18} className="text-gray-500" />
                  <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Ringkasan Statistik per Ruangan</h2>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${darkMode ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                    {byRuangan.length} Bangsal
                  </span>
                </div>
                {/* Tabel discroll di dalam — tidak memanjang ke bawah */}
                <div className="overflow-x-auto overflow-y-auto max-h-56">
                  <table className="w-full text-sm">
                    <thead className={`sticky top-0 z-10 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                      <tr className={`text-xs uppercase border-b ${darkMode ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-100"}`}>
                        <th className="text-left px-5 py-2.5 font-semibold">Ruangan</th>
                        <th className="text-center px-3 py-2.5 font-semibold">Total</th>
                        <th className="text-center px-3 py-2.5 font-semibold">Rata-rata LOS</th>
                        <th className="text-center px-3 py-2.5 font-semibold">LOS Maks</th>
                        <th className="text-center px-3 py-2.5 font-semibold">Checklist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byRuangan.map((r) => {
                        const rp = dateFilteredPatients.filter((p) => (p.asalRuangan || "Tidak Diketahui") === r.name);
                        const losRp = rp.filter((p) => p.lamaRawat > 0);
                        const avgR = losRp.length ? Math.round(losRp.reduce((s, p) => s + p.lamaRawat, 0) / losRp.length) : 0;
                        const maxR = rp.length ? Math.max(...rp.map((p) => p.lamaRawat)) : 0;
                        const avgCheck = rp.length
                          ? Math.round(rp.reduce((s, p) => {
                              const d = CHECKLIST_ALL.filter((c) => hasChecklistItem(p.checklist, c)).length;
                              return s + (d / CHECKLIST_ALL.length) * 100;
                            }, 0) / rp.length)
                          : 0;
                        return (
                          <tr key={r.name} className={`border-b transition-colors ${darkMode ? "border-gray-700 hover:bg-gray-700/60" : "border-gray-50 hover:bg-blue-50/40"}`}>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: getRuanganColor(r.name) }} />
                                <span className={`font-semibold text-sm ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{r.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center font-extrabold text-blue-600">{r.value}</td>
                            <td className={`px-3 py-2.5 text-center text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>{avgR > 0 ? `${avgR} hr` : "–"}</td>
                            <td className={`px-3 py-2.5 text-center text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>{maxR > 0 ? `${maxR} hr` : "–"}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${avgCheck >= 80 ? "bg-green-100 text-green-700" : avgCheck >= 60 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                {avgCheck}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── MODULE 1: TRANSPORT MODES BREAKDOWN ── */}
              <div className={`rounded-2xl shadow-md p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Car size={18} className="text-blue-500" />
                  <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Moda Transportasi Kepulangan Pasien</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {transportStats.map((t) => (
                    <div key={t.name} className={`p-4 rounded-xl border ${darkMode ? "bg-gray-700/50 border-gray-700" : "bg-gray-50 border-gray-100"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.name}</span>
                        <span className="text-sm font-black px-2 py-0.5 rounded text-white" style={{ background: t.color }}>{t.percent}%</span>
                      </div>
                      <p className={`text-2xl font-black ${darkMode ? "text-white" : "text-gray-800"}`}>{t.count} <span className="text-xs font-normal text-gray-400">pasien</span></p>
                      <p className="text-xs text-gray-400 mt-1">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── MODULE 2: MISSING CHECKLIST EVALUATION REPORT ── */}
              <div className={`rounded-2xl shadow-md overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                {/* Header & filter tetap di atas */}
                <div className={`px-5 pt-5 pb-3 border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <FileWarning size={18} className="text-red-500 flex-shrink-0" />
                      <div>
                        <h2 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Evaluasi Dokumen Kepulangan Tertunda</h2>
                        <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                          Pasien belum memenuhi 100% verifikasi checklist •{" "}
                          <span className="font-bold text-red-500">{incompletePatients.length} pasien</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Filter size={13} className="text-gray-400 flex-shrink-0" />
                      <select
                        value={missingFilter}
                        onChange={(e) => setMissingFilter(e.target.value)}
                        className={`text-xs px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? "bg-gray-700 border-gray-600 text-gray-200" : "bg-white border-gray-200 text-gray-700 shadow-sm"}`}
                      >
                        <option value="">Semua Item Tertunda</option>
                        {CHECKLIST_ALL.map((c) => (
                          <option key={c} value={c}>Kurang: {CHECKLIST_LABELS[c] || c}</option>
                        ))}
                      </select>
                      {missingFilter && (
                        <button onClick={() => setMissingFilter("")} className="text-xs text-red-500 hover:text-red-700 font-semibold px-1.5 py-1">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {incompletePatients.length === 0 ? (
                  <div className={`px-5 py-10 text-center ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                    <CheckSquare size={32} className="mx-auto mb-2 text-emerald-500" />
                    <h3 className="font-bold text-base mb-1">Semua Dokumen 100% Lengkap!</h3>
                    <p className={`text-xs max-w-md mx-auto ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                      Tidak ada pasien pada periode terfilter yang memiliki defisit dokumen kepulangan.
                    </p>
                  </div>
                ) : (
                  /* Isi tabel discroll di dalam — tidak memanjang ke bawah */
                  <div className="overflow-x-auto overflow-y-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead className={`sticky top-0 z-10 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                        <tr className={`text-xs uppercase border-b ${darkMode ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-100"}`}>
                          <th className="text-left px-5 py-2.5 font-semibold">Nama Pasien</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Bangsal</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Tgl Keluar</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Item Tertunda</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incompletePatients.map((p) => (
                          <tr
                            key={p.id}
                            onClick={() => openDetail(p)}
                            className={`border-b transition-colors cursor-pointer ${darkMode ? "border-gray-700 hover:bg-gray-700/60" : "border-gray-50 hover:bg-red-50/30"}`}
                          >
                            <td className="px-5 py-2.5 font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ background: getRuanganColor(p.asalRuangan) }}>
                                  {getInitials(protect(p.namaPasien, canViewPII, "name"))}
                                </div>
                                <span className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                                  {protect(p.namaPasien, canViewPII, "name")}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded text-xs text-white font-semibold" style={{ background: getRuanganColor(p.asalRuangan) }}>
                                {p.asalRuangan || "N/A"}
                              </span>
                            </td>
                            <td className={`px-3 py-2.5 text-xs font-mono ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              {p.tanggalKeluar}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {p.missingItems.map((m) => (
                                  <span key={m} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full border border-red-200 whitespace-nowrap">
                                    <AlertTriangle size={9} /> {CHECKLIST_LABELS[m] || m}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      )}

      {selectedPatient && (
        <PatientModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          canViewPII={canViewPII}
          dark={darkMode}
          onPrint={(p) => {
            setSelectedPatient(null);
            setPrintingPatient(p);
            if (session) {
              appendAudit({
                user: session.user.username,
                action: "PRINT_DOC",
                detail: `Mencetak dokumen bukti kepulangan pasien No. RM ${p.noRM}`,
              });
            }
          }}
        />
      )}

      {showSecurity && session && (
        <SecurityPanel
          session={session}
          onClose={() => setShowSecurity(false)}
          onLogout={() => handleLogout()}
        />
      )}

      <footer className="mt-10 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2">
          <span className="flex items-center gap-1.5">
            <Lock size={12} className="text-emerald-500" />
            Dashboard Dokumen Pasien Pulang • RS Timika © 2025
          </span>
          <span>
            Menampilkan {totalPatients} dari {patients.length} pasien • Data Realtime dari Google Sheets
            {datePreset !== "all" && <> • Filter: {effectiveRange.label}</>}
          </span>
        </div>
      </footer>
    </div>
  );
}
