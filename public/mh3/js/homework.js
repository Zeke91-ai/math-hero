// Math Hero 3: generator PR (soal pekerjaan rumah) kelas 2-5. Murni logika (tanpa DOM) agar bisa diuji di Node:
//   node tests/mh3_homework.test.js
// Soal deterministik: generate(id, seed, tier) selalu menghasilkan soal yang sama, jadi PR yang terbuka cukup
// disimpan sebagai {id, seed, tier}. tier 0-3 = Dunia 1-4 (awal sampai akhir kelas).
// Setiap soal butuh coretan (minimal 2 langkah hitung) dan membawa: steps (ringkasan), hints[2] (strategi, kerangka),
// similar() (contoh mirip, jawaban soal asli tidak dibocorkan), polaSalah[] (pesan bertarget untuk salah umum).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MH3Homework = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const X = '×', BAGI = ':';
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fmtRp = (n) => 'Rp' + fmt(n);
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const pad2 = (n) => String(n).padStart(2, '0');
  const clock = (h, m) => `${pad2(h)}.${pad2(m)}`;

  // Pengacak deterministik (mulberry32).
  function rng(seed) {
    let s = seed >>> 0;
    const next = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
    const pick = (a) => a[Math.floor(next() * a.length)];
    return { next, int, pick };
  }

  // Jumlah simpanan saat a + b disusun, dan jumlah pinjaman saat a - b disusun.
  function carries(a, b) {
    let c = 0, n = 0;
    while (a > 0 || b > 0 || c > 0) {
      const s = (a % 10) + (b % 10) + c;
      c = s >= 10 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10);
    }
    return n;
  }
  function borrows(a, b) {
    let br = 0, n = 0;
    while (a > 0 || b > 0) {
      let d = (a % 10) - (b % 10) - br;
      if (d < 0) { br = 1; n++; } else br = 0;
      a = Math.floor(a / 10); b = Math.floor(b / 10);
    }
    return n;
  }

  // Cerita memakai dunia game.
  const ITEM = ['batu benteng', 'bintang', 'kristal', 'anak panah', 'koin emas'];
  const MONSTER = ['monster', 'goblin', 'kelelawar kabut'];

  const int = (r, lo, hi) => r.int(lo, hi);
  const T = (tier, lo, hi) => lo + Math.round(((hi - lo) * tier) / 3); // nilai naik mengikuti tier

  // ===== Templat. Tiap gen(r, tier) mengembalikan soal tanpa id/grade/seed =====
  const GEN = {};

  // ---- Kelas 2 ----
  GEN.tambah3 = (r, t) => {
    let a, b, g = 0;
    do { a = int(r, 150 + T(t, 0, 200), 899); b = int(r, 150, 999 - a > 150 ? 999 - a : 150); } while ((a + b >= 1000 || carries(a, b) < 2) && g++ < 500);
    const ans = a + b, u = (a % 10) + (b % 10), pu = Math.floor(u / 10);
    const ten = (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) + pu;
    return { form: 'int', carryKind: 'simpan', carries: carries(a, b), question: `${fmt(a)} + ${fmt(b)} = ...`, answer: ans,
      steps: [`Satuan: ${a % 10} + ${b % 10} = ${u}, tulis ${u % 10}, simpan ${pu}.`, `Puluhan: ${Math.floor(a / 10) % 10} + ${Math.floor(b / 10) % 10} + ${pu} = ${ten}, tulis ${ten % 10}, simpan ${Math.floor(ten / 10)}.`, `Ratusan: ${Math.floor(a / 100)} + ${Math.floor(b / 100)} + ${Math.floor(ten / 10)} = ${Math.floor(ans / 100)}.`, `Jadi ${fmt(a)} + ${fmt(b)} = ${fmt(ans)}.`],
      hints: ['Susun ke bawah. Mulai dari satuan, lalu puluhan, lalu ratusan.', `Satuan: ${a % 10} + ${b % 10} = □ (simpan □). Puluhan: ${Math.floor(a / 10) % 10} + ${Math.floor(b / 10) % 10} + simpanan = □. Ratusan: ...`],
      polaSalah: [] };
  };

  GEN.kurang3 = (r, t) => {
    let a, b, g = 0;
    do { a = int(r, 300 + T(t, 0, 300), 999); b = int(r, 110, a - 40); } while (borrows(a, b) < 2 && g++ < 500);
    const ans = a - b;
    return { form: 'int', carryKind: 'pinjam', carries: borrows(a, b), question: `${fmt(a)} - ${fmt(b)} = ...`, answer: ans,
      steps: [`Satuan: ${a % 10} kurang dari ${b % 10}, pinjam 1 puluhan. ${(a % 10) + 10} - ${b % 10} = ${((a % 10) + 10) - (b % 10)}.`, `Puluhan dan ratusan dihitung dengan memperhitungkan yang sudah dipinjam.`, `Jadi ${fmt(a)} - ${fmt(b)} = ${fmt(ans)}.`, `Cek: ${fmt(ans)} + ${fmt(b)} = ${fmt(a)}.`],
      hints: ['Susun ke bawah. Kalau angka atas lebih kecil, pinjam dari angka di sebelah kirinya.', `Satuan: (${a % 10} + 10) - ${b % 10} = □. Puluhan: ingat sudah dipinjam 1. Ratusan: ...`],
      polaSalah: [] };
  };

  GEN.cerita2 = (r, t) => {
    const it = r.pick(ITEM), start = int(r, 150, 400 + T(t, 0, 200)), use = int(r, 60, 150), plus = int(r, 50, 150);
    const first = r.next() < 0.5; // urutan: pakai dulu, lalu dapat; atau dapat dulu, lalu pakai
    const ans = start - use + plus;
    const q = first
      ? `Benteng punya ${fmt(start)} ${it}. Dipakai ${fmt(use)}, lalu dapat ${fmt(plus)} lagi. Berapa ${it} sekarang?`
      : `Benteng punya ${fmt(start)} ${it}. Dapat ${fmt(plus)} lagi, lalu dipakai ${fmt(use)}. Berapa ${it} sekarang?`;
    const steps = first
      ? [`Dipakai: ${fmt(start)} - ${fmt(use)} = ${fmt(start - use)}.`, `Dapat lagi: ${fmt(start - use)} + ${fmt(plus)} = ${fmt(ans)}.`]
      : [`Dapat lagi: ${fmt(start)} + ${fmt(plus)} = ${fmt(start + plus)}.`, `Dipakai: ${fmt(start + plus)} - ${fmt(use)} = ${fmt(ans)}.`];
    return { form: 'int', carryKind: null, carries: 0, question: q, answer: ans, steps: steps.concat([`Jadi ${it} sekarang ada ${fmt(ans)}.`]),
      hints: ['Baca pelan-pelan. Ada dua kejadian, hitung satu per satu sesuai urutan cerita.', first ? `${fmt(start)} - ${fmt(use)} = □, lalu □ + ${fmt(plus)} = ?` : `${fmt(start)} + ${fmt(plus)} = □, lalu □ - ${fmt(use)} = ?`],
      polaSalah: [{ ans: start - use, msg: 'Kamu baru menghitung satu kejadian. Baca lagi ceritanya.' }, { ans: start + plus, msg: 'Kamu baru menghitung satu kejadian. Baca lagi ceritanya.' },
        { ans: start + use + plus, msg: 'Yang dipakai itu mengurangi, bukan menambah.' }] };
  };

  GEN.kelompokTambah = (r, t) => {
    const k = int(r, 3, 6 + T(t, 0, 3)), m = int(r, 4, 9), extra = int(r, 11, 29), it = r.pick(['bintang', 'kristal', 'anak panah']);
    const ans = k * m + extra;
    return { form: 'int', carryKind: null, carries: 0, question: `${k} menara masing-masing menyimpan ${m} ${it}, ditambah ${extra} ${it} yang baru jatuh. Berapa semua ${it}?`, answer: ans,
      steps: [`${k} menara × ${m} = ${k * m}.`, `Ditambah ${extra}: ${k * m} + ${extra} = ${ans}.`, `Jadi ada ${ans} ${it}.`],
      hints: ['Hitung dulu isi semua menara, baru tambahkan yang jatuh.', `${k} ${X} ${m} = □, lalu □ + ${extra} = ?`],
      polaSalah: [{ ans: k * m, msg: 'Jangan lupa menambahkan yang baru jatuh.' }, { ans: k + m + extra, msg: 'Banyak menara itu pengali, bukan ditambah.' }] };
  };

  // ---- Kelas 3 ----
  GEN.kali21 = (r, t) => {
    let a, b, g = 0;
    do { a = int(r, 23, 59 + T(t, 0, 40)); b = int(r, 3, 9); } while ((a % 10) * b < 10 && g++ < 200);
    const ans = a * b, tens = Math.floor(a / 10), u = a % 10;
    return { form: 'int', carryKind: 'simpan', carries: 1, question: `${a} ${X} ${b} = ...`, answer: ans,
      steps: [`Satuan: ${u} ${X} ${b} = ${u * b}, tulis ${(u * b) % 10}, simpan ${Math.floor((u * b) / 10)}.`, `Puluhan: ${tens} ${X} ${b} = ${tens * b}, ditambah simpanan ${Math.floor((u * b) / 10)} = ${tens * b + Math.floor((u * b) / 10)}.`, `Jadi ${a} ${X} ${b} = ${ans}.`],
      hints: ['Pisahkan puluhan dan satuan, kalikan masing-masing, lalu gabungkan.', `${tens * 10} ${X} ${b} = □ dan ${u} ${X} ${b} = □, lalu jumlahkan keduanya.`],
      polaSalah: [] };
  };

  GEN.bagiSisa = (r, t) => {
    const d = int(r, 3, 9), q = int(r, 6, 11 + T(t, 0, 4)), rem = int(r, 1, d - 1), n = d * q + rem;
    return { form: 'rem', carryKind: null, carries: 0, divisor: d, question: `${n} ${BAGI} ${d} = ... sisa ...`, answer: { q, r: rem },
      steps: [`${d} ${X} ${q} = ${d * q}, itu yang paling dekat dengan ${n} tanpa melewatinya.`, `Sisanya ${n} - ${d * q} = ${rem}.`, `Jadi ${n} ${BAGI} ${d} = ${q} sisa ${rem}.`, `Cek: ${d} ${X} ${q} + ${rem} = ${n}.`],
      hints: [`Cari kelipatan ${d} yang paling dekat dengan ${n}, tetapi tidak lebih besar.`, `${d} ${X} □ = □ (paling dekat ke ${n}). Sisa = ${n} - □.`],
      polaSalah: [] };
  };

  GEN.kurangNol = (r, t) => {
    const base = r.pick([1000, 1000, 2000, 3000].slice(0, 2 + (t > 1 ? 2 : 0)));
    let x, g = 0;
    do { x = int(r, 111, 999); } while ((x % 10 === 0 || Math.floor(x / 10) % 10 === 0) && g++ < 200);
    const ans = base - x;
    return { form: 'int', carryKind: 'pinjam', carries: borrows(base, x), question: `${fmt(base)} - ${x} = ...`, answer: ans,
      steps: [`Angka nol tidak bisa dipinjami, jadi pinjam dari angka paling kiri yang bukan nol.`, `Cara cepat: ${fmt(base)} - ${x} = (${fmt(base - 1)} - ${x}) + 1.`, `${fmt(base - 1)} - ${x} = ${fmt(base - 1 - x)}, ditambah 1 = ${fmt(ans)}.`],
      hints: ['Ada nol berderet, susah dipinjami. Pinjam dari angka kiri yang bukan nol, atau kurangi dulu dengan 1 lebih kecil.', `${fmt(base - 1)} - ${x} = □, lalu □ + 1 = ?`],
      polaSalah: [] };
  };

  GEN.uang = (r, t) => {
    const n = int(r, 2, 5), price = 500 * int(r, 2, 7), total = n * price;
    const paid = r.pick([5000, 10000, 20000]);
    if (paid <= total) return GEN.uang(r, t);
    const it = r.pick(['ramuan', 'tameng kecil', 'panah api', 'jimat']);
    return { form: 'int', unit: 'Rp', carryKind: null, carries: 0, question: `Beli ${n} ${it} @${fmtRp(price)}, bayar ${fmtRp(paid)}. Berapa kembaliannya?`, answer: paid - total,
      steps: [`Harga semua: ${n} ${X} ${fmtRp(price)} = ${fmtRp(total)}.`, `Kembalian: ${fmtRp(paid)} - ${fmtRp(total)} = ${fmtRp(paid - total)}.`],
      hints: [`Hitung dulu harga ${n} ${it}, baru kurangkan dari uang yang dibayar.`, `${n} ${X} ${fmt(price)} = □, lalu ${fmt(paid)} - □ = ?`],
      polaSalah: [{ ans: total, msg: 'Itu total harganya, bukan kembaliannya.' }, { ans: paid - price, msg: `Kamu baru menghitung 1 ${it}. Ada ${n}.` }] };
  };

  GEN.lamaWaktu = (r, t) => {
    const sh = int(r, 6, 11), sm = 5 * int(r, 1, 11), dh = int(r, 1, 2), dm = 5 * int(r, 3, 11);
    const tot = sh * 60 + sm + dh * 60 + dm, h = Math.floor(tot / 60), m = tot % 60;
    const cross = sm + dm >= 60;
    if (t >= 1 && !cross) return GEN.lamaWaktu(r, t);
    const tail = cross ? [`Menit: ${sm} + ${dm} = ${sm + dm}, lebih dari 60 jadi tambah 1 jam, sisa ${sm + dm - 60} menit.`] : [`Menit: ${sm} + ${dm} = ${sm + dm}.`];
    return { form: 'time', carryKind: null, carries: 0, question: `Berangkat pukul ${clock(sh, sm)}, perjalanan ${dh} jam ${dm} menit. Tiba pukul berapa? (jj.mm)`, answer: { h, m },
      steps: [`Jam: ${sh} + ${dh} = ${sh + dh}.`].concat(tail, [`Tiba pukul ${clock(h, m)}.`]),
      hints: ['Tambahkan jamnya dulu, lalu tambahkan menitnya. Ingat 60 menit = 1 jam.', `${sh} jam + ${dh} jam = □ jam. ${sm} menit + ${dm} menit = □ menit (kalau lewat 60, jadi 1 jam lagi).`],
      polaSalah: cross ? [{ ans: { h: sh + dh, m: (sm + dm) % 60 }, msg: 'Menitmu lewat 60. Ingat 1 jam = 60 menit, tambahkan ke jam.' }] : [] };
  };

  // ---- Kelas 4 ----
  GEN.kali22 = (r, t) => {
    const a = int(r, 12, 39 + T(t, 0, 50)), b = int(r, 11, 39);
    const ans = a * b, b1 = b % 10, b10 = Math.floor(b / 10) * 10;
    return { form: 'int', carryKind: 'simpan', carries: 1, question: `${a} ${X} ${b} = ...`, answer: ans,
      steps: [`${a} ${X} ${b1} = ${a * b1}.`, `${a} ${X} ${b10} = ${a * b10}.`, `Jumlahkan: ${a * b1} + ${a * b10} = ${ans}.`],
      hints: [`Pisah ${b} menjadi ${b10} + ${b1}. Kalikan ${a} dengan masing-masing.`, `${a} ${X} ${b10} = □, ${a} ${X} ${b1} = □, lalu □ + □ = ?`],
      polaSalah: [{ ans: a * b1 + a * Math.floor(b / 10), msg: 'Perkalian dengan puluhan harus digeser satu tempat (dikali 10).' }] };
  };

  GEN.bagi3 = (r, t) => {
    let d, q, n, g = 0;
    do { d = int(r, 2, 4 + T(t, 0, 5)); q = int(r, 110, 330); n = d * q; } while (n > 999 && g++ < 200);
    return { form: 'int', carryKind: null, carries: 0, question: `${n} ${BAGI} ${d} = ...`, answer: q,
      steps: [`Bagi ratusan, puluhan, lalu satuan satu per satu sambil membawa sisanya.`, `Hasil: ${n} ${BAGI} ${d} = ${q}.`, `Cek: ${d} ${X} ${q} = ${n}.`],
      hints: [`Bagi dari angka paling kiri. Sisa tiap langkah dibawa ke angka berikutnya.`, `Pecah ${n} jadi bagian yang mudah dibagi ${d}, lalu jumlahkan hasil bagi tiap bagian.`],
      polaSalah: [] };
  };

  GEN.pecahanDari = (r, t) => {
    const den = r.pick([3, 4, 5, 6, 8]), num = r.pick([2, 3, 4, 5, 7].filter((x) => x < den && gcd(x, den) === 1)), q = int(r, 4, 9 + T(t, 0, 6)), n = den * q;
    const m = r.pick(MONSTER);
    return { form: 'int', carryKind: null, carries: 0, question: `${num}/${den} dari ${n} ${m} adalah ... ${m}.`, answer: num * q,
      steps: [`1/${den} dari ${n} = ${n} ${BAGI} ${den} = ${q}.`, `${num}/${den} = ${num} ${X} ${q} = ${num * q}.`],
      hints: [`Cari dulu 1/${den} dari ${n}, lalu kalikan dengan ${num}.`, `${n} ${BAGI} ${den} = □, lalu □ ${X} ${num} = ?`],
      polaSalah: [{ ans: q, msg: `Itu baru 1/${den}-nya. Kamu perlu ${num}/${den}.` }] };
  };

  GEN.kelilingLuas = (r, t) => {
    const p = int(r, 12, 24 + T(t, 0, 10)), l = int(r, 8, p - 2), kind = r.pick(['luas', 'keliling', 'luasKurang']);
    if (kind === 'keliling') return { form: 'int', carryKind: null, carries: 0, question: `Taman berbentuk persegi panjang, panjang ${p} m dan lebar ${l} m. Berapa meter pagar untuk mengelilinginya?`, answer: 2 * (p + l),
      steps: [`Panjang + lebar = ${p} + ${l} = ${p + l}.`, `Keliling = 2 ${X} ${p + l} = ${2 * (p + l)} m.`],
      hints: ['Pagar mengelilingi taman, jadi itu keliling: dua panjang dan dua lebar.', `${p} + ${l} = □, lalu □ ${X} 2 = ?`],
      polaSalah: [{ ans: p * l, msg: 'Itu luas. Yang ditanya panjang pagar (keliling).' }, { ans: p + l, msg: 'Itu baru separuh keliling. Ada dua panjang dan dua lebar.' }] };
    if (kind === 'luas') return { form: 'int', carryKind: null, carries: 0, question: `Taman berbentuk persegi panjang, panjang ${p} m dan lebar ${l} m. Berapa luasnya (m²)?`, answer: p * l,
      steps: [`Luas = panjang ${X} lebar = ${p} ${X} ${l}.`, `${p} ${X} ${Math.floor(l / 10) * 10} = ${p * Math.floor(l / 10) * 10}, ${p} ${X} ${l % 10} = ${p * (l % 10)}.`, `Jumlahkan: ${p * l} m².`],
      hints: ['Luas persegi panjang = panjang ' + X + ' lebar.', `${p} ${X} ${l}: pisah ${l} jadi ${Math.floor(l / 10) * 10} + ${l % 10}.`],
      polaSalah: [{ ans: 2 * (p + l), msg: 'Itu keliling. Yang ditanya luas.' }] };
    const d = int(r, 3, Math.min(6, p - 7));
    const w = p - d;
    return { form: 'int', carryKind: null, carries: 0, question: `Panjang taman ${p} m, lebarnya ${d} m lebih pendek dari panjang. Berapa luas taman (m²)?`, answer: p * w,
      steps: [`Lebar = ${p} - ${d} = ${w} m.`, `Luas = ${p} ${X} ${w} = ${p * w} m².`],
      hints: ['Cari dulu lebarnya, baru hitung luas.', `${p} - ${d} = □, lalu ${p} ${X} □ = ?`],
      polaSalah: [{ ans: p * d, msg: `${d} itu selisihnya, bukan lebarnya. Cari lebar dulu.` }] };
  };

  const KPK = []; // pasangan yang tidak saling membagi, diurutkan dari KPK terkecil
  for (let a = 3; a <= 12; a++) for (let b = a + 1; b <= 15; b++) if (b % a !== 0 && lcm(a, b) <= 60) KPK.push([a, b]);
  KPK.sort((x, y) => lcm(x[0], x[1]) - lcm(y[0], y[1]) || x[0] - y[0]);
  GEN.kpk = (r, t) => {
    const [a, b] = r.pick(KPK.slice(0, Math.round(KPK.length * (t + 1) / 4))), L = lcm(a, b);
    const ma = [], mb = [];
    for (let k = 1; k * a <= L; k++) ma.push(k * a);
    for (let k = 1; k * b <= L; k++) mb.push(k * b);
    return { form: 'int', carryKind: null, carries: 0, question: `Menara A menembak tiap ${a} detik, menara B tiap ${b} detik. Keduanya menembak bersamaan sekarang. Setelah berapa detik mereka pertama kali menembak bersamaan lagi?`, answer: L,
      steps: [`Tembakan A: ${ma.join(', ')}.`, `Tembakan B: ${mb.join(', ')}.`, `Angka pertama yang sama: ${L}. Jadi ${L} detik.`],
      hints: ['Tuliskan kelipatan kedua angka. Cari angka pertama yang muncul di keduanya (KPK).', `Kelipatan ${a}: ${a}, ${2 * a}, ${3 * a}, ... Kelipatan ${b}: ${b}, ${2 * b}, ${3 * b}, ... Mana yang sama lebih dulu?`],
      polaSalah: [{ ans: a * b, msg: 'Itu memang bersamaan, tetapi ada yang lebih cepat. Cari kelipatan persekutuan terkecil.' }, { ans: a + b, msg: 'Jangan dijumlahkan. Cari kelipatan yang sama.' }] };
  };

  // ---- Kelas 5 ----
  GEN.kali32 = (r, t) => {
    const a = int(r, 120, 299 + T(t, 0, 200)), b = int(r, 12, 49);
    const b1 = b % 10, b10 = Math.floor(b / 10) * 10, ans = a * b;
    return { form: 'int', carryKind: 'simpan', carries: 2, question: `${fmt(a)} ${X} ${b} = ...`, answer: ans,
      steps: [`${fmt(a)} ${X} ${b1} = ${fmt(a * b1)}.`, `${fmt(a)} ${X} ${b10} = ${fmt(a * b10)}.`, `Jumlahkan: ${fmt(a * b1)} + ${fmt(a * b10)} = ${fmt(ans)}.`],
      hints: [`Pisah ${b} menjadi ${b10} + ${b1}. Kalikan ${fmt(a)} dengan masing-masing lalu jumlahkan.`, `${fmt(a)} ${X} ${b1} = □, ${fmt(a)} ${X} ${b10} = □, lalu jumlahkan.`],
      polaSalah: [{ ans: a * b1 + a * Math.floor(b / 10), msg: 'Perkalian dengan puluhan harus digeser satu tempat (dikali 10).' }] };
  };

  GEN.bagi42 = (r, t) => {
    let d, q, n, g = 0;
    do { d = int(r, 12, 24 + T(t, 0, 11)); q = int(r, 30, 95); n = d * q; } while ((n < 1000 || n > 9999) && g++ < 200);
    return { form: 'int', carryKind: null, carries: 0, question: `${fmt(n)} ${BAGI} ${d} = ...`, answer: q,
      steps: [`Tebak dulu, lalu cek dengan perkalian: ${d} ${X} ${q} = ${fmt(n)}.`, `Jadi ${fmt(n)} ${BAGI} ${d} = ${q}.`],
      hints: [`Bagi dari kiri. Kira-kira ${d} muat berapa kali di angka depan ${fmt(n)}? Cek dengan perkalian.`, `${d} ${X} 10 = ${d * 10}, ${d} ${X} 50 = ${d * 50}, ... Cari yang paling mendekati ${fmt(n)}.`],
      polaSalah: [] };
  };

  GEN.pecahanTambah = (r, t) => {
    let b, d, g = 0;
    do { b = int(r, 2, 4 + T(t, 0, 3)); d = int(r, 2, 6 + T(t, 0, 2)); } while ((b === d || b % d === 0 || d % b === 0) && g++ < 200);
    const a = int(r, 1, b - 1), c = int(r, 1, d - 1), L = lcm(b, d);
    const n = a * (L / b) + c * (L / d);
    return { form: 'frac', carryKind: null, carries: 0, question: `${a}/${b} + ${c}/${d} = ... (tulis sebagai pecahan)`, answer: { n, d: L },
      steps: [`Samakan penyebut: KPK dari ${b} dan ${d} adalah ${L}.`, `${a}/${b} = ${a * (L / b)}/${L} dan ${c}/${d} = ${c * (L / d)}/${L}.`, `Jumlahkan: ${a * (L / b)}/${L} + ${c * (L / d)}/${L} = ${n}/${L}.`],
      hints: ['Penyebutnya harus sama dulu sebelum dijumlahkan. Cari KPK kedua penyebut.', `KPK ${b} dan ${d} = □. ${a}/${b} = □/□, ${c}/${d} = □/□. Lalu jumlahkan pembilangnya.`],
      polaSalah: [{ ans: { n: a + c, d: b + d }, msg: 'Penyebut tidak dijumlahkan. Samakan dulu penyebutnya.' }] };
  };

  GEN.persen = (r, t) => {
    const p = r.pick([10, 20, 25, 30, 40, 60, 75, 15].slice(0, 5 + T(t, 0, 3)));
    const step = p % 10 === 0 ? 10 : 20, n = step * int(r, 5, 40 + T(t, 0, 20)), m = r.pick(MONSTER);
    const ans = (n * p) / 100;
    const steps = p % 10 === 0 ? [`10% dari ${n} = ${n / 10}.`, `${p}% = ${p / 10} ${X} 10% = ${p / 10} ${X} ${n / 10} = ${ans}.`]
      : p === 25 || p === 75 ? [`25% = 1/4, jadi 25% dari ${n} = ${n} ${BAGI} 4 = ${n / 4}.`, p === 25 ? `Jadi ${ans}.` : `75% = 3 ${X} 25% = 3 ${X} ${n / 4} = ${ans}.`]
        : [`10% dari ${n} = ${n / 10}, 5% = ${n / 20}.`, `15% = ${n / 10} + ${n / 20} = ${ans}.`];
    return { form: 'int', carryKind: null, carries: 0, question: `Ada ${fmt(n)} ${m} di medan perang. ${p}% di antaranya sudah kabur. Berapa ${m} yang kabur?`, answer: ans, steps,
      hints: ['Persen artinya per seratus. Cari 10% dulu (bagi 10), atau pakai pecahan yang setara.', p % 10 === 0 ? `10% dari ${n} = □, lalu ${p / 10} ${X} □ = ?` : p === 15 ? `10% = □, 5% = setengah dari 10%, lalu jumlahkan.` : `${p}% = ${p / 25}/4. Bagi ${n} dengan 4, lalu kalikan ${p / 25}.`],
      polaSalah: [{ ans: n / 10, msg: 'Itu baru 10%. Bandingkan dengan persen yang diminta.' }, { ans: n - ans, msg: 'Itu yang tersisa. Yang ditanya yang kabur.' }] };
  };

  GEN.rataRata = (r, t) => {
    const cnt = int(r, 4, 5), m = int(r, 28, 60 + T(t, 0, 10));
    let vals = [], g = 0;
    do { // simpangan dari rata-rata dibuat acak, simpangan terakhir menutup selisih supaya jumlahnya pas
      const dev = Array.from({ length: cnt - 1 }, () => int(r, -12, 12));
      dev.push(-dev.reduce((x, y) => x + y, 0));
      vals = dev.map((d) => m + d);
    } while ((Math.max(...vals) - m > 20 || m - Math.min(...vals) > 20 || vals.every((v) => v === m)) && g++ < 500);
    const sum = vals.reduce((x, y) => x + y, 0), mon = r.pick(MONSTER);
    return { form: 'int', carryKind: null, carries: 0, question: `Gelombang 1 sampai ${cnt} berisi ${vals.join(', ')} ${mon}. Berapa rata-rata ${mon} tiap gelombang?`, answer: m,
      steps: [`Jumlahkan semua: ${vals.join(' + ')} = ${sum}.`, `Bagi dengan banyak gelombang: ${sum} ${BAGI} ${cnt} = ${m}.`],
      hints: ['Rata-rata = jumlah semua dibagi banyaknya data.', `${vals.join(' + ')} = □, lalu □ ${BAGI} ${cnt} = ?`],
      polaSalah: [{ ans: sum, msg: `Itu jumlahnya. Bagi dengan ${cnt} untuk rata-rata.` }] };
  };

  GEN.volume = (r, t) => {
    const p = int(r, 6, 12 + T(t, 0, 5)), l = int(r, 4, 10), h = int(r, 3, 9);
    return { form: 'int', carryKind: null, carries: 0, question: `Peti harta berbentuk balok: panjang ${p} cm, lebar ${l} cm, tinggi ${h} cm. Berapa volumenya (cm³)?`, answer: p * l * h,
      steps: [`Luas alas = ${p} ${X} ${l} = ${p * l}.`, `Volume = ${p * l} ${X} ${h} = ${p * l * h} cm³.`],
      hints: ['Volume balok = panjang ' + X + ' lebar ' + X + ' tinggi. Kalikan dua dulu, baru yang ketiga.', `${p} ${X} ${l} = □, lalu □ ${X} ${h} = ?`],
      polaSalah: [{ ans: p * l, msg: 'Itu luas alas. Kalikan lagi dengan tingginya.' }, { ans: 2 * (p * l + p * h + l * h), msg: 'Itu luas permukaan. Yang ditanya volume.' }] };
  };

  GEN.kecepatan = (r, t) => {
    const v = r.pick([40, 50, 60, 70, 80, 90]), h = int(r, 2, 5), ans = v * h + v / 2;
    return { form: 'int', carryKind: null, carries: 0, question: `Naga terbang ${v} km/jam selama ${h} jam 30 menit. Berapa km jarak yang ditempuhnya?`, answer: ans,
      steps: [`${h} jam: ${v} ${X} ${h} = ${v * h} km.`, `30 menit = setengah jam: ${v} ${BAGI} 2 = ${v / 2} km.`, `Jumlahkan: ${v * h} + ${v / 2} = ${ans} km.`],
      hints: ['Jarak = kecepatan ' + X + ' waktu. 30 menit adalah setengah jam.', `${v} ${X} ${h} = □, ${v} ${BAGI} 2 = □, lalu jumlahkan.`],
      polaSalah: [{ ans: v * h, msg: 'Kamu belum menghitung 30 menit terakhir.' }, { ans: v * (h + 30), msg: '30 menit itu setengah jam, bukan 30 jam.' }] };
  };

  const META = [
    ['tambah3', 2, 'Penjumlahan bersusun 3 angka'], ['kurang3', 2, 'Pengurangan bersusun meminjam'], ['cerita2', 2, 'Cerita 2 langkah'], ['kelompokTambah', 2, 'Perkalian kelompok + tambah'],
    ['kali21', 3, 'Perkalian 2 angka x 1 angka'], ['bagiSisa', 3, 'Pembagian bersisa'], ['kurangNol', 3, 'Pengurangan melewati nol'], ['uang', 3, 'Cerita uang'], ['lamaWaktu', 3, 'Lama waktu'],
    ['kali22', 4, 'Perkalian 2 angka x 2 angka'], ['bagi3', 4, 'Pembagian 3 angka : 1 angka'], ['pecahanDari', 4, 'Pecahan dari jumlah'], ['kelilingLuas', 4, 'Keliling dan luas'], ['kpk', 4, 'KPK dalam cerita'],
    ['kali32', 5, 'Perkalian 3 angka x 2 angka'], ['bagi42', 5, 'Pembagian 4 angka : 2 angka'], ['pecahanTambah', 5, 'Penjumlahan pecahan beda penyebut'], ['persen', 5, 'Persen'], ['rataRata', 5, 'Rata-rata'],
    ['volume', 5, 'Volume'], ['kecepatan', 5, 'Kecepatan, jarak, waktu'],
  ];
  const TEMPLATES = META.map(([id, grade, title]) => ({ id, grade, title, form: null }));
  const FORM_OF = {};

  // ===== Membaca & memeriksa jawaban =====
  // Terima angka, string ("1.234", "13 sisa 4", "17/12", "10.20"), atau objek ({q,r} / {n,d} / {h,m}).
  function parseInput(form, input) {
    if (input == null) return null;
    const digits = (s) => (/^\d+$/.test(s) ? Number(s) : null);
    if (form === 'int') {
      if (typeof input === 'number') return Number.isFinite(input) ? input : null;
      const s = String(input).replace(/[.\s]/g, '').replace(/^Rp/i, '');
      return digits(s);
    }
    if (form === 'rem') {
      if (typeof input === 'object') return Number.isInteger(input.q) && Number.isInteger(input.r) ? { q: input.q, r: input.r } : null;
      const m = /^\s*(\d+)\s*(?:sisa|r|,)?\s*(\d+)\s*$/i.exec(String(input));
      return m ? { q: Number(m[1]), r: Number(m[2]) } : null;
    }
    if (form === 'frac') {
      if (typeof input === 'object') return Number.isInteger(input.n) && Number.isInteger(input.d) ? { n: input.n, d: input.d } : null;
      const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(input));
      return m ? { n: Number(m[1]), d: Number(m[2]) } : null;
    }
    if (form === 'time') {
      if (typeof input === 'object') return Number.isInteger(input.h) && Number.isInteger(input.m) ? { h: input.h, m: input.m } : null;
      const m = /^\s*(\d{1,2})\s*[.:]\s*(\d{1,2})\s*$/.exec(String(input));
      return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
    }
    return null;
  }
  function same(form, a, b) {
    if (a == null || b == null) return false;
    if (form === 'int') return a === b;
    if (form === 'rem') return a.q === b.q && a.r === b.r;
    if (form === 'frac') return a.d > 0 && b.d > 0 && a.n * b.d === b.n * a.d; // pecahan setara diterima
    if (form === 'time') return a.m === b.m && a.h % 12 === b.h % 12 && a.m < 60;
    return false;
  }
  function check(problem, input) {
    const v = parseInput(problem.form, input);
    return v != null && same(problem.form, v, problem.answer);
  }
  // Pesan bertarget untuk salah umum (gratis, tidak dihitung petunjuk). null jika tidak dikenali.
  function wrongMessage(problem, input) {
    const v = parseInput(problem.form, input);
    if (v == null || check(problem, input)) return null;
    for (const p of problem.polaSalah) if (same(problem.form, v, p.ans)) return p.msg;
    if (problem.form === 'rem' && v.r >= problem.divisor) return 'Sisa harus lebih kecil dari pembagi. Coba bagi lagi.';
    if (problem.form === 'rem' && v.q * problem.divisor + v.r === problem.divisor * problem.answer.q + problem.answer.r) return 'Hasil dan sisanya belum tepat. Cek lagi sisanya.';
    if (problem.form === 'frac' && v.d <= 0) return 'Penyebut tidak boleh nol.';
    if (problem.form === 'int' && problem.carryKind) {
      const d = Math.abs(v - problem.answer);
      if (d === 10 || d === 100) return problem.carryKind === 'simpan' ? 'Coba cek simpanannya.' : 'Coba cek pinjamannya.';
    }
    return null;
  }
  function answerText(problem) {
    const a = problem.answer;
    if (problem.form === 'int') return problem.unit === 'Rp' ? fmtRp(a) : fmt(a);
    if (problem.form === 'rem') return `${a.q} sisa ${a.r}`;
    if (problem.form === 'frac') return `${a.n}/${a.d}`;
    return clock(a.h, a.m);
  }

  // ===== Pembuatan soal =====
  function generate(id, seed, tier) {
    if (!GEN[id]) throw new Error('templat PR tidak dikenal: ' + id);
    tier = Math.max(0, Math.min(3, tier | 0)); seed = seed >>> 0;
    const base = GEN[id](rng(seed), tier);
    const grade = META.find((m) => m[0] === id)[1];
    const p = Object.assign({ id, grade, tier, seed }, base);
    p.hints = p.hints.slice(0, 2);
    p.polaSalah = p.polaSalah.filter((w) => !same(p.form, w.ans, p.answer)); // salah umum yang kebetulan benar dibuang
    // Contoh mirip: soal sejenis dengan angka lain, langkahnya lengkap. Jawaban soal asli tidak dibocorkan.
    p.similar = () => {
      for (let k = 1; k <= 50; k++) {
        const q = GEN[id](rng((Math.imul(seed, 2654435761) + k * 7919) >>> 0), tier);
        if (q.question !== p.question && JSON.stringify(q.answer) !== JSON.stringify(p.answer)) return { question: q.question, steps: q.steps };
      }
      throw new Error('contoh mirip gagal: ' + id);
    };
    p.check = (input) => check(p, input);
    p.wrongMessage = (input) => wrongMessage(p, input);
    return p;
  }
  const byGrade = (g) => TEMPLATES.filter((t) => t.grade === g);
  // Pilih templat untuk kelas+tier, hindari yang baru dipakai (recent = daftar id terakhir).
  function pick(grade, tier, seed, recent) {
    const list = byGrade(grade);
    if (!list.length) throw new Error('kelas tidak dikenal: ' + grade);
    const r = rng(seed >>> 0), avoid = recent || [];
    const pool = list.filter((t) => !avoid.includes(t.id));
    const t = (pool.length ? pool : list)[Math.floor(r.next() * (pool.length ? pool.length : list.length))];
    return generate(t.id, (seed + 1) >>> 0, tier);
  }

  for (const t of TEMPLATES) { FORM_OF[t.id] = generate(t.id, 1, 0).form; t.form = FORM_OF[t.id]; }

  return { X, BAGI, fmt, fmtRp, gcd, lcm, rng, carries, borrows, TEMPLATES, byGrade, generate, pick, check, parseInput, wrongMessage, answerText };
});
