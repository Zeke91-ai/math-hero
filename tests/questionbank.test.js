// Uji bank soal kit:  node tests/questionbank.test.js
// Semua keterampilan dari tiga pembuat soal lama harus menghasilkan soal baku yang benar, deterministik per seed,
// dan tidak mengubah Math.random global. Tingkat adaptif harus sama dengan aturan lama di mh3/progress.js.
const assert = require('assert');
const Bank = require('../public/shared/js/questionbank.js');
const MathQuiz = require('../public/js/math.js');
const Concepts = require('../public/shared/js/concepts.js');
const Homework = require('../public/mh3/js/homework.js');
const Progress = require('../public/mh3/js/progress.js');
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, 'GAGAL: ' + m); console.log('ok: ' + m); };

Bank.useMathQuiz(MathQuiz);
Bank.useConcepts(Concepts);
Bank.useHomework(Homework);
const all = Bank.skills();
ok(all.length === 4 + 5 + Homework.TEMPLATES.length, `katalog memuat ${all.length} keterampilan`);
ok(new Set(all.map((s) => s.id)).size === all.length, 'id keterampilan unik');
ok(Bank.skills({ kelas: 2 }).length > 0 && Bank.skills({ kelas: 5 }).every((s) => s.kelas[0] <= 5 && s.kelas[1] >= 5), 'filter kelas');
ok(Bank.skills({ sumber: 'mh3' }).length === Homework.TEMPLATES.length, 'filter sumber');
assert.throws(() => Bank.soal('tidak.ada', 1, Bank.rng(1)), /tidak dikenal/);
ok(true, 'keterampilan tak dikenal ditolak');

// Setiap keterampilan, setiap tingkat, 25 seed: soal baku lengkap dan jawaban benar menurut periksa().
let jumlah = 0;
for (const s of all) {
  for (let t = s.tingkat[0]; t <= s.tingkat[1]; t++) {
    for (let seed = 1; seed <= 25; seed++) {
      const q = Bank.soalSeed(s.id, t, seed);
      jumlah++;
      assert.strictEqual(q.skill, s.id); assert.strictEqual(q.tingkat, t); assert.strictEqual(q.bentuk, s.bentuk);
      assert.ok(typeof q.teks === 'string' && q.teks.length > 3, `${s.id}: teks`);
      assert.ok(q.langkah.length >= 1 && q.langkah.every((x) => typeof x === 'string' && x), `${s.id}: langkah`);
      assert.ok(q.jawaban !== undefined && q.jawaban !== null && !(typeof q.jawaban === 'number' && !Number.isFinite(q.jawaban)), `${s.id}: jawaban`);
      if (q.pilihan) {
        assert.ok(q.pilihan.includes(q.jawaban), `${s.id} t${t} seed ${seed}: jawaban ada di pilihan`);
        assert.strictEqual(new Set(q.pilihan).size, q.pilihan.length, `${s.id}: pilihan unik`);
        assert.ok(q.pilihan.every((v) => v >= 0), `${s.id}: pilihan tidak negatif`);
      }
      // Aturan desain: jawaban tidak negatif, dan angka kecil di tingkat awal (hasil sampai 20 untuk garis bilangan, penjumlahan, dan kurang).
      if (q.bentuk === 'int') assert.ok(q.jawaban >= 0, `${s.id}: jawaban tidak negatif`);
      if (/^garis\.(tambah|kurang|hilang)$/.test(s.id) && t === 1) assert.ok(q.jawaban <= 10, `${s.id} tingkat 1: angka kecil`);
      if (q.bentuk === 'int') assert.ok(Bank.periksa(q, q.jawaban), `${s.id}: periksa jawaban benar`);
      else assert.ok(Bank.periksa(q, q.mentah.answerText ? q.mentah.answerText : Homework.answerText(q.mentah)), `${s.id}: periksa teks jawaban`);
      if (s.sumber === 'mh3') assert.ok(q.petunjuk.length === 2, `${s.id}: dua petunjuk`);
    }
  }
}
ok(true, `${jumlah} soal dari semua keterampilan dan tingkat valid`);

// Deterministik: seed sama = soal sama; seed beda umumnya beda.
for (const id of ['tambah.cerita', 'garis.puluhan', 'pr.tambah3', 'pr.bagiSisa']) {
  const a = JSON.stringify(Bank.soalSeed(id, 2, 42), (k, v) => (k === 'mentah' ? undefined : v));
  const b = JSON.stringify(Bank.soalSeed(id, 2, 42), (k, v) => (k === 'mentah' ? undefined : v));
  const c = new Set(Array.from({ length: 10 }, (_, i) => JSON.stringify(Bank.soalSeed(id, 2, 100 + i).teks))).size;
  assert.strictEqual(a, b, id + ' deterministik');
  assert.ok(c > 1, id + ' bervariasi menurut seed');
}
ok(true, 'seed sama menghasilkan soal sama, seed beda bervariasi');

// Math.random tidak bocor: dipulihkan setelah dipinjam, juga bila pembuat soal melempar galat.
{
  const asli = Math.random;
  Bank.soalSeed('tambah.cerita', 3, 7);
  assert.strictEqual(Math.random, asli);
  assert.throws(() => Bank.denganRng(Bank.rng(1), () => { throw new Error('x'); }), /x/);
  assert.strictEqual(Math.random, asli);
  ok(true, 'Math.random dipulihkan');
}

// Tingkat dijepit ke rentang keterampilan; periksa menolak jawaban salah dan masukan sampah.
{
  const q = Bank.soalSeed('kali.cerita', 99, 5);
  ok(q.tingkat === 5, 'tingkat di atas rentang dijepit');
  ok(!Bank.periksa(q, q.jawaban + 1) && !Bank.periksa(q, 'abc') && !Bank.periksa(q, ''), 'jawaban salah dan sampah ditolak');
  const h = Bank.soalSeed('pr.tambah3', 2, 9);
  ok(Bank.periksa(h, String(h.jawaban)) && !Bank.periksa(h, h.jawaban + 10), 'periksa PR memakai aturan pembuatnya');
}

// Tingkat adaptif umum sama dengan aturan MH3 lama untuk semua riwayat 0/1 sepanjang 0-7 dan tingkat dunia 0-3.
{
  let cocok = 0;
  for (let len = 0; len <= 7; len++) {
    for (let bits = 0; bits < (1 << len); bits++) {
      const recent = Array.from({ length: len }, (_, i) => (bits >> i) & 1);
      for (let base = 0; base <= 3; base++) {
        assert.strictEqual(Bank.adaptTier(recent.slice(-6), base), Progress.adaptTier({ recent: recent.slice(-6) }, base));
        cocok++;
      }
    }
  }
  ok(true, `adaptTier umum = progress.adaptTier pada ${cocok} kasus`);
  ok(Bank.catatBersih([1, 1, 1, 1, 1, 1], false).length === 6 && Bank.adaptTier([0, 0, 0], 2, [1, 5]) === 1, 'catatBersih dan batas tingkat kustom');
}
console.log(`semua uji bank soal lulus (${n} cek)`);
