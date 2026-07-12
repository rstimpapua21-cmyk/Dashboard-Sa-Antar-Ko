#!/usr/bin/env python3
"""
Script untuk update dashboard dengan data dari Google Sheets
Menambahkan embedded data ke HTML
"""

import json
import re
from datetime import datetime

def main():
    print("=" * 70)
    print("🔄 UPDATE DASHBOARD DENGAN DATA TERBARU")
    print("=" * 70)
    print()
    
    # Baca embedded data
    print("📖 Membaca embedded_data.json...")
    try:
        with open('embedded_data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✓ {len(data)} records ditemukan")
    except Exception as e:
        print(f"✗ Error: {e}")
        return
    
    # Baca HTML
    print("\n📖 Membaca sa_ntarko.html...")
    try:
        with open('sa_ntarko.html', 'r', encoding='utf-8') as f:
            html_content = f.read()
        print(f"✓ HTML file size: {len(html_content)} bytes")
    except Exception as e:
        print(f"✗ Error: {e}")
        return
    
    # Cari bagian script untuk ditambahkan data
    # Kita akan tambahkan setelah "// Global variables"
    marker = "let embeddedData = [];"
    replacement = f"let embeddedData = {json.dumps(data, ensure_ascii=False)};"
    
    if marker in html_content:
        print("\n🔄 Embedding data ke HTML...")
        new_html = html_content.replace(marker, replacement)
        
        # Write
        try:
            with open('sa_ntarko.html', 'w', encoding='utf-8') as f:
                f.write(new_html)
            print(f"✓ Data berhasil di-embed!")
        except Exception as e:
            print(f"✗ Error: {e}")
            return
    else:
        print(f"\n⚠️  Marker tidak ditemukan")
        print(f"💡 Mencari alternatif...")
        
        # Coba cari bagian global variables
        alt_marker = "// Global variables"
        if alt_marker in html_content:
            # Inject setelah global variables
            idx = html_content.find(alt_marker)
            end_idx = html_content.find("\n", idx) + 1
            
            inject_code = f"\n        // Embedded data dari Google Sheets ({len(data)} records)\n        const EMBEDDED_DATA = {json.dumps(data, ensure_ascii=False)};\n"
            
            new_html = html_content[:end_idx] + inject_code + html_content[end_idx:]
            
            try:
                with open('sa_ntarko.html', 'w', encoding='utf-8') as f:
                    f.write(new_html)
                print(f"✓ Data berhasil di-inject!")
            except Exception as e:
                print(f"✗ Error: {e}")
                return
        else:
            print(f"✗ Tidak bisa inject data")
            return
    
    print()
    print("=" * 70)
    print("✅ DASHBOARD BERHASIL DIUPDATE!")
    print("=" * 70)
    print(f"📊 Total records: {len(data)}")
    print(f"🕐 Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("💡 Buka sa_ntarko.html di browser")
    print("💡 Data sudah embedded, dashboard siap digunakan!")

if __name__ == '__main__':
    main()
