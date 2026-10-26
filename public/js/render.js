// Penggambaran dunia: tile bertema, latar parallax bergaya pixel art, dan balon teks.
(function () {
  const T = 32;           // ukuran tile di dunia (tile sumber 16 px diperbesar 2x)
  const FONT = "'Kleintenna', system-ui, sans-serif";

  // Tema tile. kind 'grass': blok 3x3 (kolom ox..ox+2, baris oy..oy+2). kind 'bars': potongan tepi dan isi.
  const THEMES = {
    grassA: { img: 'tileset', kind: 'grass', ox: 0, oy: 0, plank: [12, 8], hi: '#8ee6a5' },
    grassB: { img: 'tileset', kind: 'grass', ox: 6, oy: 0, plank: [12, 8], hi: '#d8e84a' },
    candy: { img: 'tileset_pink', kind: 'grass', ox: 0, oy: 0, plank: [12, 8], hi: '#ffc2e6' },
    stone: { img: 'tileset', kind: 'bars', top: [[7, 4], [8, 4]], capL: [6, 4], capR: [9, 4],
      fill: [[0, 4], [1, 4], [2, 5], [3, 5], [4, 4], [0, 6]], plank: [12, 9], hi: '#cfd8dc' },
    crystal: { img: 'tileset', kind: 'bars', top: [[13, 4]], capL: [12, 4], capR: [14, 4],
      fill: [[13, 5], [14, 5], [13, 6], [14, 6]], plank: [12, 10], hi: '#9bf3c0' },
    metal: { img: 'tileset', kind: 'bars', top: [[13, 0]], capL: [12, 0], capR: [14, 0],
      fill: [[13, 1], [14, 1], [13, 2], [14, 2]], plank: [12, 9], hi: '#e3edf5' },
    crates: { img: 'tileset', kind: 'bars', top: [[6, 8], [7, 8], [8, 8]], capL: [6, 8], capR: [8, 8],
      fill: [[6, 9], [8, 9], [9, 9], [7, 10], [9, 8], [6, 10]], plank: [12, 8], hi: '#ffd08a' },
  };

  function solidAt(L, c, r) {
    if (c < 0 || c >= L.cols || r >= L.rows) return true;
    if (r < 0) return false;
    return L.tiles[r * L.cols + c] === 1;
  }

  function tile(ctx, imgName, sx, sy, dx, dy) {
    const im = window.Assets.img[imgName];
    if (!im || !im.complete) return;
    ctx.drawImage(im, sx * 16, sy * 16, 16, 16, Math.round(dx), Math.round(dy), T, T);
  }

  function drawTiles(ctx, L, camX, camY, vw, vh) {
    const th = THEMES[L.tema] || THEMES.grassA;
    const c0 = Math.max(0, Math.floor(camX / T)), c1 = Math.min(L.cols - 1, Math.floor((camX + vw) / T));
    const r0 = Math.max(0, Math.floor(camY / T)), r1 = Math.min(L.rows - 1, Math.floor((camY + vh) / T));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const v = L.tiles[r * L.cols + c];
        if (!v) continue;
        const dx = c * T - camX, dy = r * T - camY;
        if (v === 1) {
          const up = solidAt(L, c, r - 1), dn = solidAt(L, c, r + 1);
          const lf = solidAt(L, c - 1, r), rt = solidAt(L, c + 1, r);
          if (th.kind === 'grass') {
            const col = !lf ? 0 : (!rt ? 2 : 1), row = !up ? 0 : (!dn ? 2 : 1);
            tile(ctx, th.img, th.ox + col, th.oy + row, dx, dy);
          } else if (!up) {
            const p = !lf ? th.capL : (!rt ? th.capR : th.top[c % th.top.length]);
            tile(ctx, th.img, p[0], p[1], dx, dy);
          } else {
            const p = th.fill[((c & 1) + (r & 1) * 2 + (c % 5 === 0 ? 1 : 0)) % th.fill.length];
            tile(ctx, th.img, p[0], p[1], dx, dy);
          }
        } else if (v === 2) {
          drawPlatTile(ctx, th, L, c, r, dx, dy);
        }
      }
    }
  }

  // Satu tile platform tembus dari bawah. Ujung kiri/kanan memakai potongan tepi.
  function drawPlatTile(ctx, th, L, c, r, dx, dy) {
    const lf = L.tiles[r * L.cols + c - 1] === 2, rt = L.tiles[r * L.cols + c + 1] === 2;
    if (th.kind === 'grass') {
      const col = !lf ? 0 : (!rt ? 2 : 1);
      tile(ctx, th.img, th.ox + col, th.oy, dx, dy);
    } else {
      const p = !lf ? th.capL : (!rt ? th.capR : th.top[c % th.top.length]);
      tile(ctx, th.img, p[0], p[1], dx, dy);
    }
  }

  // Papan tipis (platform gerak, papan rapuh, jembatan): potongan papan dari tileset.
  function drawPlank(ctx, L, x, y, w) {
    const th = THEMES[L.tema] || THEMES.grassA;
    const im = window.Assets.img[th.img];
    if (!im || !im.complete) return;
    const n = Math.max(1, Math.round(w / T));
    for (let i = 0; i < n; i++) {
      const p = th.plank;
      // Tinggi isi papan sekitar 4 px sumber; tampilkan 16x8 sumber agar terlihat jelas.
      ctx.drawImage(im, p[0] * 16, p[1] * 16, 16, 8, Math.round(x + i * T), Math.round(y - 2), T, 16);
    }
  }

  // Platform tebal (satu tile tinggi) berujung kiri-kanan, dipakai platform gerak agar jelas terlihat.
  function drawSlab(ctx, L, x, y, w) {
    const th = THEMES[L.tema] || THEMES.grassA;
    const n = Math.max(1, Math.round(w / T));
    for (let i = 0; i < n; i++) {
      let p;
      if (th.kind === 'grass') p = [th.ox + (i === 0 ? 0 : i === n - 1 ? 2 : 1), th.oy];
      else p = i === 0 ? th.capL : i === n - 1 ? th.capR : th.top[i % th.top.length];
      tile(ctx, th.img, p[0], p[1], x + i * T, y);
    }
  }

  // ---------- Latar parallax ----------
  const BG = {
    meadow: { sky: ['#7ec8ff', '#d9f2ff'], sun: '#fff2a8', clouds: '#ffffff', layers: [
      { kind: 'hills', color: '#b5e3ae', base: 0.62, amp: 0.10, f: 0.15 },
      { kind: 'hills', color: '#8bd18a', base: 0.74, amp: 0.09, f: 0.3 },
      { kind: 'trees', color: '#5fb86d', base: 0.88, amp: 0.05, f: 0.5 } ] },
    forest: { sky: ['#5b3f8f', '#ff9c6e'], sun: '#ffd27a', clouds: '#ffb48f', layers: [
      { kind: 'pines', color: '#5a4690', base: 0.7, amp: 0.1, f: 0.15 },
      { kind: 'pines', color: '#3c2f73', base: 0.85, amp: 0.1, f: 0.32 },
      { kind: 'pines', color: '#2a2058', base: 1.0, amp: 0.12, f: 0.55 } ] },
    candy: { sky: ['#ffd1e8', '#fff4d6'], sun: '#fffbe0', clouds: '#ffffff', layers: [
      { kind: 'hills', color: '#ffc2e0', base: 0.62, amp: 0.10, f: 0.15 },
      { kind: 'lolli', color: '#ff9fcf', base: 0.8, amp: 0.05, f: 0.3 },
      { kind: 'hills', color: '#ff86bf', base: 0.9, amp: 0.07, f: 0.5 } ] },
    sky: { sky: ['#0b1b4d', '#4b78d6'], sun: '#fff6c9', clouds: '#cfe0ff', stars: true, layers: [
      { kind: 'cloudbank', color: '#9db8ee', base: 0.78, amp: 0.07, f: 0.2 },
      { kind: 'cloudbank', color: '#d4e3ff', base: 0.95, amp: 0.08, f: 0.45 } ] },
    cave: { sky: ['#071026', '#173a5e'], sun: null, clouds: null, stars: true, layers: [
      { kind: 'crystals', color: '#1d4f73', base: 0.72, amp: 0.2, f: 0.15 },
      { kind: 'crystals', color: '#2a8a96', base: 0.9, amp: 0.2, f: 0.35 },
      { kind: 'crystals', color: '#46c5a8', base: 1.05, amp: 0.18, f: 0.6 } ] },
    city: { sky: ['#3b3552', '#f08c5a'], sun: '#ffd9a0', clouds: '#8a6a86', layers: [
      { kind: 'towers', color: '#5b4a6e', base: 0.7, amp: 0.2, f: 0.15 },
      { kind: 'towers', color: '#3a3050', base: 0.88, amp: 0.2, f: 0.35 },
      { kind: 'towers', color: '#251f3a', base: 1.02, amp: 0.15, f: 0.6 } ] },
    ruins: { sky: ['#f4b26a', '#fff0c9'], sun: '#fff7d6', clouds: '#fff0d8', layers: [
      { kind: 'pillars', color: '#e2a775', base: 0.7, amp: 0.2, f: 0.15 },
      { kind: 'pillars', color: '#c88a5c', base: 0.9, amp: 0.22, f: 0.35 },
      { kind: 'hills', color: '#a96b46', base: 1.0, amp: 0.08, f: 0.6 } ] },
    palace: { sky: ['#1a0f3d', '#6a35a0'], sun: '#fff6c9', clouds: '#8a62c0', stars: true, layers: [
      { kind: 'towers', color: '#412a78', base: 0.78, amp: 0.2, f: 0.15 },
      { kind: 'crystals', color: '#7a4fc0', base: 0.95, amp: 0.2, f: 0.35 },
      { kind: 'towers', color: '#241552', base: 1.05, amp: 0.15, f: 0.6 } ] },
  };

  const cache = {};
  const PX = 4; // satu piksel latar = 4 px layar (kesan pixel art)

  // Gambar satu lapisan siluet yang bisa diulang tanpa sambungan. Lebar W piksel latar.
  function makeLayer(def, hPix) {
    const W = 160;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = hPix;
    const g = cv.getContext('2d');
    g.fillStyle = def.color;
    const two = Math.PI * 2;
    const hAt = (x) => {
      const t = x / W * two;
      return def.base * hPix - def.amp * hPix * (0.5 + 0.28 * Math.sin(t * 2 + 1) + 0.22 * Math.sin(t * 3 + 4) + 0.1 * Math.sin(t * 5));
    };
    for (let x = 0; x < W; x++) {
      let top = hAt(x);
      if (def.kind === 'pines') {
        const p = x % 16; top -= (8 - Math.abs(p - 8)) * 1.6;
      } else if (def.kind === 'towers') {
        top = hPix * def.base - def.amp * hPix * (0.3 + 0.7 * (Math.floor(x / 10) * 37 % 11) / 10);
        if (x % 10 === 9 || x % 10 === 0) top += 4;
      } else if (def.kind === 'pillars') {
        const seg = Math.floor(x / 12), local = x % 12;
        top = hPix * def.base - def.amp * hPix * (0.3 + 0.7 * ((seg * 53) % 9) / 9);
        if (local < 2 || local > 9) top += 6;
      } else if (def.kind === 'crystals') {
        const seg = Math.floor(x / 14), local = x % 14;
        const hh = def.amp * hPix * (0.4 + 0.6 * ((seg * 29) % 7) / 7);
        top = hPix * def.base - hh * (1 - Math.abs(local - 7) / 7);
      } else if (def.kind === 'cloudbank') {
        top = hAt(x) + Math.sin(x * 0.9) * 2;
      }
      g.fillRect(x, Math.round(top), 1, hPix);
    }
    if (def.kind === 'lolli') {
      // Permen lolipop: tongkat putih dan kepala berputar warna-warni.
      for (let i = 0; i < 5; i++) {
        const x = 12 + i * 32, y = Math.round(def.base * hPix - 14 - (i % 2) * 6);
        g.fillStyle = '#ffffff'; g.fillRect(x, y, 2, 40);
        g.fillStyle = i % 2 ? '#ffe14d' : '#7be0c3'; g.fillRect(x - 5, y - 8, 12, 12);
        g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 4, 4, 4);
      }
    }
    if (def.kind === 'trees') {
      for (let i = 0; i < 8; i++) {
        const x = 8 + i * 20, y = Math.round(def.base * hPix - 10 - (i % 3) * 3);
        g.fillStyle = '#7a5230'; g.fillRect(x + 4, y, 3, 14);
        g.fillStyle = def.color; g.fillRect(x, y - 8, 11, 10); g.fillRect(x + 2, y - 12, 7, 6);
      }
    }
    return cv;
  }

  function makeCloud(color) {
    const cv = document.createElement('canvas');
    cv.width = 40; cv.height = 16;
    const g = cv.getContext('2d');
    g.fillStyle = color;
    g.fillRect(4, 8, 32, 8); g.fillRect(8, 4, 12, 6); g.fillRect(18, 0, 14, 10); g.fillRect(2, 10, 36, 6);
    return cv;
  }

  function bgFor(L, vw, vh) {
    const key = L.bg + ':' + Math.ceil(vh / PX);
    if (cache[key]) return cache[key];
    const def = BG[L.bg] || BG.meadow;
    const hPix = Math.ceil(vh / PX);
    const o = { def, layers: def.layers.map((l) => ({ cv: makeLayer(l, hPix), f: l.f })), cloud: def.clouds ? makeCloud(def.clouds) : null };
    // Bintang malam: posisi tetap, dibuat sekali.
    o.stars = [];
    if (def.stars) for (let i = 0; i < 46; i++) o.stars.push({ x: (i * 97) % 1000 / 1000, y: (i * 53) % 600 / 1000, s: i % 3 === 0 ? 3 : 2, p: i * 1.7 });
    cache[key] = o;
    return o;
  }

  function drawBackground(ctx, L, camX, camY, vw, vh, t) {
    const o = bgFor(L, vw, vh), def = o.def;
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, def.sky[0]); g.addColorStop(1, def.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    for (const s of o.stars) {
      const a = 0.5 + 0.5 * Math.sin(t * 2 + s.p);
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.65 * a})`;
      ctx.fillRect(Math.round(s.x * vw), Math.round(s.y * vh), s.s, s.s);
    }
    if (def.sun) {
      ctx.fillStyle = def.sun;
      ctx.beginPath(); ctx.arc(vw * 0.78, vh * 0.16, 28, 0, Math.PI * 2); ctx.fill();
    }
    if (o.cloud) {
      for (let i = 0; i < 6; i++) {
        const span = vw + 320;
        const x = ((i * 230 - camX * 0.1 - t * (8 + i * 2)) % span + span) % span - 160;
        const y = vh * (0.08 + (i % 4) * 0.09);
        ctx.globalAlpha = 0.85;
        ctx.drawImage(o.cloud, Math.round(x), Math.round(y), 40 * 4, 16 * 4);
        ctx.globalAlpha = 1;
      }
    }
    const vOff = Math.max(-80, Math.min(80, (L.height - camY - vh) * 0.05));
    for (const l of o.layers) {
      const w = l.cv.width * PX;
      const x0 = -(((camX * l.f) % w) + w) % w;
      for (let x = x0; x < vw; x += w) ctx.drawImage(l.cv, Math.round(x), Math.round(vOff), w, l.cv.height * PX);
    }
  }

  // Balon teks krem bergaris ungu. x = pusat horizontal, y = sisi atas kotak. Mengembalikan ukuran kotak.
  // Gelembung teks. Teks boleh berisi "\n" untuk beberapa baris (kotak menyesuaikan baris terpanjang).
  function bubble(ctx, text, x, y, opts) {
    const o = Object.assign({ size: 16, pad: 8, color: '#2c1a52', border: '#4b2e83', bg: 'rgba(255,253,245,0.95)' }, opts || {});
    ctx.font = o.size + 'px ' + FONT;
    const lines = String(text).split('\n');
    const lh = o.size + 4;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + o.pad * 2;
    const h = lines.length * lh - 4 + o.pad * 2;
    ctx.fillStyle = o.bg; ctx.strokeStyle = o.border; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(Math.round(x - w / 2), Math.round(y), w, h, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = o.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, Math.round(x), Math.round(y + o.pad + o.size / 2 + i * lh + 1)));
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'start';
    return { w, h };
  }

  window.Render = { T, FONT, THEMES, drawTiles, drawBackground, drawPlank, drawSlab, bubble };
})();
