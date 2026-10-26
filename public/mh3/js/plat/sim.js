// Math Hero 3: logika level Kejar (platformer MH1 versi layar tegak). Tanpa DOM supaya bisa diuji di Node.
// Level ditulis sebagai peta teks (satu string per baris, atas ke bawah, tile 32 px):
//   # padat   = tembus dari bawah   S awal   E tujuan (kristal)   c checkpoint   * bintang
//   e musuh jalan   ^ duri   P Peti Kekuatan (PR, tidak menghalangi)   K Peti Kristal (PR, tidak menghalangi)
// Kolom di luar peta = dinding, baris di bawah peta = jurang.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./physics.js'));
  else (root.MH3 = root.MH3 || {}).platSim = factory(root.Physics);
})(typeof self !== 'undefined' ? self : this, function (Physics) {
  const { C, T, stepBody, overlap } = Physics;
  const HEARTS = 3, INVULN = 1.4, WALK = 55, RESPAWN_FALL = 140;

  function parse(def) {
    const rows = def.map.length, cols = Math.max(...def.map.map((r) => r.length));
    const L = { cols, rows, tiles: new Uint8Array(cols * rows), stars: [], enemies: [], spikes: [], checkpoints: [], chests: [], start: null, goal: null };
    def.map.forEach((line, r) => {
      for (let c = 0; c < cols; c++) {
        const ch = line[c] || '.', x = c * T, y = r * T;
        if (ch === '#') L.tiles[r * cols + c] = 1;
        else if (ch === '=') L.tiles[r * cols + c] = 2;
        else if (ch === 'S') L.start = { x: x + T / 2, y: y + T };
        else if (ch === 'E') L.goal = { x: x + 4, y: y - T, w: T - 8, h: T * 2 };
        else if (ch === 'c') L.checkpoints.push({ x: x + T / 2, y: y + T, got: false, id: L.checkpoints.length });
        else if (ch === '*') L.stars.push({ x: x + T / 2, y: y + T / 2, got: false, id: L.stars.length });
        else if (ch === 'e') L.enemies.push({ x: x + 2, y: y + T - 30, id: L.enemies.length });
        else if (ch === '^') L.spikes.push({ x: x + 3, y: y + 12, w: T - 6, h: T - 12 });
        else if (ch === 'P' || ch === 'K') L.chests.push({ kind: ch === 'P' ? 'power' : 'crystal', x: x - 4, y: y - 8, w: T + 8, h: T + 8, got: false, id: L.chests.length });
      }
    });
    if (!L.start) throw new Error('Level tanpa S');
    if (!L.goal) throw new Error('Level tanpa E');
    return L;
  }

  function create(def) {
    const L = parse(def);
    const g = {
      def, L, t: 0, phase: 'play', hearts: HEARTS, invuln: 0, stars: 0, deaths: 0, hurts: 0, events: [], power: null,
      cp: { x: L.start.x, y: L.start.y }, coyote: 0, buffer: 0, face: 1, anim: 'idle', djumpUsed: false, enemies: [],
      p: { x: 0, y: 0, w: C.PW, h: C.PH, vx: 0, vy: 0, onGround: false },
    };
    g.enemies = L.enemies.map((e) => ({ id: e.id, b: { x: e.x, y: e.y, w: 28, h: 30, vx: -WALK, vy: 0, onGround: false }, dir: -1, dead: false, timer: 0, x0: e.x, y0: e.y }));
    place(g, g.cp);
    return g;
  }
  function place(g, pt) { const p = g.p; p.x = pt.x - p.w / 2; p.y = pt.y - p.h; p.vx = p.vy = 0; p.onGround = false; }

  function hurt(g, why) {
    if (g.invuln > 0 || g.phase !== 'play') return;
    g.hearts--; g.hurts++; g.invuln = INVULN; g.events.push({ type: 'hurt', why });
    if (g.power === 'shield') { g.power = null; g.hearts++; g.hurts--; g.events.push({ type: 'shieldBreak' }); return; }
    if (g.hearts <= 0) {
      // Habis hati: ulang dari checkpoint terakhir dengan hati penuh. Level tidak pernah macet.
      g.deaths++; g.hearts = HEARTS; place(g, g.cp); g.invuln = INVULN + 0.6; g.events.push({ type: 'respawn' });
    } else if (why === 'jatuh') place(g, g.cp);
  }

  function grantPower(g, key) { g.power = key; g.djumpUsed = false; g.events.push({ type: 'power', key }); }

  // in: { dir: -1|0|1, jump: tombol lompat baru ditekan, jumpHeld: masih ditahan }
  function update(g, dt, input) {
    if (g.phase !== 'play') return;
    dt = Math.min(dt, 1 / 30);
    g.t += dt;
    const p = g.p, L = g.L;
    g.invuln = Math.max(0, g.invuln - dt);
    // --- gerak pemain ---
    const dir = input.dir || 0;
    p.vx = dir * C.MOVE;
    if (dir) g.face = dir;
    if (input.jump) g.buffer = C.BUFFER; else g.buffer = Math.max(0, g.buffer - dt);
    g.coyote = p.onGround ? C.COYOTE : Math.max(0, g.coyote - dt);
    if (g.buffer > 0) {
      if (g.coyote > 0) { p.vy = C.JUMP; g.coyote = 0; g.buffer = 0; g.djumpUsed = false; g.events.push({ type: 'jump' }); }
      else if (g.power === 'djump' && !g.djumpUsed && !p.onGround) { p.vy = C.DJUMP; g.djumpUsed = true; g.buffer = 0; g.events.push({ type: 'djump' }); }
    }
    // lompat pendek jika tombol dilepas lebih awal
    if (!input.jumpHeld && p.vy < -200) p.vy += C.GRAVITY * dt * 1.5;
    p.vy += C.GRAVITY * dt;
    const wasGround = p.onGround;
    const r = stepBody(p, dt, L, []);
    if (r.landed && !wasGround) g.events.push({ type: 'land' });
    g.anim = !p.onGround ? (p.vy < 0 ? 'jump' : 'fall') : dir ? 'run' : 'idle';
    if (p.y > L.rows * T + RESPAWN_FALL) hurt(g, 'jatuh');

    // --- musuh jalan ---
    for (const e of g.enemies) {
      if (e.dead) { e.timer -= dt; continue; }
      const b = e.b;
      b.vx = e.dir * WALK; b.vy += C.GRAVITY * dt;
      const hit = stepBody(b, dt, L, []);
      const ahead = Math.floor((b.x + (e.dir > 0 ? b.w + 2 : -2)) / T), below = Math.floor((b.y + b.h + 2) / T);
      const edge = b.onGround && Physics.tileAt(L, ahead, below) === 0;
      if (hit.hitWall || edge) { e.dir = -e.dir; }
      if (b.y > L.rows * T + 200) e.dead = true;
      if (!e.dead && overlap(p, b)) {
        const stomp = p.vy > 60 && p.y + p.h - b.y < 22;
        if (stomp) { e.dead = true; e.timer = 0.4; p.vy = input.jumpHeld ? C.JUMP * 0.85 : C.JUMP * 0.6; g.djumpUsed = false; g.events.push({ type: 'stomp', x: b.x + b.w / 2, y: b.y }); }
        else hurt(g, 'musuh');
      }
    }
    for (const s of L.spikes) if (overlap(p, s)) hurt(g, 'duri');

    // --- benda ambil ---
    const mag = g.power === 'magnet' ? 120 : 0, pc = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    for (const s of L.stars) {
      if (s.got) continue;
      const d = Math.hypot(s.x - pc.x, s.y - pc.y);
      if (d < 24 || (mag && d < mag)) { if (mag && d >= 24) { s.x += (pc.x - s.x) * Math.min(1, dt * 10); s.y += (pc.y - s.y) * Math.min(1, dt * 10); if (Math.hypot(s.x - pc.x, s.y - pc.y) > 24) continue; } s.got = true; g.stars++; g.events.push({ type: 'star', x: s.x, y: s.y }); }
    }
    for (const c of L.checkpoints) if (!c.got && Math.abs(c.x - pc.x) < 28 && Math.abs(c.y - (p.y + p.h)) < 70) { c.got = true; g.cp = { x: c.x, y: c.y }; g.events.push({ type: 'checkpoint', x: c.x, y: c.y }); }
    for (const ch of L.chests) {
      const on = overlap(p, ch);
      if (!on) ch.skip = false; // peti yang ditunda terbuka lagi setelah hero menjauh
      else if (!ch.got && !ch.skip) { ch.got = true; g.events.push({ type: 'chest', kind: ch.kind, id: ch.id }); }
    }
    if (overlap(p, L.goal)) { g.phase = 'won'; g.events.push({ type: 'win' }); }
  }

  // Bintang 1-3: 3 dari hati utuh dan bintang banyak, minimal 1 jika selesai.
  function rating(g) {
    const total = g.L.stars.length || 1, frac = g.stars / total;
    return Math.max(1, Math.min(3, 1 + (g.hurts === 0 && g.deaths === 0 ? 1 : 0) + (frac >= 0.7 ? 1 : 0)));
  }

  return { HEARTS, parse, create, update, hurt, grantPower, rating, place };
});
