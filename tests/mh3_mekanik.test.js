// Uji mekanik lanjutan Kejar MH3 (tangga, per, pipa, platform gerak, lift, papan rapuh, kotak, tombol, tuas, gergaji):
//   node tests/mh3_mekanik.test.js
const assert = require('assert');
const Sim = require('../public/mh3/js/plat/sim.js');
const { T } = require('../public/shared/js/physics.js');

// Peta uji tanpa tujuan diberi E di pojok kiri atas (tidak terjangkau) supaya bisa diurai.
const mk = (map, opts) => Sim.create({ id: 0, nama: 'uji', tema: 'padang', map: map.some((r) => r.includes('E')) ? map : ['', 'E'].concat(map.slice(2)) }, opts);
function run(g, sec, inp) {
  for (let i = 0; i < sec * 60 && g.phase === 'play'; i++) { Sim.update(g, 1 / 60, typeof inp === 'function' ? inp(g, i) : inp); g.events.length = 0; }
  return g;
}
const feet = (g) => g.p.y + g.p.h, cx = (g) => g.p.x + g.p.w / 2;
const pad = (rows) => rows.map((r) => r.padEnd(12, '.'));

// Tangga: jalan ke tangga, tekan atas, berdiri di lantai atas, lalu jalan ke tujuan.
{
  const g = mk(pad([
    '', '', '', '',
    '..........E.',
    '#####H######',
    '.....H......',
    '.....H......',
    '.....H......',
    '.S...H......',
    '############',
  ]));
  let phase = 0;
  run(g, 8, (g) => {
    if (phase === 0 && Math.abs(cx(g) - 5.5 * T) < 6) phase = 1;
    if (phase === 1 && feet(g) <= 5 * T + 0.5 && !g.climb) phase = 2;
    if (phase === 0) return { dir: 1 };
    if (phase === 1) return { dir: 0, up: true };
    return { dir: 1 };
  });
  assert.strictEqual(g.phase, 'won', `tangga: harus sampai tujuan (x=${Math.round(cx(g))}, kaki=${Math.round(feet(g))})`);
  console.log('ok: tangga dipanjat dengan tombol atas, berdiri di puncak');
}
// Turun tangga dengan tombol bawah dari puncak.
{
  const g = mk(pad(['', '', '', '', '.....S......', '#####H######', '.....H......', '.....H......', '.....H......', '.....H....E.', '############']));
  run(g, 0.5, { dir: 0 });
  assert.ok(Math.abs(feet(g) - 5 * T) < 1, 'berdiri di atas puncak tangga');
  run(g, 3, { dir: 0, down: true });
  assert.ok(Math.abs(feet(g) - 10 * T) < 1, `turun sampai lantai bawah (kaki=${feet(g)})`);
  run(g, 4, { dir: 1 });
  assert.strictEqual(g.phase, 'won');
  console.log('ok: tangga dituruni dengan tombol bawah');
}
// Per: melontar jauh lebih tinggi dari lompat biasa (lebih dari 7 tile).
{
  const g = mk(pad(['', '', '', '', '', '', '', '', '', '', '', '', '.S..s......E', '############']));
  const y0 = feet(g);
  let top = y0;
  run(g, 2.5, (g) => { top = Math.min(top, feet(g)); return { dir: g.t < 0.5 ? 1 : 0 }; });
  assert.ok(y0 - top > 7 * T, `per melontar ${((y0 - top) / T).toFixed(1)} tile`);
  console.log(`ok: per melontar ${((y0 - top) / T).toFixed(1)} tile`);
}
// Per samping: lari cepat mendatar.
{
  const g = mk(['.S>...................................E', '#######################################'].map((r) => r));
  g.p.y -= 0; run(g, 0.2, { dir: 1 });
  const x0 = cx(g); run(g, 0.3, { dir: 1 });
  assert.ok((cx(g) - x0) / 0.3 > 400, 'per samping melaju lebih cepat dari lari biasa');
  console.log('ok: per samping melontar mendatar');
}
// Pipa: masuk di ( lalu keluar di ) di lantai atas.
{
  const g = mk(pad(['', '', '.........)..', '.......#####', '', '', '', '', '', '.S.(.......E', '############']));
  let seen = false;
  run(g, 3, (g) => { if (g.pipe) seen = true; return { dir: g.pipe || seen ? 0 : 1 }; });
  assert.ok(seen, 'masuk pipa');
  assert.ok(Math.abs(cx(g) - 9.5 * T) < 8 && Math.abs(feet(g) - 3 * T) < 1, `keluar di mulut atas (x=${cx(g)}, kaki=${feet(g)})`);
  console.log('ok: pipa membawa hero ke lantai atas');
}
// Platform gerak mendatar membawa hero.
{
  const g = mk(pad(['', '', '', '', '', '', '', '', '...------...', '', '', '', '', '', '', '', '', '', '', '', '.S........E.']));
  const m = g.L.movers[0];
  Sim.place(g, { x: m.x + T, y: m.y });
  run(g, 0.2, { dir: 0 });
  const dx0 = cx(g) - m.x;
  run(g, 1.5, { dir: 0 });
  assert.ok(g.p.onGround && Math.abs(cx(g) - m.x - dx0) < 2, 'hero tetap di atas platform yang bergerak');
  assert.ok(m.x !== m.x0, 'platform bergerak');
  console.log('ok: platform gerak membawa hero');
}
// Lift naik membawa hero dari bawah ke atas.
{
  const g = mk(pad(['', '', '', '#####|######', '.....|......', '.....|......', '.....|......', '.....|......', '.....|......', '.S...|......', '############']));
  const m = g.L.movers[0];
  Sim.place(g, { x: m.x + T, y: m.y });
  let best = 99999; run(g, 7, (g) => { best = Math.min(best, feet(g)); return { dir: 0 }; });
  assert.ok(best <= 4 * T, `lift membawa hero ke atas (kaki terbaik ${best})`);
  console.log('ok: lift membawa hero naik');
}
// Papan rapuh runtuh setelah diinjak lalu muncul lagi.
{
  const g = mk(pad(['', '', '', '', '', '...~~~......', '', '', '', '', '.S..........', '############']));
  const c = g.L.crumbles[1];
  Sim.place(g, { x: c.x + T / 2, y: c.y });
  run(g, 0.3, { dir: 0 });
  assert.ok(g.p.onGround && Math.abs(feet(g) - c.y) < 1, 'berdiri di papan rapuh');
  run(g, 0.6, { dir: 0 });
  assert.ok(feet(g) > c.y + 8, 'papan runtuh dan hero jatuh');
  run(g, 3.5, { dir: 1 });
  assert.ok(g.L.crumbles.every((x) => x.state === 'idle'), 'papan muncul lagi');
  console.log('ok: papan rapuh runtuh dan muncul lagi');
}
// Kotak didorong ke tombol: gerbang terbuka dan tetap terbuka saat hero pergi.
{
  const g = mk(pad(['', '', '', '', '', '', '', '', '', '.S.B.._..1.E', '############']));
  const gate = g.L.gates[0];
  assert.strictEqual(gate.open, false);
  run(g, 4, (g) => ({ dir: gate.open ? 0 : 1 }));
  assert.ok(gate.open, 'kotak di tombol membuka gerbang');
  const b = g.boxes[0];
  assert.ok(b.x > 5.5 * T && b.x < 7 * T, `kotak di atas tombol (x=${b.x})`);
  // lompati kotak lalu lewati gerbang
  run(g, 6, (g) => ({ dir: 1, jump: g.p.onGround && cx(g) < b.x && b.x - (g.p.x + g.p.w) < 6, jumpHeld: true }));
  assert.strictEqual(g.phase, 'won', 'hero lewat gerbang yang terbuka');
  console.log('ok: kotak dorong menahan tombol, gerbang terbuka');
}
// Tombol tanpa kotak: gerbang menutup lagi setelah hero turun dari tombol (tidak menutup di atas hero).
{
  const g = mk(pad(['', '', '', '', '', '', '', '', '', '.S._...1...E', '############']));
  const gate = g.L.gates[0];
  run(g, 0.6, (g) => ({ dir: cx(g) < 3.5 * T ? 1 : 0 }));
  assert.ok(gate.open, 'berdiri di tombol membuka gerbang');
  run(g, 1.5, { dir: -1 });
  assert.ok(!gate.open, 'gerbang menutup setelah tombol dilepas');
  console.log('ok: tombol injak hanya aktif selama ditekan');
}
// Tuas: sekali disentuh, gerbang tetap terbuka.
{
  const g = mk(pad(['', '', '', '', '', '', '', '', '', '.S.t..1...E.', '############']));
  const g2 = mk(pad(['', '', '', '', '', '', '', '', '', '.S.y..1...E.', '############']));
  run(g2, 4, { dir: 1 });
  assert.notStrictEqual(g2.phase, 'won', 'tuas kanal lain tidak membuka gerbang 1');
  run(g, 4, { dir: 1 });
  assert.strictEqual(g.phase, 'won', 'tuas membuka gerbang kanal yang sama');
  console.log('ok: tuas membuka gerbang sesuai warna kanal');
}
// Tuas dan tombol macet: memunculkan soal sekali per sentuhan; gerbang baru terbuka setelah soal selesai.
{
  const evs = []; const g0 = mk(pad(['', '', '', '', '', '', '', '', '', '.S.T..1...E.', '############']));
  for (let i = 0; i < 180; i++) { Sim.update(g0, 1 / 60, { dir: 1 }); evs.push(...g0.events); g0.events.length = 0; }
  const qs = evs.filter((e) => e.type === 'quiz');
  assert.strictEqual(qs.length, 1, 'soal muncul satu kali selama hero menempel');
  assert.ok(qs[0].what === 'lever' && !g0.L.gates[0].open && g0.phase === 'play', 'tuas macet tidak membuka gerbang');
  Sim.solveQuiz(g0, 'lever', qs[0].id);
  assert.ok(g0.L.gates[0].open, 'soal selesai: tuas menyala, gerbang terbuka');
  run(g0, 3, { dir: 1 });
  assert.strictEqual(g0.phase, 'won');
  const h = mk(pad(['', '', '', '', '', '', '', '', '', '.S.j..1...E.', '############']));
  const hev = []; for (let i = 0; i < 60; i++) { Sim.update(h, 1 / 60, { dir: h.p.x < 3 * T ? 1 : 0 }); hev.push(...h.events); h.events.length = 0; }
  assert.ok(hev.some((e) => e.type === 'quiz' && e.what === 'plate') && !h.L.gates[0].open, 'tombol macet meminta soal dulu');
  Sim.solveQuiz(h, 'plate', 0); run(h, 0.2, { dir: 0 });
  assert.ok(h.L.gates[0].open, 'tombol yang sudah tidak macet bekerja saat diinjak');
  console.log('ok: tuas dan tombol macet meminta soal dulu');
}
// Skill jagoan sesuai hero; MH1 dan tanpa nama memakai lempar.
{
  assert.strictEqual(mk(pad(['', '', '.S..'])).skill, 'lempar');
  assert.strictEqual(mk(pad(['', '', '.S..']), { hero: 'owi' }).skill, 'terjang');
  assert.strictEqual(mk(pad(['', '', '.S..']), { hero: 'dudu' }).skill, 'hantam');
  assert.strictEqual(mk(pad(['', '', '.S..']), { hero: 'hero2' }).skill, 'lempar');
  console.log('ok: skill dipilih dari jagoan');
}
// Pinki: bola api memantul, mengalahkan musuh dari jauh dan menyalakan tuas di seberang jurang.
{
  const g = mk(pad(['', '', '', '', '', '', '', '', '', '.S.....e....', '############']), { hero: 'pinki' });
  run(g, 0.2, { dir: 0 });
  run(g, 0.05, { dir: 0, skill: true });
  run(g, 1, { dir: 0 });
  assert.ok(g.enemies[0].dead && g.hurts === 0, 'musuh kalah oleh bola api');
  const h = mk(pad(['', '', '', '', '', '', '', '', '', '.S....t.1.E.', '######.#####']), { hero: 'pinki' });
  run(h, 0.2, { dir: 0 }); run(h, 0.05, { dir: 0, skill: true }); run(h, 1, { dir: 0 });
  assert.ok(h.L.levers[0].on && h.L.gates[0].open, 'bola api menyalakan tuas dari jauh');
  console.log('ok: Pinki melempar bola api');
}
// Lompat ganda selalu ada; Meluncur (kekuatan super) membuat hero menyeberang jurang yang terlalu lebar.
{
  const map = ['', '', '', '', '', '', '', '', '', '', '', '', '.S..................', '#####...........####'];
  const plain = mk(map), glide = mk(map);
  Sim.grantPower(glide, 'glide');
  const plan = (g) => ({ dir: cx(g) < 17 * T ? 1 : 0, jump: (g.p.onGround && cx(g) > 4.3 * T && cx(g) < 6 * T) || (!g.p.onGround && !g.djumpUsed && g.p.vy > 0), jumpHeld: true });
  let dj = false;
  run(plain, 3, (g) => { if (g.djumpUsed) dj = true; return plan(g); }); run(glide, 5, plan);
  assert.ok(dj, 'lompat ganda tanpa kekuatan super');
  assert.ok(plain.hurts >= 1 && glide.hurts === 0 && glide.p.onGround && cx(glide) > 16 * T, `hanya yang meluncur menyeberang (biasa jatuh ${plain.hurts}x, meluncur x=${(cx(glide) / T).toFixed(1)})`);
  console.log('ok: lompat ganda bawaan, meluncur menyeberang jurang lebar');
}
// Perisai menahan pukulan lalu pulih sendiri setelah 10 detik.
{
  const g = mk(pad(['', '', '.S..']));
  Sim.grantPower(g, 'shield');
  Sim.hurt(g, 'musuh');
  assert.ok(g.hearts === Sim.HEARTS && !g.shield.ready, 'perisai menahan pukulan pertama');
  g.invuln = 0; Sim.hurt(g, 'musuh');
  assert.strictEqual(g.hearts, Sim.HEARTS - 1, 'perisai belum pulih: pukulan kedua kena');
  run(g, 10.2, { dir: 0 });
  assert.ok(g.shield.ready && g.power === 'shield', 'perisai pulih setelah 10 detik');
  console.log('ok: perisai pulih tiap 10 detik');
}
// Semua jagoan bisa memecah blok retak: Dudu menghantam (beberapa lapis), Pinki bola api, Owi menukik.
{
  const map = pad(['', '', '', '', '', '', '.S..........', '##x#########', '..x.........', '#..*........', '############']);
  const g = mk(map, { hero: 'dudu' });
  Sim.place(g, { x: 2.5 * T, y: 7 * T }); run(g, 0.2, { dir: 0 });
  run(g, 0.05, { dir: 0, skill: true }); run(g, 1.5, { dir: 0 });
  assert.ok(g.L.cracks.every((k) => k.broken) && feet(g) === 10 * T, `dua lapis blok retak pecah (kaki=${feet(g)})`);
  const n = mk(pad(['', '', '', '', '', '', '.S..........', '#####x######', '............', '############']), { hero: 'pinki' });
  run(n, 0.2, { dir: 0 }); run(n, 0.05, { dir: 0, skill: true }); run(n, 1.2, { dir: 0 });
  assert.ok(n.L.cracks[0].broken, 'bola api Pinki memecah blok retak di lantai');
  const o = mk(pad(['', '', '', '', '', '', '.S..........', '#####x######', '............', '############']), { hero: 'owi' });
  Sim.place(o, { x: 3.5 * T, y: 7 * T }); run(o, 0.2, { dir: 0 });
  run(o, 0.15, { dir: 1, jump: o.t < 0.22, jumpHeld: true }); run(o, 0.05, { dir: 1, skill: true }); run(o, 1, { dir: 0 });
  assert.ok(o.L.cracks[0].broken, 'terjang Owi menukik memecah blok retak');
  console.log('ok: semua jagoan memecah blok retak');
}
// Musuh MH1: banteng menyeruduk dan pusing saat menabrak dinding; lebah dan meriam tidak bisa diinjak; meriam menembak.
{
  const g = mk(pad(['', '', '', '', '', '', '', '', '', '#S......r..#', '############']));
  run(g, 0.1, { dir: 0 });
  const e = g.enemies[0]; e.dir = -1;
  let charged = false; run(g, 2, () => { if (e.state === 'charge') charged = true; return { dir: 0 }; });
  assert.ok(charged, 'banteng menyeruduk saat melihat hero');
  const f = mk(pad(['', '', '', '', '', '', '', '', '.S..f.......', '############']));
  run(f, 3, { dir: 1 });
  assert.ok(f.hurts >= 1 && !f.enemies[0].dead, 'lebah tidak bisa dilewati begitu saja');
  const c = mk(pad(['', '', '', '', '', '', '', '', '', '.S........n.', '############']));
  let shot = false; run(c, 4, (g) => { if (g.balls.length) shot = true; return { dir: 0 }; });
  assert.ok(shot && c.hurts >= 1, 'meriam menembak dan peluru melukai');
  console.log('ok: banteng, lebah, dan meriam seperti MH1');
}
// Gergaji melukai.
{
  const g = mk(pad(['', '', '', '', '', '', '', '', '', '.S..o.....E.', '############']));
  run(g, 1, { dir: 1 });
  assert.ok(g.hurts >= 1, 'gergaji melukai');
  console.log('ok: gergaji melukai');
}
console.log('semua uji mekanik Kejar lulus');
