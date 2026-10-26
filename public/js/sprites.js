// Sprite pixel art untuk dekorasi dan item, serta latar (backdrop). File ada di assets/svg
// (sumber dan lisensi: assets/svg/CREDITS.md). Gambar dimuat sekali di awal; jika belum siap,
// draw() dan backdrop() mengembalikan false/null dan pemanggil memakai cadangan.
(function () {
  const NAMES = [
    'chick', 'bee', 'apple', 'banana', 'cherry', 'grape', 'strawberry',
    'pineapple', 'watermelon', 'candy', 'lollipop',
  ];
  // Aset dari Vecteezy disimpan di subfolder vecteezy/ dan dipanggil dengan nama pendek.
  const SRC = {
    park: 'assets/svg/vecteezy/vecteezy_adventure-game-park-background_21173001.svg',
    trees: 'assets/svg/vecteezy/vecteezy_set-of-green-pixel-trees-computer-graphic-vector_17459073.svg',
  };
  const cache = {};
  const backdrops = {};

  function get(name) {
    if (!cache[name]) {
      const img = new Image();
      img.src = SRC[name] || ('assets/svg/' + name + '.svg');
      cache[name] = img;
    }
    return cache[name];
  }

  function draw(ctx, name, x, y, w, h) {
    const img = get(name);
    if (!img.complete || !img.naturalWidth) return false;
    ctx.drawImage(img, x, y, w, h);
    return true;
  }

  // Latar penuh layar (seperti background-cover). Dirender sekali per ukuran layar, lalu digambar ulang.
  function backdrop(name, w, h) {
    const img = get(name);
    if (!img.complete || !img.naturalWidth) return null;
    const key = name + ':' + w + 'x' + h;
    if (!backdrops[key]) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const cx = c.getContext('2d');
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      cx.drawImage(img, (w - dw) / 2, h - dh, dw, dh);
      backdrops[key] = c;
    }
    return backdrops[key];
  }

  NAMES.forEach(get);
  get('park');
  get('trees');
  window.Sprites = { draw, backdrop };
})();
