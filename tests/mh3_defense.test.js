// Uji aturan Bertahan MH3 tanpa layar:  node tests/mh3_defense.test.js
const D = require('../public/mh3/js/defense/data.js');
const S = require('../public/mh3/js/defense/sim.js');
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.error('GAGAL: ' + m); } else console.log('ok: ' + m); };
function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

// Bot sederhana: ambil semua Bintang, bangun 2 menara di baris belakang, lalu pemanah di kolom yang diserang.
function play(levelId, seed, smart) {
  const g = S.create(D.level(levelId), seeded(seed));
  const dt = 0.1; let chestOpened = false;
  for (let i = 0; i < 20000 && g.phase !== 'won' && g.phase !== 'lost'; i++) {
    if (smart) {
      for (const p of g.pickups.slice()) if (p.age > 0.3) S.collect(g, p);
      const have = (k) => g.grid.flat().filter((u) => u && u.kind === k).length;
      if (have('menara') < 2 && !S.canPlace(g, 'menara', have('menara') ? 1 : 0, 5)) S.place(g, 'menara', have('menara') ? 1 : 0, 5);
      const cols = [2, 1, 3, 0, 4];
      for (const r of [4, 3]) for (const c of cols) if (!S.canPlace(g, 'pemanah', c, r) && have('pemanah') < 10) { S.place(g, 'pemanah', c, r); break; }
      if (g.chest && !chestOpened) { chestOpened = true; S.choosePower(g, 'beku'); g.chest = null; }
      if (g.power) { if (g.monsters.some((m) => m.y > 3)) S.usePower(g); }
      S.tickPower(g, dt);
      // Bos: pemecah Perisai Rumus lewat soal PR yang benar (bot selalu menjawab benar).
      const sb = S.shieldedBoss(g); if (sb) S.breakShield(g, sb.id);
      if (g.phase === 'rest' && g.restT > 1.5) S.skip(g);
    }
    S.update(g, dt);
  }
  return g;
}
const win = play(1, 7, true);
ok(win.phase === 'won', 'bot pintar menang Bertahan 1 (hati ' + win.hearts + ', t=' + Math.round(win.t) + 's)');
ok(win.hearts >= 1 && D.stars(win.hearts) >= 1, 'bintang level dari sisa hati');
let wins = 0; for (let s = 1; s <= 10; s++) if (play(1, s, true).phase === 'won') wins++;
ok(wins === 10, 'bot menang di 10 dari 10 seed (' + wins + ')');
// Semua 12 level Bertahan (termasuk 4 bos) harus bisa dimenangkan bot di 10 seed.
for (const L of D.LEVELS) {
  let w = 0; for (let s = 1; s <= 10; s++) if (play(L.id, s, true).phase === 'won') w++;
  ok(w === 10, 'level Bertahan ' + L.id + ' "' + L.nama + '" menang di 10 dari 10 seed (' + w + ')');
}
const lose = play(1, 3, false);
ok(lose.phase === 'lost', 'tanpa pasukan Benteng jatuh (t=' + Math.round(lose.t) + 's)');
ok(lose.t > 60, 'level tidak kalah terlalu cepat');
// Aturan dasar.
const g = S.create(D.level(1), seeded(1));
ok(S.place(g, 'pemanah', 2, 3) === null && g.stars === 50, 'taruh pemanah memotong 100 Bintang');
ok(S.place(g, 'pemanah', 2, 3) === 'penuh', 'petak terisi ditolak');
ok(S.place(g, 'tembok', 0, 0) === null, 'tembok dengan Bintang cukup');
ok(S.place(g, 'menara', 1, 0) === 'bintang', 'Bintang kurang ditolak');
process.exit(bad ? 1 : 0);
