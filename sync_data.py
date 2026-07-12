#!/usr/bin/env python3
"""
Script untuk sync data dari Google Sheets ke HTML
Jalankan script ini untuk update data di dashboard
"""

import requests
import csv
import json
from io import StringIO
from datetime import datetime

SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSv31iXfAkwY8c6Tsi9MvvT1ABR8hxQlI-3rmTCYC9z98D4NklxzocQD2o5AmBvjE25qxYMsQTY36qE/pub?gid=965791667&single=true&output=csv'

def fetch_data():
    """Download data dari Google Sheets"""
    print(f"🔄 Mengunduh data dari Google Sheets...")
    
    try:
        response = requests.get(SHEET_URL, timeout=30)
        response.raise_for_status()
        
        csv_text = response.text
        print(f"✓ Data berhasil diunduh ({len(csv_text)} bytes)")
        
        # Parse CSV
        reader = csv.DictReader(StringIO(csv_text))
        data = list(reader)
        
        print(f"✓ {len(data)} records berhasil di-parse")
        
        return data
    except Exception as e:
        print(f"✗ Error: {e}")
        return None

def update_html(data):
    """Update file HTML dengan data terbaru"""
    html_file = 'sa_ntarko.html'
    
    try:
        # Baca file HTML
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Convert data ke JSON
        data_json = json.dumps(data, ensure_ascii=False, indent=2)
        
        # Replace embedded data
        start_marker = 'const EMBEDDED_DATA = ['
        end_marker = '];'
        
        start_idx = html_content.find(start_marker)
        if start_idx == -1:
            print(f"✗ Marker '{start_marker}' tidak ditemukan di HTML")
            return False
        
        end_idx = html_content.find(end_marker, start_idx)
        if end_idx == -1:
            print(f"✗ End marker '{end_marker}' tidak ditemukan di HTML")
            return False
        
        # Replace data - strip outer brackets from JSON since start/end markers provide them
        # data_json is like [{"...": "..."}, ...] — strip first [ and last ]
        if data_json.startswith('[') and data_json.endswith(']'):
            inner_data = data_json[1:-1]
        else:
            inner_data = data_json
        new_html = (
            html_content[:start_idx + len(start_marker)] +
            '\n' + inner_data + '\n' +
            html_content[end_idx:]
        )
        
        # Write back
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(new_html)
        
        print(f"✓ File HTML berhasil diupdate dengan {len(data)} records")
        print(f"✓ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return True
    except Exception as e:
        print(f"✗ Error update HTML: {e}")
        return False

def main():
    print("=" * 60)
    print("📊 Google Sheets Data Sync")
    print("=" * 60)
    print()
    
    # Fetch data
    data = fetch_data()
    
    if data is None or len(data) == 0:
        print("\n❌ Gagal mengunduh data")
        return
    
    # Show sample
    print(f"\n📋 Sample data (record pertama):")
    for key, value in list(data[0].items())[:5]:
        print(f"   {key}: {value}")
    
    print()
    
    # Update HTML
    if update_html(data):
        print("\n✅ Sync berhasil!")
        print("💡 Buka file sa_ntarko.html di browser untuk melihat data terbaru")
    else:
        print("\n❌ Sync gagal")

if __name__ == '__main__':
    main()
