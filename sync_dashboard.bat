@echo off
echo ================================================================
echo    GOOGLE SHEETS DATA SYNC - SA ANTAR KO DASHBOARD
echo ================================================================
echo.
echo Script ini akan:
echo 1. Download data terbaru dari Google Sheets
echo 2. Embed data ke HTML dashboard
echo 3. Dashboard siap digunakan dengan data terbaru
echo.
echo ================================================================
echo.

REM Step 1: Download data
echo [1/3] Downloading data dari Google Sheets...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSv31iXfAkwY8c6Tsi9MvvT1ABR8hxQlI-3rmTCYC9z98D4NklxzocQD2o5AmBvjE25qxYMsQTY36qE/pub?gid=965791667&single=true&output=csv' -UseBasicParsing -TimeoutSec 30; $response.Content | Out-File -FilePath 'data.csv' -Encoding UTF8; Write-Host 'Downloaded' $response.Content.Length 'bytes' } catch { Write-Host 'Error:' $_.Exception.Message; exit 1 }"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ✗ GAGAL download data
    pause
    exit /b 1
)

echo ✓ Data berhasil didownload
echo.

REM Step 2: Convert CSV to JSON
echo [2/3] Converting data ke JSON...
python embed_data.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ✗ GAGAL convert data
    pause
    exit /b 1
)

echo.

REM Step 3: Update dashboard
echo [3/3] Updating dashboard...
python update_dashboard.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ✗ GAGAL update dashboard
    pause
    exit /b 1
)

echo.
echo ================================================================
echo                    ✅ SYNC BERHASIL!
echo ================================================================
echo.
echo Dashboard sudah diupdate dengan data terbaru dari Google Sheets.
echo.
echo Buka file: sa_ntarko.html
echo.
pause
