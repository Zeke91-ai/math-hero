// Kit Math Hero: bank soal. Satu antarmuka untuk semua pembuat soal di seri mana pun:
//   Bank.soal(skill, tingkat, rng)  ->  soal bentuk baku
// Murni logika (tanpa DOM). Node: require('.../questionbank.js'); browser: window.MHKit.bank.
//
// Bentuk soal baku:
//   { skill, kelas, tingkat, sumber, bentuk: 'int'|'rem'|'frac'|'jam', teks, ekspresi, jawaban, pilihan (daftar atau null),
//     langkah: [penjelasan], petunjuk: [strategi], salah: [{ans, msg}], mentah: soal asli dari pembuatnya }
// RNG ber-seed: Bank.rng(seed) memberi { next, int, pick, shuffle }. Seed yang sama selalu menghasilkan soal yang sama,
// jadi soal bisa disimpan sebagai {skill, tingkat, seed} dan dilaporkan dengan nomornya.
//
// Pembuat soal lama (math.js MH1, concepts.js MH2/MH3, homework.js MH3) tidak diubah. Adaptor memasangnya ke katalog:
//   Bank.useMathQuiz(MathQuiz)   Bank.useConcepts(MH2Concepts)   Bank.useHomework(MH3Homework)
// Pembuat yang memakai Math.random diberi RNG ber-seed lewat Bank.denganRng (Math.random dipinjam sementara).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MHKit = root.MHKit || {}).bank = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  // ---------- RNG ber-seed (mulberry32, sama dengan homework.js) ----------
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
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return { next, int, pick, shuffle };
  }

  // Jalankan fn dengan Math.random diganti RNG ber-seed, lalu pulihkan (juga bila fn melempar galat).
  function denganRng(r, fn) {
    const asli = Math.random;
    Math.random = r.next;
    try { return fn(); } finally { Math.random = asli; }
  }

  // ---------- Pengecoh ----------
  function pengecoh(jawab, jumlah, r) {
    const ds = jawab >= 30 ? [1, 2, 3, 10] : [1, 2, 3];
    const set = new Set();
    let guard = 0;
    while (set.size < jumlah && guard++ < 300) {
      const v = jawab + (r.next() < 0.5 ? 1 : -1) * r.pick(ds);
      if (v !== jawab && v >= 0) set.add(v);
    }
    for (let k = 1; set.size < jumlah; k++) if (k !== 0 && !set.has(jawab + k)) set.add(jawab + k);
    return [...set];
  }
  const pilihanInt = (jawab, total, r) => r.shuffle([jawab, ...pengecoh(jawab, total - 1, r)]);

  // ---------- Katalog ----------
  // def: { id, kelas:[min,max], judul, bentuk, tingkat:[min,max], sumber, make(tingkat, r) -> bagian soal }
  const katalog = new Map();
  function register(def) {
    if (!def.id || typeof def.make !== 'function') throw new Error('keterampilan tanpa id atau make');
    if (katalog.has(def.id)) throw new Error('keterampilan sudah terdaftar: ' + def.id);
    katalog.set(def.id, Object.assign({ tingkat: [1, 5], kelas: [1, 1], bentuk: 'int' }, def));
    return def.id;
  }
  const keterampilan = (id) => {
    const d = katalog.get(id);
    if (!d) throw new Error('keterampilan tidak dikenal: ' + id);
    return d;
  };
  // Daftar keterampilan (tanpa fungsi). filter: { kelas, sumber }.
  function skills(filter) {
    const f = filter || {};
    return [...katalog.values()]
      .filter((d) => (f.kelas == null || (f.kelas >= d.kelas[0] && f.kelas <= d.kelas[1])) && (!f.sumber || d.sumber === f.sumber))
      .map((d) => ({ id: d.id, judul: d.judul, kelas: d.kelas.slice(), tingkat: d.tingkat.slice(), bentuk: d.bentuk, sumber: d.sumber }));
  }

  // Satu antarmuka untuk semua soal. tingkat dijepit ke rentang keterampilan itu.
  function soal(skill, tingkat, r) {
    const d = keterampilan(skill);
    const t = Math.max(d.tingkat[0], Math.min(d.tingkat[1], tingkat | 0 || d.tingkat[0]));
    const g = r || rng(1);
    const s = d.make(t, g);
    return Object.assign({
      skill: d.id, kelas: d.kelas.slice(), tingkat: t, sumber: d.sumber, bentuk: d.bentuk,
      ekspresi: null, pilihan: null, langkah: [], petunjuk: [], salah: [], mentah: null,
    }, s);
  }
  const soalSeed = (skill, tingkat, seed) => soal(skill, tingkat, rng(seed));

  // Periksa jawaban. Pembuat yang punya aturan sendiri (pecahan, sisa, jam) dipakai; selain itu bilangan bulat.
  function periksa(s, masukan) {
    if (s.mentah && typeof s.mentah.check === 'function') return !!s.mentah.check(masukan);
    const v = typeof masukan === 'number' ? masukan : Number(String(masukan).replace(/[Rp\s.]/g, '').replace(',', '.'));
    return Number.isFinite(v) && v === s.jawaban;
  }

  // ---------- Tingkat adaptif (dulu di mh3/progress.js) ----------
  // recent = hasil terakhir: 1 bersih (tanpa salah dan petunjuk), 0 tidak bersih. Tidak pernah menghukum:
  // turun 1 bila 3 terakhir berturut-turut belum bersih, naik 1 bila 6 terakhir semuanya bersih.
  const RECENT_MAX = 6, DROP_RUN = 3;
  function catatBersih(recent, bersih) { return (recent || []).concat(bersih ? 1 : 0).slice(-RECENT_MAX); }
  function adaptTier(recent, base, batas) {
    const lo = batas ? batas[0] : 0, hi = batas ? batas[1] : 3;
    const r = recent || [];
    let shift = 0;
    if (r.length >= DROP_RUN && r.slice(-DROP_RUN).every((x) => x === 0)) shift = -1;
    else if (r.length >= RECENT_MAX && r.every((x) => x === 1)) shift = 1;
    return Math.max(lo, Math.min(hi, (base | 0) + shift));
  }

  // ---------- Adaptor: MH1 math.js (soal cerita) ----------
  // tingkat 1-5 dipetakan ke level MH1: 1, 3, 5, 7, 8 (kelas 1, 2, 3, 4, 4).
  const LEVEL_MH1 = [1, 3, 5, 7, 8];
  function useMathQuiz(M) {
    const ops = [['tambah.cerita', 'add', 'Penjumlahan cerita'], ['kali.cerita', 'mul', 'Perkalian cerita'],
      ['bagi.cerita', 'div', 'Pembagian cerita'], ['kelompok.cerita', 'susun', 'Susun kelompok sama besar']];
    for (const [id, op, judul] of ops) {
      register({
        id, judul, sumber: 'mh1', kelas: [1, 4], tingkat: [1, 5], bentuk: 'int',
        make(t, r) {
          const q = denganRng(r, () => M.generate(op, LEVEL_MH1[t - 1]));
          return { teks: q.prompt, ekspresi: q.expr, jawaban: q.answer, pilihan: q.choices.slice(), langkah: q.explain.slice(), mentah: q };
        },
      });
    }
  }

  // ---------- Adaptor: concepts.js (garis bilangan, MH2/MH3) ----------
  // Hanya mode yang berbentuk satu soal dan satu jawaban. Mode lain (lari, tembak, balap, timbangan, ...) menghasilkan
  // konfigurasi permainan, bukan soal, jadi tetap di mode masing-masing.
  const GARIS = [
    ['garis.tambah', 'Garis bilangan: tambah', [1, 2], [{ kind: 'add', max: 10, bMax: 5 }, { kind: 'add', max: 15, bMax: 6 }, { kind: 'add', max: 20, bMax: 9 }]],
    ['garis.kurang', 'Garis bilangan: kurang', [1, 2], [{ kind: 'sub', max: 10, bMax: 5 }, { kind: 'sub', max: 15, bMax: 6 }, { kind: 'sub', max: 20, bMax: 9 }]],
    ['garis.hilang', 'Garis bilangan: angka yang hilang', [1, 2], [{ kind: 'missing', max: 10, bMax: 5 }, { kind: 'missing', max: 15, bMax: 6 }, { kind: 'missing', max: 20, bMax: 9 }]],
    ['garis.loncat', 'Garis bilangan: loncat kelipatan', [2, 3], [{ kind: 'skip', sMin: 2, sMax: 3, nMin: 2, nMax: 4 }, { kind: 'skip', sMin: 2, sMax: 5, nMin: 2, nMax: 5 }, { kind: 'skip', sMin: 3, sMax: 9, nMin: 3, nMax: 7 }]],
    ['garis.puluhan', 'Garis bilangan: lompat puluhan', [2, 2], [{ kind: 'tens', max: 60, bMin: 11, bMax: 25 }, { kind: 'tens', max: 100, bMin: 12, bMax: 35 }, { kind: 'tens', max: 100, bMin: 21, bMax: 48 }]],
  ];
  function useConcepts(C) {
    for (const [id, judul, kelas, cfgs] of GARIS) {
      register({
        id, judul, sumber: 'mh2', kelas, tingkat: [1, 3], bentuk: 'int',
        make(t, r) {
          const q = denganRng(r, () => C.numline(cfgs[t - 1]));
          return { teks: q.label, ekspresi: q.label, jawaban: q.answer, pilihan: pilihanInt(q.answer, 4, r), langkah: q.explain.slice(), mentah: q };
        },
      });
    }
  }

  // ---------- Adaptor: homework.js (PR MH3, kelas 2-5) ----------
  // tingkat 1-4 = tier 0-3. Soal sudah ber-seed; seed diambil dari RNG yang diberikan. Soal tanpa pilihan (diketik).
  function useHomework(H) {
    for (const t of H.TEMPLATES) {
      register({
        id: 'pr.' + t.id, judul: t.title, sumber: 'mh3', kelas: [t.grade, t.grade], tingkat: [1, 4], bentuk: t.form,
        make(tk, r) {
          const p = H.generate(t.id, Math.floor(r.next() * 4294967296) >>> 0, tk - 1);
          return { teks: p.question, ekspresi: p.question, jawaban: p.answer, langkah: p.steps.slice(), petunjuk: p.hints.slice(), salah: p.polaSalah.slice(), mentah: p };
        },
      });
    }
  }

  return { rng, denganRng, register, skills, soal, soalSeed, periksa, catatBersih, adaptTier, useMathQuiz, useConcepts, useHomework, pilihanInt };
});
