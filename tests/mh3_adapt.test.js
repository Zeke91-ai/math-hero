// Uji tingkat soal adaptif dan kelas PR Math Hero 3:  node tests/mh3_adapt.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../public/mh3/js/progress.js');
const H = require('../public/mh3/js/homework.js');

const done = (wrong, hints) => ({ status: 'done', stars: 3, wrong, hints, id: 'tambah3', seed: 7, tier: 0, grade: 2 });
const withRecent = (...xs) => ({ recent: xs });

test('tanpa riwayat, tingkat tetap sama dengan tingkat dunia', () => {
  const p = P.norm({});
  for (let base = 0; base <= 3; base++) assert.equal(P.adaptTier(p, base), base);
});

test('tiga PR berturut-turut tidak bersih menurunkan tingkat satu langkah', () => {
  assert.equal(P.adaptTier(withRecent(1, 0, 0, 0), 2), 1);
  assert.equal(P.adaptTier(withRecent(1, 1, 0, 1, 0, 0), 2), 2, 'PR bersih di antara membatalkan penurunan');
});

test('satu atau dua PR tidak bersih tidak menurunkan tingkat', () => {
  assert.equal(P.adaptTier(withRecent(1, 1, 1, 0), 2), 2);
  assert.equal(P.adaptTier(withRecent(1, 0, 0), 2), 2);
});

test('enam PR bersih berturut-turut menaikkan tingkat satu langkah', () => {
  assert.equal(P.adaptTier(withRecent(1, 1, 1, 1, 1, 1), 1), 2);
  assert.equal(P.adaptTier(withRecent(0, 1, 1, 1, 1, 1), 1), 1, 'satu PR tidak bersih di 6 terakhir menahan kenaikan');
});

test('tingkat tidak pernah keluar dari 0 sampai 3', () => {
  assert.equal(P.adaptTier(withRecent(0, 0, 0), 0), 0);
  assert.equal(P.adaptTier(withRecent(1, 1, 1, 1, 1, 1), 3), 3);
});

test('noteAnswer hanya menyimpan 6 PR terakhir dan mengabaikan PR yang ditunda', () => {
  const p = P.norm({});
  for (let i = 0; i < 9; i++) P.noteAnswer(p, done(0, 0));
  assert.equal(p.recent.length, 6);
  P.noteAnswer(p, { status: 'later', wrong: 0, hints: 0 });
  assert.equal(p.recent.length, 6, 'ditunda belum dinilai');
  P.noteAnswer(p, done(1, 0));
  assert.equal(p.recent[5], 0, 'PR dengan salah tercatat tidak bersih');
});

test('logPR dari PR selesai ikut mencatat hasil; PR ditunda tidak', () => {
  const p = P.norm({});
  P.logPR(p, done(2, 0), 'PR');
  assert.deepEqual(p.recent, [0]);
  P.logPR(p, done(0, 1), 'PR');
  assert.deepEqual(p.recent, [0, 0], 'pakai petunjuk juga dihitung tidak bersih');
  P.logPR(p, { status: 'later', id: 'x', seed: 1, tier: 0, grade: 2 }, 'PR');
  assert.deepEqual(p.recent, [0, 0]);
  P.logPR(p, done(0, 0), 'PR');
  assert.deepEqual(p.recent, [0, 0, 1]);
});

test('profil lama tanpa riwayat tetap valid', () => {
  const p = P.norm({ nama: 'LAMA', grade: 3 });
  assert.deepEqual(p.recent, []);
  assert.equal(p.grade, 3);
});

test('kelas menentukan soal yang dibuat kartu PR', () => {
  for (const grade of [2, 3, 4, 5]) {
    for (let seed = 1; seed <= 50; seed++) {
      const q = H.pick(grade, 1, seed, []);
      assert.equal(q.grade, grade, `kelas ${grade} seed ${seed}`);
      assert.ok(H.byGrade(grade).some((t) => t.id === q.id));
    }
  }
  const kelas2 = new Set(Array.from({ length: 30 }, (_, s) => H.pick(2, 0, s + 1, []).id));
  const kelas5 = new Set(Array.from({ length: 30 }, (_, s) => H.pick(5, 0, s + 1, []).id));
  assert.ok([...kelas2].every((id) => !kelas5.has(id)), 'soal kelas 2 dan kelas 5 berasal dari templat berbeda');
});
