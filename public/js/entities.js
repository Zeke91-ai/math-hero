// Musuh, jebakan, platform bergerak, jembatan, platform pilih, dan bos Math Hero.
// Logika dan gambar. Keadaan disimpan di objek dunia W (dibuat di main.js).
(function () {
  const { C, T, stepBody, overlap, tileAt } = window.Physics;
  const A = window.Assets;
  const S = 2; // skala sprite

  // Musuh biasa. faces = arah hadap sprite asli (1 kanan, -1 kiri).
  const EN = {
    a: { run: 'enemy2_run', idle: 'enemy2_idle', hit: 'enemy2_hit', w: 40, h: 56, speed: 46, stomp: true, faces: 1, dmg: 15 },
    b: { run: 'enemy1_run', idle: 'enemy1_idle', hit: 'enemy1_hit', w: 40, h: 60, speed: 62, stomp: true, faces: 1, dmg: 15 },
    r: { run: 'enemy3_walk', idle: 'enemy3_idle', charge: 'enemy3_charge', stun: 'enemy3_stun', hit: 'enemy3_hit', w: 40, h: 56, speed: 36, stomp: false, faces: 1, dmg: 20 },
    f: { run: 'enemy5_fly', idle: 'enemy5_idle', hit: 'enemy5_hit', w: 44, h: 44, speed: 0, stomp: false, faces: 1, dmg: 15 },
  };
  // Bos. sheet = awalan nama sprite.
  const BK = {
    dino: { sheet: 'enemy6', run: 'enemy6_run', idle: 'enemy6_idle', atk: 'enemy6_attack', hit: 'enemy6_hit', scale: 3, w: 66, h: 76, faces: -1 },
    raja: { sheet: 'enemy7', run: 'enemy7_run', idle: 'enemy7_idle', atk: 'enemy7_attack', hit: 'enemy7_hit', scale: 3, w: 66, h: 76, faces: -1 },
    robot: { sheet: 'enemy1', run: 'enemy1_run', idle: 'enemy1_idle', atk: 'enemy1_idle', hit: 'enemy1_hit', scale: 3, w: 70, h: 94, faces: 1 },
    meriam: { sheet: 'enemy4', run: 'enemy4_walk', idle: 'enemy4_idle', atk: 'enemy4_attack', hit: 'enemy4_hit', scale: 3, w: 84, h: 84, faces: -1 },
  };

  function init(W, L) {
    W.enemies = L.enemies.map(makeEnemy);
    W.cannons = L.cannons.map((c) => Object.assign({}, c, { t: Math.random() * 1.5, fire: 0, shot: true }));
    W.saws = L.saws.map((s) => Object.assign({}, s, { ang: 0, cx: s.x }));
    W.balls = []; W.drops = []; W.marks = [];
    W.movers = L.movers.map((m) => Object.assign({}, m, { cx: m.x, cy: m.y, dx: 0, dy: 0, vy: 0 }));
    W.crumbles = L.crumbles.map((c) => Object.assign({}, c, { state: 'ok', timer: 0, touched: false }));
    W.pilih = L.pilih.map(makePilih);
    W.bridges = L.bridges.map((b) => Object.assign({}, b, { built: 0 }));
    W.boss = L.boss ? makeBoss(L.boss) : null;
    W.arenaWall = null;
  }

  function makeEnemy(e) {
    const d = EN[e.type];
    const o = { type: e.type, d, dir: e.dir || -1, state: 'walk', t: Math.random() * 3, dead: false, timer: 0, w: d.w, h: d.h };
    if (e.type === 'f') {
      Object.assign(o, { x0: e.x, y0: e.y, x: e.x, y: e.y, range: e.range, speed: e.speed, phase: Math.random() });
    } else {
      o.b = { x: e.x - d.w / 2, y: e.y - d.h, w: d.w, h: d.h, vx: 0, vy: 0, onGround: false };
    }
    return o;
  }

  function enemyBox(e) {
    if (e.type === 'f') return { x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h };
    return e.b;
  }

  function makePilih(p) {
    const q = window.MathQuiz.generate(p.op, p.lv);
    const wrong = window.MathQuiz.distractors(q.answer, p.cols.length - 1);
    const all = window.MathQuiz.shuffle([q.answer].concat(wrong));
    return {
      prompt: q.expr.replace(/×/g, 'x').replace(/÷/g, ':'), solved: false, lv: p.lv, y: p.y,
      tiles: p.cols.map((c, i) => ({ x: c * T, y: p.y, w: p.w * T, value: all[i], correct: all[i] === q.answer, state: 'ok', timer: 0 })),
    };
  }

  function makeBoss(d) {
    const k = BK[d.kind];
    return {
      def: d, k, kind: d.kind, nama: d.nama, hp: d.hp, maxHp: d.hp, op: d.op, lv: d.lv, a0: d.a0,
      state: 'wait', t: 0, dir: -1, cycle: 0, shots: 0, defeated: false, flash: 0,
      b: { x: d.x - k.w / 2, y: d.y - k.h, w: k.w, h: k.h, vx: 0, vy: 0, onGround: false },
    };
  }

  // Persegi dinamis (padat atau tembus dari bawah) untuk fisika pemain dan musuh.
  function dynRects(W) {
    const d = [];
    for (const g of W.gates) if (!g.open) d.push({ x: g.x, y: g.y, w: g.w, h: g.h, ow: false, ref: g });
    for (const br of W.bridges) {
      const sw = br.len * T / br.parts;
      for (let i = 0; i < br.built; i++) d.push({ x: br.x + i * sw, y: br.y, w: sw, h: 14, ow: true, ref: br });
    }
    for (const m of W.movers) d.push({ x: m.cx, y: m.cy, w: m.w, h: 14, ow: true, vy: m.vy, ref: m });
    for (const c of W.crumbles) if (c.state !== 'gone') d.push({ x: c.x, y: c.y, w: T, h: 12, ow: true, ref: c });
    for (const pg of W.pilih) for (const t of pg.tiles) if (t.state !== 'gone') d.push({ x: t.x, y: t.y, w: t.w, h: 14, ow: true, ref: t });
    if (W.arenaWall) d.push(W.arenaWall);
    return d;
  }

  function groundAhead(L, x, y) { return tileAt(L, Math.floor(x / T), Math.floor(y / T)) !== 0; }

  function updateEnemy(e, dt, W, dyn, P) {
    if (e.dead) { e.timer -= dt; return; }
    e.t += dt;
    if (e.type === 'f') {
      const ph = Math.PI * 2 * (e.speed * e.t + e.phase);
      e.x = e.x0 + e.range * Math.sin(ph);
      e.y = e.y0 + Math.sin(e.t * 2.3) * 14;
      e.dir = Math.cos(ph) >= 0 ? 1 : -1;
      return;
    }
    const b = e.b, d = e.d;
    if (e.type === 'r') {
      const cx = b.x + b.w / 2, px = P.x + P.w / 2;
      if (e.state === 'walk') {
        b.vx = e.dir * d.speed;
        const dx = px - cx;
        if (Math.sign(dx) === e.dir && Math.abs(dx) < 230 && Math.abs((P.y + P.h) - (b.y + b.h)) < 70) { e.state = 'tele'; e.timer = 0.45; }
      } else if (e.state === 'tele') {
        b.vx = 0; e.timer -= dt;
        if (e.timer <= 0) e.state = 'charge';
      } else if (e.state === 'charge') {
        b.vx = e.dir * 250;
      } else if (e.state === 'stun') {
        b.vx = 0; e.timer -= dt;
        if (e.timer <= 0) e.state = 'walk';
      }
    } else {
      b.vx = e.dir * d.speed;
    }
    // Berbalik di tepi jurang (kecuali saat menyeruduk).
    if (b.onGround && e.state !== 'charge') {
      const fx = e.dir > 0 ? b.x + b.w + 2 : b.x - 2;
      if (!groundAhead(W.L, fx, b.y + b.h + 4)) {
        let ok = false;
        for (const r of dyn) if (fx > r.x && fx < r.x + r.w && Math.abs(b.y + b.h - r.y) < 8) ok = true;
        if (!ok) { e.dir = -e.dir; b.vx = e.dir * d.speed; }
      }
    }
    b.vy += C.GRAVITY * dt;
    const res = stepBody(b, dt, W.L, dyn);
    if (res.hitWall) {
      if (e.type === 'r' && e.state === 'charge') { e.state = 'stun'; e.timer = 1.6; }
      e.dir = -res.hitWall;
    }
    if (b.y > W.L.height + 100) e.dead = true, e.timer = 0;
  }

  function update(W, dt, P) {
    const t = W.t;
    // Platform bergerak.
    for (const m of W.movers) {
      const s = Math.sin(Math.PI * 2 * (m.speed * t + m.phase));
      const nx = m.x + (m.axis === 'x' ? m.range * s : 0);
      const ny = m.y + (m.axis === 'y' ? m.range * s : 0);
      m.dx = nx - m.cx; m.dy = ny - m.cy; m.vy = m.dy / Math.max(dt, 0.001);
      m.cx = nx; m.cy = ny;
    }
    // Papan rapuh.
    for (const c of W.crumbles) {
      if (c.state === 'ok' && c.touched) { c.state = 'shake'; c.timer = 0.45; }
      c.touched = false;
      if (c.state === 'shake') { c.timer -= dt; if (c.timer <= 0) { c.state = 'gone'; c.timer = 2.8; } }
      else if (c.state === 'gone') { c.timer -= dt; if (c.timer <= 0) c.state = 'ok'; }
    }
    // Platform pilih: tile salah retak lalu hilang sementara.
    for (const pg of W.pilih) {
      for (const tl of pg.tiles) {
        if (tl.state === 'crack') { tl.timer -= dt; if (tl.timer <= 0) { tl.state = 'gone'; tl.timer = 3.5; } }
        else if (tl.state === 'gone') { tl.timer -= dt; if (tl.timer <= 0) tl.state = 'ok'; }
      }
    }
    const dyn = dynRects(W);
    W.dyn = dyn;
    for (const e of W.enemies) updateEnemy(e, dt, W, dyn, P);
    W.enemies = W.enemies.filter((e) => !(e.dead && e.timer <= 0));

    // Meriam.
    for (const c of W.cannons) {
      c.t += dt;
      if (c.fire > 0) c.fire -= dt;
      if (Math.abs(P.x - c.x) < 420 && c.t >= 2.4) { c.t = 0; c.fire = 0.5; c.shot = false; }
      if (c.fire > 0 && !c.shot && c.fire < 0.3) {
        c.shot = true;
        W.balls.push({ x: c.x + c.dir * 26, y: c.y - 26, vx: c.dir * 170, r: 7 });
        if (window.Sfx) window.Sfx.play('pukul');
      }
    }
    // Peluru.
    for (const b of W.balls) {
      b.x += b.vx * dt;
      if (tileAt(W.L, Math.floor(b.x / T), Math.floor(b.y / T)) === 1 || b.x < 0 || b.x > W.L.width) b.dead = true;
      for (const r of dyn) if (!r.ow && b.x > r.x && b.x < r.x + r.w && b.y > r.y && b.y < r.y + r.h) b.dead = true;
    }
    W.balls = W.balls.filter((b) => !b.dead);
    // Gergaji.
    for (const s of W.saws) {
      s.ang += dt * 10;
      if (s.range) s.cx = s.x0 + s.range * Math.sin(Math.PI * 2 * s.speed * t);
    }
    // Batu runcing yang jatuh (serangan bos robot).
    for (const d of W.drops) {
      d.vy += 1000 * dt; d.y += d.vy * dt;
      if (d.y >= d.floor) d.dead = true;
    }
    W.drops = W.drops.filter((d) => !d.dead);
    updateBoss(W, dt, P, dyn);
  }

  // ---------- Bos ----------
  function updateBoss(W, dt, P, dyn) {
    const B = W.boss;
    if (!B || B.defeated) return;
    const b = B.b, L = W.L;
    B.t += dt;
    if (B.flash > 0) B.flash -= dt;
    const cx = b.x + b.w / 2, px = P.x + P.w / 2;
    const arenaL = (B.a0 + 2) * T, arenaR = (L.cols - 2) * T;
    const moves = B.kind === 'dino' || B.kind === 'raja';
    b.vx = 0;
    switch (B.state) {
      case 'wait':
        const trig = B.def.ty !== undefined ? (P.y + P.h <= B.def.ty && P.onGround) : px > B.a0 * T + 96;
        if (trig) {
          W.arenaWall = B.def.noWall ? null : { x: B.a0 * T, y: 0, w: T, h: L.height, ow: false, wall: true };
          B.state = 'intro'; B.t = 0;
          W.hooks.bossStart(B);
        }
        break;
      case 'intro':
        if (B.t > 1.5) { B.state = 'move'; B.t = 0; }
        break;
      case 'move':
        if (B.kind === 'robot' || B.kind === 'meriam') {
          B.dir = px < cx ? -1 : 1;
        } else {
          b.vx = B.dir * 55;
          if (cx < arenaL) B.dir = 1; else if (cx > arenaR) B.dir = -1;
        }
        if (B.t > 2.2) { B.state = 'tele'; B.t = 0; B.dir = px < cx ? -1 : 1; prepareAttack(W, B); }
        break;
      case 'tele':
        if (B.t > 0.9) { B.state = 'atk'; B.t = 0; B.shots = 0; startAttack(W, B); }
        break;
      case 'atk': {
        const done = runAttack(W, B, dt, px, cx);
        if (done) { B.state = 'stun'; B.t = 0; b.vx = 0; W.marks = []; B.cycle++; }
        break;
      }
      case 'stun':
        if (B.t > 6) { B.state = 'move'; B.t = 0; }
        break;
      case 'hurt':
        if (B.t > 1.2) { B.state = 'move'; B.t = 0; }
        break;
      case 'dead':
        if (B.t > 1.6) {
          B.defeated = true; W.arenaWall = null;
          W.hooks.bossDefeated(B);
        }
        break;
    }
    b.vy += C.GRAVITY * dt;
    const res = stepBody(b, dt, L, dyn.filter((r) => r.wall || !r.ow));
    if (B.state === 'atk' && B.dashing && res.hitWall) { B.dashing = false; B.dashDone = true; }
    if (!moves) b.vx = 0;
  }

  function useRain(B) { return B.kind === 'robot' || (B.kind === 'raja' && B.cycle % 2 === 1); }

  function prepareAttack(W, B) {
    if (!useRain(B)) return;
    // Tanda peringatan di lantai: tempat batu akan jatuh.
    const L = W.L, n = 3 + (B.lv >= 6 ? 1 : 0);
    const x0 = (B.a0 + 2) * T, x1 = (L.cols - 2) * T;
    W.marks = [];
    for (let i = 0; i < n; i++) W.marks.push({ x: x0 + (x1 - x0) * (i + 0.2 + Math.random() * 0.6) / n });
  }

  function startAttack(W, B) {
    if (useRain(B)) {
      for (const m of W.marks) W.drops.push({ x: m.x, y: B.b.y - 420, vy: 0, floor: B.b.y + B.b.h });
      B.atkTime = 1.6;
    } else if (B.kind === 'meriam') {
      B.atkTime = 2.0; B.shots = 0;
    } else {
      B.dashing = true; B.dashDone = false; B.atkTime = 3.2;
    }
  }

  function runAttack(W, B, dt, px, cx) {
    const b = B.b;
    if (useRain(B)) return B.t > B.atkTime;
    if (B.kind === 'meriam') {
      const due = Math.floor(B.t / 0.6) + 1;
      while (B.shots < due && B.shots < 3) {
        const high = B.shots === 1;
        W.balls.push({ x: cx + B.dir * 50, y: b.y + b.h - (high ? 96 : 26), vx: B.dir * 190, r: 8 });
        B.shots++;
        if (window.Sfx) window.Sfx.play('pukul');
      }
      return B.t > B.atkTime;
    }
    // Menyeruduk melintasi arena ke arah pemain.
    if (B.dashing) b.vx = B.dir * 330;
    return B.dashDone || B.t > B.atkTime;
  }

  function bossStunned(B) { return !!B && !B.defeated && B.state === 'stun'; }

  // Pemain menjawab benar: bos terkena.
  function bossHit(W) {
    const B = W.boss;
    B.hp--; B.flash = 0.6; B.t = 0;
    B.state = B.hp <= 0 ? 'dead' : 'hurt';
  }

  // ---------- Tabrakan dengan pemain ----------
  // Mengembalikan { stomped: [musuh], hurt: {dmg, x} | null }.
  function checkPlayer(W, P, prevBottom) {
    const out = { stomped: [], hurt: null };
    const pb = { x: P.x + 3, y: P.y + 4, w: P.w - 6, h: P.h - 4 };
    const hurt = (dmg, x) => { if (!out.hurt || dmg > out.hurt.dmg) out.hurt = { dmg, x }; };
    for (const e of W.enemies) {
      if (e.dead) continue;
      const bx = enemyBox(e);
      if (!overlap(pb, bx)) continue;
      if (e.d.stomp && P.vy > 0 && prevBottom <= bx.y + 20) { out.stomped.push(e); continue; }
      if (e.type === 'r' && e.state === 'stun') continue;
      hurt(e.d.dmg, bx.x + bx.w / 2);
    }
    for (const s of W.saws) if (overlap(pb, { x: s.cx - 14, y: s.y - 14, w: 28, h: 28 })) hurt(20, s.cx);
    for (const sp of W.L.spikes) if (overlap(pb, { x: sp.x + 4, y: sp.y, w: sp.w - 8, h: sp.h })) hurt(15, sp.x + sp.w / 2);
    for (const b of W.balls) if (overlap(pb, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) { b.dead = true; hurt(15, b.x); }
    for (const d of W.drops) if (overlap(pb, { x: d.x - 16, y: d.y - 16, w: 32, h: 32 })) { d.dead = true; hurt(15, d.x); }
    const B = W.boss;
    if (B && !B.defeated && (B.state === 'move' || B.state === 'tele' || B.state === 'atk')) {
      if (overlap(pb, B.b)) hurt(20, B.b.x + B.b.w / 2);
    }
    return out;
  }

  // ---------- Gambar ----------
  function sp(ctx, name, f, x, y, s, flip) { return A.drawFeet(ctx, name, f, x, y, s, flip); }

  function drawPlanks(ctx, W, cx, cy, vw, vh) {
    const R = window.Render, L = W.L;
    for (const m of W.movers) {
      R.drawSlab(ctx, L, m.cx - cx, m.cy - cy, m.w);
      // Panah kecil di sisi bawah menandai platform yang bergerak.
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const ax = Math.round(m.cx - cx + m.w / 2), ay = Math.round(m.cy - cy + 24);
      if (m.axis === 'x') { ctx.fillRect(ax - 9, ay, 18, 3); ctx.fillRect(ax - 11, ay - 2, 3, 7); ctx.fillRect(ax + 8, ay - 2, 3, 7); }
      else { ctx.fillRect(ax - 1, ay - 7, 3, 16); ctx.fillRect(ax - 3, ay - 9, 7, 3); ctx.fillRect(ax - 3, ay + 7, 7, 3); }
    }
    for (const c of W.crumbles) {
      if (c.state === 'gone') continue;
      const sh = c.state === 'shake' ? (Math.random() - 0.5) * 4 : 0;
      ctx.globalAlpha = c.state === 'shake' ? 0.8 : 1;
      R.drawPlank(ctx, L, c.x - cx + sh, c.y - cy, T);
      ctx.globalAlpha = 1;
    }
    for (const br of W.bridges) {
      const sw = br.len * T / br.parts;
      for (let i = 0; i < br.parts; i++) {
        if (i < br.built) R.drawPlank(ctx, L, br.x + i * sw - cx, br.y - cy, sw);
        else {
          ctx.globalAlpha = 0.28 + 0.12 * Math.sin(W.t * 4 + i);
          R.drawPlank(ctx, L, br.x + i * sw - cx, br.y - cy, sw);
          ctx.globalAlpha = 1;
        }
      }
    }
    for (const pg of W.pilih) {
      for (const tl of pg.tiles) {
        if (tl.state === 'gone') continue;
        const x = tl.x - cx + (tl.state === 'crack' ? (Math.random() - 0.5) * 4 : 0), y = tl.y - cy;
        ctx.fillStyle = tl.state === 'right' ? '#b8f5c6' : '#fff6cf';
        ctx.strokeStyle = tl.state === 'right' ? '#2f9e5a' : '#7a4fc0';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(x, y - 2, tl.w, 22, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2c1a52'; ctx.font = '16px ' + R.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(tl.value), x + tl.w / 2, y + 10);
        ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'start';
      }
      if (!pg.solved) {
        const mid = (pg.tiles[0].x + pg.tiles[pg.tiles.length - 1].x + pg.tiles[0].w) / 2;
        R.bubble(ctx, pg.prompt, mid - cx, pg.y - cy - 120, { size: 18 });
      }
    }
  }

  function drawHazards(ctx, W, cx, cy, t) {
    const L = W.L;
    // Duri: potongan frame penuh sprite jebakan duri.
    for (const s of L.spikes) {
      if (s.x + s.w < cx - 40 || s.x > cx + 900) continue;
      sp(ctx, 'trap4', 3, s.x + s.w / 2 - cx, s.y + s.h - cy, S, false);
    }
    for (const s of W.saws) sp(ctx, 'trap2', Math.floor(s.ang) % 7, s.cx - cx, s.y + 16 - cy, 1, false);
    for (const c of W.cannons) {
      const f = c.fire > 0 ? Math.floor((0.5 - c.fire) / 0.5 * 7) : A.at('enemy4_idle', t, 8);
      sp(ctx, c.fire > 0 ? 'enemy4_attack' : 'enemy4_idle', f, c.x - cx, c.y - cy, S, c.dir > 0);
    }
    for (const b of W.balls) {
      const im = A.img.cannonball2;
      if (im && im.complete) ctx.drawImage(im, Math.round(b.x - cx - 16), Math.round(b.y - cy - 16), 32, 32);
      else { ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(b.x - cx, b.y - cy, b.r, 0, 7); ctx.fill(); }
    }
    for (const d of W.drops) sp(ctx, 'enemy5_idle', 0, d.x - cx, d.y + 20 - cy, S, false);
    for (const m of W.marks) {
      const a = 0.4 + 0.4 * Math.sin(t * 20);
      ctx.fillStyle = `rgba(255,70,90,${a})`;
      const gy = (W.boss ? W.boss.b.y + W.boss.b.h : 0) - cy;
      ctx.beginPath(); ctx.moveTo(m.x - cx - 14, gy); ctx.lineTo(m.x - cx + 14, gy); ctx.lineTo(m.x - cx, gy - 22); ctx.fill();
    }
  }

  function drawEnemies(ctx, W, cx, cy, t) {
    for (const e of W.enemies) {
      const d = e.d;
      const fx = e.type === 'f' ? e.x : e.b.x + e.b.w / 2;
      const fy = e.type === 'f' ? e.y + e.h / 2 : e.b.y + e.b.h;
      if (fx < cx - 80 || fx > cx + 1000) continue;
      const flip = e.dir !== d.faces;
      if (e.dead) {
        const n = A.frames(d.hit);
        const idx = Math.min(n - 1, Math.floor((0.45 - e.timer) / 0.45 * n));
        ctx.globalAlpha = Math.max(0, e.timer / 0.45);
        sp(ctx, d.hit, idx, fx - cx, fy - cy, S, flip);
        ctx.globalAlpha = 1;
        continue;
      }
      let sheet = d.run;
      if (e.type === 'r') sheet = e.state === 'charge' ? d.charge : e.state === 'stun' ? d.stun : e.state === 'tele' ? d.idle : d.run;
      sp(ctx, sheet, A.at(sheet, t + e.t, e.state === 'charge' ? 18 : 12), fx - cx, fy - cy, S, flip);
      if (e.type === 'r' && e.state === 'tele') window.Render.bubble(ctx, '!', fx - cx, fy - cy - 96, { size: 20 });
      if (e.type === 'r' && e.state === 'stun') drawDizzy(ctx, fx - cx, fy - cy - 62, t);
    }
  }

  function drawDizzy(ctx, x, y, t) {
    ctx.fillStyle = '#ffd54a';
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * 2.1;
      ctx.fillRect(Math.round(x + Math.cos(a) * 22) - 3, Math.round(y + Math.sin(a) * 7) - 3, 6, 6);
    }
  }

  function drawBoss(ctx, W, cx, cy, t) {
    const B = W.boss;
    if (!B || B.defeated) return;
    const k = B.k, b = B.b;
    const fx = b.x + b.w / 2 - cx, fy = b.y + b.h - cy;
    const flip = B.dir !== k.faces;
    let sheet = k.idle, f = A.at(k.idle, t, 8);
    if (B.state === 'move') { sheet = k.run; f = A.at(k.run, t, 12); }
    else if (B.state === 'tele') { sheet = k.idle; f = A.at(k.idle, t, 20); }
    else if (B.state === 'atk') { sheet = B.kind === 'meriam' || (B.dashing) ? k.atk : k.run; f = A.at(sheet, t, 14); }
    else if (B.state === 'hurt' || B.state === 'dead') { sheet = k.hit; f = A.at(k.hit, B.t, 10); }
    const sc = k.scale;
    const shake = B.state === 'tele' ? (Math.random() - 0.5) * 5 : 0;
    if (B.state === 'dead') ctx.globalAlpha = Math.max(0, 1 - B.t / 1.6);
    else if (B.flash > 0 && Math.floor(B.flash * 20) % 2 === 0) ctx.globalAlpha = 0.45;
    sp(ctx, sheet, f, fx + shake, fy, sc, flip);
    ctx.globalAlpha = 1;
    if (B.state === 'tele') window.Render.bubble(ctx, '!', fx, fy - b.h - 52, { size: 22, bg: 'rgba(255,230,230,0.95)', border: '#c0392b' });
    if (B.state === 'stun') drawDizzy(ctx, fx, fy - b.h - 6, t);
    // Bar HP dan nama.
    if (B.state !== 'wait') {
      const bw = 96, bx = fx - bw / 2, by = fy - b.h - 36;
      ctx.fillStyle = '#e5e5e5'; ctx.fillRect(Math.round(bx), Math.round(by), bw, 10);
      ctx.fillStyle = '#ff8fab'; ctx.fillRect(Math.round(bx), Math.round(by), Math.round(bw * Math.max(0, B.hp) / B.maxHp), 10);
      ctx.strokeStyle = '#4b2e83'; ctx.lineWidth = 2; ctx.strokeRect(Math.round(bx), Math.round(by), bw, 10);
      window.Render.bubble(ctx, B.nama, fx, by - 34, { size: 15, pad: 6 });
    }
  }

  function drawArena(ctx, W, cx, cy, vh) {
    const w = W.arenaWall;
    if (!w) return;
    const x = w.x - cx;
    ctx.fillStyle = 'rgba(179,140,255,0.45)';
    ctx.fillRect(Math.round(x + 8), 0, 16, vh);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let y = ((W.t * 80) % 40) - 40; y < vh; y += 40) ctx.fillRect(Math.round(x + 14), Math.round(y), 4, 20);
  }

  window.Ent = { init, update, dynRects, checkPlayer, bossStunned, bossHit, drawPlanks, drawHazards, drawEnemies, drawBoss, drawArena, enemyBox, EN, BK };
})();
