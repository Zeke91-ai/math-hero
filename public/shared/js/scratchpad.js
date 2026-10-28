// Kertas coret-coret untuk menghitung, dipakai bersama oleh Math Hero 1, 2, dan 3.
// Tombol pulau bulat (✎) melayang dan bisa diseret; meluncur menempel ke tepi kiri/kanan saat dilepas.
// Ketukan membuka lembar bawah (bottom sheet) setinggi ~58% layar, jadi soal di atas tetap terlihat.
// Tombol "Lihat soal" di gagang lembar menciutkan lembar jadi strip tipis. Coretan tersimpan sampai Hapus/clear().
//
// Tombol hanya ada saat game memanggil Scratchpad.setAvailable(true), yaitu ketika anak sedang mengerjakan
// soal yang menghentikan waktu. Kertas TIDAK menjeda game. Animasi memakai GSAP + Draggable (shared/vendor/gsap);
// bila GSAP tidak termuat, semuanya tetap jalan tanpa animasi dan tanpa seret.
//
// API: setAvailable(bool) idempoten, boleh dipanggil tiap frame | open() close() clear() isOpen() isAvailable()
//      init(opts) tetap ada demi kompatibilitas (opsional onOpen/onClose).
(function () {
  'use strict';
  const INK = ['#2b1d52', '#d63a2f'];
  const POS_KEY = 'mathHero.scratch.pos';
  const BTN = 56, MARGIN = 6, STRIP = 64, DRAG_MIN = 6;
  const hooks = { onOpen: null, onClose: null };
  let strokes = [], drawing = null, ink = 0;
  let root = null, cv = null, g = null, btn = null, toggleBtn = null, drag = null;
  let avail = false, opened = false, collapsed = false;
  let pos = { x: 0, y: 0 }; // sudut kiri-atas tombol dalam piksel viewport

  const gs = () => window.gsap || null;
  // Durasi 0 bila anak/OS meminta gerak dikurangi.
  const dur = (s) => {
    try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0; } catch (e) { /* abaikan */ }
    return s;
  };

  function css() {
    const s = document.createElement('style');
    s.textContent = [
      '#scratch-btn{position:fixed;left:0;top:0;z-index:60;display:none;align-items:center;justify-content:center;width:56px;height:56px;padding:0;border:3px solid #2b1d52;border-radius:50%;background:#ffd54a;color:#2b1d52;font:700 26px/1 system-ui,sans-serif;box-shadow:0 3px 0 #2b1d52,0 6px 12px rgba(0,0,0,.25);cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}',
      '#scratch-btn:active{cursor:grabbing}',
      '#scratch{position:fixed;left:0;right:0;bottom:0;margin:0 auto;z-index:1000;display:none;flex-direction:column;width:min(100%,560px);height:min(58vh,560px);height:min(58dvh,560px);box-sizing:border-box;background:#fffdf2;border:4px solid #2b1d52;border-bottom:0;border-radius:18px 18px 0 0;box-shadow:0 -6px 18px rgba(20,10,45,.35);font-family:system-ui,sans-serif;color:#2b1d52}',
      '#scratch.open{display:flex}',
      '#scratch .head{flex:0 0 ' + (STRIP - 4) + 'px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px 0 14px;box-sizing:border-box}',
      '#scratch .head span{font-weight:700;font-size:16px}',
      '#scratch .grip{position:absolute;top:6px;left:50%;width:44px;height:5px;margin-left:-22px;border-radius:3px;background:#c9bfe6}',
      '#scratch .head button{min-width:48px;min-height:48px;padding:0 14px;border:3px solid #2b1d52;border-radius:12px;background:#9ad7ff;font:700 16px/1 system-ui,sans-serif;color:#2b1d52;cursor:pointer;touch-action:manipulation}',
      '#scratch canvas{flex:1;min-height:0;width:calc(100% - 20px);margin:0 10px;border:3px solid #2b1d52;border-radius:12px;background:#fffdf2;touch-action:none;cursor:crosshair}',
      '#scratch .bar{display:flex;flex:0 0 auto;gap:8px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));box-sizing:border-box}',
      '#scratch .bar button{flex:1;min-height:52px;border:3px solid #2b1d52;border-radius:12px;font:700 18px/1 system-ui,sans-serif;color:#2b1d52;cursor:pointer;touch-action:manipulation}',
      '#scratch .bar button.ink{flex:0 0 56px}',
      '#scratch .bar button.sel{outline:4px solid #7b4bd6;outline-offset:1px}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  // ---------- Kanvas ----------
  function size() {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    redraw();
  }

  // Koordinat disimpan 0..1 terhadap kertas supaya aman bila ukuran layar berubah.
  function redraw() {
    if (!cv) return;
    const w = cv.width, h = cv.height, dpr = window.devicePixelRatio || 1;
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,120,200,0.2)'; g.lineWidth = 1 * dpr;
    for (let y = 36 * dpr; y < h; y += 36 * dpr) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 4 * dpr;
    for (const s of drawing ? strokes.concat([drawing]) : strokes) {
      g.strokeStyle = INK[s.c];
      g.beginPath(); g.moveTo(s.pts[0][0] * w, s.pts[0][1] * h);
      if (s.pts.length === 1) g.lineTo(s.pts[0][0] * w + 0.1, s.pts[0][1] * h);
      for (let i = 1; i < s.pts.length; i++) g.lineTo(s.pts[i][0] * w, s.pts[i][1] * h);
      g.stroke();
    }
  }

  function pt(e) {
    const r = cv.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  }

  // ---------- Posisi tombol ----------
  const vw = () => window.innerWidth, vh = () => window.innerHeight;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function loadPos() {
    try {
      const v = JSON.parse(localStorage.getItem(POS_KEY));
      if (v && isFinite(v.x) && isFinite(v.y)) return v;
    } catch (e) { /* tanpa storage tetap jalan */ }
    return { x: 1, y: 0.38 }; // tepi kanan, 38% dari atas
  }
  function savePos() {
    try { localStorage.setItem(POS_KEY, JSON.stringify({ x: +(pos.x / vw()).toFixed(4), y: +(pos.y / vh()).toFixed(4) })); } catch (e) { /* abaikan */ }
  }
  // Tepi terdekat (kiri/kanan) dan y yang masih di dalam layar.
  function snapped(x, y) {
    const right = x + BTN / 2 > vw() / 2;
    return { x: right ? vw() - BTN - MARGIN : MARGIN, y: clamp(y, MARGIN, Math.max(MARGIN, vh() - BTN - MARGIN)) };
  }
  function place(p) {
    pos = p;
    if (gs()) gs().set(btn, { x: p.x, y: p.y }); else btn.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
  }
  function placeFromSaved() {
    const v = loadPos();
    place(snapped(v.x * vw(), v.y * vh()));
    if (drag) drag.update();
  }
  function onDragEnd() {
    const gsap = gs();
    const to = snapped(gsap.getProperty(btn, 'x'), gsap.getProperty(btn, 'y'));
    pos = to;
    gsap.to(btn, { x: to.x, y: to.y, duration: dur(0.35), ease: 'power3.out', onComplete() { if (drag) drag.update(); } });
    savePos();
  }

  // ---------- Tombol: muncul / hilang ----------
  function showBtn() {
    btn.style.display = 'flex'; btn.removeAttribute('aria-hidden'); btn.tabIndex = 0;
    const gsap = gs();
    if (gsap) { gsap.killTweensOf(btn, 'scale,opacity'); gsap.fromTo(btn, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: dur(0.25), ease: 'back.out(1.7)' }); }
    else { btn.style.opacity = '1'; }
  }
  function hideBtn(d) {
    btn.setAttribute('aria-hidden', 'true'); btn.tabIndex = -1;
    const gsap = gs();
    const end = () => { if (!avail || opened) btn.style.display = 'none'; };
    if (gsap && btn.style.display !== 'none') { gsap.killTweensOf(btn, 'scale,opacity'); gsap.to(btn, { scale: 0.4, opacity: 0, duration: dur(d), ease: 'power2.in', onComplete: end }); }
    else btn.style.display = 'none';
  }

  // ---------- Lembar ----------
  // Tinggi lembar yang terlihat dilaporkan ke CSS (--scratch-h) agar kotak soal tidak tertutup.
  function reportH() {
    const gsap = gs();
    const yp = gsap ? +gsap.getProperty(root, 'yPercent') : (opened ? (collapsed ? collapsedY() : 0) : 100);
    const h = opened || yp < 100 ? Math.max(0, root.offsetHeight * (1 - yp / 100)) : 0;
    document.documentElement.style.setProperty('--scratch-h', Math.round(h) + 'px');
  }
  const collapsedY = () => Math.max(0, (1 - STRIP / Math.max(STRIP, root.offsetHeight)) * 100);
  function sheetTo(yp, d, ease, done) {
    const gsap = gs();
    if (gsap) {
      gsap.killTweensOf(root);
      gsap.to(root, { yPercent: yp, duration: dur(d), ease, onUpdate: reportH, onComplete() { reportH(); if (done) done(); } });
    } else { root.style.transform = 'translateY(' + yp + '%)'; reportH(); if (done) done(); }
  }
  function setCollapsed(c, instant) {
    collapsed = c;
    toggleBtn.textContent = c ? 'Buka kertas' : 'Lihat soal';
    toggleBtn.setAttribute('aria-expanded', c ? 'false' : 'true');
    sheetTo(c ? collapsedY() : 0, instant ? 0 : 0.25, 'power2.inOut');
  }

  function open() {
    if (opened || !avail) return;
    opened = true; collapsed = false;
    toggleBtn.textContent = 'Lihat soal'; toggleBtn.setAttribute('aria-expanded', 'true');
    root.classList.add('open'); document.body.classList.add('scratch-open');
    size();
    const gsap = gs();
    if (gsap) gsap.set(root, { yPercent: 100 }); else root.style.transform = 'translateY(100%)';
    sheetTo(0, 0.32, 'power3.out');
    hideBtn(0.2);
    if (hooks.onOpen) hooks.onOpen();
  }
  function close() {
    if (!opened) return;
    opened = false; drawing = null;
    sheetTo(100, 0.24, 'power2.in', () => { if (!opened) { root.classList.remove('open'); document.body.classList.remove('scratch-open'); } });
    if (avail) showBtn();
    if (hooks.onClose) hooks.onClose();
  }
  function clear() { strokes = []; drawing = null; redraw(); }

  function setAvailable(b) {
    b = !!b;
    if (b === avail || !btn) { if (!btn) avail = b; return; }
    avail = b;
    if (b) { if (!opened) showBtn(); }
    else if (opened) { close(); hideBtn(0.01); } else hideBtn(0.18);
  }

  function build() {
    css();
    btn = el('button', { id: 'scratch-btn', type: 'button', 'aria-label': 'Buka kertas coret-coret', 'aria-hidden': 'true', tabindex: '-1' }, '✎');
    root = el('div', { id: 'scratch', role: 'dialog', 'aria-label': 'Kertas coret-coret' });
    const head = el('div', { class: 'head' });
    head.appendChild(el('div', { class: 'grip' }));
    head.appendChild(el('span', {}, 'Kertas coret-coret'));
    toggleBtn = el('button', { type: 'button', 'aria-expanded': 'true' }, 'Lihat soal');
    toggleBtn.addEventListener('click', () => setCollapsed(!collapsed));
    head.appendChild(toggleBtn);
    cv = el('canvas', { 'aria-label': 'Kertas untuk menulis dengan jari' });
    g = cv.getContext('2d');
    const bar = el('div', { class: 'bar' });
    const inkBtns = INK.map((c, i) => {
      const b = el('button', { type: 'button', class: 'ink', 'aria-label': i ? 'Tinta merah' : 'Tinta ungu' });
      b.style.background = c;
      b.addEventListener('click', () => { ink = i; inkBtns.forEach((x, j) => x.classList.toggle('sel', j === i)); });
      bar.appendChild(b); return b;
    });
    inkBtns[0].classList.add('sel');
    const del = el('button', { type: 'button' }, 'Hapus'); del.style.background = '#ff9f43';
    del.addEventListener('click', clear);
    const done = el('button', { type: 'button' }, 'Selesai'); done.style.background = '#5fd068';
    done.addEventListener('click', close);
    bar.appendChild(del); bar.appendChild(done);
    root.appendChild(head); root.appendChild(cv); root.appendChild(bar);
    document.body.appendChild(btn); document.body.appendChild(root);

    const gsap = gs();
    if (gsap) {
      gsap.set(root, { yPercent: 100 });
      gsap.set(btn, { opacity: 0, scale: 0.4 });
      if (window.Draggable) {
        gsap.registerPlugin(window.Draggable);
        drag = window.Draggable.create(btn, {
          type: 'x,y', minimumMovement: DRAG_MIN, dragClickables: true, zIndexBoost: false,
          bounds: { minX: 0, maxX: vw() - BTN, minY: 0, maxY: vh() - BTN },
          onClick: open, onDragEnd,
        })[0];
      } else btn.addEventListener('click', open);
    } else btn.addEventListener('click', open);
    placeFromSaved();

    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      drawing = { c: ink, pts: [pt(e)] }; redraw();
    });
    cv.addEventListener('pointermove', (e) => { if (drawing) { drawing.pts.push(pt(e)); redraw(); } });
    const up = () => { if (drawing) { strokes.push(drawing); drawing = null; redraw(); } };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    window.addEventListener('resize', () => {
      if (drag) drag.applyBounds({ minX: 0, maxX: vw() - BTN, minY: 0, maxY: vh() - BTN });
      placeFromSaved();
      if (opened) { size(); if (collapsed) sheetTo(collapsedY(), 0); else reportH(); }
    });
    // Esc menutup kertas di laptop.
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && opened) { e.stopPropagation(); close(); } }, true);
    if (avail) showBtn();
  }

  window.Scratchpad = {
    init(opts) { Object.assign(hooks, opts || {}); },
    setAvailable, open, close, clear,
    isOpen() { return opened; },
    isAvailable() { return avail; },
  };
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
