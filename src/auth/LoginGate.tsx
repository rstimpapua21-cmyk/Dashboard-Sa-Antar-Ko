import { useState } from "react";
import { Lock, Shield, User, KeyRound, LogIn, Eye, EyeOff, AlertCircle } from "lucide-react";
import { authenticate, type Session } from "./session";
import { ROLES } from "./rbac";

interface LoginGateProps {
  onLogin: (session: Session) => void;
  initialMessage?: string | null;
  onCancel?: () => void;
}

const DEMO_ACCOUNTS = [
  { username: "admin", password: "Admin@2025", role: "admin" as const },
  { username: "medis", password: "Medis@2025", role: "medis" as const },
  { username: "petugas", password: "Petugas@2025", role: "petugas" as const },
];

export default function LoginGate({ onLogin, initialMessage, onCancel }: LoginGateProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(initialMessage || null);
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // small delay to mimic server round-trip
    setTimeout(() => {
      const session = authenticate(username, password);
      setLoading(false);
      if (!session) {
        setError("Username atau kata sandi salah. Akses ditolak.");
        return;
      }
      onLogin(session);
    }, 450);
  }

  function fillDemo(acc: { username: string; password: string }) {
    setUsername(acc.username);
    setPassword(acc.password);
    setError(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl mb-3">
            <Shield className="text-white" size={30} />
          </div>
          <h1 className="text-white text-xl font-bold">Dashboard Pasien Pulang</h1>
          <p className="text-blue-200/80 text-sm">Sistem Terproteksi • RS Timika</p>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 sm:p-8"
        >
          <div className="flex items-center gap-2 mb-5">
            <Lock className="text-blue-600" size={18} />
            <h2 className="text-gray-800 font-semibold">Masuk ke Sistem</h2>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl transition-colors"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
              ) : (
                <>
                  <LogIn size={16} /> Masuk
                </>
              )}
            </button>
          </div>

          {/* Demo accounts */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowDemo((s) => !s)}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              {showDemo ? "Sembunyikan kredensial demo" : "Tampilkan kredensial akun bawaan"}
            </button>
            {showDemo && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-gray-500 font-medium">
                  Catatan: Semua sandi diverifikasi menggunakan enkripsi <b>PBKDF2 SHA-256 + Salt</b>. Setelah masuk, Anda dapat mengganti sandi melalui menu Keamanan.
                </p>
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className="w-full flex items-center justify-between text-left bg-gray-50 hover:bg-blue-50 rounded-lg px-3 py-2 transition-colors border border-gray-200 hover:border-blue-300"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shadow-sm"
                        style={{ background: ROLES[acc.role].color }}
                      />
                      <span className="text-sm font-bold text-gray-800">{ROLES[acc.role].label}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono font-semibold">{acc.username} / {acc.password}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 w-full text-center text-blue-200/80 hover:text-white text-sm font-medium transition-colors"
          >
            ← Kembali ke Dashboard Publik
          </button>
        )}

        <div className="text-center text-blue-200/70 text-xs mt-5 px-4 space-y-1">
          <p className="font-semibold text-white/90">🔒 Dilindungi Enkripsi Kriptografis SHA-256</p>
          <p>
            Akses ke rekam medis pasien dicatat dalam log audit yang tidak dapat dimanipulasi serta mematuhi protokol privasi data kesehatan.
          </p>
        </div>
      </div>
    </div>
  );
}
