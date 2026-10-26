# Math Hero

Game petualangan platformer matematika untuk anak kelas 1 sampai 4 SD (8 level: level 1-2 kelas 1, 3-4 kelas 2, 5-6 kelas 3, 7-8 kelas 4). Dimainkan di Chrome Android lewat jaringan lokal (hotspot HP), jadi tidak perlu internet saat bermain.

## Cara menjalankan

1. Pastikan laptop dan HP terhubung ke hotspot yang sama. Nyalakan hotspot di HP, lalu sambungkan laptop ke hotspot itu.
2. Klik 2x `run.bat` di folder project.
   - Pertama kali, skrip memeriksa Node.js. Jika belum ada, skrip memasangnya lewat winget. Jika pemasangan selesai, tutup jendela, lalu klik 2x `run.bat` lagi.
   - Jendela akan menampilkan alamat seperti `http://10.x.x.x:8091`. Itu alamat untuk HP.
3. Di HP, buka Chrome dan ketik alamat itu. Jangan pakai `localhost` di HP, karena itu mengarah ke HP sendiri.
4. Untuk menghentikan server, tutup jendela `run.bat` atau tekan Ctrl+C di jendela itu.

Kalau alamat IP laptop berubah (misalnya setelah hotspot dimatikan dan dinyalakan lagi), jalankan `ipconfig` di laptop dan cari IPv4 Address pada adapter Wi-Fi atau hotspot. Pakai angka itu di HP.

### Firewall Windows

Saat pertama kali server berjalan, Windows bisa menampilkan peringatan firewall. Izinkan akses untuk jaringan **Private**. Jika terlanjur menolak, buka PowerShell sebagai administrator lalu jalankan:

```
netsh advfirewall firewall add rule name="Math Hero" dir=in action=allow protocol=TCP localport=8091
```

Jika server dijalankan dengan port lain, ganti `8091` sesuai port yang tampil di jendela.

## Kontrol

- **Joystick** (kiri bawah): jalan ke kiri dan kanan. Geser ke atas atau bawah untuk mengintip layar. Geser ke bawah sambil menekan Lompat untuk turun dari platform tipis.
- **Lompat** (kanan bawah): lompat. Di udara tekan lagi untuk lompat ganda.
- **B** (di samping Lompat): buka peti soal, pecahkan tumpukan peti, pasang jembatan, serang bos yang sedang pusing. Tekan saat gelembung "Tekan B" muncul. Jika tidak ada sasaran, karakter bergaya (salto, joget, atau ta-da) sebagai hiburan.
- **Jeda** (kanan atas): berhenti sejenak. Tekan lagi untuk lanjut.
- **Senyap / Bersuara** (sebelah kiri Jeda): mematikan atau menyalakan suara dan musik.

## Aturan permainan

- Tiap level punya **peti soal** (tanda ?). Semua peti harus dijawab agar trofi di ujung level terbuka. Level dengan bos mengharuskan bos dikalahkan juga.
- **Tumpukan peti** menghalangi jalan: jawab soal untuk memecahkannya. **Jembatan** di atas jurang dipasang bagian demi bagian dengan jawaban benar. **Platform pilih jawaban** (angka di platform) memberi bonus jika kamu menginjak yang benar.
- **Bos** (level 2, 4, 6, 8) punya serangan yang diberi tanda "!" sebelum datang. Hindari serangannya, lalu saat bos pusing (muncul bintang berputar) dekati dan tekan B untuk menjawab soal. Jawaban benar melukai bos. Jawaban salah membuat bos membalas (health -10).
- Injak musuh dari atas untuk mengalahkannya (kaktus dan robot). Hindari lebah kotak, tong penyeruduk, peluru meriam, gergaji, dan duri.
- Terkena bahaya mengurangi health dan membuat pemain terpental sebentar (kebal 1,3 detik). Health habis: nyawa berkurang 1 dan pemain kembali ke bendera checkpoint terakhir dengan health penuh. Jatuh ke jurang: health berkurang 20 dan pemain kembali ke tempat aman terakhir.
- Pemain punya 3 nyawa. Saat nyawa habis, permainan berakhir dan skor dicatat.
- Skor: bintang 10, permata rahasia 50, injak musuh 20, peti dan pintu dan jembatan dan bos bernilai lebih besar di level lebih tinggi. Menjawab benar di percobaan pertama memberi poin penuh, setelah salah poinnya setengah. Selesai level +200.
- Semua soal pilihan ganda. Jawaban salah memunculkan penjelasan langkah dan boleh dicoba lagi.

## Menu utama

- **Mulai Baru**: isi nama (1-6 huruf, lewat papan huruf di layar), pilih karakter (Anak Berani, Robo Kuning, Rubah Lincah), lalu main dari Level 1.
- **Lanjutkan**: pilih pemain yang punya checkpoint. Permainan dimulai dari level terakhir yang dicapai, dengan skor yang sama. Nyawa kembali ke 3.
- **Papan Juara**: skor terbaik tiap pemain (nama 1-6 huruf) beserta karakter yang dipakai, dari database.

Setelah kalah atau menamatkan Level 8, permainan kembali ke menu utama.

## Penyimpanan data

Data tersimpan di `data/mathhero.sqlite` (SQLite) di dalam folder project. Isinya:
- nama panggilan (1 sampai 6 huruf A-Z, diisi lewat papan huruf di layar),
- skor, hasil (kalah atau tamat), dan karakter yang dipakai,
- checkpoint untuk fitur Lanjutkan.

Tidak ada data pribadi yang disimpan.

Untuk menghapus semua data, tutup server lalu hapus file `data/mathhero.sqlite`.

## Hosting statis (tanpa server, opsional)

Folder `public` bisa diunggah apa adanya ke hosting statis (GitHub Pages, Netlify, dsb.), termasuk di sub-folder, karena semua path aset relatif. Di sana tidak ada server API, jadi game otomatis memakai `public/js/localapi.js`: nama panggilan, skor terbaik, dan checkpoint disimpan di `localStorage` browser (per HP/browser, tidak dikirim ke mana pun). Aturannya sama dengan server: satu nama = satu pemain, 1 sampai 6 huruf A-Z, nama tidak pantas ditolak, Papan Juara menampilkan skor terbaik tiap pemain. Jika data browser dihapus, skor ikut hilang. Saat dijalankan lewat `run.bat`, penyimpanan tetap memakai SQLite di server seperti biasa.

Uji mode ini: `python tests/mode_statis.py` (server statis murni di sub-folder `/math-hero/`). Di hosting statis, konsol browser akan mencatat satu permintaan `/api` yang gagal (404/405) tiap halaman dibuka; itu normal.

## Troubleshooting

- **Halaman tidak terbuka di HP**: pastikan HP dan laptop di hotspot yang sama, alamat IP benar (bukan `localhost`), dan firewall mengizinkan port 8091.
- **Alamat IP tidak muncul di jendela**: jalankan `ipconfig` di laptop dan cari IPv4 Address.
- **Suara tidak terdengar**: buka Chrome, sentuh tombol Mulai terlebih dahulu. Browser mobile baru mengizinkan suara setelah interaksi pertama. Tombol bertuliskan "Senyap" berarti suara sedang menyala (ketuk untuk mematikan). Jika tertulis "Bersuara", suara sedang dimatikan. Pastikan juga volume HP tidak nol.
- **Papan Juara atau Lanjutkan tidak berfungsi**: server mungkin belum berjalan lewat `run.bat`, atau laptop memakai server lain. Tutup semua jendela server lalu jalankan `run.bat` lagi.
- **Layar terasa terpotong atau tombol tertutup**: coba putar HP ke arah lain. Layout sudah diuji dalam mode potret di ukuran layar mirip HP Android, tetapi belum diuji di HP fisik (lihat catatan uji di bagian pengembang).
- **Lag di HP lama**: tutup aplikasi lain di HP. Jika masih lambat, catat HP dan kecepatan fps yang tampil di pojok kiri bawah, lalu laporkan.

## Lisensi dan atribusi

Kode game memakai lisensi MIT (lihat `LICENSE`). Aset pihak ketiga (sprite CraftPix, font, ikon SVG) memiliki lisensinya sendiri dan tidak tercakup MIT; rincian di `public/assets/svg/CREDITS.md`. Paket sumber asli CraftPix tidak disertakan di repositori ini (lisensinya tidak mengizinkan menyebarkan file aslinya); hanya sprite olahan di `public/assets/game` yang dipakai game.

## Untuk pengembang

Struktur singkat:
- `server.js`: server statis dan routing API.
- `lib/store.js`: database SQLite dan endpoint API (`MATHHERO_DATA_DIR` mengganti folder data, dipakai tes).
- `public/index.html`, `public/css/style.css`: tampilan.
- `public/js/`: `physics.js` (fisika, dipakai juga bot level), `levels.js` (pembangun level dan 8 level), `assets.js` (pemuat sprite), `render.js` (tile bertema dan latar parallax), `entities.js` (musuh, jebakan, platform gerak, jembatan, bos), `main.js` (pemain, aturan, kamera, HUD), `math.js` (soal 8 level), `quiz.js` (panel soal), `audio.js`, `input.js`, `menu.js`.
- `public/assets/game/`: sprite hasil `python scripts/prepare_assets.py` dari paket CraftPix (jalankan ulang jika aset sumber berubah).
- `scripts/cek_level.js`: bot yang memastikan trofi dan semua peti bisa dicapai di setiap level.
- `kb/` dan `scripts/kb.py`: catatan kerja agen (knowledge base, Markdown). Mulai dari `kb/RINGKASAN.md`. `kb.sqlite` hanya berisi brief yang menunjuk ke `kb/`.
- `tests/`: tes otomatis.

Menambah level: tulis fungsi baru di `levels.js` memakai `Builder` (lihat komentar di bagian atas file), masukkan ke daftar `LEVELS`, lalu jalankan `node scripts/cek_level.js`.

Untuk menjalankan tes, siapkan Python dan Playwright:

```
pip install playwright pillow fonttools
python -m playwright install chromium
```

Lalu dari folder project:

```
node tests/math.test.js
node tests/bot_sanity.js
node scripts/cek_level.js
python tests/playthrough.py
python tests/menu.py
python tests/font_kleintenna.py
```

Alat bantu visual: `python tests/shot.py <level> <kolom[:tinggi],...>` menyimpan screenshot ke `tests/shots/`, `python tests/shot_boss.py` memotret bos beraksi, `python tests/montage.py` menggabungkan gambar.

Tes Playwright menjalankan server sendiri di port khusus, jadi tidak bentrok dengan server yang sedang berjalan.

Catatan: tes otomatis berjalan di Chromium headless dengan profil Pixel 5. Uji di HP fisik tetap diperlukan untuk memastikan sentuhan, suara, dan performa di perangkat sungguhan.
