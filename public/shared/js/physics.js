// Fisika platformer Math Hero. Murni logika tanpa DOM, dipakai game (browser) dan bot pemeriksa level (Node).
// Dunia memakai tile 32 px. Koordinat y ke bawah. Hitbox pemain 28 x 52 px.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Physics = factory();
})(this, function () {
  const T = 32;
  const C = {
    T,
    GRAVITY: 1700,
    MOVE: 190,
    JUMP: -660,      // tinggi lompat penuh sekitar 128 px (4 tile)
    DJUMP: -560,     // lompat kedua di udara sekitar 92 px
    MAXFALL: 880,
    COYOTE: 0.1,     // masih boleh melompat sebentar setelah turun dari tepi
    BUFFER: 0.12,    // tombol lompat yang ditekan sedikit lebih awal tetap dihitung
    PW: 28,
    PH: 52,
  };

  // Isi tile: 0 kosong, 1 padat, 2 platform tembus dari bawah (bisa diinjak dari atas).
  // Kolom di luar level dianggap dinding padat; baris di luar level kosong (jatuh ke jurang).
  function tileAt(L, c, r) {
    if (c < 0 || c >= L.cols) return 1;
    if (r < 0 || r >= L.rows) return 0;
    return L.tiles[r * L.cols + c];
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Gerakkan benda b selama dt detik. dyn: persegi dinamis {x,y,w,h,ow,vy} (gerbang, platform gerak, dll).
  // Mengembalikan {hitWall, landed, bumped, platform}.
  function stepBody(b, dt, L, dyn) {
    const res = { hitWall: 0, landed: false, bumped: false, platform: null };
    dyn = dyn || [];

    // Sumbu X.
    const dir = Math.sign(b.vx);
    if (dir !== 0) {
      b.x += b.vx * dt;
      const top = Math.floor(b.y / T), bot = Math.floor((b.y + b.h - 0.01) / T);
      if (dir > 0) {
        const c = Math.floor((b.x + b.w - 0.001) / T);
        for (let r = top; r <= bot; r++) {
          if (tileAt(L, c, r) === 1) { b.x = c * T - b.w; b.vx = 0; res.hitWall = 1; break; }
        }
      } else {
        const c = Math.floor(b.x / T);
        for (let r = top; r <= bot; r++) {
          if (tileAt(L, c, r) === 1) { b.x = (c + 1) * T; b.vx = 0; res.hitWall = -1; break; }
        }
      }
      for (const d of dyn) {
        if (d.ow || !overlap(b, d)) continue;
        // Abaikan jika benda berdiri di atas persegi ini (ditangani sumbu Y).
        if (b.y + b.h <= d.y + 6) continue;
        if (dir > 0) b.x = d.x - b.w; else b.x = d.x + d.w;
        b.vx = 0;
        res.hitWall = dir;
      }
    }

    // Sumbu Y.
    const prevBottom = b.y + b.h, prevTop = b.y;
    if (b.vy > C.MAXFALL) b.vy = C.MAXFALL;
    b.y += b.vy * dt;
    b.onGround = false;
    const c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w - 0.001) / T);
    if (b.vy >= 0) {
      const r = Math.floor((b.y + b.h) / T);
      for (let c = c0; c <= c1; c++) {
        const t = tileAt(L, c, r);
        if (t === 1 || (t === 2 && !(b.drop > 0) && prevBottom <= r * T + 0.5)) {
          b.y = r * T - b.h; b.vy = 0; b.onGround = true; res.landed = true; break;
        }
      }
    } else {
      const r = Math.floor(b.y / T);
      for (let c = c0; c <= c1; c++) {
        if (tileAt(L, c, r) === 1) { b.y = (r + 1) * T; b.vy = 0; res.bumped = true; break; }
      }
    }
    for (const d of dyn) {
      if (!overlap(b, d)) continue;
      if (d.ow && b.drop > 0) continue;
      const dvy = d.vy > 0 ? d.vy * dt : 0;
      if (b.vy >= 0 && prevBottom <= d.y + 6 + dvy) {
        b.y = d.y - b.h; b.vy = 0; b.onGround = true; res.landed = true; res.platform = d;
      } else if (!d.ow && b.vy < 0 && prevTop >= d.y + d.h - 6) {
        b.y = d.y + d.h; b.vy = 0; res.bumped = true;
      }
    }

    // Dorong keluar dari persegi padat yang masih menumpuk (misalnya platform gerak dari samping).
    for (const d of dyn) {
      if (d.ow || !overlap(b, d)) continue;
      const left = b.x + b.w - d.x, right = d.x + d.w - b.x;
      b.x += left < right ? -left : right;
    }
    return res;
  }

  return { C, T, tileAt, overlap, stepBody };
});
