# Script untuk embed data CSV ke HTML
$csvFile = "data.csv"
$htmlFile = "sa_ntarko.html"

Write-Host "🔄 Membaca CSV..." -ForegroundColor Cyan

# Baca CSV
$csv = Import-Csv -Path $csvFile -Encoding UTF8
Write-Host "✓ $($csv.Count) records ditemukan" -ForegroundColor Green

# Convert ke JSON
$json = $csv | ConvertTo-Json -Depth 10
Write-Host "✓ Data berhasil di-convert ke JSON" -ForegroundColor Green

# Baca HTML
Write-Host "🔄 Membaca file HTML..." -ForegroundColor Cyan
$htmlContent = Get-Content -Path $htmlFile -Raw -Encoding UTF8

# Cari marker untuk embed data
$marker = "// DATA_AKAN_DIEMBED_DI_SINI"
$replacement = "const EMBEDDED_DATA = $json;"

if ($htmlContent -match [regex]::Escape($marker)) {
    # Replace marker dengan data
    $newHtml = $htmlContent -replace [regex]::Escape($marker), $replacement
    
    # Write back
    $newHtml | Out-File -FilePath $htmlFile -Encoding UTF8 -NoNewline
    
    Write-Host "✓ Data berhasil di-embed ke HTML" -ForegroundColor Green
    Write-Host "✓ File HTML siap digunakan!" -ForegroundColor Green
} else {
    Write-Host "✗ Marker tidak ditemukan di HTML" -ForegroundColor Red
    Write-Host "Menyimpan data ke file terpisah..." -ForegroundColor Yellow
    $json | Out-File -FilePath "embedded_data.json" -Encoding UTF8
    Write-Host "✓ Data disimpan ke embedded_data.json" -ForegroundColor Green
}

Write-Host "`n✅ Selesai!" -ForegroundColor Green
Write-Host "💡 Buka sa_ntarko.html di browser untuk melihat dashboard" -ForegroundColor Cyan
