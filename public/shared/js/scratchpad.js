// Kertas coret-coret untuk menghitung, dipakai bersama oleh Math Hero 1, 2, dan 3.
// Tombol "Coret" kecil melayang di layar; ketukan membuka kertas bergaris, anak menulis dengan jari atau mouse.
// Coretan tersimpan selama halaman terbuka (sampai "Hapus"), jadi bisa dilihat lagi sambil menjawab.
// Game dijeda lewat callback onOpen/onClose yang dipasang tiap seri.
(function () {
  'use strict';
  const INK = ['#2b1d52', '#d63a2f'];
  const hooks = { onOpen: null, onClose: null };
  let strokes = [], drawing = null, ink = 0, root = null, cv = null, g = null, btn = null;

  function css() {
    const s = document.createElement('style');
    s.textContent = [
      '#scratch-btn{position:fixed;z-index:60;top:calc(6px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);min-width:48px;min-height:44px;padding:0 10px;border:3px solid #2b1d52;border-radius:14px;background:#ffd54a;color:#2b1d52;font:700 15px/1 system-ui,sans-serif;box-shadow:0 3px 0 #2b1d52;opacity:.92;cursor:pointer;touch-action:manipulation}',
      '#scratch-btn:active{transform:translate(-50%,2px);box-shadow:0 1px 0 #2b1d52}',
      '#scratch{position:fixed;inset:0;z-index:1000;display:none;flex-direction:column;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));background:rgba(20,10,45,.78);font-family:system-ui,sans-serif}',
      '#scratch.open{display:flex}',
      '#scratch p{margin:0;color:#fff;font-weight:700;font-size:16px;text-align:center}',
      '#scratch canvas{flex:1;min-height:0;width:100%;max-width:560px;border:4px solid #2b1d52;border-radius:12px;background:#fffdf2;touch-action:none;cursor:crosshair}',
      '#scratch .bar{display:flex;gap:8px;width:100%;max-width:560px}',
      '#scratch .bar button{flex:1;min-height:52px;border:3px solid #2b1d52;border-radius:12px;font:700 18px/1 system-ui,sans-serif;color:#2b1d52;cursor:pointer;touch-action:manipulation}',
      '#scratch .bar button.ink{flex:0 0 56px}',
      '#scratch .bar button.sel{outline:4px solid #fff;outline-offset:1px}',
      '@media (prefers-reduced-motion:no-preference){#scratch.open{animation:scratchIn .12s ease-out}@keyframes scratchIn{from{opacity:0}to{opacity:1}}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

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

  function open() {
    if (root.classList.contains('open')) return;
    root.classList.add('open'); btn.style.display = 'none';
    size();
    if (hooks.onOpen) hooks.onOpen();
  }
  function close() {
    if (!root.classList.contains('open')) return;
    root.classList.remove('open'); btn.style.display = '';
    drawing = null;
    if (hooks.onClose) hooks.onClose();
  }

  function build() {
    css();
    btn = el('button', { id: 'scratch-btn', type: 'button', 'aria-label': 'Buka kertas coret-coret' }, '✎ Coret');
    root = el('div', { id: 'scratch', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Kertas coret-coret' });
    root.appendChild(el('p', {}, 'Kertas coret-coret: tulis hitunganmu di sini.'));
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
    del.addEventListener('click', () => { strokes = []; drawing = null; redraw(); });
    const done = el('button', { type: 'button' }, 'Selesai'); done.style.background = '#5fd068';
    done.addEventListener('click', close);
    bar.appendChild(del); bar.appendChild(done);
    root.appendChild(cv); root.appendChild(bar);
    document.body.appendChild(btn); document.body.appendChild(root);
    btn.addEventListener('click', open);

    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      drawing = { c: ink, pts: [pt(e)] }; redraw();
    });
    cv.addEventListener('pointermove', (e) => { if (drawing) { drawing.pts.push(pt(e)); redraw(); } });
    const up = () => { if (drawing) { strokes.push(drawing); drawing = null; redraw(); } };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    window.addEventListener('resize', () => { if (root.classList.contains('open')) size(); });
    // Esc menutup kertas di laptop.
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('open')) { e.stopPropagation(); close(); } }, true);
  }

  window.Scratchpad = {
    init(opts) { Object.assign(hooks, opts || {}); },
    open, close,
    isOpen() { return !!root && root.classList.contains('open'); },
  };
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
