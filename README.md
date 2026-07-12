# Dashboard Sa Antar Ko - RS Timika

Dashboard interaktif untuk monitoring dokumen kepulangan pasien di RSUD Timika, Papua Tengah.

## 🏥 Fitur Utama

### 👥 **Sistem Autentikasi Aman**
- Login dengan enkripsi **PBKDF2 SHA-256 + Cryptographic Salt** (120 iterasi)
- Role-based access control (RBAC): Admin, Medis, Petugas
- Session timeout otomatis (30 menit)
- Audit log lengkap untuk semua aktivitas

### 📊 **Dashboard Realtime**
- Data langsung dari Google Sheets (auto-refresh 60 detik)
- Filter periode: Hari ini, 7 hari, Bulan ini, Bulan lalu, Custom range
- Visualisasi grafik interaktif (Bar Chart, Pie Chart, Area Chart)
- Mode publik (tanpa login) untuk statistik agregat

### 🔒 **Keamanan Data Pasien**
- PII (Personally Identifiable Information) masking otomatis untuk role non-medis
- Data sensitif (nama, No. RM, alamat) disamarkan sesuai hak akses
- Export CSV dengan opsi mask/unmask data pribadi

### 👤 **Manajemen Pengguna (Admin)**
- Tambah/hapus akun pengguna
- Reset password user lain
- Ubah role pengguna
- Edit profil pribadi (nama tampilan & unit)

### 📋 **Fitur Klinis**
- Monitoring kelengkapan checklist kepulangan (10 item wajib)
- Tracking lama rawat inap (LOS) per bangsal
- Evaluasi dokumen tertunda
- Cetak laporan formal A4 (print-ready)

## 🚀 Deployment

### Prasyarat
- Node.js 18+ dan npm
- Akses ke Google Sheets published CSV URL

### Instalasi Lokal

```bash
# Clone repository
git clone https://github.com/rstimpapua21-cmyk/Dashboard-Sa-Antar-Ko.git
cd Dashboard-Sa-Antar-Ko

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build Production

```bash
# Build untuk production
npm run build

# Output akan ada di folder dist/
# File single HTML siap di-deploy ke static hosting
```

### Deploy ke Static Hosting

Dashboard ini menghasilkan **single HTML file** (±780KB gzipped) yang bisa di-host di:

- **GitHub Pages**: Upload `dist/index.html` ke branch `gh-pages`
- **Netlify**: Drag & drop folder `dist/`
- **Vercel**: Connect repository, auto-detect Vite
- **RS Timika Server**: Upload ke web server internal

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (utility-first)
- **Charts**: Recharts (responsive & interactive)
- **Icons**: Lucide React
- **Crypto**: Web Crypto API (SHA-256 hashing)
- **State**: React Hooks (useState, useMemo, useCallback)

## 📁 Struktur Folder

```
src/
├── auth/                  # Sistem autentikasi & keamanan
│   ├── session.ts         # Session management + SHA-256 hashing
│   ├── rbac.ts            # Role-based access control definitions
│   ├── LoginGate.tsx      # Halaman login
│   └── SecurityPanel.tsx  # Panel keamanan & manajemen user
├── components/            # Komponen reusable
│   ├── Toast.tsx          # Sistem notifikasi toast
│   └── PrintablePatientReport.tsx  # Laporan cetak A4
├── data/
│   └── patientData.ts     # Fetch data dari Google Sheets
├── utils/
│   ├── mask.ts            # PII masking functions
│   └── cn.ts              # Class name utilities
├── App.tsx                # Main application component
├── main.tsx               # Entry point
└── index.css              # Global styles + Tailwind
```

## 🔐 Akun Bawaan

| Username | Role    | Unit                  |
|----------|---------|-----------------------|
| admin    | Admin   | Direktur RS           |
| medis    | Medis   | Instalasi Rawat Inap  |
| petugas  | Petugas | Rekam Medis           |

⚠️ **Penting**: Password bawaan **tidak ditampilkan di source code** — hanya hash SHA-256 + Salt yang tersimpan. Password dikomunikasikan melalui jalur secure terpisah. Ganti password setelah deployment pertama!

## 📊 Sumber Data

Dashboard mengambil data realtime dari Google Sheets yang dipublish:
- Format: CSV published URL
- Auto-refresh: 60 detik
- Fallback: CORS proxy chain jika direct fetch gagal

## 🛡️ Keamanan & Privasi

- **Zero Plaintext Password**: Semua sandi di-hash dengan SHA-256 + salt unik
- **Session Encryption**: Token sesi disimpan encrypted di localStorage
- **Audit Trail**: Semua aksi penting tercatat dengan timestamp
- **PII Protection**: Data pribadi pasien otomatis disamarkan untuk role non-medis
- **Compliance**: Mengikuti prinsip privasi data kesehatan (HIPAA-inspired)

## 📝 Lisensi

© 2025 RSUD Timika - Dinas Kesehatan Papua Tengah

---

**Pengembang**: Tim IT RSUD Timika  
**Kontak**: [it-support@rsudtimika.go.id](mailto:it-support@rsudtimika.go.id)  
**Versi**: 1.0.0 (Production Ready)
