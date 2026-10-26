// Math Hero 3: cerita Benteng Bintang. Naskah 20 level ada di SCRIPT.levels (tugas 3.5).
// Satu baris dialog = { who, text }. who: 'peri' (Peri Angka, pemandu), 'raja' (Raja Kabut), 'kapten' (kapten monster dunia
// ini, ikut sprite-nya), 'warga' (penduduk; line.hero = kunci sprite), 'hero' (pemain). 1 sampai 3 baris per adegan.
//
// Mengubah naskah: edit SCRIPT.levels['1-1'] = { before: [...], after: [...] }. Level tanpa entri memakai teks umum
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

  // Naskah per level. Bertahan = monster menyerbu benteng; Kejar = kapten kabur membawa kristal (dan kadang penduduk);
  // Bos = pertarungan dengan kapten dunia itu. Level Kejar yang punya penduduk memicu RESCUE sesudah `after`.
  const SCRIPT = {
    levels: {
      // Dunia 1: Padang Rumput (Kapten Slime)
      '1-1': {
        before: [peri('Monster datang dari atas! Taruh pasukanmu di petak dan jaga benteng.'), peri('Ketuk Bintang yang jatuh untuk membeli pasukan baru.')],
        after: [peri('Benteng selamat! Tapi lihat, Kapten Slime kabur sambil membawa Kristal Bintang!')],
      },
      '1-2': {
        before: [peri('Kapten Slime lari ke bukit sambil menculik Bu Salju!'), peri('Kejar dia! Lompat di atas jurang dan ambil semua peti.')],
        after: [peri('Bu Salju sudah bebas! Satu kristal kembali ke benteng.')],
      },
      '1-3': {
        before: [peri('Slime-slime kecil menyerbu ladang! Jaga para petani.'), peri('Pemanah bisa menembak lurus ke atas. Atur mereka di jalurnya!')],
        after: [peri('Ladang aman! Kapten Slime sekarang bersembunyi di balik bukit.')],
      },
      '1-4': {
        before: [peri('Kapten Slime lari lagi dan menangkap Pak Bom si tukang meriam!'), peri('Awas, lompat dengan pas ya, Pahlawan!')],
        after: [peri('Pak Bom bebas! Dia langsung ikut menjaga benteng.')],
      },
      '1-5': {
        before: [kapten('Hahaha! Kristal ini milikku. Kalian tidak akan bisa merebutnya!'), peri('Perisainya kuat! Jawab soal PR untuk memecahkannya, lalu serang lagi.')],
        after: [kapten('Aduh... aku kalah. Ampun!'), peri('Hebat! Padang Rumput kembali aman. Ayo ke Gua Kristal!')],
      },

      // Dunia 2: Gua Kristal (Kapten Elang)
      '2-1': {
        before: [peri('Gelap sekali di mulut gua! Pasang pasukanmu supaya monster tidak masuk benteng.')],
        after: [peri('Monster gua mundur semua. Kapten Elang terbang makin tinggi!')],
      },
      '2-2': {
        before: [peri('Kapten Elang menangkap Robo Kuning dan membawa Kristal Bintang lewat jalan kristal!'), peri('Kejar dia! Lompat di atas batu yang berkilau.')],
        after: [peri('Robo Kuning sudah bebas! Kristal Bintang kembali sedikit demi sedikit.')],
      },
      '2-3': {
        before: [peri('Suara gema bikin monster terdengar banyak sekali!'), peri('Tembok Batu kuat sekali. Pasang dia di depan!')],
        after: [peri('Terowongan aman. Kapten Elang masih terbang di depan. Kejar terus!')],
      },
      '2-4': {
        before: [peri('Kapten Elang menyeberangi jurang! Rubah Lincah ikut tertangkap.'), peri('Lompat cepat, Pahlawan. Jangan sampai jatuh!')],
        after: [peri('Rubah Lincah bebas! Dia sekarang ikut bersama kita.')],
      },
      '2-5': {
        before: [kapten('Kristal ini sudah jadi milikku. Kalian tidak bisa mengambilnya!'), peri('Perisainya kuat! Pecahkan dengan menjawab PR, lalu serang lagi.')],
        after: [kapten('Waaah! Kristalku jatuh...'), peri('Gua Kristal bersinar lagi! Sekarang kita ke Rawa Kabut.')],
      },

      // Dunia 3: Rawa Kabut (Kapten Ulat)
      '3-1': {
        before: [peri('Kabut tebal menutupi rawa. Monster bisa datang dari mana saja!'), peri('Taruh pasukanmu dekat benteng dan tetap waspada.')],
        after: [peri('Monster kabut mundur. Kapten Ulat menyelinap ke hutan!')],
      },
      '3-2': {
        before: [peri('Kapten Ulat menculik Anak Berani dan membawa Kristal Bintang lewat jembatan kabut!'), peri('Kabut bikin jalan sulit terlihat. Lompat pelan-pelan, ya!')],
        after: [peri('Anak Berani bebas! Dia berjanji ikut menjaga benteng.')],
      },
      '3-3': {
        before: [peri('Monster berlumut ini kuat sekali. Pasang tembok batu di depan!'), peri('Pemanah juga bisa membantu dari belakang.')],
        after: [peri('Hutan Lumut aman. Kapten Ulat tinggal selangkah lagi!')],
      },
      '3-4': {
        before: [peri('Kapten Ulat masuk ke rawa paling dalam. Ayo kejar!'), peri('Lompat dari batang kayu ke batang kayu, ya.')],
        after: [peri('Kapten Ulat tertangkap! Kristal Bintang kembali ke tangan kita.')],
      },
      '3-5': {
        before: [kapten('Hihihi! Kabut ini akan menyembunyikanku selamanya!'), peri('Kabutnya tebal sekali. Pecahkan perisainya dengan menjawab PR!')],
        after: [kapten('Tidak! Kabutku hilang!'), peri('Rawa Kabut sudah bersih. Ayo ke Kastil Awan, rumah Raja Kabut!')],
      },

      // Dunia 4: Kastil Awan (Raja Kabut)
      '4-1': {
        before: [raja('Ha! Kalian sampai juga ke kastilku. Tapi pasukanku sudah menunggu!'), peri('Jaga benteng sekuat tenagamu, Pahlawan!')],
        after: [peri('Pasukan Raja Kabut mundur. Tinggal beberapa langkah lagi!')],
      },
      '4-2': {
        before: [peri('Raja Kabut lari naik tangga awan sambil membawa Kristal Bintang terakhir!'), peri('Naik terus, Pahlawan. Jangan lihat ke bawah!')],
        after: [peri('Kristal terakhir hampir kembali. Ayo lanjut!')],
      },
      '4-3': {
        before: [peri('Pasukan terakhir Raja Kabut menyerbu gerbang. Ini gerbang terakhir!'), peri('Pakai semua pasukan yang kamu punya!')],
        after: [peri('Gerbang Langit terbuka lebar. Raja Kabut sudah terpojok!')],
      },
      '4-4': {
        before: [raja('Kalian tidak akan bisa mengejarku di menara petir!'), peri('Lompat cepat sebelum petirnya menyambar!')],
        after: [peri('Raja Kabut tertangkap! Semua kristal sudah kembali.')],
      },
      '4-5': {
        before: [raja('Muahaha! Kristal Bintang sudah jadi milikku!'), peri('Ini pertarungan terakhir! Pecahkan perisainya dengan menjawab PR, lalu serang!')],
        after: [raja('Aku menyerah... kabutku hilang.')],
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
