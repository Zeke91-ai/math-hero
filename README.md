# Seri Math Hero

Seri game belajar matematika berbentuk petualangan pixel art untuk anak kelas 1 sampai 4 SD. Dimainkan di Chrome Android lewat jaringan lokal (hotspot HP), jadi tidak perlu internet saat bermain.

Halaman awal (`/`) sekarang adalah **pemilih seri**:

| Seri | Alamat | Isi |
|---|---|---|
| **Math Hero 1**: Petualangan di Kerajaan Awan | `mh1/` | Platformer, 8 level, 4 bos. Dijelaskan di bagian [Math Hero 1](#math-hero-1). |
| **Math Hero 2**: Misi Kristal Bilangan | `mh2/` | 6 dunia x 5 level, 9 jenis permainan, 6 bos. Dijelaskan di bagian [Math Hero 2](#math-hero-2). |

Keduanya dijaga dengan prinsip yang sama: anak **memahami konsep** (bukan menebak), semua jawaban pilihan/sentuh tanpa keyboard HP, kesalahan dijawab dengan penjelasan ramah, dan gaya pixel art.

# Math Hero 1

Game petualangan platformer matematika untuk anak kelas 1 sampai 4 SD (8 level: level 1-2 kelas 1, 3-4 kelas 2, 5-6 kelas 3, 7-8 kelas 4).

## Cara menjalankan

1. Pastikan laptop dan HP terhubung ke hotspot yang sama. Nyalakan hotspot di HP, lalu sambungkan laptop ke hotspot itu.
2. Klik 2x `run.bat` di folder project.
   - Pertama kali, skrip memeriksa Node.js. Jika belum ada, skrip memasangnya lewat winget. Jika pemasangan selesai, tutup jendela, lalu klik 2x `run.bat` lagi.
   - Jendela akan menampilkan alamat seperti `http://10.x.x.x:8091`. Itu alamat untuk HP.
3. Di HP, buka Chrome dan ketik alamat itu. Jangan pakai `localhost` di HP, karena itu mengarah ke HP sendiri. Halaman pertama adalah pemilih seri: ketuk **Main Math Hero 1** atau **Main Math Hero 2**.
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
- **Seri Math Hero** (tombol kecil di bawah): kembali ke halaman pemilih seri.

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

# Math Hero 2

**Misi Kristal Bilangan.** Profesor Kacau memecahkan Kristal Bilangan, dan angka-angka di enam dunia jadi kacau. Bersama Peri Angka, pemain memulihkan tiap pecahan kristal dengan *memahami* cara kerja angka. Tiap dunia punya materi, musik, latar, dan bos sendiri; tiap level memakai jenis permainan yang berbeda agar anak tidak bosan.

## Dunia dan materi

| Dunia | Kelas | Konsep | Level (jenis permainan) | Bos |
|---|---|---|---|---|
| 1 Padang Bilangan | 1 | tambah dan kurang sampai 20, pasangan 10 | Lompat Bilangan, Lari Angka, Timbangan, Lompat Bilangan | Raja Slime Kacau (Meteor Angka) |
| 2 Pantai Puluhan | 2 | puluhan dan satuan, uang, membandingkan | Lompat Puluhan, Pasar Koin, Balap Hitung, Timbangan | Babi Hutan Kebut (Balap, harus juara 1) |
| 3 Kebun Perkalian | 2-3 | perkalian = kelompok sama banyak dan baris, kelipatan, faktor | Kebun Kotak, Lompat Kelipatan, Meteor Kelipatan, Kebun Kotak | Ulat Raksasa (Lari Angka dikejar bos) |
| 4 Gua Bagi Rata | 3 | pembagian = bagi rata, kebalikan perkalian, sisa | Bagi Rata, Timbangan Kotak Misteri, Kebun Bagi, Bagi Rata + sisa | Burung Kacau (Meteor Angka) |
| 5 Kota Pecahan | 3-4 | pecahan = bagian sama besar, membandingkan, senilai, di garis bilangan | Pizza Pecahan, Pizza (bandingkan), Lompat Pecahan, Meteor Setengah | Koki Kacau (pesanan pizza berwaktu) |
| 6 Benteng Profesor Kacau | 4 | campuran: kali-bagi, kembalian, dua langkah | Balap, Pasar Kembalian, Lari Angka, Timbangan Dua Langkah | Profesor Kacau, 3 babak: meteor, timbangan, balap |

## Sembilan jenis permainan

| Permainan | Gaya | Cara main | Konsep yang ditekankan |
|---|---|---|---|
| Lompat Bilangan | platformer | joystick melompat satu batu bernomor, A = +10 (puluhan), B = "Di sini!" | tambah = maju, kurang = mundur, kali = lompatan sama besar, puluhan dulu lalu satuan, pecahan di garis bilangan. Tiap lompatan meninggalkan busur berlabel (+1, +10). |
| Lari Angka | pelari otomatis | A = lompat (bisa 2x) | kumpulkan bola sampai TEPAT target ("butuh berapa lagi?"), kelipatan, ekspresi yang hasilnya sama |
| Meteor Angka | penembak vertikal | joystick geser, B = lempar bintang | pasangan 10, kelipatan, genap/ganjil, hasil bagi, pecahan senilai 1/2 |
| Balap Hitung | balap pseudo-3D 3 lajur | joystick pindah lajur, A = lompati batu | kelancaran berhitung dan membandingkan (<, =, >); jawaban benar = turbo |
| Timbangan Ajaib | teka-teki | ketuk beban | tanda "=" artinya sama berat; kotak misteri yang sama (dasar aljabar) |
| Kebun Kotak | teka-teki | tombol + / - untuk baris dan isi | perkalian sebagai susunan baris, pembagian ke baris, faktor, sifat tukar |
| Bagi Rata | jelajah top-down | joystick jalan, B = ambil/beri, A = ambil kembali | pembagian sebagai membagikan satu-satu bergiliran, sisa |
| Pasar Koin | warung | ketuk koin dan uang kertas | nilai uang dan nilai tempat (ribuan, ratusan), kembalian |
| Pizza Pecahan | dapur | ketuk tombol potong lalu ketuk potongan | penyebut = jumlah potongan sama besar, pembilang = yang diambil, membandingkan, senilai |

Setiap level dibuka dengan **kartu konsep** beranimasi. Jawaban salah membuka **"Ayo pahami!"**: penjelasan langkah demi langkah dari Peri Angka beserta gambar (garis bilangan, timbangan, susunan baris, pizza). Di mode aksi penjelasannya muncul sebagai pesan singkat agar permainan tidak terhenti. Semua kartu konsep bisa dibaca ulang di **Buku Konsep** (tombol Buku di peta).

## Aturan

- Tiap level punya 3 hati. Hati berkurang karena bahaya di mode aksi (jurang, peti, meteor, bom bos, waktu pesanan habis). Hati habis: level diulang, tanpa kehilangan progres lain.
- Jawaban salah tidak mengurangi hati di mode teka-teki; hanya mengurangi bintang.
- Bintang tiap level: tanpa salah 3, salah 1-2 kali 2, lebih dari itu 1. Bintang terbaik dan skor terbaik disimpan.
- Level berikutnya terbuka setelah level sebelumnya selesai. Mengalahkan bos mengembalikan satu pecahan kristal dan membuka dunia berikutnya.
- Pahlawan: Pinki, Owi, dan Anak Berani tersedia dari awal; Dudu terbuka di 12 bintang, Robo Kuning di 30, Rubah Lincah di 50.

## Kontrol

- **Mode aksi** memakai joystick (kiri bawah) dan tombol A/B (kanan bawah). Label di bawah huruf A/B menunjukkan fungsinya di mode itu.
- **Mode teka-teki** cukup diketuk.
- Di laptop: panah/WASD = joystick, Z atau Spasi = A, X atau Enter = B, Esc atau P = jeda.
- Tombol jeda (kiri atas) berisi Lanjut, Ulangi level, Ke peta, serta Musik dan Efek suara.

## Penyimpanan Math Hero 2

Progres disimpan di `localStorage` browser (kunci `mathHero2.save.v1`), tiga slot pemain per HP. Isinya hanya nama panggilan (1-6 huruf A-Z, nama tidak pantas ditolak dengan daftar yang sama seperti Math Hero 1), pahlawan pilihan, serta bintang dan skor terbaik tiap level. Tidak ada yang dikirim ke server, jadi Math Hero 2 bekerja sama baiknya lewat `run.bat` maupun hosting statis (GitHub Pages). Slot bisa dihapus dari layar Pilih Petualang.

Alamat khusus untuk guru, orang tua, atau pengujian:
- `mh2/?buka=1` membuka semua level.
- `mh2/?level=3-2` langsung memainkan level tertentu.
- `mh2/?debug=1` menampilkan fps.

# Umum

## Lisensi dan atribusi

Kode game memakai lisensi MIT (lihat `LICENSE`). Aset pihak ketiga (sprite CraftPix, font, ikon SVG) memiliki lisensinya sendiri dan tidak tercakup MIT; rincian di `public/assets/svg/CREDITS.md`. Paket sumber asli CraftPix tidak disertakan di repositori ini (lisensinya tidak mengizinkan menyebarkan file aslinya); hanya sprite olahan di `public/assets/game` (Math Hero 1) dan atlas olahan `public/mh2/assets/sprites.png` (Math Hero 2) yang dipakai game.

Pixel art tambahan Math Hero 2 (Peri Angka, Profesor Kacau, kristal, hati, bintang, awan, gerobak, peti, bibit dan bunga, meteor, mahkota, topi koki, pizza, koin, uang kertas, timbangan) digambar langsung di kode (`public/mh2/js/gfx.js` dan file mode). Musik dan efek suara kedua seri disintesis di browser, tanpa file audio.

## Untuk pengembang

Struktur singkat:
- `server.js`: server statis dan routing API.
- `lib/store.js`: database SQLite dan endpoint API (`MATHHERO_DATA_DIR` mengganti folder data, dipakai tes).
- `public/index.html`: halaman pemilih seri (Math Hero 1 / Math Hero 2), satu file tanpa pustaka.
- `public/mh1/index.html`, `public/css/style.css`: tampilan Math Hero 1. Halamannya memakai `<base href="../">` sehingga skrip dan aset Math Hero 1 tetap di `public/js` dan `public/assets`.
- `public/js/`: `physics.js` (fisika, dipakai juga bot level), `levels.js` (pembangun level dan 8 level), `assets.js` (pemuat sprite), `render.js` (tile bertema dan latar parallax), `entities.js` (musuh, jebakan, platform gerak, jembatan, bos), `main.js` (pemain, aturan, kamera, HUD), `math.js` (soal 8 level), `quiz.js` (panel soal), `audio.js`, `input.js`, `menu.js`.
- `public/assets/game/`: sprite hasil `python scripts/prepare_assets.py` dari paket CraftPix (jalankan ulang jika aset sumber berubah).
- `scripts/cek_level.js`: bot yang memastikan trofi dan semua peti bisa dicapai di setiap level.
- `kb/` dan `scripts/kb.py`: catatan kerja agen (knowledge base, Markdown). Mulai dari `kb/RINGKASAN.md`. `kb.sqlite` hanya berisi brief yang menunjuk ke `kb/`.
- `tests/`: tes otomatis.

Math Hero 2 (`public/mh2/`):
- `js/core.js`: layar logis 360 x tinggi-mengikuti-HP, loop, adegan, input (sentuh, joystick, keyboard), tombol pixel yang digambar di canvas, partikel, pesan.
- `js/gfx.js`: pemuat atlas, sprite Math Hero 1 yang dipakai ulang, pixel art buatan sendiri, latar parallax tiap dunia, gambar bos.
- `js/audio.js`: musik chiptune per dunia dan bos, efek suara (Web Audio).
- `js/save.js`: tiga slot pemain di localStorage.
- `js/concepts.js`: semua pembuat soal dan penjelasan konsep (murni logika, diuji di Node).
- `js/stages.js`: 6 dunia x 5 level beserta cerita dan bos. Mengganti/menambah level cukup di sini.
- `js/play.js`: adegan bermain (kartu konsep, HUD, penjelasan, jeda, kalah, bintang, babak bos terakhir).
- `js/modes/*.js`: sembilan mode. Antarmukanya dijelaskan di komentar atas `play.js`; tiap mode punya `solve()` untuk uji otomatis.
- `js/scenes.js`: judul, slot pemain, isi nama, pilih pahlawan, peta dunia, Buku Konsep, cerita, hasil, kredit.
- `assets/sprites.png` + `sprites.json`: atlas hasil `python scripts/prepare_assets_mh2.py <folder paket craftpix>` (paket: Tiny Hero Sprites, Top-Down Hunt Animals, Slime Mobs, Roguelike Shoot 'Em Up).

Menambah level Math Hero 1: tulis fungsi baru di `levels.js` memakai `Builder` (lihat komentar di bagian atas file), masukkan ke daftar `LEVELS`, lalu jalankan `node scripts/cek_level.js`.

Untuk menjalankan tes, siapkan Python dan Playwright:

```
pip install playwright pillow fonttools
python -m playwright install chromium
```

Lalu dari folder project:

```
node tests/mh2.test.js
python tests/mh2_playthrough.py
node tests/math.test.js
node tests/bot_sanity.js
node scripts/cek_level.js
python tests/playthrough.py
python tests/menu.py
python tests/font_kleintenna.py
```

Alat bantu visual: `python tests/shot.py <level> <kolom[:tinggi],...>` menyimpan screenshot ke `tests/shots/`, `python tests/shot_boss.py` memotret bos beraksi, `python tests/montage.py` menggabungkan gambar.

`tests/mh2.test.js` memeriksa ribuan soal acak Math Hero 2 (jawaban benar, pengecoh unik, timbangan benar-benar seimbang, target lari selalu tercapai) dan data level. `tests/mh2_playthrough.py` membuka pemilih seri, memuat Math Hero 1 dari `mh1/`, lalu menyelesaikan ke-30 level Math Hero 2 sampai layar hasil (beberapa level sengaja dijawab salah dulu untuk memastikan penjelasan muncul). Jika Chromium Playwright belum diunduh, tes ini memakai Chrome atau Edge yang terpasang.

Tes Playwright menjalankan server sendiri di port khusus, jadi tidak bentrok dengan server yang sedang berjalan.

Catatan: tes otomatis berjalan di Chromium headless dengan profil Pixel 5. Uji di HP fisik tetap diperlukan untuk memastikan sentuhan, suara, dan performa di perangkat sungguhan.
