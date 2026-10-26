// Math Hero 2: peta petualangan. 6 dunia (stage), tiap dunia 5 level; level ke-5 selalu bos.
// Tiap level memilih mode permainan (lihat js/modes) dan konfigurasi soal (lihat concepts.js).
// Urutan materi mengikuti kelas 1 sampai 4 SD: tambah-kurang, puluhan dan uang, perkalian, pembagian, pecahan, campuran.
// Di level yang menuntut kegesitan (Lari Angka, Meteor Angka, Balap Hitung) angkanya sengaja kecil: tangan dan mata
// sudah sibuk, jadi tantangannya ada di permainan, bukan di besarnya hitungan.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MH2Stages = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const MODES = ['numline', 'runner', 'shooter', 'racer', 'balance', 'garden', 'share', 'market', 'pizza'];

  const STAGES = [
    {
      id: 1, nama: 'Padang Bilangan', tema: 'padang', musik: 'padang', warna: '#5fd068', kelas: 'Kelas 1',
      materi: 'Tambah dan kurang sampai 20',
      cerita: ['Padang Bilangan dulu tenang dan hijau.', 'Sekarang angka-angkanya melompat ke mana-mana!', 'Ayo atur lagi dengan garis bilangan.'],
      bos: { nama: 'Raja Slime Kacau', sprite: 'slime1', ejek: 'Blub blub! Angka 10 milikku sekarang!' },
      levels: [
        { nama: 'Lompat Maju', mode: 'numline', tasks: 4, cfg: { kind: 'add', max: 10, bMax: 5 } },
        { nama: 'Lari Pas', mode: 'runner', tasks: 3, cfg: { kind: 'sum', tMin: 5, tMax: 10, orbMax: 4 } },
        { nama: 'Timbangan Ajaib', mode: 'balance', tasks: 4, cfg: { kind: 'simple', max: 10 } },
        { nama: 'Lompat Mundur', mode: 'numline', tasks: 4, cfg: { kind: 'sub', max: 15, bMax: 6 } },
        { nama: 'Raja Slime Kacau', mode: 'shooter', boss: true, tasks: 5, tema: 'langit', cfg: { waves: [{ kind: 'bond', n: 10 }], boss: { sprite: 'slime1', hp: 5, warna: '#5fd068' } } },
      ],
    },
    {
      id: 2, nama: 'Pantai Puluhan', tema: 'pantai', musik: 'pantai', warna: '#4b9cff', kelas: 'Kelas 2',
      materi: 'Puluhan, satuan, dan uang',
      cerita: ['Di Pantai Puluhan, kerang dihitung per sepuluh.', 'Tapi Babi Hutan Kebut mengacak semua harga!', 'Pakai puluhan dan satuan untuk membereskannya.'],
      bos: { nama: 'Babi Hutan Kebut', sprite: 'babi', ejek: 'Ngok! Tidak ada yang bisa mengalahkan kecepatanku!' },
      levels: [
        { nama: 'Lompat Puluhan', mode: 'numline', tasks: 3, cfg: { kind: 'tens', max: 100, bMin: 12, bMax: 35 } },
        { nama: 'Warung Pantai', mode: 'market', tasks: 4, cfg: { kind: 'pay', maxDenom: 1000, min: 300, max: 2500 } },
        { nama: 'Balap Kelinci', mode: 'racer', tasks: 6, cfg: { op: 'mix', ops: ['add', 'tens', 'sub'], aMax: 12, bMax: 6, rival: 'kelinci' } },
        { nama: 'Timbangan Puluhan', mode: 'balance', tasks: 4, cfg: { kind: 'tens' } },
        { nama: 'Babi Hutan Kebut', mode: 'racer', boss: true, tasks: 8, cfg: { op: 'mix', ops: ['compare', 'tens'], cMin: 10, cMax: 60, rival: 'babi', mustWin: true } },
      ],
    },
    {
      id: 3, nama: 'Kebun Perkalian', tema: 'kebun', musik: 'kebun', warna: '#ffb347', kelas: 'Kelas 2-3',
      materi: 'Perkalian sebagai kelompok dan baris',
      cerita: ['Kebun Perkalian menanam bibit dalam baris rapi.', 'Ulat Raksasa memakan barisnya sampai berantakan!', 'Kalau barisnya sama panjang, menghitung jadi cepat.'],
      bos: { nama: 'Ulat Raksasa', sprite: 'slime3', ejek: 'Nyam nyam! Barisanmu enak sekali!' },
      levels: [
        { nama: 'Kebun Baris', mode: 'garden', tasks: 4, cfg: { kind: 'total', rMax: 4, cMax: 5 } },
        { nama: 'Lompat Kelipatan', mode: 'numline', tasks: 4, cfg: { kind: 'skip', sMin: 2, sMax: 5, nMin: 2, nMax: 5 } },
        { nama: 'Hujan Kelipatan', mode: 'shooter', tasks: 3, tema: 'langit', cfg: { waves: [{ kind: 'multiple', k: 2, need: 5 }, { kind: 'multiple', k: 5, need: 5 }, { kind: 'multiple', k: 3, need: 5 }] } },
        { nama: 'Persegi Ajaib', mode: 'garden', tasks: 2, cfg: { kind: 'factors', totals: [12, 16, 18, 20, 24], need: 3 } },
        { nama: 'Ulat Raksasa', mode: 'runner', boss: true, tasks: 4, cfg: { kind: 'equal', values: [6, 8, 10, 12], need: 3, boss: { sprite: 'slime3', hp: 4 } } },
      ],
    },
    {
      id: 4, nama: 'Gua Bagi Rata', tema: 'gua', musik: 'gua', warna: '#8b5cf6', kelas: 'Kelas 3',
      materi: 'Pembagian sebagai bagi rata, dan sisa',
      cerita: ['Para slime gua suka permata berkilau.', 'Kelelawar Kacau membagi permata tidak adil!', 'Ayo bagi rata, satu-satu bergiliran.'],
      bos: { nama: 'Burung Kacau', sprite: 'burung', ejek: 'Kaak! Semua permata untukku saja!' },
      levels: [
        { nama: 'Permata Slime', mode: 'share', tasks: 3, cfg: { gMin: 2, gMax: 3, eMin: 2, eMax: 4 } },
        { nama: 'Kotak Misteri', mode: 'balance', tasks: 4, cfg: { kind: 'groups', nMax: 4, vMax: 6 } },
        { nama: 'Kebun Bagi', mode: 'garden', tasks: 4, cfg: { kind: 'rows', rMax: 5, cMax: 6 } },
        { nama: 'Sisa di Peti', mode: 'share', tasks: 3, cfg: { gMin: 2, gMax: 4, eMin: 2, eMax: 4, rem: true } },
        { nama: 'Burung Kacau', mode: 'shooter', boss: true, tasks: 5, tema: 'gua', cfg: { waves: [{ kind: 'divide', dMax: 5, qMax: 5 }], boss: { sprite: 'burung', hp: 5, warna: '#8b5cf6' } } },
      ],
    },
    {
      id: 5, nama: 'Kota Pecahan', tema: 'kota', musik: 'kota', warna: '#ff8fab', kelas: 'Kelas 3-4',
      materi: 'Pecahan: bagian yang sama besar',
      cerita: ['Kota Pecahan terkenal dengan pizzanya.', 'Koki Kacau memotong pizza tidak sama besar!', 'Pecahan hanya adil kalau bagiannya sama besar.'],
      bos: { nama: 'Koki Kacau', sprite: 'slime2', ejek: 'Hohoho! Potonganku besar-kecil, siapa peduli?' },
      levels: [
        { nama: 'Pizzeria Kota', mode: 'pizza', tasks: 4, cfg: { kind: 'make', dens: [2, 3, 4] } },
        { nama: 'Mana Lebih Banyak?', mode: 'pizza', tasks: 5, cfg: { kind: 'compare' } },
        { nama: 'Lompat Pecahan', mode: 'numline', tasks: 4, cfg: { kind: 'frac', den: 4 } },
        { nama: 'Meteor Setengah', mode: 'shooter', tasks: 2, tema: 'angkasa', cfg: { waves: [{ kind: 'half', need: 5 }, { kind: 'half', need: 6 }] } },
        { nama: 'Koki Kacau', mode: 'pizza', boss: true, tasks: 6, cfg: { kind: 'mix', kinds: ['make', 'equiv', 'compare'], dens: [2, 3, 4, 6, 8], boss: { sprite: 'slime2' }, timer: 30 } },
      ],
    },
    {
      id: 6, nama: 'Benteng Profesor Kacau', tema: 'benteng', musik: 'benteng', warna: '#b38cff', kelas: 'Kelas 4',
      materi: 'Semua jurus: campuran',
      cerita: ['Lima kristal sudah kembali!', 'Kristal terakhir dijaga Profesor Kacau di bentengnya.', 'Pakai semua jurus yang sudah kamu pahami!'],
      bos: { nama: 'Profesor Kacau', sprite: 'prof', ejek: 'Muahaha! Tanpa kristal, 2 + 2 = 5 selamanya!' },
      levels: [
        { nama: 'Balap Benteng', mode: 'racer', tasks: 8, cfg: { op: 'mix', ops: ['mul', 'div'], mulA: 5, mulB: 5, dMax: 5, qMax: 5, rival: 'rubah' } },
        { nama: 'Toko Kembalian', mode: 'market', tasks: 4, cfg: { kind: 'change', paid: [2000, 5000, 10000], maxDenom: 5000 } },
        { nama: 'Lari Kristal', mode: 'runner', tasks: 3, cfg: { kind: 'sum', tMin: 10, tMax: 20, orbMax: 6 } },
        { nama: 'Timbangan Dua Langkah', mode: 'balance', tasks: 4, cfg: { kind: 'twostep' } },
        {
          nama: 'Profesor Kacau', boss: true, final: true, mode: 'shooter', tasks: 1,
          phases: [
            { mode: 'shooter', tasks: 4, tema: 'angkasa', cfg: { waves: [{ kind: 'multiple', kMin: 2, kMax: 5 }], boss: { sprite: 'prof', hp: 4, warna: '#b38cff' } }, judul: 'Babak 1: Hujan Meteor' },
            { mode: 'balance', tasks: 2, cfg: { kind: 'twostep' }, judul: 'Babak 2: Timbangan Kacau' },
            { mode: 'racer', tasks: 6, cfg: { op: 'mix', ops: ['mul', 'div', 'compare'], mulA: 5, mulB: 5, dMax: 5, qMax: 5, cMin: 20, cMax: 99, rival: 'prof', mustWin: true }, judul: 'Babak 3: Kejar Profesor!' },
          ],
        },
      ],
    },
  ];

  // Lengkapi id level ("1-1"), nomor dunia, dan daftar level urut global.
  const ALL_LEVELS = [];
  STAGES.forEach((st) => st.levels.forEach((L, i) => {
    L.id = `${st.id}-${i + 1}`;
    L.stage = st.id;
    L.index = ALL_LEVELS.length;
    L.tema = L.tema || st.tema;
    if (L.phases) L.phases.forEach((p) => { p.tema = p.tema || st.tema; });
    ALL_LEVELS.push(L);
  }));

  const api = { MODES, STAGES, ALL_LEVELS };
  if (typeof window !== 'undefined' && window.MH2) { window.MH2.STAGES = STAGES; window.MH2.ALL_LEVELS = ALL_LEVELS; }
  return api;
});
