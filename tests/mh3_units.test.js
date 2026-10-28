// Uji pasukan, monster, dan bos (Perisai Rumus) Bertahan MH3 tanpa layar:  node tests/mh3_units.test.js
const D = require('../public/mh3/js/defense/data.js');
const S = require('../public/mh3/js/defense/sim.js');
const P = require('../public/mh3/js/progress.js');
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.error('GAGAL: ' + m); } else console.log('ok: ' + m); };
function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const mk = (waves, extra) => S.create(Object.assign({ id: 99, nama: 't', tema: 'padang', startStars: 2000, skyEvery: 999, skyValue: 0, restTime: 1, loadout: [], waves }, extra), seeded(5));
const run = (g, sec, dt = 0.05) => { for (let t = 0; t < sec; t += dt) S.update(g, dt); };
const addM = (g, kind, col, y) => { const d = D.MONSTERS[kind]; const m = { id: g.nextId++, kind, col, y, hp: d.hp, max: d.hp, hurt: 0, atk: null, slow: 0, shield: false, gate: 0, openT: 0, healT: d.heal ? d.heal.every : 0, jumped: false }; g.monsters.push(m); return m; };
const quiet = (g) => { g.phase = 'wave'; g.spawns = []; g.waveT = 0; };

// ROSTER dan D.UNITS sinkron, semua pasukan punya biaya sama.
for (const u of P.ROSTER) { ok(!!D.UNITS[u.id], 'D.UNITS punya ' + u.id); ok(D.UNITS[u.id] && D.UNITS[u.id].cost === u.cost, 'biaya ' + u.id + ' sama dengan ROSTER'); }
ok(Object.keys(D.MONSTERS).filter((k) => !D.MONSTERS[k].boss).length === 7, '3 monster lama + 4 monster baru');
ok(['bos1', 'bos2', 'bos3', 'bos4'].every((k) => D.MONSTERS[k] && D.MONSTERS[k].boss), '4 bos');

// Penyihir: memperlambat.
let g = mk([[]]); quiet(g); S.place(g, 'penyihir', 2, 5); let m = addM(g, 'biasa', 2, 1);
run(g, 3); ok(m.slow > 0 || m.y < 1 + 0.2 * 3 * 0.8, 'penyihir memperlambat monster (slow=' + m.slow.toFixed(1) + ')');
// Meriam: ledakan kena tetangga.
g = mk([[]]); quiet(g); S.place(g, 'meriam', 2, 5); m = addM(g, 'tebal', 2, 2); const near = addM(g, 'tebal', 3, 2.2); const far = addM(g, 'tebal', 0, 2);
run(g, 4); ok(near.hp < near.max && far.hp === far.max && m.hp < m.max, 'meriam: pusat dan tetangga kena, kolom jauh tidak');
// Robo: laser kena semua monster satu jalur.
g = mk([[]]); quiet(g); S.place(g, 'robo', 1, 5); const a1 = addM(g, 'tebal', 1, 1.5), a2 = addM(g, 'tebal', 1, 3), b1 = addM(g, 'tebal', 2, 2);
run(g, 0.5); ok(a1.hp < a1.max && a2.hp < a2.max && b1.hp === b1.max, 'robo: laser kena seluruh jalur, bukan jalur lain');
// Rubah: 3 jalur.
g = mk([[]]); quiet(g); S.place(g, 'rubah', 2, 5); const r = [1, 2, 3, 0].map((c) => addM(g, 'raksasa', c, 1.5));
run(g, 1.5); ok(r[0].hp < r[0].max && r[1].hp < r[1].max && r[2].hp < r[2].max && r[3].hp === r[3].max, 'rubah menembak 3 jalur sekaligus');
// Anak: perisai satu baris.
g = mk([[]]); quiet(g); S.place(g, 'anak', 0, 3); S.place(g, 'tembok', 2, 3); const wall = g.grid[3][2]; addM(g, 'tebal', 4, 0.5); run(g, 0.6); m = addM(g, 'raksasa', 2, 3.2);
run(g, 3); ok(wall.hp === wall.max, 'anak melindungi tembok sebaris dari serangan');
g = mk([[]]); quiet(g); S.place(g, 'tembok', 2, 3); const wall2 = g.grid[3][2]; addM(g, 'raksasa', 2, 3.2); run(g, 3);
ok(wall2.hp < wall2.max, 'tanpa Anak, tembok yang sama rusak');
// Lompat: melewati tembok sekali.
g = mk([[]]); quiet(g); S.place(g, 'tembok', 2, 3); m = addM(g, 'lompat', 2, 3.2); run(g, 0.5);
ok(m.jumped && m.y > 4, 'monster lompat melewati penghadang pertama (y=' + m.y.toFixed(2) + ')');
// Pecah: jadi 2 biasa.
g = mk([[]]); quiet(g); m = addM(g, 'pecah', 2, 2); m.hp = 0; S.update(g, 0.05);
ok(g.monsters.filter((q) => q.kind === 'biasa').length === 2, 'monster pecah menjadi 2 monster biasa');
// Tabib: menyembuhkan.
g = mk([[]]); quiet(g); const tb = addM(g, 'tabib', 2, 2); const hurt = addM(g, 'tebal', 2, 2.2); hurt.hp = 3; run(g, 2.5);
ok(hurt.hp > 3, 'tabib menyembuhkan monster di dekatnya (hp ' + hurt.hp + ')');
// Upgrade menaikkan kerusakan: pemanah level 3 lebih cepat membunuh.
const dpsOf = (lv) => { const gg = mk([[]], { upg: { pemanah: lv } }); quiet(gg); S.place(gg, 'pemanah', 2, 5); const mm = addM(gg, 'raksasa', 2, 1.5); run(gg, 4); return mm.max - mm.hp; };
ok(dpsOf(3) > dpsOf(1) * 1.5, 'upgrade pemanah menambah kerusakan');

// Bos: awalnya tanpa perisai, perisai naik di 66% dan 33% HP, menolak semua serangan sampai soal PR dijawab.
g = mk([[]]); quiet(g); for (const c of [0, 1, 2, 3, 4]) S.place(g, 'pemanah', c, 5); S.place(g, 'meriam', 2, 6);
const boss = addM(g, 'bos1', 2, 1.2);
ok(!boss.shield && !S.shieldedBoss(g), 'bos mulai tanpa perisai');
for (let i = 0; i < 400 && !boss.shield; i++) S.update(g, 0.05);
ok(boss.shield && Math.abs(boss.hp / boss.max - 0.66) < 0.02, 'perisai pertama naik di 66% HP (hp ' + (boss.hp / boss.max).toFixed(2) + ')');
const hp1 = boss.hp; run(g, 5);
ok(boss.shield && boss.hp === hp1, 'Perisai Rumus menahan semua serangan (hp ' + boss.hp + ')');
S.usePower(Object.assign(g, { power: { key: 'meteor', cd: 0 } })); ok(boss.hp === hp1, 'meteor juga ditahan');
ok(S.shieldedBoss(g) === boss, 'shieldedBoss menunjuk bos berperisai');
ok(S.breakShield(g, boss.id) && !boss.shield, 'soal PR benar memecahkan perisai');
for (let i = 0; i < 800 && !boss.shield; i++) S.update(g, 0.05);
ok(boss.shield && Math.abs(boss.hp / boss.max - 0.33) < 0.02, 'perisai kedua naik di 33% HP (hp ' + (boss.hp / boss.max).toFixed(2) + ')');
S.breakShield(g, boss.id); run(g, 8); ok(boss.hp < 0.33 * boss.max - 0.01, 'sesudah perisai kedua pecah bos terluka lagi (hp ' + boss.hp + ')');
for (let i = 0; i < 2000 && boss.hp > 0; i++) S.update(g, 0.05);
ok(boss.hp <= 0 && boss.gate === 2, 'bos mati tanpa perisai ketiga');

// Pertarungan bos penuh lewat bot: tiap perisai muncul, bot "menjawab" soal.
function fightBoss(kind, seed) {
  const gg = S.create({ id: 98, nama: 'bos', tema: 'padang', startStars: 600, skyEvery: 5, skyValue: 25, restTime: 2, loadout: [], waves: [[{ m: kind, n: 1, start: 3, gap: 1 }]] }, seeded(seed));
  let breaks = 0;
  for (let i = 0; i < 40000 && gg.phase !== 'won' && gg.phase !== 'lost'; i++) {
    for (const p of gg.pickups.slice()) if (p.age > 0.3) S.collect(gg, p);
    const have = (k) => gg.grid.flat().filter((u) => u && u.kind === k).length;
    if (have('menara') < 2 && !S.canPlace(gg, 'menara', have('menara') ? 1 : 0, 6)) S.place(gg, 'menara', have('menara') ? 1 : 0, 6);
    for (const c of [2, 1, 3, 0, 4]) if (!S.canPlace(gg, 'pemanah', c, 5)) { S.place(gg, 'pemanah', c, 5); break; }
    if (gg.phase === 'rest') S.skip(gg);
    const b = S.shieldedBoss(gg); if (b && b.y > 1.5 && gg.t % 1 < 0.06) { if (S.breakShield(gg, b.id)) breaks++; }
    S.update(gg, 0.05);
  }
  return { phase: gg.phase, breaks, hearts: gg.hearts };
}
for (const k of ['bos1', 'bos2', 'bos3', 'bos4']) { const r = fightBoss(k, 11); ok(r.phase === 'won' && r.breaks === 2, k + ' bisa dimenangkan lewat perisai (pecah ' + r.breaks + 'x, hati ' + r.hearts + ')'); }
// Tanpa memecahkan perisai bos tidak pernah kalah-tapi-juga-tidak-mati: pasukan tak berguna.
g = mk([[{ m: 'bos1', n: 1, start: 1, gap: 1 }]]); for (const c of [0, 1, 2, 3, 4]) S.place(g, 'pemanah', c, 5); run(g, 800);
ok(g.phase === 'lost', 'tanpa memecahkan perisai Benteng jatuh (hati ' + g.hearts + ')');
process.exit(bad ? 1 : 0);
