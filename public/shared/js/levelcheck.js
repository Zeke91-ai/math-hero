// Kit Math Hero: pemeriksa level (bot jangkauan). Memakai fisika yang sama dengan game (shared/js/physics.js) untuk
// memastikan level platformer bisa diselesaikan. Pemain virtual mencoba berjalan dan melompat (lompat ganda opsional)
// dari setiap titik pijak yang sudah dicapai. Gerbang tumpukan peti dianggap terbuka, jembatan dianggap terpasang,
// platform gerak dan papan rapuh dianggap padat di posisi ujungnya. Musuh dan jebakan diabaikan.
// Dua format peta: MH1 (hasil Builder di public/js/levels.js, dipakai langsung) dan Kejar MH3 (peta teks, lewat
// fromKejar). Format lain cukup membuat adaptor yang menghasilkan bentuk yang sama:
//   { id, nama, cols, rows, height, tiles, start:{x,y kaki}, goal:{x,y kaki}, crates, stars, secrets, bridges, movers,
//     crumbles, pilih, boss?, chests? }
// Node: require('.../levelcheck.js'); browser: window.MHKit.levelcheck.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./physics.js'));
  else ((root.MHKit = root.MHKit || {}).levelcheck = factory(root.Physics));
})(typeof self !== 'undefined' ? self : this, function (Ph) {
  const { C, T, stepBody } = Ph;

  function prepare(L) {
    const tiles = Uint8Array.from(L.tiles);
    const mark = (x, y, w) => {
      const r = Math.round(y / T);
      for (let c = Math.floor(x / T); c < Math.ceil((x + w) / T); c++) if (r >= 0 && r < L.rows && c >= 0 && c < L.cols && !tiles[r * L.cols + c]) tiles[r * L.cols + c] = 2;
    };
    for (const b of L.bridges) mark(b.x, b.y, b.len * T);
    for (const m of L.movers) {
      if (m.axis === 'x') { mark(m.x - m.range, m.y, m.w); mark(m.x + m.range, m.y, m.w); }
      else { mark(m.x, m.y - m.range, m.w); mark(m.x, m.y + m.range, m.w); }
    }
    for (const c of L.crumbles) mark(c.x, c.y, T);
    for (const p of L.pilih) for (const c of p.cols) mark(c * T, p.y, p.w * T);
    return Object.assign({}, L, { tiles });
  }

  function plansFor(allowDouble) {
    const plans = [];
    const dirs = [-1, 0, 1];
    const djs = allowDouble ? [undefined, 0.25, 0.45] : [undefined];
    for (const dir of dirs) {
      const switches = [{ sw: undefined, dir2: dir }];
      for (const d2 of dirs) if (d2 !== dir) switches.push({ sw: 0.3, dir2: d2 });
      for (const s of switches) for (const dj of djs) plans.push({ jump: true, dir, sw: s.sw, dir2: s.dir2, dj });
    }
    plans.push({ jump: false, dir: -1 }, { jump: false, dir: 1 });
    return plans;
  }

  function simulate(L, st, plan, allowDouble) {
    const b = { x: st.x - C.PW / 2, y: st.feet - C.PH, w: C.PW, h: C.PH, vx: 0, vy: 0, onGround: true, drop: 0 };
    const startX = b.x;
    const dt = 1 / 60;
    let t = 0, jumped = false, usedDj = false, off = false;
    while (t < 3.4) {
      let dir = plan.dir;
      if (plan.sw !== undefined && t >= plan.sw) dir = plan.dir2;
      b.vx = dir * C.MOVE;
      if (plan.jump && !jumped) { b.vy = C.JUMP; jumped = true; }
      else if (jumped && allowDouble && plan.dj !== undefined && !usedDj && t >= plan.dj && !b.onGround) { b.vy = C.DJUMP; usedDj = true; }
      b.vy += C.GRAVITY * dt;
      stepBody(b, dt, L, []);
      t += dt;
      if (b.y > L.height + 80) return null;
      if (plan.jump) {
        if (b.onGround && t > 0.06) return { x: b.x + b.w / 2, feet: b.y + b.h };
      } else {
        if (!b.onGround) off = true;
        if (b.onGround && off) return { x: b.x + b.w / 2, feet: b.y + b.h };
        if (b.onGround && Math.abs(b.x - startX) >= 8) return { x: b.x + b.w / 2, feet: b.y + b.h };
        if (b.onGround && b.vx === 0) return null; // terhalang dinding
      }
    }
    return null;
  }

  function reach(Lraw, allowDouble) {
    const L = prepare(Lraw);
    const key = (s) => Math.round(s.x / 8) + '_' + Math.round(s.feet);
    const start = { x: L.start.x, feet: L.start.y };
    const seen = new Map([[key(start), start]]);
    const queue = [start];
    const plans = plansFor(allowDouble);
    while (queue.length) {
      const s = queue.pop();
      for (const p of plans) {
        const n = simulate(L, s, p, allowDouble);
        if (!n) continue;
        const k = key(n);
        if (!seen.has(k)) { seen.set(k, n); queue.push(n); }
      }
    }
    return [...seen.values()];
  }

  function check(L) {
    const out = { id: L.id, nama: L.nama, ok: true, msg: [] };
    const single = reach(L, false);
    const double = reach(L, true);
    const near = (list, x, y, dx, dyUp) => list.some((s) => Math.abs(s.x - x) <= dx && s.feet >= y - 1 && s.feet - y <= dyUp);
    const stand = (list, o) => list.some((s) => Math.abs(s.x - o.x) <= 56 && Math.abs(s.feet - o.y) <= 40);
    const goal = L.goal;
    const goalOk = stand(single, goal);
    out.msg.push(`titik pijak ${single.length} (lompat ganda ${double.length}), trofi ${goalOk ? 'tercapai' : 'TIDAK tercapai'}`);
    if (!goalOk) out.ok = false;
    L.crates.forEach((c, i) => { if (!stand(single, c)) { out.ok = false; out.msg.push(`peti ${i + 1} (${Math.round(c.x / T)}) tidak terjangkau tanpa lompat ganda`); } });
    if (L.boss) {
      const b = L.boss;
      if (!stand(single, { x: b.x, y: b.y })) { out.ok = false; out.msg.push('area bos tidak terjangkau'); }
    }
    // Bintang dan permata: terjangkau jika ada titik pijak di dekat dan tidak terlalu tinggi.
    const reachable = (list, o, upMax) => list.some((s) => Math.abs(s.x - o.x) <= 36 && o.y <= s.feet - 6 && s.feet - o.y <= upMax);
    const missStars = L.stars.filter((s) => !reachable(single, s, 4.6 * T));
    const missStars2 = L.stars.filter((s) => !reachable(double, s, 7 * T));
    out.msg.push(`bintang: ${L.stars.length - missStars.length}/${L.stars.length} (lompat tunggal), ${L.stars.length - missStars2.length}/${L.stars.length} (ganda)`);
    if (missStars2.length) out.msg.push('bintang tak terjangkau di kolom: ' + missStars2.map((s) => Math.round(s.x / T)).join(','));
    (L.chests || []).forEach((c, i) => {
      const hit = single.some((s) => Math.abs(s.x - (c.x + c.w / 2)) <= c.w / 2 + C.PW / 2 && s.feet >= c.y && s.feet - C.PH <= c.y + c.h);
      if (!hit) { out.ok = false; out.msg.push(`peti ${i + 1} (kolom ${Math.round(c.x / T)}) tidak terjangkau`); }
    });
    L.secrets.forEach((s) => {
      const a = reachable(single, s, 4.6 * T), d = reachable(double, s, 7 * T);
      out.msg.push(`rahasia kolom ${Math.round(s.x / T)}: ${a ? 'tunggal' : d ? 'perlu lompat ganda' : 'TAK TERJANGKAU'}`);
      if (!a && !d) out.ok = false;
    });
    return out;
  }

  // Adaptor Kejar MH3: hasil platSim.parse (L dengan start/goal/stars/chests) menjadi bentuk umum.
  // Tujuan Kejar adalah kotak; titik pijak yang dihitung adalah tengah-bawahnya. Peti tidak menghalangi,
  // jadi cukup ada titik pijak yang kotak pemainnya bersinggungan dengan kotak peti.
  function fromKejar(def, L) {
    return {
      id: def.id, nama: def.nama, cols: L.cols, rows: L.rows, height: L.rows * T, tiles: L.tiles,
      start: L.start, goal: { x: L.goal.x + L.goal.w / 2, y: L.goal.y + L.goal.h },
      crates: [], stars: L.stars, secrets: [], bridges: [], movers: [], crumbles: [], pilih: [],
      chests: L.chests,
    };
  }

  return { check, reach, fromKejar };
});
