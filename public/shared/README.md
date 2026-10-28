# Bank aset bersama

Folder ini dipakai bersama oleh Math Hero 1, 2, dan 3. Isinya hanya hal yang memang sama di semua seri.

## Isi

- `js/scratchpad.js`: kertas coret-coret (`window.Scratchpad`): pulau seret + lembar bawah. Game memanggil `Scratchpad.setAvailable(bool)` tiap frame saat anak mengerjakan soal yang menghentikan waktu, dan `Scratchpad.clear()` saat soal baru.
- `js/credits.js`: data kredit bersama dan helper (`window.MathHeroCredits`).
- `js/audio.js`: musik chiptune dan efek suara Web Audio (memasang diri ke `window.MH2`, yang juga dipakai core MH3), dipakai MH2 dan MH3. MH1 masih memakai `public/js/audio.js` sendiri (isinya berbeda).
- `js/concepts.js`: semua pembuat soal dan penjelasan konsep (murni logika, diuji di Node), dipakai MH2 dan MH3.
- `css/mh-ui.css`: gaya antarmuka bersama MH2 dan MH3 (dulu `mh2/css/mh2.css`).
- `vendor/gsap/`: GSAP 3.15.0 (`gsap.min.js`, `Draggable.min.js`) dari paket npm resmi, disalin apa adanya, lisensi di `LICENSE.txt` (Standard "no charge"). Di-vendor lokal karena game dimainkan lewat LAN atau offline, bukan CDN.

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
