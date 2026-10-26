// Pemuat aset gambar (sprite sheet craftpix yang sudah disiapkan di assets/game) dan helper menggambar frame.
(function () {
  const BASE = 'assets/game/';
  const img = {};
  let manifest = {};
  let ready = false;
  const waiters = [];

  function loadImage(name) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve();
      im.onerror = () => { console.error('gagal memuat aset', name); resolve(); };
      im.src = BASE + name + '.png';
      img[name] = im;
    });
  }

  function load() {
    return fetch(BASE + 'manifest.json').then((r) => r.json()).then((m) => {
      manifest = m;
      return Promise.all(Object.keys(m).map(loadImage));
    }).then(() => {
      ready = true;
      waiters.splice(0).forEach((fn) => fn());
    });
  }

  function onReady(fn) { if (ready) fn(); else waiters.push(fn); }

  // Gambar satu frame sheet. (x, y) = pojok kiri atas frame di layar; s = skala; flip = cermin horizontal.
  function draw(ctx, name, frame, x, y, s, flip) {
    const im = img[name], m = manifest[name];
    if (!im || !m || !im.complete || !im.naturalWidth) return false;
    const f = ((frame % m.frames) + m.frames) % m.frames;
    const w = m.fw * s, h = m.h * s;
    if (flip) {
      ctx.save();
      ctx.translate(Math.round(x + w), Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(im, f * m.fw, 0, m.fw, m.h, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(im, f * m.fw, 0, m.fw, m.h, Math.round(x), Math.round(y), w, h);
    }
    return true;
  }

  // Gambar frame dengan titik jangkar di tengah-bawah isi sprite (kaki), agar mudah ditempatkan di tanah.
  // (fx, fy) = titik kaki di layar. Pusat horizontal memakai tengah kotak isi piksel (bbox).
  function drawFeet(ctx, name, frame, fx, fy, s, flip) {
    const m = manifest[name];
    if (!m) return false;
    const bb = m.bbox;
    const cx = (bb[0] + bb[2]) / 2, bottom = bb[3];
    const ax = flip ? (m.fw - cx) : cx;
    return draw(ctx, name, frame, fx - ax * s, fy - bottom * s, s, flip);
  }

  function frames(name) { return manifest[name] ? manifest[name].frames : 1; }
  function info(name) { return manifest[name]; }
  // Indeks frame animasi dari waktu t (detik) dan fps.
  function at(name, t, fps) { return Math.floor(t * (fps || 12)) % frames(name); }

  window.Assets = { img, load, onReady, draw, drawFeet, frames, info, at, get ready() { return ready; } };
})();
