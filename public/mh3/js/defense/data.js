// Math Hero 3: data Bertahan (pertahanan jalur). Angka biaya, HP, dan kecepatan adalah titik awal untuk dituning.
// Satuan jarak = petak. Satuan waktu = detik. Tanpa DOM supaya bisa diuji di Node.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.MH3 = root.MH3 || {}).defenseData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const COLS = 5, ROWS = 7;

  // Pasukan. cd = waktu isi ulang kartu. fire = jeda tembak. make = jeda menghasilkan Bintang.
  const UNITS = {
    pemanah: { nama: 'Pemanah Kecil', info: 'Menembak lurus ke atas jalurnya', cost: 100, hp: 6, cd: 5, fire: 1.3, dmg: 1 },
    menara: { nama: 'Menara Bintang', info: 'Menghasilkan Bintang', cost: 50, hp: 4, cd: 5, make: 8, first: 4, value: 25 },
    tembok: { nama: 'Tembok Batu', info: 'Memblok monster', cost: 50, hp: 22, cd: 7 },
    // Pasukan penduduk yang diselamatkan (id sama dengan progress.js ROSTER).
    penyihir: { nama: 'Penyihir Es', info: 'Memperlambat monster', cost: 150, hp: 5, cd: 7, fire: 1.6, dmg: 0.5, shot: 'es', slow: 3, hero: 'owi' },
    meriam: { nama: 'Meriam', info: 'Ledakan di area sekitar', cost: 200, hp: 7, cd: 9, fire: 3.2, dmg: 3, shot: 'bom', splash: 0.6, hero: 'dudu' },
    robo: { nama: 'Robo Kuning', info: 'Laser satu jalur penuh', cost: 175, hp: 8, cd: 8, fire: 2.4, dmg: 1.2, shot: 'laser', hero: 'hero2' },
    rubah: { nama: 'Rubah Lincah', info: 'Menyerang 3 jalur sekaligus', cost: 175, hp: 6, cd: 8, fire: 1.5, dmg: 1, shot: 'tiga', hero: 'hero3' },
    anak: { nama: 'Anak Berani', info: 'Perisai satu baris sebentar', cost: 150, hp: 5, cd: 10, shot: 'perisai', every: 14, dur: 4, hero: 'hero1' },
  };

  // Monster (sprite MH1). spd dalam petak per detik, dps = kerusakan per detik ke pasukan yang diserang.
  const MONSTERS = {
    biasa: { nama: 'Monster Biasa', hp: 4, spd: 0.2, dps: 1, sprite: 'enemy1_run', hit: 'enemy1_hit', scale: 1.5 },
    cepat: { nama: 'Monster Cepat', hp: 3, spd: 0.4, dps: 1, sprite: 'enemy2_run', hit: 'enemy2_hit', scale: 1.5 },
    tebal: { nama: 'Monster Tebal', hp: 12, spd: 0.13, dps: 1.6, sprite: 'enemy4_walk', hit: 'enemy4_hit', scale: 1.5 },
    lompat: { nama: 'Monster Lompat', hp: 6, spd: 0.28, dps: 1.2, sprite: 'enemy3_walk', hit: 'enemy3_hit', scale: 1.5, jump: true }, // melompati penghadang pertama
    raksasa: { nama: 'Raksasa Batu', hp: 28, spd: 0.09, dps: 2.5, sprite: 'enemy7_run', hit: 'enemy7_hit', scale: 2.2 },
    pecah: { nama: 'Monster Pecah', hp: 6, spd: 0.2, dps: 1, sprite: 'enemy6_run', hit: 'enemy6_hit', scale: 1.5, split: { m: 'biasa', n: 2 } }, // pecah jadi 2 Monster Biasa
    tabib: { nama: 'Monster Tabib', hp: 5, spd: 0.17, dps: 0.8, sprite: 'enemy5_fly', hit: 'enemy5_hit', scale: 1.5, heal: { every: 2, amount: 1.5, range: 1 } },
    // Bos: Perisai Rumus kebal dari semua serangan sampai dipecahkan dengan satu soal PR, lalu terbuka `open` detik.
    // Kalau sampai Benteng, hati berkurang `castle` dan bos terdorong mundur, bukan hilang.
    bos1: { nama: 'Kapten Slime', hp: 40, spd: 0.07, dps: 3, boss: 'slime1', scale: 2.4, open: 12, castle: 2 },
    bos2: { nama: 'Kapten Elang', hp: 55, spd: 0.08, dps: 3, boss: 'burung', scale: 1.7, open: 12, castle: 2 },
    bos3: { nama: 'Kapten Ulat', hp: 70, spd: 0.075, dps: 3.5, boss: 'slime3', scale: 2.4, open: 11, castle: 2 },
    bos4: { nama: 'Raja Kabut', hp: 90, spd: 0.08, dps: 4, boss: 'prof', scale: 2.2, open: 10, castle: 2 },
  };

  // Gelombang: grup { m: jenis, n: jumlah, start: detik sejak gelombang mulai, gap: jeda antar monster }.
  // 12 level: tiap dunia 2 Bertahan biasa + 1 bos (ref 3, 6, 9, 12). Kesulitan naik per dunia (tier 0..3).
  const LEVELS = [
    {
      id: 1, nama: 'Gerbang Padang', tema: 'padang', startStars: 150, skyEvery: 6, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok'],
      // Peti PR muncul setelah gelombang ke-n (mulai 0). Soal dibuka lewat MH3.homework.open.
      chestAfter: 0,
      waves: [
        [{ m: 'biasa', n: 4, start: 4, gap: 9 }],
        [{ m: 'biasa', n: 6, start: 3, gap: 7 }, { m: 'cepat', n: 2, start: 20, gap: 12 }],
        [{ m: 'biasa', n: 6, start: 3, gap: 6 }, { m: 'cepat', n: 3, start: 12, gap: 8 }, { m: 'tebal', n: 2, start: 25, gap: 14 }],
      ],
    },
    {
      id: 2, nama: 'Ladang Gandum', tema: 'padang', startStars: 150, skyEvery: 6, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok', 'penyihir'], chestAfter: 0,
      waves: [
        [{ m: 'biasa', n: 6, start: 3, gap: 6 }, { m: 'cepat', n: 2, start: 18, gap: 10 }],
        [{ m: 'biasa', n: 5, start: 3, gap: 5 }, { m: 'cepat', n: 3, start: 14, gap: 7 }, { m: 'tebal', n: 1, start: 30, gap: 0 }],
        [{ m: 'cepat', n: 4, start: 2, gap: 5 }, { m: 'tebal', n: 2, start: 16, gap: 10 }, { m: 'biasa', n: 6, start: 3, gap: 5 }],
      ],
    },
    {
      id: 3, nama: 'Kapten Slime', tema: 'padang', startStars: 180, skyEvery: 6, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok', 'penyihir'], chestAfter: 0,
      waves: [
        [{ m: 'biasa', n: 6, start: 3, gap: 6 }, { m: 'cepat', n: 2, start: 18, gap: 10 }],
        [{ m: 'biasa', n: 6, start: 3, gap: 5 }, { m: 'cepat', n: 3, start: 14, gap: 7 }],
        [{ m: 'tebal', n: 2, start: 3, gap: 14 }, { m: 'biasa', n: 6, start: 10, gap: 5 }],
        [{ m: 'bos1', n: 1, start: 3, gap: 0 }, { m: 'biasa', n: 6, start: 12, gap: 4 }],
      ],
    },
    {
      id: 4, nama: 'Mulut Gua', tema: 'gua', startStars: 180, skyEvery: 6, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok', 'meriam'], chestAfter: 0,
      waves: [
        [{ m: 'biasa', n: 5, start: 3, gap: 6 }, { m: 'lompat', n: 2, start: 15, gap: 9 }],
        [{ m: 'cepat', n: 5, start: 2, gap: 4 }, { m: 'biasa', n: 5, start: 14, gap: 5 }],
        [{ m: 'tebal', n: 2, start: 3, gap: 8 }, { m: 'lompat', n: 2, start: 22, gap: 6 }],
      ],
    },
    {
      id: 5, nama: 'Terowongan Gema', tema: 'gua', startStars: 190, skyEvery: 6, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok', 'meriam'], chestAfter: 0,
      waves: [
        [{ m: 'pecah', n: 3, start: 3, gap: 9 }, { m: 'cepat', n: 3, start: 16, gap: 6 }],
        [{ m: 'tabib', n: 1, start: 3, gap: 10 }, { m: 'tebal', n: 2, start: 14, gap: 9 }, { m: 'biasa', n: 6, start: 2, gap: 5 }],
        [{ m: 'lompat', n: 3, start: 3, gap: 7 }, { m: 'pecah', n: 3, start: 14, gap: 8 }, { m: 'cepat', n: 3, start: 26, gap: 5 }],
      ],
    },
    {
      id: 6, nama: 'Kapten Elang', tema: 'gua', startStars: 190, skyEvery: 6, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok', 'meriam'], chestAfter: 0,
      waves: [
        [{ m: 'biasa', n: 6, start: 3, gap: 5 }, { m: 'cepat', n: 2, start: 18, gap: 10 }],
        [{ m: 'pecah', n: 2, start: 3, gap: 10 }, { m: 'tebal', n: 2, start: 16, gap: 10 }],
        [{ m: 'tabib', n: 2, start: 3, gap: 9 }, { m: 'cepat', n: 4, start: 14, gap: 5 }],
        [{ m: 'bos2', n: 1, start: 3, gap: 0 }, { m: 'biasa', n: 6, start: 12, gap: 4 }],
      ],
    },
    {
      id: 7, nama: 'Tepi Rawa', tema: 'kebun', startStars: 200, skyEvery: 7, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok', 'robo'], chestAfter: 0,
      waves: [
        [{ m: 'biasa', n: 5, start: 3, gap: 6 }, { m: 'tabib', n: 1, start: 20, gap: 0 }],
        [{ m: 'lompat', n: 3, start: 3, gap: 7 }, { m: 'cepat', n: 4, start: 18, gap: 5 }],
        [{ m: 'tebal', n: 3, start: 3, gap: 8 }, { m: 'pecah', n: 2, start: 20, gap: 10 }, { m: 'biasa', n: 4, start: 26, gap: 5 }],
      ],
    },
    {
      id: 8, nama: 'Hutan Lumut', tema: 'kebun', startStars: 190, skyEvery: 7, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok', 'robo'], chestAfter: 0,
      waves: [
        [{ m: 'pecah', n: 3, start: 3, gap: 9 }, { m: 'tabib', n: 1, start: 20, gap: 0 }],
        [{ m: 'tebal', n: 3, start: 3, gap: 8 }, { m: 'lompat', n: 3, start: 18, gap: 6 }, { m: 'cepat', n: 4, start: 30, gap: 4 }],
        [{ m: 'raksasa', n: 1, start: 14, gap: 0 }, { m: 'pecah', n: 3, start: 3, gap: 9 }, { m: 'tabib', n: 2, start: 22, gap: 8 }],
      ],
    },
    {
      id: 9, nama: 'Kapten Ulat', tema: 'kebun', startStars: 210, skyEvery: 7, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok', 'robo'], chestAfter: 0,
      waves: [
        [{ m: 'tebal', n: 2, start: 3, gap: 10 }, { m: 'biasa', n: 6, start: 14, gap: 5 }],
        [{ m: 'lompat', n: 3, start: 3, gap: 6 }, { m: 'pecah', n: 2, start: 18, gap: 9 }, { m: 'cepat', n: 3, start: 30, gap: 5 }],
        [{ m: 'tabib', n: 2, start: 3, gap: 10 }, { m: 'tebal', n: 2, start: 16, gap: 8 }],
        [{ m: 'bos3', n: 1, start: 3, gap: 0 }, { m: 'biasa', n: 6, start: 12, gap: 4 }],
      ],
    },
    {
      id: 10, nama: 'Kaki Kastil', tema: 'langit', startStars: 200, skyEvery: 7, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok', 'rubah'], chestAfter: 0,
      waves: [
        [{ m: 'raksasa', n: 1, start: 8, gap: 0 }, { m: 'biasa', n: 8, start: 3, gap: 4 }],
        [{ m: 'tebal', n: 4, start: 3, gap: 7 }, { m: 'pecah', n: 2, start: 18, gap: 8 }, { m: 'cepat', n: 4, start: 30, gap: 4 }],
        [{ m: 'lompat', n: 4, start: 3, gap: 6 }, { m: 'tabib', n: 2, start: 16, gap: 10 }, { m: 'raksasa', n: 1, start: 28, gap: 0 }],
      ],
    },
    {
      id: 11, nama: 'Gerbang Langit', tema: 'langit', startStars: 215, skyEvery: 7, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok', 'rubah'], chestAfter: 0,
      waves: [
        [{ m: 'pecah', n: 3, start: 3, gap: 9 }, { m: 'tebal', n: 2, start: 18, gap: 8 }],
        [{ m: 'raksasa', n: 1, start: 6, gap: 0 }, { m: 'tabib', n: 2, start: 3, gap: 10 }, { m: 'lompat', n: 4, start: 16, gap: 6 }, { m: 'cepat', n: 4, start: 30, gap: 4 }],
        [{ m: 'tebal', n: 4, start: 3, gap: 7 }, { m: 'pecah', n: 4, start: 16, gap: 7 }, { m: 'biasa', n: 6, start: 34, gap: 4 }],
      ],
    },
    {
      id: 12, nama: 'Raja Kabut', tema: 'langit', startStars: 300, skyEvery: 7, skyValue: 25, restTime: 5,
      loadout: ['pemanah', 'menara', 'tembok', 'rubah'], chestAfter: 0,
      waves: [
        [{ m: 'tebal', n: 3, start: 3, gap: 8 }, { m: 'cepat', n: 3, start: 20, gap: 5 }],
        [{ m: 'pecah', n: 3, start: 3, gap: 9 }, { m: 'lompat', n: 3, start: 18, gap: 6 }, { m: 'tabib', n: 1, start: 30, gap: 0 }],
        [{ m: 'raksasa', n: 1, start: 6, gap: 14 }, { m: 'tebal', n: 3, start: 26, gap: 8 }],
        [{ m: 'bos4', n: 1, start: 14, gap: 0 }, { m: 'biasa', n: 4, start: 3, gap: 3 }],
      ],
    },
  ];

  const stars = (hearts) => (hearts >= 5 ? 3 : hearts >= 3 ? 2 : hearts >= 1 ? 1 : 0);

  return { COLS, ROWS, UNITS, MONSTERS, LEVELS, stars, level: (id) => LEVELS.find((l) => l.id === id) };
});
