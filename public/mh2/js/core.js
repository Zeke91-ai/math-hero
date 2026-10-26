// Math Hero 2: inti mesin. Layar (koordinat logis 360 x VH), loop, adegan, input (sentuh, joystick, keyboard),
// tombol gaya pixel yang digambar di canvas, teks, partikel, dan pesan singkat.
// Semua modul lain menempel ke window.MH2 (disingkat M).
(function () {
  const M = window.MH2 = {
    VW: 360, VH: 640, scale: 1, dpr: 1, t: 0, dt: 0,
    scenes: {}, scene: null, sceneName: '', params: null,
    FONT: "'Kleintenna', system-ui, sans-serif",
    NUMFONT: "'Kleintenna', system-ui, sans-serif",
    debug: /[?&]debug=1(&|$)/.test(location.search),
  };

  const app = document.getElementById('app');
  const canvas = document.getElementById('screen');
  const g = canvas.getContext('2d');
  M.canvas = canvas; M.g = g;

  // ---------- Ukuran layar ----------
  // Lebar logis selalu 360. Tinggi logis mengikuti bentuk layar (dibatasi), kolom di tengah pada layar lebar.
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    let colW = Math.min(w, Math.round(h * 0.66));
    M.dpr = Math.min(window.devicePixelRatio || 1, 2);
    M.scale = colW / M.VW;
    // Layar pendek (laptop mendatar): kecilkan skala agar tinggi logis minimal 560 tetap muat.
    if (h / M.scale < 560) { M.scale = h / 560; colW = Math.round(M.VW * M.scale); }
    app.style.width = colW + 'px';
    M.VH = Math.max(560, Math.min(900, Math.round(h / M.scale)));
    M.cssW = colW; M.cssH = h;
    canvas.width = Math.round(colW * M.dpr);
    canvas.height = Math.round(h * M.dpr);
    if (M.scene && M.scene.resize) M.scene.resize();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();

  // ---------- Bantuan umum ----------
  M.rnd = (n) => Math.floor(Math.random() * n);
  M.between = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  M.pick = (a) => a[Math.floor(Math.random() * a.length)];
  M.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  M.lerp = (a, b, k) => a + (b - a) * k;
  M.ease = (k) => 1 - Math.pow(1 - M.clamp(k, 0, 1), 3);
  M.shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = M.rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  M.inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  M.fmt = (n) => Number(n).toLocaleString('id-ID');

  // ---------- Teks ----------
  // Teks berbingkai agar terbaca di atas latar ramai. o: size, color, align, base, outline, ow, maxW, lh, font.
  M.text = function (ctx, str, x, y, o) {
    o = o || {};
    const size = o.size || 16;
    ctx.font = `${size}px ${o.font || M.FONT}`;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'middle';
    let lines = String(str).split('\n');
    if (o.maxW) lines = [].concat(...lines.map((l) => M.wrap(ctx, l, o.maxW)));
    const lh = o.lh || Math.round(size * 1.25);
    const y0 = o.base === 'top' ? y : y - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => {
      const yy = Math.round(y0 + i * lh);
      if (o.outline !== false) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = o.ow || Math.max(3, size / 5);
        ctx.strokeStyle = o.outline || '#1d1438';
        ctx.strokeText(l, Math.round(x), yy);
      }
      ctx.fillStyle = o.color || '#fff';
      ctx.fillText(l, Math.round(x), yy);
    });
    return lines.length * lh;
  };
  M.wrap = function (ctx, line, maxW) {
    const out = []; let cur = '';
    for (const word of line.split(' ')) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && cur) { out.push(cur); cur = word; } else cur = test;
    }
    out.push(cur);
    return out;
  };
  M.measure = function (ctx, str, size, font) {
    ctx.font = `${size || 16}px ${font || M.FONT}`;
    return ctx.measureText(str).width;
  };

  // ---------- Kotak dan tombol gaya pixel ----------
  // Kotak bersudut terpotong 2 px dengan garis gelap, sorotan atas, dan bayangan bawah.
  M.box = function (ctx, x, y, w, h, fill, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const line = o.line || '#1d1438', b = o.border || 3;
    ctx.fillStyle = line;
    ctx.fillRect(x + b, y, w - 2 * b, h);
    ctx.fillRect(x, y + b, w, h - 2 * b);
    ctx.fillRect(x + b / 2, y + b / 2, w - b, h - b);
    ctx.fillStyle = fill;
    ctx.fillRect(x + b, y + b, w - 2 * b, h - 2 * b);
    if (o.shade !== false) {
      ctx.fillStyle = o.shadeColor || 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + b, y + h - b - Math.max(3, Math.round(h * 0.12)), w - 2 * b, Math.max(3, Math.round(h * 0.12)));
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x + b + 2, y + b + 2, w - 2 * b - 4, 2);
    }
  };
  M.panel = function (ctx, x, y, w, h, o) {
    o = o || {};
    ctx.fillStyle = 'rgba(13,9,32,0.35)';
    ctx.fillRect(Math.round(x) + 4, Math.round(y) + 5, Math.round(w), Math.round(h));
    M.box(ctx, x, y, w, h, o.fill || '#fff6dc', { line: o.line || '#2b1d52', border: 4, shade: false });
    if (o.title) {
      M.box(ctx, x + 14, y - 14, w - 28, 30, o.titleFill || '#7b4bd6', { line: o.line || '#2b1d52' });
      M.text(ctx, o.title, x + w / 2, y + 1, { size: 18, align: 'center' });
    }
  };

  // Tombol: digambar tiap frame dan didaftarkan sebagai area sentuh untuk frame itu.
  const COLORS = {
    pink: ['#ff8fab', '#d65f82'], blue: ['#4b9cff', '#2d6fc4'], green: ['#5fd068', '#2f9a43'], orange: ['#ffb347', '#d27f1c'],
    purple: ['#8b5cf6', '#5b34b8'], yellow: ['#ffd54a', '#d1a21b'], gray: ['#9aa0b4', '#666c80'], red: ['#ff6b6b', '#c9414a'],
    white: ['#fff6dc', '#d6c8a4'], teal: ['#36c9b8', '#1f8f84'],
  };
  M.COLORS = COLORS;
  let hits = [], pressed = null;
  M.button = function (ctx, o) {
    const c = COLORS[o.color || 'pink'] || COLORS.pink;
    const down = pressed && pressed.id === (o.id || o.label) && M.pointer.down;
    const off = o.disabled;
    const dy = down ? 3 : 0;
    const x = Math.round(o.x), y = Math.round(o.y), w = Math.round(o.w), h = Math.round(o.h);
    ctx.globalAlpha = off ? 0.45 : 1;
    if (!down) M.box(ctx, x, y + 4, w, h, c[1], { shade: false });
    M.box(ctx, x, y + dy, w, h, o.fill || c[0], { shadeColor: 'rgba(0,0,0,0.12)' });
    if (o.selected) { ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 3; ctx.strokeRect(x - 3, y - 3 + dy, w + 6, h + 6); }
    if (o.draw) o.draw(ctx, x, y + dy, w, h);
    if (o.label !== undefined && o.label !== '') {
      M.text(ctx, o.label, x + w / 2 + (o.icon ? 10 : 0), y + h / 2 + dy - 1, { size: o.size || 18, align: 'center', color: o.textColor || '#fff', font: o.font, maxW: w - 8, outline: o.textColor ? false : undefined });
    }
    if (o.icon) M.icon(ctx, o.icon, x + (o.label ? 10 : w / 2 - 12), y + h / 2 - 12 + dy, 24, o.iconColor || '#fff');
    ctx.globalAlpha = 1;
    if (!off && o.onTap) hits.push({ id: o.id || o.label, x, y, w, h: h + 4, onTap: o.onTap, sfx: o.sfx });
    return { x, y, w, h };
  };
  // Area sentuh tak terlihat (misalnya untuk benda di dalam permainan).
  M.hit = function (id, x, y, w, h, onTap, sfx) { hits.push({ id, x, y, w, h, onTap, sfx: sfx || null }); };

  // ---------- Input ----------
  const I = M.input = { x: 0, y: 0, a: false, b: false, aHit: false, bHit: false, pause: false, any: false };
  M.pointer = { down: false, x: 0, y: 0, sx: 0, sy: 0, moved: false };
  const keys = {};
  // Tekanan singkat yang terjadi di antara dua frame tetap dihitung (dikunci sampai frame berikutnya membacanya).
  const latch = {};

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / M.scale, y: (e.clientY - r.top) / M.scale };
  }
  canvas.addEventListener('pointerdown', (e) => {
    M.audio && M.audio.unlock();
    const p = toLogical(e);
    Object.assign(M.pointer, { down: true, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, id: e.pointerId });
    canvas.setPointerCapture(e.pointerId);
    pressed = null;
    for (let i = hits.length - 1; i >= 0; i--) if (M.inRect(p.x, p.y, hits[i])) { pressed = hits[i]; break; }
    if (M.scene && M.scene.pointerDown) M.scene.pointerDown(p.x, p.y);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!M.pointer.down || e.pointerId !== M.pointer.id) return;
    const p = toLogical(e);
    M.pointer.x = p.x; M.pointer.y = p.y;
    if (Math.hypot(p.x - M.pointer.sx, p.y - M.pointer.sy) > 8) M.pointer.moved = true;
    if (M.scene && M.scene.pointerMove) M.scene.pointerMove(p.x, p.y);
  });
  const endPointer = (e) => {
    if (!M.pointer.down) return;
    const p = toLogical(e);
    M.pointer.down = false;
    if (pressed && M.inRect(p.x, p.y, pressed)) {
      const h = pressed; pressed = null;
      M.audio && M.audio.sfx(h.sfx || 'klik');
      h.onTap(p.x, p.y);
    } else if (M.scene && M.scene.tap && !M.pointer.moved) M.scene.tap(p.x, p.y);
    pressed = null;
    if (M.scene && M.scene.pointerUp) M.scene.pointerUp(p.x, p.y);
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', () => { M.pointer.down = false; pressed = null; });

  // Joystick dan tombol A/B (DOM, di atas canvas).
  const joy = document.getElementById('joy'), knob = document.getElementById('knob');
  const ctrl = document.getElementById('controls');
  const btnA = document.getElementById('btn-a'), btnB = document.getElementById('btn-b');
  const JR = 44;
  let joyId = null, jc = { x: 0, y: 0 }, joyX = 0, joyY = 0;
  function setJoy(dx, dy) {
    const len = Math.hypot(dx, dy), cl = Math.min(len, JR);
    const nx = len ? dx / len * cl : 0, ny = len ? dy / len * cl : 0;
    knob.style.transform = `translate(${nx}px, ${ny}px)`;
    joyX = Math.abs(nx / JR) < 0.25 ? 0 : nx / JR;
    joyY = Math.abs(ny / JR) < 0.25 ? 0 : ny / JR;
  }
  joy.addEventListener('pointerdown', (e) => {
    M.audio && M.audio.unlock();
    joyId = e.pointerId; joy.setPointerCapture(e.pointerId);
    const r = joy.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    setJoy(e.clientX - jc.x, e.clientY - jc.y); e.preventDefault();
  });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) { setJoy(e.clientX - jc.x, e.clientY - jc.y); e.preventDefault(); } });
  const joyEnd = (e) => { if (e.pointerId === joyId) { joyId = null; setJoy(0, 0); } };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => joy.addEventListener(ev, joyEnd));

  let padA = false, padB = false;
  function hold(el, set) {
    el.addEventListener('pointerdown', (e) => { M.audio && M.audio.unlock(); set(true); el.classList.add('down'); e.preventDefault(); });
    const up = () => { set(false); el.classList.remove('down'); };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => el.addEventListener(ev, up));
  }
  hold(btnA, (v) => { padA = v; if (v) latch.A = true; });
  hold(btnB, (v) => { padB = v; if (v) latch.B = true; });
  ctrl.addEventListener('contextmenu', (e) => e.preventDefault());

  const KEYMAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
    KeyZ: 'A', Space: 'A', KeyK: 'A', KeyX: 'B', KeyJ: 'B', Enter: 'B', Escape: 'P', KeyP: 'P' };
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (!k) return;
    M.audio && M.audio.unlock();
    if (k === 'P') I.pause = true;
    if (!e.repeat) latch[k] = true;
    keys[k] = true; e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; padA = padB = false; if (M.scene && M.scene.blur) M.scene.blur(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && M.scene && M.scene.blur) M.scene.blur(); });
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  let prevA = false, prevB = false;
  function readInput() {
    const on = (k) => !!(keys[k] || latch[k]);
    I.x = joyX || ((on('r') ? 1 : 0) - (on('l') ? 1 : 0));
    I.y = joyY || ((on('d') ? 1 : 0) - (on('u') ? 1 : 0));
    const a = padA || !!keys.A, b = padB || !!keys.B;
    I.aHit = (a && !prevA) || !!latch.A; I.bHit = (b && !prevB) || !!latch.B;
    I.a = a || !!latch.A; I.b = b || !!latch.B; prevA = a; prevB = b;
    for (const k in latch) delete latch[k];
  }

  // Adegan memilih kontrol yang tampil: { joy: true, a: 'Lompat', b: 'Ambil' } atau null.
  M.setControls = function (c) {
    ctrl.classList.toggle('on', !!c);
    if (!c) return;
    ctrl.classList.toggle('nojoy', !c.joy);
    ctrl.classList.toggle('noa', !c.a);
    ctrl.classList.toggle('nob', !c.b);
    btnA.querySelector('small').textContent = c.a || '';
    btnB.querySelector('small').textContent = c.b || '';
  };

  // ---------- Partikel dan teks melayang ----------
  const FX = M.fx = { list: [] };
  FX.burst = function (x, y, o) {
    o = o || {};
    const n = o.n || 10;
    for (let i = 0; i < n; i++) {
      const a = (o.angle !== undefined ? o.angle : Math.random() * Math.PI * 2) + (Math.random() - 0.5) * (o.spread || 6.3);
      const sp = (o.speed || 120) * (0.4 + Math.random() * 0.8);
      FX.list.push({ kind: o.kind || 'sq', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 40), g: o.gravity !== undefined ? o.gravity : 400,
        life: 0, max: (o.life || 0.7) * (0.7 + Math.random() * 0.6), c: Array.isArray(o.color) ? M.pick(o.color) : (o.color || '#ffd54a'), s: o.size || 4 });
    }
  };
  FX.float = function (text, x, y, color, size) {
    FX.list.push({ kind: 'txt', text, x, y, vx: 0, vy: -40, g: 0, life: 0, max: 1.1, c: color || '#ffd54a', s: size || 18 });
  };
  FX.confetti = function () {
    FX.burst(M.VW / 2, M.VH * 0.3, { n: 60, speed: 260, up: 160, life: 1.8, gravity: 260, color: ['#ff8fab', '#ffd54a', '#64e3ff', '#5fd068', '#b38cff'], size: 5 });
  };
  FX.update = function (dt) {
    for (const p of FX.list) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; }
    FX.list = FX.list.filter((p) => p.life < p.max);
  };
  FX.draw = function (ctx, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    for (const p of FX.list) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.6));
      if (p.kind === 'txt') M.text(ctx, p.text, p.x - ox, p.y - oy, { size: p.s, align: 'center', color: p.c });
      else if (p.kind === 'star') M.drawStar(ctx, p.x - ox, p.y - oy, p.s * 2, p.c);
      else { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - ox - p.s / 2), Math.round(p.y - oy - p.s / 2), p.s, p.s); }
    }
    ctx.globalAlpha = 1;
  };
  M.drawStar = function (ctx, x, y, r, color, outline) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    if (outline) { ctx.lineWidth = 3; ctx.strokeStyle = outline; ctx.stroke(); }
    ctx.fillStyle = color; ctx.fill();
  };

  // Pesan singkat di bagian atas layar.
  const toast = { text: '', until: 0, color: '#fff6dc' };
  M.toast = function (text, ms, color) { toast.text = text; toast.until = M.t + (ms || 1800) / 1000; toast.color = color || '#fff6dc'; };
  M.drawToast = function (ctx, y) {
    if (!toast.text || M.t > toast.until) return;
    ctx.font = `16px ${M.FONT}`;
    const lines = M.wrap(ctx, toast.text, M.VW - 60);
    const w = Math.min(M.VW - 24, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28), h = lines.length * 20 + 14;
    const k = Math.min(1, (toast.until - M.t) * 4);
    ctx.globalAlpha = k;
    M.box(ctx, M.VW / 2 - w / 2, y, w, h, toast.color, { line: '#2b1d52' });
    lines.forEach((l, i) => M.text(ctx, l, M.VW / 2, y + 17 + i * 20, { size: 16, align: 'center', color: '#2b1d52', outline: false }));
    ctx.globalAlpha = 1;
  };

  // ---------- Adegan dan loop ----------
  let fade = { a: 0, dir: 0, next: null };
  M.register = (name, sc) => { M.scenes[name] = sc; };
  // Pindah adegan dengan transisi gelap singkat.
  M.go = function (name, params, instant) {
    if (instant || !M.scene) { switchTo(name, params); return; }
    fade = { a: 0, dir: 1, next: [name, params] };
  };
  function switchTo(name, params) {
    if (M.scene && M.scene.exit) M.scene.exit();
    M.sceneName = name; M.params = params || {};
    M.scene = M.scenes[name];
    FX.list = []; toast.text = '';
    M.setControls(null);
    if (M.scene.enter) M.scene.enter(M.params);
  }

  let last = performance.now(), fpsN = 0, fpsT = 0, fps = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    M.dt = dt; M.t += dt;
    readInput();
    if (M.scene && fade.dir !== 1) {
      if (M.scene.update) M.scene.update(dt);
    }
    FX.update(dt);
    if (fade.dir === 1) { fade.a += dt * 5; if (fade.a >= 1) { fade.a = 1; fade.dir = -1; switchTo(fade.next[0], fade.next[1]); } }
    else if (fade.dir === -1) { fade.a -= dt * 4; if (fade.a <= 0) { fade.a = 0; fade.dir = 0; } }
    I.pause = false;
    // Gambar.
    hits = [];
    g.setTransform(M.dpr * M.scale, 0, 0, M.dpr * M.scale, 0, 0);
    g.imageSmoothingEnabled = false;
    if (M.scene && M.scene.draw) M.scene.draw(g);
    if (fade.a > 0) { g.fillStyle = `rgba(26,18,51,${fade.a})`; g.fillRect(0, 0, M.VW, M.VH); }
    fpsN++; if (now - fpsT > 1000) { fps = fpsN; fpsN = 0; fpsT = now; }
    if (M.debug) M.text(g, `${fps} fps ${M.VW}x${M.VH}`, 4, M.VH - 10, { size: 12 });
    requestAnimationFrame(frame);
  }
  M.start = function (first, params) {
    switchTo(first, params);
    last = performance.now();
    requestAnimationFrame(frame);
  };
})();
