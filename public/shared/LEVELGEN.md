# Spesifikasi Level Generator Platformer (Kit F5)

Status: draf untuk disetujui bosskuh (2026-10-28). Belum ada kode. Setelah disetujui, generator dibangun di
`public/shared/js/levelgen.js` lalu dipakai untuk merombak 8 level Kejar MH3.

## 1. Pelajaran dari contoh `public/assets/advanced-level-example-*`

| Contoh | Yang dipelajari |
|---|---|
| 1 (peta besar gaya Sonic) | Mulai kiri bawah, bos di kanan atas: level naik terus, bukan hanya ke kanan. Banyak jalur (atas cepat, bawah lambat). Pipa/tabung yang membawa pemain, per (pegas), loop dan lereng, poros vertikal dengan pijakan bertingkat, lift. |
| 2 (gua gaya Spelunky) | Level = kisi ruang kecil yang saling terhubung. Tangga dan rantai untuk naik turun, lava, balok penghancur, peti dan harta di cabang samping. Satu tema warna (ungu) dipakai konsisten. |
| 3, 4, 8, 9 (hutan piksel, berwarna) | Level disusun dari potongan selebar satu layar. Jalur berkelok: kanan, naik lewat poros, turun ke gua, lalu keluar lagi. Gua memakai latar lebih gelap tetapi tile yang sama, jadi tetap terasa satu dunia. Peti, kotak kayu, duri, musuh pemanah, pintu, tuas. |
| 5, 6, 7 (versi abu-abu) | Bentuk jalur yang lebih rumit: menara bertingkat, zig-zag naik, turun ke sumur lalu naik lagi, dan ruang rahasia. Tiap ruang punya satu ide (satu rintangan utama), bukan campuran acak. |

Kesimpulan desain:
1. Level dibangun dari **ruang (chunk)** kecil yang dirangkai pada kisi makro, bukan satu baris panjang.
2. Arah gerak bervariasi: kanan, naik, turun, dan bolak-balik (switchback). Layar MH3 tegak, jadi level vertikal justru pas.
3. Tiap ruang punya satu ide utama. Ide baru dikenalkan di tempat aman dulu, baru diuji.
4. Visual satu level memakai satu tema (tile, latar, dekorasi, musuh). Ruang dalam (gua, interior) hanya menggelapkan latar.

## 2. Mekanik baru untuk Kejar MH3

Saat ini Kejar hanya punya tanah, jurang, platform tembus, bintang, musuh jalan, duri, checkpoint, dan peti PR. MH1 sudah
punya platform gerak, papan rapuh, gergaji, meriam, dan gerbang; fisikanya (`shared/js/physics.js`) sama, jadi bisa dipinjam.

| Kode | Mekanik | Perilaku | Aset |
|---|---|---|---|
| `H` | Tangga | Tekan atas/bawah di depan tangga untuk memanjat; lepas di atas berdiri di puncak. Musuh tidak memanjat. | Animasi `*_climb` hero; batang tangga digambar dengan warna kayu tema. |
| `s` | Per (pegas) | Diinjak: melontar setinggi sekitar 8 tile (2x lompat biasa). | `trap1` (pad merah yang tertekan). |
| `>` `<` | Per samping | Melontar mendatar, untuk lintasan cepat gaya Sonic. | `trap1` diputar. |
| `(` `)` | Pipa | Masuk di mulut pipa, hero dibawa sepanjang jalur pipa ke mulut lain (bisa naik). | Tile pipa digambar dari palet logam `tileset`. |
| `-` `\|` | Platform gerak (datar, tegak) | Seperti `movers` MH1. Lift tegak untuk poros vertikal. | Papan dari `tileset` (sudah dipakai MH1). |
| `~` | Papan rapuh | Runtuh 0,6 detik setelah diinjak, muncul lagi 3 detik kemudian. | `trap5` (animasi runtuh). |
| `B` | Kotak dorong | Didorong dengan berjalan ke arahnya, jatuh oleh gravitasi, bisa dipijak dan menekan tombol. | `box1_idle`, animasi `*_push` hero. |
| `_` | Tombol injak | Aktif selama ditekan hero atau kotak. Membuka gerbang dengan warna sama. | `end_idle`/`end_pressed`. |
| `t` | Tuas | Disentuh sekali, menyala tetap. Membuka gerbang dengan warna sama. | Digambar prosedural (batang + kenop warna kanal). |
| `G` | Gerbang | Padat sampai kanalnya aktif. Maksimal 3 kanal warna per level (merah, biru, kuning). | Balok bergaris dari `tileset` + warna kanal. |
| `x` | Blok retak | Bisa dihancurkan dengan skill Dudu atau kotak yang jatuh. Hanya menutup jalan pintas atau harta, tidak pernah jalan utama. | `box2_break`. |
| `o` | Gergaji | Diam atau bergerak bolak-balik. Hanya tier 2 ke atas. | `trap2`. |

Puzzle yang disukai anak SD (dipakai generator sebagai pola ruang):
- Dorong kotak ke tombol supaya gerbang tetap terbuka.
- Dorong kotak ke tepi lalu pakai sebagai tangga untuk naik.
- Tarik tuas di atas, lalu turun dan lewati gerbang di bawah (jalur bolak-balik).
- Lift tegak + per untuk naik poros tinggi.

## 3. Skill jagoan

Tiap jagoan punya satu skill, tombol B di samping Lompat. Animasinya sudah ada di atlas (`throw`, `push`, `climb`).

| Jagoan | Skill | Kegunaan |
|---|---|---|
| Pinki | Lempar bola bintang | Menjatuhkan musuh dari jauh, menekan tuas yang tidak terjangkau. |
| Owi | Melayang | Tahan Lompat di udara untuk turun pelan, menyeberang jurang lebar. |
| Dudu | Hantam tanah | Dari udara menghantam ke bawah: menghancurkan blok retak dan memantulkan musuh. |
| hero1 sampai hero3 (MH1) | Lempar (sama seperti Pinki) | Atlas MH1 tidak punya animasi panjat atau dorong, jadi pakai pose terdekat. |

Aturan: **jalan utama selalu bisa dilalui tanpa skill.** Skill hanya membuka jalan pintas, bintang ekstra, atau ruang rahasia.
Jadi pilihan jagoan tidak pernah membuat anak macet, tetapi tiap jagoan punya alasan untuk dimainkan ulang.
Kekuatan dari Peti Kekuatan (lompat ganda, magnet, perisai) tetap seperti sekarang.

## 4. Tingkat kesulitan dan arah gerak

Generator menerima `tier` 0 sampai 3 (sama dengan `tier` dunia MH3). Kisi makro: tiap ruang 12 kolom x 10 baris tile.

| Tier | Dunia MH3 | Bentuk jalur | Porsi ruang naik/turun | Mekanik yang boleh muncul |
|---|---|---|---|---|
| 0 | Padang | Kanan, sesekali naik satu ruang | sekitar 15% | tangga, per, kotak dorong, tombol |
| 1 | Gua | Kanan dengan poros naik dan sumur turun | sekitar 30% | + pipa, lift, tuas dan gerbang |
| 2 | Rawa | Zig-zag, bolak-balik, dua jalur (atas dan bawah) | sekitar 45% | + papan rapuh, per samping, gergaji diam |
| 3 | Kastil Awan | Menara: sebagian besar naik, tujuan di puncak | sekitar 60% | + gergaji gerak, kombinasi 2 kanal gerbang |

Aturan adil (semua tier):
- Mekanik baru dikenalkan dulu di ruang "kenal" (tanpa bahaya), baru muncul di ruang "uji". Paling banyak 2 mekanik baru per level.
- Tidak ada lompatan buta: kamera selalu bisa melihat tempat mendarat (kamera ikut naik/turun, sudah ada di `scene.js`).
- Checkpoint di awal tiap 2 sampai 3 ruang dan sebelum ruang puzzle. Jatuh di poros vertikal mendarat di lantai ruang, bukan kembali ke awal.
- Puzzle tidak bisa terkunci: kotak yang jatuh ke lubang muncul lagi di tempat awal (tombol "ulang kotak" juga disediakan).
- Durasi target 2 sampai 3 menit per level (sama dengan Kejar sekarang), dicek oleh bot.
- Peti PR (`P`, `K`) tetap tidak menghalangi jalan, `P` di sepertiga awal, `K` dekat tujuan.

## 5. Visual koheren per tema

Satu level = satu tema. Generator hanya memilih aset dari palet tema itu.

| Tema | Tile utama | Platform tembus | Latar (`M.drawBg`) | Ruang dalam | Musuh | Dekorasi |
|---|---|---|---|---|---|---|
| padang | `tileset` rumput hijau | papan kayu | `padang` | gua tanah, latar digelapkan 40% | slime1, kelinci | semak, bunga, pagar |
| gua | `tileset` batu abu (bars) | papan batu | `gua` | sama, ditambah kristal biru bercahaya | burung, slime2 | kristal, stalaktit |
| kebun (Rawa Kabut) | `tileset_pink` rumput merah muda | papan kayu | `kebun` | rongga akar, kabut | slime3, babi | jamur, alang-alang |
| langit (Kastil Awan) | `tileset` logam | papan logam | `langit` | dalam kastil, latar `benteng` | robo, alien | bendera, rantai |

Aturan tampilan:
- Permukaan atas tile memakai sisi berumput/bertepi, sisi dan dasar memakai isi tile (autotile 4 arah sederhana), tidak lagi kotak warna polos seperti sekarang.
- Ruang dalam menggelapkan latar dan menambah dinding belakang, tetapi tile depannya tetap sama dengan ruang luar.
- Warna kanal gerbang (merah, biru, kuning) sama di semua tema supaya anak cepat paham.
- Semua aset sudah ada di repo (CraftPix, `public/assets/game/` dan atlas MH3). Tidak ada aset baru yang diunduh.

## 6. Cara kerja generator

Berkas: `public/shared/js/levelgen.js`, API `window.MHKit.levelgen` (juga `require` di Node). Tanpa build, tanpa CDN.

```js
const lv = MHKit.levelgen.generate({ seed: 31, tier: 1, tema: 'gua', rooms: 9, intro: ['pipa'], rows: 'auto' });
// -> { map: [...string], tema, tier, seed, rooms: [{gx, gy, kind, chunk}], stats: {waktuBot, arah} }
```

Langkah:
1. **Jalur makro.** Jalan acak ber-seed di kisi ruang dari Mulai ke Tujuan, dengan bobot arah sesuai tier (kanan, naik, turun). Tiap ruang diberi jenis: `datar`, `naik`, `turun`, `belok`, `puzzle`, `istirahat`.
2. **Pilih potongan.** Pustaka potongan tulisan tangan (`public/shared/js/levelgen.chunks.js`), masing-masing 12x10 dengan pintu masuk dan keluar (kiri, kanan, atas, bawah) dan label mekanik + tier. Generator memilih potongan yang pintunya cocok, lalu boleh mencerminkan kiri-kanan. Pola ini (seperti Spelunky) menjamin tiap ruang dirancang manusia, sementara susunannya tetap bervariasi.
3. **Isi.** Bintang mengikuti jalur (dan di cabang skill), musuh di lantai datar, checkpoint, peti `P` dan `K`, ruang di luar jalur diisi tanah padat atau ruang rahasia.
4. **Cek.** Bot `levelcheck.js` diperluas mengerti tangga, per, lift, pipa, tuas/gerbang (urutan kanal), dan kotak (cek sederhana: kotak bisa mencapai tombolnya). Jika gagal atau terlalu lama/cepat, ulang dengan seed berikutnya.
5. **Keluaran.** Peta teks dengan kode di bagian 2, jadi `sim.js` tetap membaca format yang sama (ditambah kode baru).

Level kampanye memakai **seed tetap** yang disimpan di `plat/levels.js`, jadi level yang dimainkan anak selalu sama dan bisa diuji.
Seed acak hanya untuk mode tambahan nanti (misalnya "Kejar Bebas").

## 7. Rencana merombak Kejar MH3

8 level Kejar diganti hasil generator. Nama, tema, peti PR, warga yang diselamatkan, dan bintang tetap.

| Level | Tema, tier | Bentuk | Mekanik baru |
|---|---|---|---|
| 1 Jejak di Padang | padang, 0 | kanan, satu bukit naik | tangga, per |
| 2 Kejar Lewat Bukit | padang, 0 | kanan + satu poros naik | kotak dorong, tombol |
| 3 Jalan Kristal | gua, 1 | kanan, naik, turun ke sumur | pipa, lift |
| 4 Jurang Berkilau | gua, 1 | dua poros, satu bolak-balik | tuas dan gerbang |
| 5 Jembatan Kabut | kebun, 2 | zig-zag dua jalur | papan rapuh, per samping |
| 6 Rawa Dalam | kebun, 2 | turun dalam lalu naik lagi | gergaji diam, gabungan kotak + gerbang |
| 7 Tangga Awan | langit, 3 | menara naik | gergaji gerak, lift + per |
| 8 Menara Petir | langit, 3 | menara tinggi, tujuan di puncak | dua kanal gerbang |

## 8. Tahap kerja (setelah disetujui)

| Tahap | Isi | Tes |
|---|---|---|
| G1 | `sim.js` + `scene.js`: tangga, per, platform gerak, papan rapuh, kotak, tombol, tuas, gerbang, pipa, gergaji; kamera vertikal; autotile tema | tes unit sim (Node), Playwright satu level contoh |
| G2 | Skill jagoan (tombol B) | tes unit + Playwright |
| G3 | `levelgen.js` + pustaka potongan (sekitar 40 potongan) | generator deterministik per seed, 200 seed lolos bot |
| G4 | `levelcheck.js` mengerti mekanik baru | `npm run test:levels` |
| G5 | 8 level Kejar diganti, seed dipilih dan dikunci | `npm run test:mh3`, bot menamatkan 8 level, uji layar 393x851 |

Dikerjakan di cabang yang sama dengan kit bersama, tanpa merge. Uji di ponsel asli tetap dianjurkan setelah G5.
