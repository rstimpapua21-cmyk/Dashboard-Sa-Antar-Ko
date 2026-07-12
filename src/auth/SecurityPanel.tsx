import { useState } from "react";
import {
  X, Shield, KeyRound, Clock, ScrollText, Trash2, CheckCircle2, Lock,
  Check, RefreshCw, Eye, EyeOff, ShieldCheck,
  User, Users as UsersIcon, UserPlus, Building,
} from "lucide-react";
import { ROLES, can, type Permission, type Role } from "./rbac";
import {
  type Session,
  type StoredUser,
  getAuditLog,
  clearAuditLog,
  remainingMs,
  SESSION_TTL,
  changeUserPassword,
  resetToFactoryCredentials,
  updateUserProfile,
  getStoredUsers,
  createUser,
  deleteUser,
  adminResetUserPassword,
  adminChangeUserRole,
} from "./session";
import { useToast } from "../components/Toast";

interface SecurityPanelProps {
  session: Session;
  onClose: () => void;
  onLogout: () => void;
}

const PERMISSION_LABELS: Record<Permission, string> = {
  view_dashboard: "Lihat Dashboard",
  view_patient_list: "Lihat Daftar Pasien",
  view_patient_pii: "Lihat Data Pribadi (PII)",
  view_patient_detail: "Buka Detail Pasien",
  view_analytics: "Lihat Analitik",
  export_data: "Ekspor Data (CSV)",
};

function formatTs(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type Tab = "akses" | "profil" | "password" | "users" | "log";

export default function SecurityPanel({ session, onClose, onLogout }: SecurityPanelProps) {
  const toast = useToast();
  const isAdmin = can(session.user.role, "view_patient_pii") && session.user.role === "admin";

  const [tab, setTab] = useState<Tab>("akses");

  // Password change state
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Profile edit state
  const [profileName, setProfileName] = useState(session.user.displayName);
  const [profileUnit, setProfileUnit] = useState(session.user.unit);
  const [profileLoading, setProfileLoading] = useState(false);

  // User management state (admin only)
  const [users, setUsers] = useState<StoredUser[]>(() => getStoredUsers());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newUserUnit, setNewUserUnit] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("petugas");
  const [newUserPw, setNewUserPw] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Admin reset user password state
  const [resettingUser, setResettingUser] = useState<string | null>(null);
  const [resetPwValue, setResetPwValue] = useState("");

  const role = ROLES[session.user.role];
  const logs = getAuditLog();
  const allPerms = Object.keys(PERMISSION_LABELS) as Permission[];
  const ttlMin = Math.round(SESSION_TTL / 60000);

  function refreshUsers() {
    setUsers(getStoredUsers());
  }

  function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error("Konfirmasi Tidak Cocok", "Kata sandi baru & konfirmasinya harus sama persis.");
      return;
    }

    setPwLoading(true);
    setTimeout(() => {
      const res = changeUserPassword(session.user.username, oldPw, newPw);
      setPwLoading(false);
      if (!res.success) {
        toast.error("Gagal Mengganti Sandi", res.message);
      } else {
        toast.success("Sandi Terenkripsi", res.message);
        setOldPw("");
        setNewPw("");
        setConfirmPw("");
      }
    }, 400);
  }

  async function handleResetFactory() {
    const ok = await toast.confirm({
      title: "Reset Semua Sandi ke Pabrik?",
      message:
        "Semua akun (admin, medis, petugas) akan dikembalikan ke sandi bawaan awal. Data pengguna tambahan tidak akan terpengaruh, hanya kredensial pabrik yang di-reset. Lanjutkan?",
      okLabel: "Ya, Reset",
      danger: true,
    });
    if (ok) {
      resetToFactoryCredentials();
      refreshUsers();
      toast.warning("Sandi Pabrik Dipulihkan", "Semua akun bawaan telah dikembalikan ke sandi awal & dihash ulang SHA-256.");
    }
  }

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setTimeout(() => {
      const res = updateUserProfile(session.user.username, profileName, profileUnit);
      setProfileLoading(false);
      if (!res.success) {
        toast.error("Gagal Simpan Profil", res.message);
      } else {
        toast.success("Profil Tersimpan", "Nama tampilan & unit kerja Anda telah diperbarui.");
        refreshUsers();
      }
    }, 350);
  }

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setTimeout(() => {
      const res = createUser(session.user.username, {
        username: newUsername,
        password: newUserPw,
        displayName: newDisplayName,
        role: newUserRole,
        unit: newUserUnit,
      });
      setCreateLoading(false);
      if (!res.success) {
        toast.error("Gagal Buat Akun", res.message);
      } else {
        toast.success("Akun Berhasil Dibuat", res.message);
        setNewUsername("");
        setNewDisplayName("");
        setNewUserUnit("");
        setNewUserPw("");
        setNewUserRole("petugas");
        setShowCreateForm(false);
        refreshUsers();
      }
    }, 400);
  }

  async function handleDeleteUser(username: string) {
    const ok = await toast.confirm({
      title: `Hapus Akun @${username}?`,
      message: `Semua akses login untuk @${username} akan dinonaktifkan permanen. Aksi ini tidak dapat dibatalkan.`,
      okLabel: "Ya, Hapus Permanen",
      danger: true,
    });
    if (!ok) return;
    const res = deleteUser(session.user.username, username);
    if (!res.success) {
      toast.error("Gagal Hapus Akun", res.message);
    } else {
      toast.success("Akun Dihapus", res.message);
      refreshUsers();
    }
  }

  function handleAdminReset(username: string) {
    if (!resetPwValue || resetPwValue.length < 8) {
      toast.warning("Sandi Terlalu Pendek", "Kata sandi baru minimal 8 karakter.");
      return;
    }
    const res = adminResetUserPassword(session.user.username, username, resetPwValue);
    if (!res.success) {
      toast.error("Gagal Reset Sandi", res.message);
    } else {
      toast.success("Sandi Direset", `Sandi @${username} berhasil diubah. Sampaikan sandi baru secara aman kepada pengguna.`);
      setResettingUser(null);
      setResetPwValue("");
      refreshUsers();
    }
  }

  function handleChangeRole(username: string, newRole: Role) {
    const res = adminChangeUserRole(session.user.username, username, newRole);
    if (!res.success) {
      toast.error("Gagal Ubah Role", res.message);
    } else {
      toast.success("Role Diperbarui", res.message);
      refreshUsers();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Shield size={18} />
            <h3 className="font-semibold">Keamanan & Akses</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* User summary */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: role.color }}
          >
            {session.user.displayName.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800">{session.user.displayName}</p>
            <p className="text-xs text-gray-400">
              @{session.user.username} • {session.user.unit}
            </p>
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
            style={{ background: role.color }}
          >
            {role.label}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b border-gray-100 overflow-x-auto">
          {([
            { k: "akses" as Tab, label: "🔑 Hak Akses" },
            { k: "profil" as Tab, label: "👤 Profil" },
            { k: "password" as Tab, label: "🔐 Sandi" },
            ...(isAdmin ? [{ k: "users" as Tab, label: `👥 Pengguna (${users.length})` }] : []),
            { k: "log" as Tab, label: `📜 Log (${logs.length})` },
          ]).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 -mb-px ${
                tab === t.k
                  ? "border-blue-600 text-blue-700 bg-blue-50/60 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {tab === "akses" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <KeyRound size={14} className="text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-400">ID Sesi</p>
                    <p className="font-mono text-xs text-gray-700 truncate">{session.token.slice(0, 8)}…</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Clock size={14} className="text-emerald-500" />
                  <div>
                    <p className="text-xs text-gray-400">Masa Berlaku</p>
                    <p className="font-medium text-gray-700">{ttlMin} menit</p>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-emerald-800">
                <ShieldCheck size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold">Keamanan Kata Sandi SHA-256 PBKDF2</p>
                  <p className="mt-0.5 text-emerald-700">
                    Sistem ini menggunakan enkripsi sandi berganda 120 iterasi SHA-256 + cryptographic salt unik per akun. Tidak ada kata sandi yang disimpan dalam bentuk teks biasa (plaintext).
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
                <Lock size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  {can(session.user.role, "view_patient_pii")
                    ? "Anda memiliki hak akses penuh atas data pribadi pasien (PII)."
                    : "Data pribadi pasien (nama, RM, alamat) otomatis disamarkan untuk menjaga privasi."}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  Matriks Hak Akses
                </p>
                <div className="space-y-1.5">
                  {allPerms.map((perm) => {
                    const allowed = can(session.user.role, perm);
                    return (
                      <div
                        key={perm}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <span className="text-sm text-gray-700">{PERMISSION_LABELS[perm]}</span>
                        {allowed ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 size={14} /> Diizinkan
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold text-gray-400">
                            <Lock size={12} /> Ditolak
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "password" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900">
                <p className="font-bold flex items-center gap-1.5">
                  <KeyRound size={14} className="text-blue-600" />
                  Mengubah Kata Sandi Akun (@{session.user.username})
                </p>
                <p className="mt-1 text-blue-700">
                  Kata sandi baru akan langsung dienkripsi dengan <b>PBKDF2 SHA-256 (120 Putaran) + Salt Kriptografis</b> dan disimpan di penyimpanan aman lokal browser Anda.
                </p>
              </div>

              <form onSubmit={handlePwSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kata Sandi Saat Ini</label>
                  <div className="relative">
                    <input
                      type={showOld ? "text" : "password"}
                      value={oldPw}
                      onChange={(e) => setOldPw(e.target.value)}
                      placeholder="Masukkan kata sandi lama Anda"
                      required
                      className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kata Sandi Baru</label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      required
                      minLength={8}
                      className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {newPw && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: newPw.length < 8 ? "33%" : newPw.length < 12 ? "66%" : "100%",
                            background: newPw.length < 8 ? "#ef4444" : newPw.length < 12 ? "#f59e0b" : "#10b981",
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: newPw.length < 8 ? "#ef4444" : newPw.length < 12 ? "#f59e0b" : "#10b981" }}>
                        {newPw.length < 8 ? "Lemah (min 8)" : newPw.length < 12 ? "Sedang" : "Kuat"}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      required
                      minLength={8}
                      className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirmPw && confirmPw !== newPw && (
                    <p className="text-[11px] text-red-500 font-semibold mt-1">Kata sandi tidak cocok</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={pwLoading || !oldPw || !newPw || newPw !== confirmPw || newPw.length < 8}
                  className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  {pwLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <KeyRound size={14} /> Enkripsi &amp; Ganti Sandi SHA-256
                    </>
                  )}
                </button>
              </form>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Lupa sandi akun Anda?</span>
                <button
                  type="button"
                  onClick={handleResetFactory}
                  className="text-[11px] text-red-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <RefreshCw size={11} /> Reset Sandi Pabrik (Bawaan)
                </button>
              </div>
            </div>
          )}

          {/* ── PROFIL PENGGUNA ── */}
          {tab === "profil" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900">
                <p className="font-bold flex items-center gap-1.5">
                  <User size={14} className="text-blue-600" /> Kelola Profil Pribadi
                </p>
                <p className="mt-1 text-blue-700">
                  Perbarui nama tampilan &amp; unit kerja Anda. Perubahan langsung terlihat di header dashboard, log audit, dan seluruh laporan.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg"
                  style={{ background: role.color }}
                >
                  {profileName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{profileName}</p>
                  <p className="text-xs text-gray-500">@{session.user.username}</p>
                  <p className="text-xs text-gray-400">{profileUnit} • {role.label}</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <User size={13} className="text-slate-500" /> Nama Tampilan
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Contoh: dr. Adi Wijaya, Sp.PD"
                    required
                    minLength={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Building size={13} className="text-slate-500" /> Unit / Departemen
                  </label>
                  <input
                    type="text"
                    value={profileUnit}
                    onChange={(e) => setProfileUnit(e.target.value)}
                    placeholder="Contoh: Instalasi Rawat Inap Bedah"
                    required
                    minLength={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2.5">
                  Username <b className="font-mono text-gray-700">@{session.user.username}</b> tidak bisa diubah sendiri karena berkaitan dengan login. Hubungi administrator jika ingin mengubahnya.
                </div>

                <button
                  type="submit"
                  disabled={profileLoading || !profileName || !profileUnit || (profileName === session.user.displayName && profileUnit === session.user.unit)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  {profileLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={14} /> Simpan Perubahan Profil
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ── MANAJEMEN PENGGUNA (ADMIN ONLY) ── */}
          {tab === "users" && isAdmin && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900">
                <p className="font-bold flex items-center gap-1.5">
                  <UsersIcon size={14} className="text-indigo-600" /> Manajemen Akun Pengguna Sistem
                </p>
                <p className="mt-1 text-indigo-700">
                  Anda dapat menambah, mengubah role, mereset sandi, atau menghapus akun. Semua sandi baru dienkripsi otomatis dengan SHA-256 + Salt kriptografis.
                </p>
              </div>

              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  <UserPlus size={14} /> Tambah Pengguna Baru
                </button>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-3 bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                      <UserPlus size={14} /> Buat Akun Baru
                    </h4>
                    <button type="button" onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-700">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Username</label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="mis. dr_yudi"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Role</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as Role)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        {(Object.keys(ROLES) as Role[]).filter((r) => r !== "public").map((r) => (
                          <option key={r} value={r}>{ROLES[r].label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Nama Tampilan</label>
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="dr. Yudi Prasetyo"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Unit / Departemen</label>
                    <input
                      type="text"
                      value={newUserUnit}
                      onChange={(e) => setNewUserUnit(e.target.value)}
                      placeholder="Instalasi Rawat Inap"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Sandi Awal (min. 8 karakter)</label>
                    <input
                      type="text"
                      value={newUserPw}
                      onChange={(e) => setNewUserPw(e.target.value)}
                      placeholder="Sampaikan sandi ini secara aman ke pengguna"
                      required
                      minLength={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={createLoading || newUserPw.length < 8}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow flex items-center justify-center gap-1.5"
                  >
                    {createLoading ? <RefreshCw size={13} className="animate-spin" /> : <><Check size={13} /> Buat Akun (Dienkripsi SHA-256)</>}
                  </button>
                </form>
              )}

              {/* User list */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-between">
                  <span>Daftar Pengguna Terdaftar</span>
                  <span className="text-gray-400 normal-case font-medium">{users.length} akun</span>
                </p>
                {users.map((u) => {
                  const uRole = ROLES[u.role];
                  const isSelf = u.username.toLowerCase() === session.user.username.toLowerCase();
                  return (
                    <div key={u.username} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ background: uRole.color }}
                        >
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-800 truncate flex items-center gap-1">
                            {u.displayName}
                            {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Anda</span>}
                          </p>
                          <p className="text-[11px] text-gray-500 font-mono truncate">@{u.username} • {u.unit}</p>
                        </div>
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.username, e.target.value as Role)}
                          disabled={isSelf}
                          className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed"
                          title={isSelf ? "Tidak bisa mengubah role diri sendiri" : "Ubah role pengguna"}
                        >
                          {(Object.keys(ROLES) as Role[]).filter((r) => r !== "public").map((r) => (
                            <option key={r} value={r}>{ROLES[r].short}</option>
                          ))}
                        </select>
                      </div>

                      {/* Reset password inline form */}
                      {resettingUser === u.username ? (
                        <div className="px-3 py-2.5 bg-amber-50 border-t border-amber-200 flex items-center gap-2">
                          <KeyRound size={13} className="text-amber-600 flex-shrink-0" />
                          <input
                            type="text"
                            value={resetPwValue}
                            onChange={(e) => setResetPwValue(e.target.value)}
                            placeholder="Sandi baru (min. 8 karakter)"
                            className="flex-1 px-2 py-1 rounded border border-amber-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAdminReset(u.username)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => { setResettingUser(null); setResetPwValue(""); }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-gray-500">
                            {u.lastChanged && u.lastChanged !== "Inisialisasi sistem"
                              ? `Sandi diubah: ${new Date(u.lastChanged).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
                              : "Menggunakan sandi bawaan sistem"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => { setResettingUser(u.username); setResetPwValue(""); }}
                              className="text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1"
                            >
                              <KeyRound size={11} /> Reset Sandi
                            </button>
                            {!isSelf && (
                              <>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleDeleteUser(u.username)}
                                  className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                                >
                                  <Trash2 size={11} /> Hapus
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "log" && (
            <div>
              {logs.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <ScrollText size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada aktivitas tercatat.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {logs
                    .slice()
                    .reverse()
                    .map((log, i) => (
                      <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <ScrollText size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">{log.action}</span>
                            {log.detail && <span className="text-gray-500"> — {log.detail}</span>}
                          </p>
                          <p className="text-xs text-gray-400">
                            {log.user} • {formatTs(log.ts)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {logs.length > 0 && (
                <button
                  onClick={() => clearAuditLog()}
                  className="mt-3 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  <Trash2 size={13} /> Bersihkan Log
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <p className="text-xs text-gray-500 font-medium">
            Sisa sesi aktif: <b className="text-blue-700">{Math.floor(remainingMs(session) / 60000)} menit</b>
          </p>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow transition-colors"
          >
            Keluar dari Sistem
          </button>
        </div>
      </div>
    </div>
  );
}
