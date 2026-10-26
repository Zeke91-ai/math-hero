// Uji logika soal: jalankan dengan  node tests/math.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const MathQuiz = require('../public/js/math.js');

const OPS = ['add', 'mul', 'div', 'susun'];

function evalExpr(q) {
  const m = q.expr.match(/^(\d+) ([+x÷]) (\d+) = \?$/);
  assert.ok(m, 'format ekspresi tidak dikenal: ' + q.expr);
  const a = Number(m[1]), b = Number(m[3]);
  return m[2] === '+' ? a + b : m[2] === 'x' ? a * b : a / b;
}

for (const op of OPS) {
  for (let level = 1; level <= 8; level++) {
    test(`soal ${op} level ${level}: jawaban benar, pilihan unik, visual dan penjelasan lengkap`, () => {
      for (let i = 0; i < 300; i++) {
        const q = MathQuiz.generate(op, level);
        assert.equal(q.answer, evalExpr(q), q.expr);
        assert.ok(Number.isInteger(q.answer) && q.answer > 0);
        assert.ok(q.choices.includes(q.answer));
        assert.equal(new Set(q.choices).size, q.choices.length);
        assert.equal(q.choices.length, level <= 2 ? 3 : 4);
        assert.ok(q.choices.every((c) => Number.isInteger(c) && c >= 0));
        assert.ok(q.explain.length >= 2 && q.explain.every((s) => s.length > 0));
        const total = q.visual.groups.reduce((a, b) => a + b, 0);
        if (op === 'add') assert.equal(total, q.answer);
        if (op === 'mul') assert.equal(total, q.answer);
        if (op === 'div') assert.equal(total, evalExpr(q) * q.visual.groups.length);
        if (op === 'susun') assert.equal(total, Number(q.expr.split(' ')[0]));
      }
    });
  }
}

test('batas per kelas: level 1 penjumlahan sampai 10, level 3 sampai 100, level 6 sampai 1000', () => {
  for (let i = 0; i < 300; i++) {
    assert.ok(MathQuiz.generate('add', 1).answer <= 10);
    assert.ok(MathQuiz.generate('add', 4).answer <= 100);
    assert.ok(MathQuiz.generate('add', 6).answer <= 1000);
    assert.ok(MathQuiz.generate('mul', 2).answer <= 25);
    assert.ok(MathQuiz.generate('mul', 5).answer <= 81);
  }
});

test('level di luar rentang dibatasi 1 sampai 8, operasi asing ditolak', () => {
  assert.equal(MathQuiz.generate('add', 0).level, 1);
  assert.equal(MathQuiz.generate('add', 99).level, 8);
  assert.throws(() => MathQuiz.generate('xyz', 1));
});

test('pengecoh unik, tidak negatif, dan bukan jawaban', () => {
  for (const ans of [1, 2, 7, 25, 120, 999, 2500]) {
    const d = MathQuiz.distractors(ans, 3);
    assert.equal(new Set(d).size, 3);
    assert.ok(d.every((x) => x !== ans && x >= 0));
  }
});
