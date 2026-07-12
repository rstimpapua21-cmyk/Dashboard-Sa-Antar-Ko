#!/usr/bin/env python3
"""
QUICK DEPLOY - Auto-Sync Dashboard RSTIM Papua
File ini akan otomatis membuat semua file yang diperlukan
untuk auto-sync dashboard dari Google Sheets.

Cara pakai:
1. Save file ini di folder repository sa-antar-ko
2. Jalankan: python quick_deploy.py
3. Selesai! Tinggal commit & push
"""

import os
import sys
from pathlib import Path

def create_file(path, content):
    """Buat file dengan content"""
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Jika file sudah ada, tanyakan apakah mau overwrite
    if file_path.exists():
        response = input(f"⚠️  File {path} sudah ada. Timpa? (y/n): ")
        if response.lower() != 'y':
            print(f"⏭️  Skip: {path}")
            return False
    
    file_path.write_text(content, encoding='utf-8')
    print(f"✅ Created: {path}")
    return True

def main():
    print("\n" + "=" * 60)
    print("🚀 QUICK DEPLOY - AUTO-SYNC DASHBOARD")
    print("=" * 60)
    
    # Cek apakah di dalam git repository
    if not os.path.exists('.git'):
        print("\n❌ ERROR: Folder ini bukan git repository!")
        print("\n💡 Solusi:")
        print("   1. Buka folder repository sa-antar-ko")
        print("   2. Jalankan lagi: python quick_deploy.py")
        print("\n   Atau jalankan: git init")
        sys.exit(1)
    
    print("\n📂 Git repository terdeteksi ✓")
    
    # ============================================
    # FILE 1: GitHub Actions Workflow
    # ============================================
    workflow = '''name: 🔄 Auto Sync Dashboard

on:
  schedule:
    - cron: '*/30 * * * *'  # Setiap 30 menit
  workflow_dispatch:        # Bisa trigger manual
  push:
    paths:
      - 'sync_data.py'
      - 'sa_ntarko.html'

permissions:
  contents: write

jobs:
  sync-data:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - name: 📥 Checkout Repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0
      
      - name: 🐍 Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: 📦 Install Dependencies
        run: |
          python -m pip install --upgrade pip
          pip install requests
      
      - name: 🔄 Sync Data dari Google Sheets
        id: sync
        run: |
          echo "🚀 Memulai sync data..."
          python sync_data.py
          
          # Cek apakah ada perubahan
          if git diff --quiet sa_ntarko.html; then
            echo "changed=false" >> $GITHUB_OUTPUT
            echo "📊 Tidak ada perubahan data"
          else
            echo "changed=true" >> $GITHUB_OUTPUT
            echo "✅ Data berhasil diupdate"
          fi
      
      - name: 💾 Commit dan Push Perubahan
        if: steps.sync.outputs.changed == 'true'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add sa_ntarko.html
          TIMESTAMP=$(TZ='Asia/Jayapura' date '+%Y-%m-%d %H:%M:%S WIT')
          git commit -m "🔄 Auto-sync data: $TIMESTAMP"
          git push origin main
          echo "✅ Push berhasil pada $TIMESTAMP"
      
      - name: 📱 Notifikasi Telegram (Optional)
        if: always()
        run: |
          if [ -z "${{ secrets.TELEGRAM_BOT_TOKEN }}" ] || [ -z "${{ secrets.TELEGRAM_CHAT_ID }}" ]; then
            echo "ℹ️ Telegram secrets tidak di-set, skip notifikasi"
            exit 0
          fi
          
          if [ "${{ job.status }}" == "success" ]; then
            if [ "${{ steps.sync.outputs.changed }}" == "true" ]; then
              STATUS="✅ Data Berhasil Diupdate"
              EMOJI="🎉"
            else
              STATUS="ℹ️ Tidak Ada Perubahan"
              EMOJI="📊"
            fi
          else
            STATUS="❌ Sync Gagal!"
            EMOJI="🚨"
          fi
          
          MESSAGE="${EMOJI} *Dashboard Auto-Sync*
          
          ${STATUS}
          
          📅 Waktu: $(TZ='Asia/Jayapura' date '+%d-%m-%Y %H:%M WIT')
          🔗 [Dashboard](https://rstimpapua21-cmyk.github.io/sa-antar-ko/sa_ntarko.html)"
          
          curl -s -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \\
            -d chat_id="${{ secrets.TELEGRAM_CHAT_ID }}" \\
            -d text="$MESSAGE" \\
            -d parse_mode="Markdown" || echo "⚠️ Gagal kirim notifikasi"
'''
    create_file('.github/workflows/auto-sync.yml', workflow)
    
    # ============================================
    # FILE 2: Real-time Dashboard JS
    # ============================================
    js = '''/**
 * 🔄 Real-time Dashboard Loader
 * Memuat data langsung dari Google Sheets
 * Auto-refresh setiap 5 menit
 */

(function() {
  'use strict';
  
  const CONFIG = {
    SHEET_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSv31iXfAkwY8c6Tsi9MvvT1ABR8hxQlI-3rmTCYC9z98D4NklxzocQD2o5AmBvjE25qxYMsQTY36qE/pub?gid=965791667&single=true&output=csv',
    REFRESH_INTERVAL: 5 * 60 * 1000, // 5 menit
    ENABLE_NOTIFICATION: true,
    DEBUG: false
  };
  
  function log(...args) {
    if (CONFIG.DEBUG) console.log('[RealtimeDashboard]', ...args);
  }
  
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
  
  function parseCSV(csv) {
    const lines = csv.split('\\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => 
      h.trim().replace(/^"|"$/g, '')
    );
    
    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = (values[i] || '').trim().replace(/^"|"$/g, '');
      });
      return obj;
    }).filter(obj => Object.values(obj).some(v => v));
  }
  
  function showNotification(message, type = 'success') {
    if (!CONFIG.ENABLE_NOTIFICATION) return;
    
    const colors = {
      success: '#10b981',
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444'
    };
    
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 99999;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 300px;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transition = 'opacity 0.3s';
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }
  
  async function loadFreshData() {
    try {
      log('Fetching fresh data...');
      const url = CONFIG.SHEET_URL + '&t=' + Date.now();
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const csvText = await response.text();
      const freshData = parseCSV(csvText);
      
      log(`Fetched ${freshData.length} records`);
      
      if (typeof window.EMBEDDED_DATA !== 'undefined') {
        const oldCount = window.EMBEDDED_DATA.length;
        const newCount = freshData.length;
        
        if (newCount !== oldCount) {
          log(`Data changed: ${oldCount} → ${newCount}`);
          window.EMBEDDED_DATA = freshData;
          
          if (typeof window.renderDashboard === 'function') {
            window.renderDashboard(freshData);
          }
          
          const diff = newCount - oldCount;
          const msg = diff > 0 
            ? `🔄 +${diff} data baru ditambahkan`
            : `🔄 Data diperbarui (${newCount} records)`;
          showNotification(msg, 'success');
        }
      }
      
      return freshData;
    } catch (error) {
      console.warn('⚠️ Real-time load failed, using cached data:', error.message);
      return typeof window.EMBEDDED_DATA !== 'undefined' ? window.EMBEDDED_DATA : [];
    }
  }
  
  function init() {
    log('Initializing...');
    loadFreshData();
    setInterval(loadFreshData, CONFIG.REFRESH_INTERVAL);
    log(`Auto-refresh setiap ${CONFIG.REFRESH_INTERVAL / 1000 / 60} menit`);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  window.RealtimeDashboard = {
    refreshNow: loadFreshData,
    getConfig: () => CONFIG,
    setConfig: (key, value) => { CONFIG[key] = value; }
  };
})();
'''
    create_file('scripts/realtime-dashboard.js', js)
    
    # ============================================
    # FILE 3: README
    # ============================================
    readme = '''# 🔄 Auto-Sync Dashboard RSTIM Papua

Dashboard **SA Antarpoli** dengan auto-sync dari Google Sheets.

## 📊 Status

- **Dashboard**: https://rstimpapua21-cmyk.github.io/sa-antar-ko/sa_ntarko.html
- **Auto-sync**: Setiap 30 menit
- **Actions**: https://github.com/rstimpapua21-cmyk/sa-antar-ko/actions

## 🚀 Fitur

✅ Auto-sync dari Google Sheets setiap 30 menit  
✅ Notifikasi Telegram (optional)  
✅ Real-time data refresh di browser  
✅ Fallback ke cached data jika offline  

## 🛠️ Setup Telegram (Optional)

1. Chat `@BotFather` di Telegram → `/newbot`
2. Catat **Bot Token**
3. Chat bot Anda, kirim `/start`
4. Buka: `https://api.telegram.org/bot<TOKEN>/getUpdates`
5. Catat `chat.id`
6. Add ke GitHub Secrets:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

## 📖 Dokumentasi

Lihat file `README_SYNC.md` untuk detail lengkap.

---

**Last Updated:** 10 Juli 2026
'''
    create_file('README_SYNC.md', readme)
    
    # ============================================
    # SELESAI!
    # ============================================
    print("\n" + "=" * 60)
    print("✅ SEMUA FILE BERHASIL DIBUAT!")
    print("=" * 60)
    
    print("\n📝 LANGKAH SELANJUTNYA:")
    print("\n1️⃣  Commit semua file:")
    print("   git add .")
    print('   git commit -m "🤖 Add auto-sync workflow"')
    
    print("\n2️⃣  Push ke GitHub:")
    print("   git push origin main")
    
    print("\n3️⃣  Cek workflow berjalan:")
    print("   https://github.com/rstimpapua21-cmyk/sa-antar-ko/actions")
    
    print("\n4️⃣  (Optional) Setup Telegram:")
    print("   Settings → Secrets → Actions")
    print("   - TELEGRAM_BOT_TOKEN")
    print("   - TELEGRAM_CHAT_ID")
    
    print("\n" + "=" * 60)
    print("🎉 SETUP SELESAI!")
    print("=" * 60 + "\n")
    
    # Tanyakan apakah mau langsung commit
    response = input("🚀 Commit dan push sekarang? (y/n): ")
    if response.lower() == 'y':
        import subprocess
        try:
            print("\n📤 Committing...")
            subprocess.run(['git', 'add', '.'], check=True)
            subprocess.run(['git', 'commit', '-m', '🤖 Add auto-sync workflow and realtime dashboard'], check=True)
            print("\n📤 Pushing...")
            subprocess.run(['git', 'push', 'origin', 'main'], check=True)
            print("\n✅ BERHASIL! Workflow akan mulai berjalan dalam beberapa menit.")
            print("🔗 Cek di: https://github.com/rstimpapua21-cmyk/sa-antar-ko/actions")
        except subprocess.CalledProcessError as e:
            print(f"\n❌ Error: {e}")
            print("\n💡 Coba jalankan manual:")
            print("   git add .")
            print('   git commit -m "🤖 Add auto-sync workflow"')
            print("   git push origin main")

if __name__ == "__main__":
    main()