# 📊 Dashboard Sa Antar Ko

Dashboard monitoring sistem pasien pulang untuk rumah sakit dengan sinkronisasi data real-time dari Google Sheets.

![Status](https://img.shields.io/badge/Status-Production-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Fitur Utama

- 📊 **Dashboard Interaktif** - Visualisasi data pasien pulang dengan grafik dan tabel
- 🔄 **Auto Sync** - Sinkronisasi otomatis dari Google Sheets
- 📱 **Responsive Design** - Tampilan optimal di desktop dan mobile
- 🔍 **Filter & Search** - Pencarian dan filter data berdasarkan berbagai kriteria
- 📈 **Statistik Real-time** - KPI dan metrik penting langsung terlihat
- 💾 **Offline Ready** - Data embedded, bisa diakses tanpa internet
- 🎨 **Modern UI** - Desain dark mode yang elegan dan profesional

## 🚀 Cara Menggunakan

### Instalasi

1. **Clone repository ini**
```bash
git clone https://github.com/rstimpapua21-cmyk/sa-antar-ko.git
cd sa-antar-ko
```

2. **Buka dashboard**
   - Double-click file `sa_ntarko.html`
   - Atau buka di browser: `sa_ntarko.html`

### Update Data dari Google Sheets

**Cara Otomatis (Recommended):**
```bash
# Windows
sync_dashboard.bat

# Atau jalankan manual
python sync_data.py
python embed_data.py
python update_dashboard.py
```

**Cara Manual:**
1. Download CSV dari Google Sheets
2. Jalankan `python embed_data.py`
3. Jalankan `python update_dashboard.py`
4. Refresh dashboard di browser

### Deploy ke Web Server

**Menggunakan Python HTTP Server:**
```bash
python -m http.server 8000
```
Kemudian buka: http://localhost:8000/sa_ntarko.html

**Menggunakan Node.js:**
```bash
npx serve
```

**Deploy ke GitHub Pages:**
1. Push ke repository GitHub
2. Aktifkan GitHub Pages di Settings
3. Akses via: `https://username.github.io/sa-antar-ko`

## 📁 Struktur Project

```
sa-antar-ko/
├── sa_ntarko.html          # Dashboard utama (HTML + CSS + JS)
├── sync_dashboard.bat      # Script otomatis sync data
├── sync_data.py           # Download data dari Google Sheets
├── embed_data.py          # Convert CSV ke JSON
├── update_dashboard.py    # Embed data ke HTML
├── README.md              # Dokumentasi (file ini)
├── CARA_PAKAI.txt         # Panduan penggunaan
├── .gitignore            # Git ignore rules
└── data/                 # Data files (optional)
    ├── data.csv
    └── embedded_data.json
```

## 🔧 Teknologi

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Charts**: Chart.js with plugins
- **Icons**: Font Awesome 6
- **Data Source**: Google Sheets (Published CSV)
- **Build Tools**: Python scripts

## 📊 Data Source

Dashboard ini menggunakan data dari Google Sheets yang di-publish sebagai CSV:

- **Source**: Google Sheets
- **Format**: CSV (Comma Separated Values)
- **Update**: Manual via sync scripts
- **Records**: 1,989+ data pasien

## 🎯 Use Cases

- Monitoring pasien pulang harian
- Tracking status dokumentasi
- Analisis trend pasien
- Reporting untuk manajemen
- Audit kelengkapan berkas

## 🛠️ Development

### Prerequisites

- Browser modern (Chrome, Firefox, Edge, Safari)
- Python 3.x (untuk sync scripts)
- Git (untuk version control)

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/rstimpapua21-cmyk/sa-antar-ko.git

# Install Python dependencies (optional)
pip install requests

# Start local server
python -m http.server 8000
```

## 📝 Kontribusi

Kontribusi sangat diterima! Silakan:

1. Fork repository ini
2. Buat branch fitur baru (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 Lisensi

Distributed under the MIT License. See `LICENSE` for more information.

## 👥 Author

- **RS Timika Papua** - Initial work
- Development Team - Maintenance & updates

## 📞 Support

Untuk pertanyaan atau bantuan:
- 📧 Email: [Contact via GitHub]
- 🐛 Issues: [Create an issue](https://github.com/rstimpapua21-cmyk/sa-antar-ko/issues)

## 🙏 Acknowledgments

- Chart.js team for amazing charting library
- Font Awesome for icons
- Google Sheets API for data integration
- All contributors and users

## 📈 Roadmap

- [x] Dashboard v1.0 dengan data embedded
- [x] Auto sync dari Google Sheets
- [ ] Real-time sync via WebSocket
- [ ] Export ke PDF/Excel
- [ ] User authentication
- [ ] Multi-language support
- [ ] Mobile app version

---

**Last Updated**: 2026-07-08  
**Version**: 1.0.0  
**Status**: Production Ready ✅
