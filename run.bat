@echo off
rem Math Hero: cek environment, pasang Node.js jika belum ada, lalu nyalakan server.
rem Cukup klik 2x file ini. Tidak ada paket npm eksternal; penyimpanan memakai SQLite bawaan Node.
chcp 65001 >nul
title Math Hero - Server
cd /d "%~dp0"

echo ==========================================
echo  Math Hero: pemeriksaan environment
echo ==========================================

where node >nul 2>nul
if errorlevel 1 goto install_node
goto check_version

:install_node
echo [!] Node.js belum terpasang.
goto do_install

:check_version
for /f %%v in ('node -p "process.versions.node"') do set NODEVER=%%v
node -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit((a>22||(a===22&&b>=13))?0:1)"
if errorlevel 1 (
  echo [!] Node.js %NODEVER% terlalu lama. Dibutuhkan 22.13 atau lebih baru.
  goto do_install
)
echo [OK] Node.js %NODEVER% siap.
goto check_sqlite

:do_install
where winget >nul 2>nul
if errorlevel 1 goto no_winget
echo Memasang Node.js LTS lewat winget. Ikuti jendela izin jika muncul.
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
echo.
echo Pemasangan selesai. Tutup jendela ini lalu klik 2x run.bat lagi,
echo supaya PATH terbaru terbaca.
pause
exit /b 0

:no_winget
echo [X] winget tidak tersedia di laptop ini.
echo     Pasang Node.js LTS secara manual dari https://nodejs.org
echo     lalu klik 2x run.bat lagi.
pause
exit /b 1

:check_sqlite
node -e "require('node:sqlite')" >nul 2>nul
if errorlevel 1 goto no_sqlite
echo [OK] Modul SQLite bawaan Node tersedia.
if not exist data mkdir data
echo.
echo Menyalakan server Math Hero.
echo Tutup jendela ini untuk menghentikan server.
echo.
node server.js
pause
exit /b 0

:no_sqlite
echo [X] Modul node:sqlite tidak ditemukan pada Node ini.
echo     Pasang Node.js 22.13 atau lebih baru, lalu jalankan lagi.
pause
exit /b 1
