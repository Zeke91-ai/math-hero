# Bank aset bersama

Folder ini dipakai bersama oleh Math Hero 1, 2, dan 3. Isinya hanya hal yang memang sama di semua seri.

## Isi

- `js/scratchpad.js`: kertas coret-coret (`window.Scratchpad`): pulau seret + lembar bawah. Game memanggil `Scratchpad.setAvailable(bool)` tiap frame saat anak mengerjakan soal yang menghentikan waktu, dan `Scratchpad.clear()` saat soal baru.
- `js/credits.js`: data kredit bersama dan helper (`window.MathHeroCredits`).
- `js/audio.js`: musik chiptune dan efek suara Web Audio (memasang diri ke `window.MH2`, yang juga dipakai core MH3), dipakai MH2 dan MH3. MH1 masih memakai `public/js/audio.js` sendiri (isinya berbeda).
- `js/concepts.js`: semua pembuat soal dan penjelasan konsep (murni logika, diuji di Node), dipakai MH2 dan MH3.
- `js/core.js`: inti mesin MH2/MH3 (loop, adegan, input, tombol canvas, partikel, `M.overlay`, `M.flash`, `M.motion`). Versi MH3, yang superset versi MH2 lama; di MH2 fitur tambahan tidak aktif karena tidak dipanggil.
- `js/physics.js`: fisika platformer murni logika (`window.Physics`, juga dimuat Node oleh bot level dan tes), dipakai MH1 dan Kejar di MH3.
- `js/levelcheck.js`: pemeriksa level (bot jangkauan, `window.MHKit.levelcheck`, juga dimuat Node). Memakai `physics.js`; mengerti format MH1 dan Kejar MH3 (`fromKejar`). Format baru cukup membuat adaptor. Dijalankan lewat `npm run test:levels` (`scripts/cek_level.js`: semua 8 level MH1 dan 8 level Kejar; `tests/bot_sanity.js`: jurang lebar harus dianggap mustahil di kedua format).
- `js/questionbank.js`: bank soal (`window.MHKit.bank`). Satu antarmuka `Bank.soal(skill, tingkat, rng)` dengan bentuk soal baku (teks, jawaban, pilihan, langkah, petunjuk), RNG ber-seed (`Bank.rng(seed)`, soal bisa disimpan sebagai `{skill, tingkat, seed}`), katalog `Bank.skills({kelas, sumber})`, dan tingkat adaptif umum (`Bank.adaptTier`). Pembuat soal lama tidak diubah; adaptor `useMathQuiz` (MH1), `useConcepts` (garis bilangan MH2/MH3), dan `useHomework` (PR MH3) memasangnya ke katalog (30 keterampilan). Mode MH2 yang menghasilkan konfigurasi permainan, bukan soal, tidak dimasukkan. Belum dipakai game; seri boleh pindah bertahap. Tes: `npm run test:bank`.
- `js/scores.js` (`window.Scores` / `MHKit.scores`): papan skor bersama Firebase Firestore, satu koleksi `scores` untuk banyak aplikasi (`Scores.submit(appId, board, name, score, meta)`, `Scores.top(appId, board, n)`; tidak pernah melempar galat, offline atau tanpa konfigurasi = skor lokal). Konfigurasinya (`SCORES_CONFIG`) sengaja tidak ikut kit karena milik tiap penerapan: `public/js/firebase-config.js`.
- `js/timebonus.js` (`window.TimeBonus` / `MHKit.timebonus`): bonus yang menyusut menurut waktu main aktif. Kecepatan susut tiap game ada di tabel `GAMES` (satu tempat, satu angka); game atau mode baru cukup menambah satu baris.
- `js/juara.js` (`window.MHJuara` / `MHKit.juara`): layar Papan Juara untuk seri bermesin MH2/MH3: `MHJuara.install(M, { board: 'mh3', back: 'title' })`.
- `css/mh-ui.css`: gaya antarmuka bersama MH2 dan MH3 (dulu `mh2/css/mh2.css`).
- `vendor/gsap/`: GSAP 3.15.0 (`gsap.min.js`, `Draggable.min.js`) dari paket npm resmi, disalin apa adanya, lisensi di `LICENSE.txt` (Standard "no charge"). Di-vendor lokal karena game dimainkan lewat LAN atau offline, bukan CDN.

- `template/`: templat seri baru (`index.html` + `js/scenes.js`), dipakai `scripts/buat_seri.js`. Panduan lengkap: `PANDUAN_SERI_BARU.md`.

## Aturan

- Masuk bank hanya kode atau aset yang dipakai lebih dari satu seri dan tidak bergantung pada isi satu seri.
- Satu fitur = satu file. Tidak ada build; file dimuat langsung dengan `<script>`.
- Setiap file mengekspos satu API global `window.X` (mis. `window.Scratchpad`). Tanpa modul ES.
- Pustaka pihak ketiga ditaruh di `vendor/<nama>/` dengan berkas lisensinya, dan dicatat di `public/assets/svg/CREDITS.md`.

## Cara memuat

MH1 memakai `<base href="../">`, jadi alamatnya relatif terhadap `public/`:

```html
<script src="shared/vendor/gsap/gsap.min.js"></script>
<script src="shared/js/credits.js"></script>
```

MH2 dan MH3 (halaman di `/mh2/` dan `/mh3/`):

```html
<script src="../shared/vendor/gsap/gsap.min.js"></script>
<script src="../shared/js/credits.js"></script>
```

Urutan: `gsap.min.js`, `Draggable.min.js`, lalu `credits.js` sebelum skrip game (menu/scenes), dan `scratchpad.js` setelah skrip game.

## Kredit bersama

`MathHeroCredits.lines([...])` mengembalikan array string untuk roll kanvas (MH2, MH3). `MathHeroCredits.renderRoll(el, [...])` mengisi DOM roll MH1. Isi larik: bagian milik game `{ head, lines }` atau kunci bagian bersama `'font'`, `'musik'`, `'animasi'`. Penutup ("Terima kasih sudah belajar!", "an edu-game by Hilmi Fuadi", surel) ditambahkan otomatis.

## Merangkai layanan meta dengan alat level dan bank soal

Level yang dibuat generator (`levelgen.js`, lihat `LEVELGEN.md`) dan soal dari bank bersama berseed, jadi satu putaran cukup dikenali dengan `{seed, tingkat}`. Untuk mode level buatan (mis. Kejar tanpa batas) caranya sama di semua seri:

1. Tambah satu baris di `TimeBonus.GAMES` untuk mode itu, lalu pakai `TimeBonus.forGame(id)` dan panggil `tick(dt)` hanya saat game berjalan.
2. Saat putaran selesai, kirim `Scores.submit('math-hero', 'mh3-kejar', nama, skorTotal, { seed, tingkat, level })`. Kunci `meta` dibatasi 8 dan nilainya sederhana, jadi seed dan tingkat cukup untuk mengulang level yang sama.
3. Tampilkan lewat `MHJuara.install(M, { board: 'mh3-kejar' })`; papan baru tidak butuh perubahan aturan Firestore (papan hanya string `board`).
