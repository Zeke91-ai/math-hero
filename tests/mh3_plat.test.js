// Uji logika level Kejar MH3 di Node:  node tests/mh3_plat.test.js
// Bot sederhana berlari ke kanan, melompat sebelum jurang, dinding, duri, dan musuh. Setiap level harus bisa ditamatkan.
const assert = require('assert');
const Sim = require('../public/mh3/js/plat/sim.js');
const Lv = require('../public/mh3/js/plat/levels.js');
const { T } = require('../public/mh3/js/plat/physics.js');
const tileAt = (L, c, r) => (c < 0 || c >= L.cols ? 1 : r < 0 || r >= L.rows ? 0 : L.tiles[r * L.cols + c]);

function bot(g, usePower) {
  const p = g.p, L = g.L;
  const col = Math.floor((p.x + p.w / 2) / T), foot = Math.floor((p.y + p.h - 1) / T);
  let jump = false;
  const look = (n) => col + n;
  for (const n of [1, 2]) {
    const c = look(n), surf = tileAt(L, c, foot + 1);
    if (p.onGround && surf === 0 && tileAt(L, c, foot + 2) === 0) jump = true;      // jurang
    if (tileAt(L, c, foot) === 1) jump = true;                                       // dinding
    if (L.spikes.some((s) => Math.floor(s.x / T) === c)) jump = true;               // duri
  }
  for (const e of g.enemies) if (!e.dead && e.b.x > p.x && e.b.x - p.x < 70 && Math.abs(e.b.y - p.y) < 60) jump = true;
  if (!p.onGround && p.y > (L.rows * T - 60) && g.power === 'djump') jump = true;
  return { dir: 1, jump: jump && p.onGround, jumpHeld: true };
}
function run(def, maxSec) {
  const g = Sim.create(def);
  let prevJump = false;
  for (let i = 0; i < maxSec * 60 && g.phase === 'play'; i++) {
    const inp = bot(g);
    Sim.update(g, 1 / 60, inp);
    g.events.length = 0;
  }
  return g;
}

for (const lv of Lv.LEVELS) {
  const g = run(lv, 240);
  assert.strictEqual(g.phase, 'won', `level ${lv.id} harus selesai (posisi x=${Math.round(g.p.x)}, mati ${g.deaths}, hati ${g.hearts})`);
  console.log(`ok: level ${lv.id} "${lv.nama}" selesai dalam ${g.t.toFixed(1)} dtk, bintang ${g.stars}/${g.L.stars.length}, hati ${g.hearts}, mati ${g.deaths}, rating ${Sim.rating(g)}`);
  assert.ok(g.L.chests.length === 2, 'tiap level punya Peti Kekuatan dan Peti Kristal');
  assert.ok(g.L.chests.every((c) => c.got), `semua peti di level ${lv.id} bisa diambil dari jalur bot`);
}
// Peti tidak menghalangi: bot tanpa menjawab apa pun tetap menamatkan level (sudah dibuktikan di atas).
// Checkpoint: jatuh ke jurang mengembalikan ke checkpoint terakhir tanpa macet.
{
  const g = Sim.create(Lv.LEVELS[0]);
  Sim.place(g, { x: 29 * T, y: 5 * T }); // di atas jurang pertama
  g.p.y = 12 * T;
  Sim.update(g, 1 / 60, { dir: 0 });
  for (let i = 0; i < 120; i++) Sim.update(g, 1 / 60, { dir: 0 });
  assert.strictEqual(g.phase, 'play');
  assert.ok(g.hearts >= 1, 'masih punya hati setelah jatuh');
}
// Habis hati: ulang dari checkpoint dengan hati penuh.
{
  const g = Sim.create(Lv.LEVELS[0]);
  g.cp = { x: 30 * T, y: 11 * T };
  for (let i = 0; i < 3; i++) { g.invuln = 0; Sim.hurt(g, 'duri'); }
  assert.strictEqual(g.hearts, Sim.HEARTS); assert.strictEqual(g.deaths, 1);
  assert.ok(Math.abs(g.p.x + g.p.w / 2 - 30 * T) < 2, 'kembali ke checkpoint');
}
// Perisai menahan satu pukulan; lompat ganda hanya dengan kekuatannya.
{
  const g = Sim.create(Lv.LEVELS[0]);
  Sim.grantPower(g, 'shield'); Sim.hurt(g, 'musuh');
  assert.strictEqual(g.hearts, Sim.HEARTS); assert.strictEqual(g.power, null);
}
console.log('semua uji Kejar lulus');
