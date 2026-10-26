// Math Hero 3: cerita Benteng Bintang. Berkas ini berisi struktur dan kait (hook); naskah lengkap 20 level diisi di tugas 3.5.
// Satu baris dialog = { who, text }. who: 'peri' (Peri Angka, pemandu), 'raja' (Raja Kabut), 'kapten' (kapten monster dunia
// ini, ikut sprite-nya), 'warga' (penduduk; line.hero = kunci sprite), 'hero' (pemain). 2 sampai 4 baris per adegan.
//
// Mengisi naskah: tambahkan SCRIPT.levels['1-1'] = { before: [...], after: [...] }. Level tanpa entri memakai teks umum
// dari fallback() di bawah, jadi game selalu punya cerita yang runtut.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./progress.js'));
  else (root.MH3 = root.MH3 || {}).story = factory(root.MH3.progress);
})(typeof self !== 'undefined' ? self : this, function (P) {
  const peri = (text) => ({ who: 'peri', text });
  const raja = (text) => ({ who: 'raja', text });
  const kapten = (text) => ({ who: 'kapten', text });
  const hero = (text) => ({ who: 'hero', text });

  const OPENING = [
    peri('Halo, Pahlawan! Aku Peri Angka. Selamat datang di Benteng Bintang!'),
    raja('Muahaha! Aku Raja Kabut! Kristal Bintang sudah milikku, dan bentengmu akan padam!'),
    peri('Gawat! Tanpa Kristal Bintang, benteng kehilangan tenaga.'),
    peri('Tahan serangan monster, kejar para kapten yang kabur, dan bawa kembali semua kristal!'),
  ];
  const ENDING = [
    raja('Tidak mungkin... semua kristal kembali ke benteng!'),
    peri('Benteng Bintang menyala lagi! Kabut pun hilang.'),
    raja('Hmm... ternyata kalian hebat kalau bekerja sama. Maaf sudah mengacau.'),
    peri('Terima kasih, Pahlawan. Kamu penjaga Benteng Bintang yang sejati!'),
  ];

  // Pembuka tiap dunia (sekali, saat pertama kali masuk dunia).
  const WORLD_INTRO = {
    1: [peri('Ini Padang Rumput, gerbang pertama benteng. Monster pertama sudah terlihat!')],
    2: [peri('Gua Kristal! Banyak batu berkilau di sini, tapi hati-hati, gelap sekali.'), peri('Kapten Elang membawa kristal ke dalam gua.')],
    3: [peri('Rawa Kabut. Kabut tebal membuat jalan sulit dilihat.'), peri('Ayo maju pelan-pelan dan tetap bersama pasukanmu.')],
    4: [peri('Kastil Awan, rumah Raja Kabut! Kristal terakhir ada di sini.'), peri('Bawa semua pasukanmu. Ini pertarungan terakhir!')],
  };

  // Penyelamatan: dialog saat penduduk dibebaskan di akhir level Kejar.
  const RESCUE = {
    penyihir: [{ who: 'warga', hero: 'owi', text: 'Terima kasih sudah menyelamatkanku! Aku Bu Salju, penyihir es.' }, { who: 'warga', hero: 'owi', text: 'Sihir esku bisa memperlambat monster. Aku ikut menjaga benteng!' }],
    meriam: [{ who: 'warga', hero: 'dudu', text: 'Wah, aku bebas! Aku Pak Bom, tukang meriam.' }, { who: 'warga', hero: 'dudu', text: 'Meriamku siap meledakkan monster. Duar!' }],
    robo: [{ who: 'warga', hero: 'hero2', text: 'Sistem menyala! Aku Robo Kuning. Terima kasih, Pahlawan.' }, { who: 'warga', hero: 'hero2', text: 'Laserku menembus satu jalur penuh. Aku bergabung!' }],
    rubah: [{ who: 'warga', hero: 'hero3', text: 'Hup! Aku Rubah Lincah. Kamu cepat sekali!' }, { who: 'warga', hero: 'hero3', text: 'Aku bisa menyerang tiga jalur sekaligus. Ayo!' }],
    anak: [{ who: 'warga', hero: 'hero1', text: 'Kamu datang! Aku Anak Berani, aku tidak takut lagi.' }, { who: 'warga', hero: 'hero1', text: 'Perisaiku melindungi satu baris. Aku siap membantu!' }],
  };

  // Naskah per level. Diisi di tugas 3.5. Contoh bentuknya ada di dua level pertama.
  const SCRIPT = {
    levels: {
      '1-1': {
        before: [peri('Monster datang dari atas! Taruh pasukan di petak dan jaga benteng.'), peri('Ketuk Bintang yang jatuh untuk membeli pasukan baru.')],
        after: [peri('Benteng selamat! Tapi lihat, kapten monster kabur membawa kristal!')],
      },
      '1-2': {
        before: [peri('Kapten Slime lari ke arah bukit sambil membawa penduduk!'), peri('Kejar dia! Kiri, kanan, dan lompat.')],
        after: [peri('Kristal berhasil direbut!')],
      },
    },
  };

  // Teks umum bila naskah level belum ditulis.
  function fallback(L, when) {
    const w = P.WORLDS[L.world - 1];
    if (L.kind === 'defense') return when === 'before'
      ? [peri(`Monster menyerbu di ${L.nama}! Taruh pasukan dan tahan mereka.`)]
      : [peri('Serangan berhasil ditahan! Benteng aman untuk sekarang.')];
    if (L.kind === 'plat') return when === 'before'
      ? [peri(`Kapten monster kabur membawa kristal dan satu penduduk! Kejar lewat ${L.nama}.`)]
      : [peri('Kristal direbut kembali! Penduduk itu selamat.')];
    return when === 'before'
      ? [{ who: 'kapten', text: `Aku ${w.kapten.nama}! Kristal ini tidak akan kuberikan!` }, peri('Hati-hati, Pahlawan. Ini pertarungan besar!')]
      : [{ who: 'kapten', text: 'Aduh, aku kalah...' }, peri(`Hebat! ${w.nama} kembali aman.`)];
  }

  const lookup = (L, when) => (SCRIPT.levels[L.id] && SCRIPT.levels[L.id][when]) || fallback(L, when);
  const clone = (lines) => lines.map((l) => Object.assign({}, l));

  return {
    SCRIPT, OPENING, ENDING, WORLD_INTRO, RESCUE,
    opening: () => clone(OPENING),
    ending: () => clone(ENDING),
    world: (w) => clone(WORLD_INTRO[w] || []),
    before: (L) => clone(lookup(L, 'before')),
    after: (L) => clone(lookup(L, 'after')),
    rescue: (unitId) => clone(RESCUE[unitId] || []),
  };
});
