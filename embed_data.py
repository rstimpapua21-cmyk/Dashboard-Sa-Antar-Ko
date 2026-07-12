#!/usr/bin/env python3
"""
Script untuk embed data dari Google Sheets CSV ke HTML
"""

import csv
import json
from datetime import datetime

def main():
    print("=" * 60)
    print("📊 Embedding Data ke Dashboard")
    print("=" * 60)
    print()
    
    # Baca CSV
    print("🔄 Membaca data.csv...")
    try:
        with open('data.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            data = [{k.strip(): v for k, v in row.items()} for row in reader]
        print(f"✓ {len(data)} records berhasil dibaca")
    except Exception as e:
        print(f"✗ Error membaca CSV: {e}")
        return
    
    # Show sample
    print(f"\n📋 Sample data (record pertama):")
    for key, value in list(data[0].items())[:5]:
        print(f"   {key}: {value[:50] if len(value) > 50 else value}")
    
    # Convert ke JSON
    print(f"\n🔄 Converting ke JSON...")
    data_json = json.dumps(data, ensure_ascii=False, indent=2)
    print(f"✓ JSON size: {len(data_json)} bytes")
    
    # Baca HTML
    print(f"\n🔄 Membaca sa_ntarko.html...")
    try:
        with open('sa_ntarko.html', 'r', encoding='utf-8') as f:
            html_content = f.read()
        print(f"✓ HTML file size: {len(html_content)} bytes")
    except Exception as e:
        print(f"✗ Error membaca HTML: {e}")
        return
    
    # Cari dan replace marker
    marker = "// DATA_AKAN_DIEMBED_DI_SINI"
    
    if marker in html_content:
        print(f"\n🔄 Embedding data ke HTML...")
        replacement = f"const EMBEDDED_DATA = {data_json};"
        new_html = html_content.replace(marker, replacement)
        
        # Write back
        try:
            with open('sa_ntarko.html', 'w', encoding='utf-8') as f:
                f.write(new_html)
            print(f"✓ Data berhasil di-embed!")
        except Exception as e:
            print(f"✗ Error menulis HTML: {e}")
            return
    else:
        print(f"\n⚠️  Marker '{marker}' tidak ditemukan di HTML")
        print(f"💾 Menyimpan data ke embedded_data.json...")
        try:
            with open('embedded_data.json', 'w', encoding='utf-8') as f:
                f.write(data_json)
            print(f"✓ Data disimpan ke embedded_data.json ({len(data_json)} bytes)")
        except Exception as e:
            print(f"✗ Error: {e}")
            return
    
    print()
    print("=" * 60)
    print("✅ SELESAI!")
    print("=" * 60)
    print(f"📊 Total records: {len(data)}")
    print(f"🕐 Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("💡 Buka sa_ntarko.html di browser untuk melihat dashboard")
    print("💡 Data sudah embedded, tidak perlu koneksi internet!")

if __name__ == '__main__':
    main()
