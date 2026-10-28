// Uji klien papan skor bersama dengan backend palsu (tanpa jaringan):  node tests/scores.test.js
const assert = require('assert');
const Scores = require('../public/js/scores.js');
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, 'GAGAL: ' + m); console.log('ok: ' + m); };

(async () => {
  // Tanpa konfigurasi: tidak melempar, top() null, submit() false.
  ok((await Scores.top('math-hero', 'mh1', 10)) === null, 'tanpa konfigurasi: top = null');
  ok((await Scores.submit('math-hero', 'mh1', 'ANA', 10)) === false, 'tanpa konfigurasi: submit = false');
  ok(Scores.enabled() === false, 'enabled() false tanpa konfigurasi');

  const store = [];
  Scores._setBackend({
    add: async (d) => { store.push(Object.assign({ createdAt: store.length + 1 }, d)); },
    query: async (appId, board, limit) => store.filter((d) => d.appId === appId && d.board === board).sort((a, b) => b.score - a.score).slice(0, limit),
  });
  ok(Scores.enabled(), 'enabled() true dengan backend');

  ok(await Scores.submit('math-hero', 'mh1', 'ANA', 120.9, { area: 2, hasil: 'kalah', aneh: { x: 1 } }), 'submit valid');
  ok(store[0].score === 120 && store[0].meta.area === 2 && !('aneh' in store[0].meta), 'skor dibulatkan, meta disaring');
  ok(await Scores.submit('math-hero', 'mh1', 'ANA', 300), 'skor kedua ANA');
  ok(await Scores.submit('math-hero', 'mh1', 'BUDI', 300), 'BUDI skor sama dengan ANA');
  ok(await Scores.submit('kuis-lain', 'mh1', 'CICI', 999), 'aplikasi lain, papan sama');

  // Ditolak di klien (cermin aturan Firestore).
  const before = store.length;
  for (const args of [['Math Hero', 'a', 'X', 1], ['math-hero', 'a b', 'X', 1], ['math-hero', 'mh1', '', 1], ['math-hero', 'mh1', 'X', -1], ['math-hero', 'mh1', 'X', 1e7], ['math-hero', 'mh1', 'X', NaN], ['1x', 'mh1', 'X', 1]]) {
    ok((await Scores.submit(...args)) === false, 'ditolak: ' + JSON.stringify(args));
  }
  ok(store.length === before, 'tidak ada yang tertulis saat ditolak');

  const top = await Scores.top('math-hero', 'mh1', 10);
  ok(top.length === 2, 'satu baris per nama, hanya appId ini');
  ok(top[0].name === 'ANA' && top[0].score === 300 && top[1].name === 'BUDI', 'urut skor, seri dimenangkan yang lebih dulu');
  ok((await Scores.top('math-hero', 'mh1', 1)).length === 1, 'batas n');
  ok((await Scores.top('math-hero', 'bukan-ada', 5)).length === 0, 'papan kosong = []');

  // Backend gagal: tidak melempar, game tetap jalan.
  Scores._setBackend({ add: async () => { throw new Error('offline'); }, query: async () => { throw new Error('offline'); } });
  ok((await Scores.submit('math-hero', 'mh1', 'ANA', 5)) === false, 'backend gagal: submit false');
  ok((await Scores.top('math-hero', 'mh1', 5)) === null, 'backend gagal: top null');
  console.log(`\n${n} pemeriksaan lulus`);
})().catch((e) => { console.error(e.message); process.exit(1); });
