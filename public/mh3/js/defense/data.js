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
  };

  // Monster (sprite MH1). spd dalam petak per detik, dps = kerusakan per detik ke pasukan yang diserang.
  const MONSTERS = {
    biasa: { nama: 'Monster Biasa', hp: 4, spd: 0.2, dps: 1, sprite: 'enemy1_run', hit: 'enemy1_hit', scale: 1.5 },
    cepat: { nama: 'Monster Cepat', hp: 3, spd: 0.4, dps: 1, sprite: 'enemy2_run', hit: 'enemy2_hit', scale: 1.5 },
    tebal: { nama: 'Monster Tebal', hp: 12, spd: 0.13, dps: 1.6, sprite: 'enemy4_walk', hit: 'enemy4_hit', scale: 1.5 },
  };

  // Gelombang: grup { m: jenis, n: jumlah, start: detik sejak gelombang mulai, gap: jeda antar monster }.
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
  ];

  const stars = (hearts) => (hearts >= 5 ? 3 : hearts >= 3 ? 2 : hearts >= 1 ? 1 : 0);

  return { COLS, ROWS, UNITS, MONSTERS, LEVELS, stars, level: (id) => LEVELS.find((l) => l.id === id) };
});
