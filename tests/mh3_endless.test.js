// Uji Kejar tanpa batas MH3:  node tests/mh3_endless.test.js
const assert = require('assert');
const En = require('../public/mh3/js/plat/endless.js');
const Sim = require('../public/mh3/js/plat/sim.js');
const TimeBonus = require('../public/shared/js/timebonus.js');
const { check, fromKejar } = require('../public/shared/js/levelcheck.js');

// Kesulitan dan pelajaran naik terus (tidak pernah turun), hati awal tetap.
let prev = null;
for (let r = 1; r <= 30; r++) {
  const p = En.plan(r, 1234), ls = En.lesson(r, 2);
  if (prev) {
    assert(p.tier >= prev.p.tier, 'tingkat level tidak turun');
    assert(p.sec >= prev.p.sec && p.quiz >= prev.p.quiz && p.mech.length >= prev.p.mech.length && p.foes.length >= prev.p.foes.length, 'beban level tidak turun');
    assert(ls.grade * 4 + ls.tier >= prev.ls.grade * 4 + prev.ls.tier, 'pelajaran tidak turun');
  }
  prev = { p, ls };
}
assert.deepStrictEqual(En.lesson(1, 2), { grade: 2, tier: 0 });
assert.deepStrictEqual(En.lesson(5, 2), { grade: 3, tier: 0 });
assert.deepStrictEqual(En.lesson(99, 2), { grade: 5, tier: 3 });
assert.deepStrictEqual(En.lesson(1, 4), { grade: 4, tier: 0 });
assert(En.plan(1, 7).tier === 0 && En.plan(7, 7).tier === 3);
console.log('ok: tingkat level dan pelajaran naik terus');

// Seed per putaran: deterministik, beda antar putaran dan antar permainan.
assert.strictEqual(En.level(3, 55).map.join(), En.level(3, 55).map.join());
assert.notStrictEqual(En.level(3, 55).map.join(), En.level(3, 56).map.join());
assert.notStrictEqual(En.level(3, 55).seed, En.level(4, 55).seed);
console.log('ok: level deterministik per seed dan putaran');

// Semua level hasil generator bisa diselesaikan (pemeriksa jangkauan kit), putaran 1-12 dari beberapa permainan.
let n = 0;
for (const run of [11, 4242, 987654]) for (let r = 1; r <= 12; r++) {
  const d = En.level(r, run), res = check(fromKejar(d, Sim.parse(d), Sim.K));
  assert(res.ok, `putaran ${r} seed permainan ${run}: ${res.msg.join('; ')}`); n++;
}
console.log(`ok: ${n} level tanpa batas lulus pemeriksa`);

// Hati tidak pernah bertambah; habis = fase dead (bukan respawn dengan hati penuh).
const def = En.level(1, 1);
const g = Sim.create(def, { hearts: En.HEARTS, endless: true });
assert.strictEqual(g.hearts, 5);
Sim.hurt(g, 'musuh'); assert.strictEqual(g.hearts, 4);
g.invuln = 0; Sim.hurt(g, 'jatuh'); assert.strictEqual(g.hearts, 3);
assert.strictEqual(Sim.loseHearts(g, 2), false); assert.strictEqual(g.hearts, 1);
assert.strictEqual(Sim.loseHearts(g, 2), true); assert.strictEqual(g.hearts, 0); assert.strictEqual(g.phase, 'dead');
assert(g.events.some((e) => e.type === 'dead'));
const g2 = Sim.create(def, { hearts: 1, endless: true });
Sim.hurt(g2, 'musuh'); assert.strictEqual(g2.phase, 'dead'); assert.strictEqual(g2.deaths, 0);
const g3 = Sim.create(def, {});            // Kejar biasa tetap pulih dan ulang
for (let i = 0; i < 3; i++) { g3.invuln = 0; Sim.hurt(g3, 'musuh'); }
assert.strictEqual(g3.phase, 'play'); assert.strictEqual(g3.hearts, Sim.HEARTS); assert.strictEqual(g3.deaths, 1);
console.log('ok: hati tidak bisa bertambah, habis = selesai');

assert(TimeBonus.GAMES['mh3-kejar'] && TimeBonus.forGame('mh3-kejar').value() === 200);
assert(En.roundScore(2, 5, 150) > En.roundScore(1, 5, 150));
console.log('ok: bonus waktu dan skor putaran');
