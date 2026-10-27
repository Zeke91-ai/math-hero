// Uji logika soal dan data level Math Hero 2:  node tests/mh2.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/mh2/js/concepts.js');
const { STAGES, ALL_LEVELS, MODES } = require('../public/mh2/js/stages.js');

const N = 300;
// Menghitung ekspresi tampilan (mis. "3×4", "12:3", "7+5", "15-3") tanpa eval.
function calc(label) {
  const m = /^(\d+)\s*([+\-×:])\s*(\d+)$/.exec(label.trim());
  assert.ok(m, 'ekspresi tidak dikenal: ' + label);
  const a = Number(m[1]), b = Number(m[3]);
  return m[2] === '+' ? a + b : m[2] === '-' ? a - b : m[2] === '×' ? a * b : a / b;
}

test('garis bilangan: target, jumlah lompatan, dan rentang garis konsisten', () => {
  const cfgs = [{ kind: 'add', max: 10 }, { kind: 'sub', max: 20, bMax: 9 }, { kind: 'missing', max: 15 }, { kind: 'skip', sMin: 2, sMax: 5 },
    { kind: 'tens', max: 100 }, { kind: 'frac', den: 4 }, { kind: 'frac' }];
  for (const cfg of cfgs) for (let i = 0; i < N; i++) {
    const t = C.numline(cfg);
    if (t.kind === 'tens') {
      const b = t.target - t.start;
      assert.equal(t.hops, Math.floor(b / 10) + b % 10);
    } else assert.equal(t.target, t.start + t.dir * t.step * t.hops, JSON.stringify(t));
    assert.ok(t.min <= Math.min(t.start, t.target) && t.max >= Math.max(t.start, t.target), JSON.stringify(t));
    assert.ok(t.target >= 0 && t.min >= 0);
    assert.equal(t.answer, t.ask === 'hops' ? t.hops : t.target);
    assert.ok(t.explain.length >= 2);
  }
});

test('lari angka: target jumlah selalu bisa dicapai, label ekspresi benar', () => {
  for (let i = 0; i < N; i++) {
    const cfg = { kind: 'sum', tMin: 6, tMax: 15, orbMax: 5 };
    const goal = C.runnerGoal(cfg);
    let have = 0, steps = 0;
    while (have < goal.target && steps++ < 400) {
      const o = C.runnerOrb(cfg, goal, have);
      assert.equal(o.good, o.value <= goal.target - have);
      if (o.good) have += o.value;
    }
    assert.equal(have, goal.target, 'target tidak tercapai');
  }
  for (const kind of ['multiple', 'equal']) for (let i = 0; i < N; i++) {
    const goal = C.runnerGoal({ kind });
    const o = C.runnerOrb({ kind }, goal, 0);
    if (kind === 'multiple') assert.equal(o.good, o.value % goal.k === 0);
    else { assert.equal(calc(o.label), o.value); assert.equal(o.good, o.value === goal.v); }
  }
});

test('lari angka: tiap titik pilihan punya minimal satu bola benar, dua label berbeda', () => {
  const cfgs = [{ kind: 'sum', tMin: 5, tMax: 10, orbMax: 4 }, { kind: 'sum', tMin: 10, tMax: 20, orbMax: 6 }, { kind: 'multiple' }, { kind: 'equal', values: [6, 8, 10, 12] }];
  for (const cfg of cfgs) for (let i = 0; i < N; i++) {
    const goal = C.runnerGoal(cfg);
    const have = goal.kind === 'sum' ? C.between(0, goal.target - 1) : 0;
    const pair = C.runnerPair(cfg, goal, have);
    assert.equal(pair.length, 2);
    assert.notEqual(pair[0].label, pair[1].label);
    for (const o of pair) {
      if (goal.kind === 'sum') assert.equal(o.good, o.value <= goal.target - have);
      if (goal.kind === 'equal') assert.equal(calc(o.label), o.value);
    }
    assert.ok(pair.some((o) => o.good), JSON.stringify({ goal, have, pair }));
  }
});

test('level gesit: hitungan tetap kecil', () => {
  for (const L of ALL_LEVELS) for (const ph of (L.phases || [L])) {
    if (ph.mode === 'racer') for (let i = 0; i < 200; i++) {
      const q = C.race(ph.cfg), e = q.label.replace(' = ?', '');
      const m = /^(\d+) ([+\-×:]) (\d+)$/.exec(e);
      if (!m) continue; // perbandingan
      const a = Number(m[1]), b = Number(m[3]);
      if (m[2] === '×') assert.ok(a <= 5 && b <= 10 && a * b <= 50, `${L.id}: ${e}`);
      if (m[2] === ':') assert.ok(b <= 5, `${L.id}: ${e}`);
      if (m[2] === '+' && a % 10) assert.ok(a <= 20 && b <= 20, `${L.id}: ${e}`);
      if (m[2] === '-') assert.ok(a <= 20, `${L.id}: ${e}`);
    }
    if (ph.mode === 'shooter') for (const w of ph.cfg.waves) for (let i = 0; i < 200; i++) {
      const t = C.shooterTarget(C.shooterWave(w));
      if (w.kind === 'divide') assert.ok(Number(t.label.split(':')[1]) <= 5, `${L.id}: ${t.label}`);
      if (w.kind === 'multiple') assert.ok(t.value <= 50, `${L.id}: ${t.label}`);
    }
    if (ph.mode === 'runner') for (let i = 0; i < 200; i++) {
      const g = C.runnerGoal(ph.cfg);
      if (g.kind === 'sum') assert.ok(g.target <= 20);
      if (g.kind === 'equal') assert.ok(g.v <= 12);
    }
  }
});

test('meteor angka: sasaran benar dan salah sesuai aturan', () => {
  const cfgs = [{ kind: 'bond', n: 10 }, { kind: 'multiple', k: 3 }, { kind: 'even' }, { kind: 'odd' }, { kind: 'divide', q: 4 }, { kind: 'half' }, { kind: 'greater', n: 40 }];
  for (const cfg of cfgs) for (let i = 0; i < N; i++) {
    const w = C.shooterWave(cfg);
    const t = C.shooterTarget(w);
    if (cfg.kind === 'multiple') assert.equal(t.good, t.value % 3 === 0);
    if (cfg.kind === 'even') assert.equal(t.good, t.value % 2 === 0);
    if (cfg.kind === 'odd') assert.equal(t.good, t.value % 2 === 1);
    if (cfg.kind === 'greater') assert.equal(t.good, t.value > 40);
    if (cfg.kind === 'divide') { assert.equal(calc(t.label), t.value); assert.equal(t.good, t.value === 4); }
    if (cfg.kind === 'half') { const [n, d] = t.label.split('/').map(Number); assert.equal(t.good, n * 2 === d); }
    if (cfg.kind === 'bond') { const x = Number(w.label.split(' ')[0]); assert.equal(t.good, x + t.value === 10); }
    assert.ok((t.good ? w.explainGood(t.item || t.value) : w.explainBad(t.item || t.value)));
  }
});

test('balap: jawaban benar ada di pilihan, pilihan unik', () => {
  const ops = ['add', 'sub', 'tens', 'mul', 'div', 'compare', 'mix'];
  for (const op of ops) for (let i = 0; i < N; i++) {
    const q = C.race({ op, aMax: 20, bMax: 9 });
    assert.equal(q.choices.length, 3);
    assert.equal(new Set(q.choices).size, 3);
    assert.ok(q.choices.includes(q.answer), JSON.stringify(q));
    if (q.op !== 'compare') assert.equal(String(calc(q.label.replace(' = ?', ''))), q.answer);
    else {
      const [a, , b] = q.label.replace(' = ?', '').split(' ').map((s) => (isNaN(s) ? s : Number(s)));
      assert.equal(q.answer, a > b ? '>' : a < b ? '<' : '=');
    }
  }
});

test('timbangan: jawaban membuat kedua sisi seimbang, jawaban ada di baki', () => {
  for (const kind of ['simple', 'sum', 'tens', 'groups', 'twostep']) for (let i = 0; i < N; i++) {
    const b = C.balance({ kind });
    assert.equal(C.sideSum(b.left, b.answer), C.sideSum(b.right, b.answer), JSON.stringify(b));
    assert.ok(b.tray.includes(b.answer));
    assert.equal(new Set(b.tray).size, b.tray.length);
    assert.ok(b.tray.every((v) => v >= 0));
    // Jawaban harus satu-satunya yang membuat seimbang.
    for (const v of b.tray) if (v !== b.answer) assert.notEqual(C.sideSum(b.left, v), C.sideSum(b.right, v));
  }
});

test('kebun, bagi rata, pasar, pizza: angka saling cocok', () => {
  for (let i = 0; i < N; i++) {
    const g1 = C.garden({ kind: 'total' }); assert.equal(g1.answer, g1.rows * g1.cols); assert.ok(g1.choices.includes(g1.answer));
    const g2 = C.garden({ kind: 'rows' }); assert.equal(g2.rows * g2.answer, g2.total);
    const g3 = C.garden({ kind: 'factors' }); assert.ok(g3.pairs.length >= g3.need && g3.need >= 2, JSON.stringify(g3)); g3.pairs.forEach(([r, c]) => assert.equal(r * c, g3.total));
    const s = C.share({ rem: i % 2 === 0, gMax: 4, eMax: 5 }); assert.equal(s.groups * s.each + s.rem, s.total); assert.ok(s.rem < s.groups);
    const m = C.market({ kind: 'pay', maxDenom: 1000 }); assert.equal(m.best.reduce((a, b) => a + b, 0), m.price); assert.ok(m.price > 0);
    const c = C.market({ kind: 'change', maxDenom: 5000, paid: [5000] }); assert.equal(c.price + c.target, c.paid); assert.ok(c.target > 0 && c.price > 0);
    assert.equal(c.best.reduce((a, b) => a + b, 0), c.target);
    const p = C.pizza({ kind: 'make' }); assert.ok(p.num >= 1 && p.num < p.den);
    const q = C.pizza({ kind: 'compare' });
    const va = q.a[0] / q.a[1], vb = q.b[0] / q.b[1];
    assert.equal(q.answer, va > vb ? 'a' : va < vb ? 'b' : 'sama');
    const e = C.pizza({ kind: 'equiv' }); assert.equal(e.answer * e.den, e.num * e.den2);
  }
});

test('data stage: 6 stage x 5 level, id unik, mode terdaftar, soal bisa dibuat', () => {
  assert.equal(STAGES.length, 6);
  const ids = new Set();
  for (const st of STAGES) {
    assert.equal(st.levels.length, 5, st.nama);
    assert.ok(st.levels[4].boss, `level terakhir ${st.nama} harus bos`);
  }
  for (const L of ALL_LEVELS) {
    assert.ok(!ids.has(L.id), 'id ganda ' + L.id); ids.add(L.id);
    const phases = L.phases || [L];
    for (const ph of phases) {
      assert.ok(MODES.includes(ph.mode), `${L.id}: mode ${ph.mode} tidak dikenal`);
      assert.ok(ph.tasks >= 1, `${L.id}: jumlah tugas`);
      // Panggil pembuat soal sesuai mode agar konfigurasi yang salah ketahuan.
      const cfg = ph.cfg;
      for (let i = 0; i < 40; i++) {
        if (ph.mode === 'numline') C.numline(cfg);
        else if (ph.mode === 'runner') { const g = C.runnerGoal(cfg); C.runnerPair(cfg, g, 0); }
        else if (ph.mode === 'shooter') (cfg.waves || [cfg]).forEach((w) => C.shooterTarget(C.shooterWave(w)));
        else if (ph.mode === 'racer') C.race(cfg);
        else if (ph.mode === 'balance') C.balance(cfg);
        else if (ph.mode === 'garden') C.garden(cfg);
        else if (ph.mode === 'share') C.share(cfg);
        else if (ph.mode === 'market') C.market(cfg);
        else if (ph.mode === 'pizza') C.pizza(cfg);
      }
    }
  }
  assert.equal(ALL_LEVELS.length, 30);
});

test('balap: perbandingan sama/kurang/lebih selalu punya jawaban benar (termasuk "36 ? 36" -> "=")', () => {
  const seen = { '<': 0, '=': 0, '>': 0 };
  for (let i = 0; i < 3000; i++) {
    const q = C.race({ op: 'compare', cMin: 10, cMax: 60 });
    const [a, , b] = q.label.split(' ').map((s) => (isNaN(s) ? s : Number(s)));
    const want = a < b ? '<' : a > b ? '>' : '=';
    assert.equal(q.answer, want, q.label);
    assert.deepEqual([...q.choices].sort(), ['<', '=', '>']);
    seen[want]++;
  }
  for (const k of Object.keys(seen)) assert.ok(seen[k] > 100, `jenis ${k} jarang muncul: ${JSON.stringify(seen)}`);
});
