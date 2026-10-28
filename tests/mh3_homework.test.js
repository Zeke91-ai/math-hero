// Uji generator PR Math Hero 3:  node tests/mh3_homework.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../public/mh3/js/homework.js');

const SEEDS = 1000;
const MAX_ANSWER = { 2: 1000, 3: 20000, 4: 5000, 5: 30000 }; // batas jawaban per kelas
const num = (s) => Number(String(s).replace(/\./g, ''));
const nums = (s) => (s.match(/\d+(?:\.\d{3})*/g) || []).map(num);
const tierOf = (seed) => seed % 4;
const each = (fn) => {
  for (const t of H.TEMPLATES) for (let seed = 1; seed <= SEEDS; seed++) fn(t, H.generate(t.id, seed, tierOf(seed)), seed);
};

test('ada sekitar 20 templat dan semua kelas 2-5 terwakili', () => {
  assert.ok(H.TEMPLATES.length >= 20);
  for (const g of [2, 3, 4, 5]) assert.ok(H.byGrade(g).length >= 4, 'kelas ' + g);
  assert.equal(new Set(H.TEMPLATES.map((t) => t.id)).size, H.TEMPLATES.length);
});

test('deterministik: seed yang sama menghasilkan soal yang sama', () => {
  each((t, p, seed) => {
    const q = H.generate(t.id, seed, tierOf(seed));
    assert.deepEqual([q.question, q.answer, q.steps, q.hints], [p.question, p.answer, p.steps, p.hints]);
  });
});

test('bentuk soal: langkah >= 2, petunjuk 2, jawaban valid dan dalam batas kelas', () => {
  each((t, p) => {
    const ctx = `${t.id} ${p.question}`;
    assert.equal(p.grade, t.grade, ctx);
    assert.ok(p.question.length > 8, ctx);
    assert.ok(p.steps.length >= 2 && p.steps.every((s) => s && !s.includes('NaN') && !s.includes('undefined')), ctx);
    assert.equal(p.hints.length, 2, ctx);
    assert.ok(p.hints.every((s) => s && !s.includes('NaN') && !s.includes('undefined')), ctx);
    assert.ok(!p.question.includes('NaN') && !p.question.includes('undefined'), ctx);
    if (p.form === 'int') {
      assert.ok(Number.isInteger(p.answer) && p.answer > 0 && p.answer <= MAX_ANSWER[p.grade], `${ctx} => ${p.answer}`);
    } else if (p.form === 'rem') {
      assert.ok(p.answer.q > 0 && p.answer.r > 0 && p.answer.r < p.divisor, ctx);
    } else if (p.form === 'frac') {
      assert.ok(p.answer.n > 0 && p.answer.d > 1 && Number.isInteger(p.answer.n), ctx);
    } else if (p.form === 'time') {
      assert.ok(p.answer.h >= 6 && p.answer.h <= 14 && p.answer.m >= 0 && p.answer.m < 60, ctx);
    } else assert.fail('bentuk jawaban tidak dikenal: ' + p.form);
  });
});

test('jawaban benar: dihitung ulang dari teks soal', () => {
  const recompute = {
    tambah3: (p) => { const [a, b] = nums(p.question); assert.ok(a + b < 1000); assert.ok(H.carries(a, b) >= 2); return a + b; },
    kurang3: (p) => { const [a, b] = nums(p.question); assert.ok(H.borrows(a, b) >= 2); return a - b; },
    kali21: (p) => { const [a, b] = nums(p.question); assert.ok((a % 10) * b >= 10); return a * b; },
    kali22: (p) => { const [a, b] = nums(p.question); return a * b; },
    kali32: (p) => { const [a, b] = nums(p.question); return a * b; },
    kurangNol: (p) => { const [a, b] = nums(p.question); assert.ok(a % 1000 === 0); return a - b; },
    bagi3: (p) => { const [a, b] = nums(p.question); assert.equal(a % b, 0); assert.ok(a >= 100 && a <= 999); return a / b; },
    bagi42: (p) => { const [a, b] = nums(p.question); assert.equal(a % b, 0); assert.ok(a >= 1000); return a / b; },
    bagiSisa: (p) => { const [a, b] = nums(p.question); return { q: Math.floor(a / b), r: a % b }; },
    pecahanDari: (p) => { const [n, d, tot] = nums(p.question); assert.equal(tot % d, 0); return (n * tot) / d; },
    persen: (p) => { const [tot, pc] = nums(p.question); assert.equal((tot * pc) % 100, 0); return (tot * pc) / 100; },
    rataRata: (p) => { const [, cnt, ...v] = nums(p.question); const vals = v.slice(0, cnt); assert.equal(vals.length, cnt); const s = vals.reduce((a, b) => a + b, 0); assert.equal(s % cnt, 0); return s / cnt; },
    volume: (p) => { const [a, b, c] = nums(p.question); return a * b * c; },
    kecepatan: (p) => { const [v, h] = nums(p.question); return v * h + v / 2; },
    uang: (p) => { const [n, price, paid] = nums(p.question); assert.ok(paid > n * price); return paid - n * price; },
    kpk: (p) => { const [a, b] = nums(p.question); return H.lcm(a, b); },
    pecahanTambah: (p) => { const [a, b, c, d] = nums(p.question); return { n: a * d + c * b, d: b * d }; },
    lamaWaktu: (p) => { const [sh, sm, dh, dm] = nums(p.question.replace('.', ' ')); const t = sh * 60 + sm + dh * 60 + dm; return { h: Math.floor(t / 60), m: t % 60 }; },
  };
  let covered = new Set();
  each((t, p) => {
    const f = recompute[t.id];
    if (!f) return;
    covered.add(t.id);
    const exp = f(p);
    if (p.form === 'frac') assert.equal(exp.n * p.answer.d, p.answer.n * exp.d, p.question); // pecahan setara
    else assert.deepEqual(p.answer, exp, p.question);
  });
  assert.ok(covered.size >= 18);
});

test('soal cerita: jawaban sesuai angka di teks (cerita2, kelompokTambah, kelilingLuas, persen)', () => {
  each((t, p) => {
    if (t.id === 'cerita2') {
      const [start, a, b] = nums(p.question);
      const first = p.question.indexOf('Dipakai') < p.question.indexOf('dapat');
      assert.equal(p.answer, first ? start - a + b : start + a - b, p.question);
    }
    if (t.id === 'kelompokTambah') { const [k, m, e] = nums(p.question); assert.equal(p.answer, k * m + e, p.question); }
    if (t.id === 'kelilingLuas') {
      const [a, b] = nums(p.question);
      if (p.question.includes('mengelilingi')) assert.equal(p.answer, 2 * (a + b));
      else if (p.question.includes('lebih pendek')) assert.equal(p.answer, a * (a - b));
      else assert.equal(p.answer, a * b);
    }
  });
});

test('check(): menerima jawaban benar dalam berbagai penulisan dan pecahan setara', () => {
  each((t, p) => {
    const a = p.answer, ctx = `${t.id} ${p.question}`;
    if (p.form === 'int') {
      assert.ok(p.check(a), ctx);
      assert.ok(p.check(String(a)), ctx);
      assert.ok(p.check(H.fmt(a)), ctx);
      if (p.unit === 'Rp') assert.ok(p.check(H.fmtRp(a)), ctx);
    } else if (p.form === 'rem') {
      assert.ok(p.check({ q: a.q, r: a.r }) && p.check(`${a.q} sisa ${a.r}`), ctx);
    } else if (p.form === 'frac') {
      assert.ok(p.check({ n: a.n, d: a.d }) && p.check(`${a.n}/${a.d}`), ctx);
      for (const k of [2, 3]) assert.ok(p.check({ n: a.n * k, d: a.d * k }), ctx);
      const g = H.gcd(a.n, a.d);
      assert.ok(p.check({ n: a.n / g, d: a.d / g }), ctx);
    } else {
      const pad = (n) => String(n).padStart(2, '0');
      assert.ok(p.check({ h: a.h, m: a.m }) && p.check(`${pad(a.h)}.${pad(a.m)}`) && p.check(`${a.h}:${pad(a.m)}`), ctx);
    }
  });
});

test('check(): menolak selisih 1, sampah, dan nol', () => {
  each((t, p) => {
    const a = p.answer, ctx = `${t.id} ${p.question}`;
    assert.ok(!p.check(null) && !p.check('') && !p.check('abc') && !p.check(undefined), ctx);
    if (p.form === 'int') {
      assert.ok(!p.check(a + 1) && !p.check(a - 1) && !p.check(0), ctx);
    } else if (p.form === 'rem') {
      assert.ok(!p.check({ q: a.q + 1, r: a.r }) && !p.check({ q: a.q - 1, r: a.r }) && !p.check({ q: a.q, r: a.r + 1 }) && !p.check({ q: a.q, r: a.r - 1 }), ctx);
      assert.ok(!p.check({ q: a.q }) && !p.check(String(a.q)), ctx);
    } else if (p.form === 'frac') {
      assert.ok(!p.check({ n: a.n + 1, d: a.d }) && !p.check({ n: a.n - 1, d: a.d }) && !p.check({ n: a.n, d: a.d + 1 }) && !p.check({ n: a.n, d: 0 }), ctx);
    } else {
      assert.ok(!p.check({ h: a.h, m: (a.m + 1) % 60 }) && !p.check({ h: a.h, m: (a.m + 59) % 60 }) && !p.check({ h: a.h + 1, m: a.m }) && !p.check({ h: a.h - 1, m: a.m }), ctx);
    }
  });
});

test('pola salah: pesan bertarget muncul, jawaban benar tidak pernah dianggap salah', () => {
  let withPattern = 0;
  each((t, p) => {
    for (const w of p.polaSalah) {
      assert.ok(w.msg && w.msg.length > 5, t.id);
      assert.ok(!H.check(p, w.ans), `pola salah sama dengan jawaban benar: ${t.id} ${p.question}`);
      const msgs = p.polaSalah.filter((o) => JSON.stringify(o.ans) === JSON.stringify(w.ans)).map((o) => o.msg); // jawaban salah yang kebetulan sama
      assert.ok(msgs.includes(p.wrongMessage(w.ans)), `${t.id} ${p.question}`);
    }
    if (p.polaSalah.length) withPattern++;
    assert.equal(p.wrongMessage(p.answer), null);
    if (p.carryKind === 'simpan') assert.match(p.wrongMessage(p.answer + 10), /simpanan/);
    if (p.carryKind === 'pinjam') assert.match(p.wrongMessage(p.answer - 100), /pinjaman/);
    if (p.form === 'rem') assert.match(p.wrongMessage({ q: p.answer.q - 1, r: p.answer.r + p.divisor }), /Sisa harus lebih kecil/);
  });
  assert.ok(withPattern > 0);
});

test('contoh mirip: soal lain, langkah lengkap, bukan soal/jawaban yang sama', () => {
  each((t, p) => {
    const s = p.similar();
    assert.notEqual(s.question, p.question, t.id);
    assert.ok(s.steps.length >= 2, t.id);
    assert.deepEqual(p.similar(), s, 'similar() harus deterministik');
    assert.ok(!s.steps.join('|').includes(p.question), t.id);
  });
});

test('variasi: tiap templat menghasilkan banyak soal berbeda', () => {
  for (const t of H.TEMPLATES) {
    const qs = new Set();
    for (let seed = 1; seed <= SEEDS; seed++) qs.add(H.generate(t.id, seed, tierOf(seed)).question);
    assert.ok(qs.size >= 20, `${t.id} hanya ${qs.size} soal berbeda`);
  }
});

test('pick(): sesuai kelas, menghindari templat terakhir', () => {
  for (const g of [2, 3, 4, 5]) for (let seed = 1; seed <= 200; seed++) {
    const p = H.pick(g, seed % 4, seed, []);
    assert.equal(p.grade, g);
    const q = H.pick(g, seed % 4, seed, [p.id]);
    assert.notEqual(q.id, p.id);
  }
  assert.throws(() => H.pick(1, 0, 1), /kelas/);
  assert.throws(() => H.generate('tidakAda', 1, 0), /templat/);
});

test('answerText(): tampilan jawaban sesuai bentuk', () => {
  assert.equal(H.answerText(H.generate('bagiSisa', 5, 0)).includes('sisa'), true);
  assert.match(H.answerText(H.generate('lamaWaktu', 5, 0)), /^\d{2}\.\d{2}$/);
  assert.match(H.answerText(H.generate('pecahanTambah', 5, 0)), /^\d+\/\d+$/);
  assert.match(H.answerText(H.generate('uang', 5, 0)), /^Rp/);
});
