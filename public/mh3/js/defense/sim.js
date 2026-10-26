// Math Hero 3: aturan permainan Bertahan, murni logika (tanpa DOM) supaya bisa diuji dengan bot di Node.
// Koordinat: kolom 0..4, y dalam petak (0 = tepi atas grid, ROWS = tepi bawah = Benteng). Monster turun ke bawah.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'));
  else (root.MH3 = root.MH3 || {}).defenseSim = factory(root.MH3.defenseData);
})(typeof self !== 'undefined' ? self : this, function (D) {
  const { COLS, ROWS, UNITS, MONSTERS } = D;
  const HEARTS = 5;
  const BODY = 0.8; // tinggi tubuh monster (petak) di atas posisi kakinya

  function create(level, rng) {
    rng = rng || Math.random;
    const g = {
      level, rng, t: 0, stars: level.startStars, hearts: HEARTS,
      grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
      monsters: [], arrows: [], pickups: [], events: [], nextId: 1,
      cards: {}, // sisa isi ulang kartu per jenis pasukan
      wave: 0, phase: 'rest', restT: 3, waveT: 0, spawns: [], skyT: level.skyEvery * 0.5,
      lastCol: -1, chest: null, power: null, mult: 1, multT: 0, freezeT: 0, kills: 0,
    };
    return g;
  }

  function ev(g, type, data) { g.events.push(Object.assign({ type }, data)); }

  // Susun jadwal kemunculan satu gelombang. Kolom dipilih acak, tidak dua kali berturut-turut di kolom yang sama.
  function buildSpawns(g, groups) {
    const out = [];
    for (const gr of groups) for (let i = 0; i < gr.n; i++) out.push({ at: gr.start + i * gr.gap, m: gr.m });
    out.sort((a, b) => a.at - b.at);
    for (const s of out) {
      let c; do { c = Math.floor(g.rng() * COLS); } while (c === g.lastCol && COLS > 1);
      s.col = c; g.lastCol = c;
    }
    return out;
  }

  function startWave(g) {
    g.phase = 'wave'; g.waveT = 0;
    g.spawns = buildSpawns(g, g.level.waves[g.wave]);
    ev(g, 'wave', { index: g.wave, total: g.level.waves.length });
  }

  function canPlace(g, kind, col, row) {
    const u = UNITS[kind];
    if (!u || col < 0 || col >= COLS || row < 0 || row >= ROWS) return 'luar';
    if (g.grid[row][col]) return 'penuh';
    if (g.cards[kind] > 0) return 'isi_ulang';
    if (g.stars < u.cost) return 'bintang';
    return null;
  }
  function place(g, kind, col, row) {
    const why = canPlace(g, kind, col, row);
    if (why) return why;
    const u = UNITS[kind];
    g.stars -= u.cost; g.cards[kind] = u.cd;
    // Upgrade (level.upg[kind] = 1..3, dibeli dengan Kunci Kristal): tiap level +30% HP, +50% kerusakan, +40% Bintang.
    const lv = Math.max(0, ((g.level.upg || {})[kind] || 1) - 1), hp = Math.round(u.hp * (1 + 0.3 * lv) * 10) / 10;
    g.grid[row][col] = { kind, hp, max: hp, lv, col, row, fire: 0.4, make: u.first || 0, id: g.nextId++, hurt: 0 };
    ev(g, 'place', { kind, col, row });
    return null;
  }

  // Ambil Bintang yang jatuh.
  function collect(g, p) {
    const i = g.pickups.indexOf(p);
    if (i < 0) return false;
    g.pickups.splice(i, 1);
    g.stars += p.value * g.mult;
    ev(g, 'star', { x: p.x, y: p.y, value: p.value * g.mult });
    return true;
  }

  function skip(g) { if (g.phase === 'rest') g.restT = 0; }

  function hitCastle(g, m) {
    g.hearts = Math.max(0, g.hearts - 1);
    ev(g, 'castle', { col: m.col, hearts: g.hearts });
    if (g.hearts <= 0) { g.phase = 'lost'; ev(g, 'lost', {}); }
  }

  function update(g, dt) {
    if (g.phase === 'won' || g.phase === 'lost') return;
    g.t += dt;
    for (const k in g.cards) g.cards[k] = Math.max(0, g.cards[k] - dt);
    if (g.multT > 0) { g.multT -= dt; if (g.multT <= 0) g.mult = 1; }
    const frozen = g.freezeT > 0; if (frozen) g.freezeT -= dt;

    // Bintang dari langit.
    g.skyT -= dt;
    if (g.skyT <= 0) {
      g.skyT += g.level.skyEvery;
      g.pickups.push({ x: Math.floor(g.rng() * COLS) + 0.5, y: -0.4, ty: 0.8 + g.rng() * (ROWS - 1.6), value: g.level.skyValue, sky: true, age: 0, id: g.nextId++ });
    }
    for (const p of g.pickups) {
      p.age += dt;
      if (p.y < p.ty) p.y = Math.min(p.ty, p.y + 1.8 * dt);
    }
    g.pickups = g.pickups.filter((p) => p.age < (p.sky ? 14 : 12));

    // Gelombang.
    if (g.phase === 'rest') {
      g.restT -= dt;
      if (g.restT <= 0) startWave(g);
    } else if (g.phase === 'wave') {
      g.waveT += dt;
      while (g.spawns.length && g.spawns[0].at <= g.waveT) {
        const s = g.spawns.shift(), d = MONSTERS[s.m];
        g.monsters.push({ id: g.nextId++, kind: s.m, col: s.col, y: -0.2, hp: d.hp, max: d.hp, hurt: 0, atk: null, slow: 0 });
      }
      if (!g.spawns.length && !g.monsters.length) {
        const idx = g.wave;
        ev(g, 'waveClear', { index: idx });
        if (g.level.chestAfter === idx) g.chest = { kind: 'kuasa' };
        g.wave++;
        if (g.wave >= g.level.waves.length) { g.phase = 'won'; ev(g, 'won', { stars: D.stars(g.hearts) }); }
        else { g.phase = 'rest'; g.restT = g.level.restTime; }
      }
    }

    // Pasukan: menembak dan menghasilkan Bintang.
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const u = g.grid[r][c];
      if (!u) continue;
      const d = UNITS[u.kind];
      if (u.hurt > 0) u.hurt -= dt;
      if (d.make) {
        u.make -= dt;
        if (u.make <= 0) { u.make += d.make; g.pickups.push({ x: c + 0.5, y: r + 0.3, ty: r + 0.3, value: Math.round(d.value * (1 + 0.4 * u.lv)), age: 0, id: g.nextId++ }); ev(g, 'make', { col: c, row: r }); }
      }
      if (d.fire) {
        u.fire -= dt;
        const target = g.monsters.some((m) => m.col === c && m.y >= 0.2 && m.y - BODY < r + 0.5);
        if (u.fire <= 0 && target) { u.fire = d.fire; g.arrows.push({ col: c, y: r + 0.2, dmg: d.dmg * (1 + 0.5 * u.lv) }); ev(g, 'shoot', { col: c, row: r }); }
        else if (u.fire < 0) u.fire = 0;
      }
    }

    // Anak panah.
    for (const a of g.arrows) {
      const ny = a.y - 7 * dt;
      const m = g.monsters.filter((q) => q.col === a.col && q.hp > 0 && ny <= q.y + 0.1 && a.y >= q.y - BODY).sort((p, q) => q.y - p.y)[0];
      if (m) { m.hp -= a.dmg; m.hurt = 0.15; a.dead = true; ev(g, 'hit', { col: m.col, y: m.y }); }
      else a.y = ny;
      if (a.y < -1) a.dead = true;
    }
    g.arrows = g.arrows.filter((a) => !a.dead);

    // Monster bergerak atau menyerang pasukan yang menghadang.
    for (const m of g.monsters) {
      if (m.hurt > 0) m.hurt -= dt;
      const d = MONSTERS[m.kind];
      m.atk = null;
      for (let r = 0; r < ROWS; r++) {
        const u = g.grid[r][m.col];
        if (u && m.y >= r + 0.15 && m.y <= r + 1.2) { m.atk = u; break; }
      }
      if (m.atk) {
        m.atk.hp -= d.dps * dt; m.atk.hurt = 0.12;
        if (m.atk.hp <= 0) { g.grid[m.atk.row][m.atk.col] = null; ev(g, 'unitDown', { kind: m.atk.kind, col: m.atk.col, row: m.atk.row }); m.atk = null; }
      } else if (!frozen) m.y += d.spd * dt;
      if (m.y >= ROWS && g.phase !== 'lost') { m.reached = true; hitCastle(g, m); }
    }
    for (const m of g.monsters) if (m.hp <= 0) { g.kills++; ev(g, 'kill', { col: m.col, y: m.y, kind: m.kind }); }
    g.monsters = g.monsters.filter((m) => m.hp > 0 && !m.reached);
  }

  // Kekuatan super dari Peti PR. Dipilih sekali, dipakai dari tombol dengan isi ulang.
  const POWERS = {
    meteor: { nama: 'Hujan Meteor', info: 'Semua monster di layar kena 3 kerusakan', cd: 40 },
    bintang2: { nama: 'Bintang x2', info: 'Bintang dobel selama 60 detik', cd: 90 },
    beku: { nama: 'Bekukan Semua', info: 'Monster berhenti 8 detik', cd: 45 },
  };
  function choosePower(g, key) { g.power = { key, cd: 0 }; }
  function usePower(g) {
    const p = g.power;
    if (!p || p.cd > 0 || g.phase === 'won' || g.phase === 'lost') return false;
    p.cd = POWERS[p.key].cd;
    if (p.key === 'meteor') { for (const m of g.monsters) { m.hp -= 3; m.hurt = 0.3; } ev(g, 'meteor', {}); }
    else if (p.key === 'bintang2') { g.mult = 2; g.multT = 60; }
    else if (p.key === 'beku') { g.freezeT = 8; }
    return true;
  }
  function tickPower(g, dt) { if (g.power && g.power.cd > 0) g.power.cd = Math.max(0, g.power.cd - dt); }

  return { create, update, place, canPlace, collect, skip, choosePower, usePower, tickPower, POWERS, COLS, ROWS, HEARTS, BODY };
});
