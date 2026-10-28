// Bot pemain Kejar MH3 untuk uji (Node dan Playwright). Memainkan level hasil generator di simulasi asli:
// aturan umum (lari ke kanan, lompati jurang dengan lompat ganda bila perlu, dinding rendah, duri, gergaji, musuh;
// tembak musuh yang tidak bisa diinjak dengan B; panjat tangga dengan atas; tunggu dan naiki platform gerak) ditambah
// langkah khusus per ruang yang butuh jalan memutar (rooms dari levelgen).
// Pakai: const bot = KejarBot.make(); tiap frame: Sim.update(g, dt, bot.step(g)).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KejarBot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const T = 32;
  // Langkah per ruang (kolom relatif ke awal ruang). go: jalan ke kolom; climb: panjat tangga sampai puncak;
  // jump: lompat ke arah (-1, 0, 1) sampai mendarat; lift: naiki lift sampai puncak; mover: naiki platform gerak;
// spring: jalan ke per di kolom itu, lalu saat terlontar arahkan ke kanan dan lompat ganda di puncak.
  const SCRIPT = {
    tuas_atas: [{ go: 8.5 }, { climb: 1 }, { go: 3.5 }, { go: 10.5 }],
    per_naik: [{ spring: 4.5 }],
    per_tembok: [{ spring: 2.5 }],
    gua_lewat: [{ go: 4.8 }, { go: 14.5 }, { climb: 1 }, { go: 15.5 }],
    menara_tangga: [{ go: 6.5 }, { climb: 1 }, { go: 1.5 }, { climb: 1 }, { go: 5.3 }, { jump: 1 }],
    menara_zigzag: [{ go: 7.5 }, { jump: 0 }, { go: 6.3 }, { jump: -1 }, { go: 3.3 }, { jump: 1 }, { go: 6.3 }, { jump: -1 }, { go: 3.3 }, { jump: 1 }],
    tangga_zigzag: [{ go: 2.6 }, { jump: 0 }, { go: 3.4 }, { jump: 1 }, { go: 7.4 }, { jump: 1 }],
    lift_naik: [{ go: 5.5 }, { lift: 1 }, { jump: 1 }],
    menara_lift_per: [{ go: 2.5 }, { lift: 1 }, { jump: 1 }],
    gerak_jurang: [{ go: 1.7 }, { mover: 1 }],
    saklar_jembatan: [{ go: 0.3 }, { jump: 1 }, { go: 3.4 }, { jump: 1 }, { go: 6.4 }, { jump: 1 }, { go: 9.3 }],
  };

  function make() {
    const ctx = { room: -1, step: 0, mem: {} };
    function move(g) {
      const p = g.p, L = g.L, rooms = g.def.rooms || [];
      const cx = p.x + p.w / 2, col = Math.floor(cx / T), foot = Math.floor((p.y + p.h - 1) / T);
      const tile = (c, r) => (c < 0 || c >= L.cols ? 1 : r < 0 || r >= L.rows ? 0 : L.tiles[r * L.cols + c]);
      const ladderAt = (c, r) => c >= 0 && c < L.cols && r >= 0 && r < L.rows && L.lad[r * L.cols + c] === 1;
      const platAt = (c, r) => L.crumbles.some((k) => k.state !== 'gone' && Math.floor(k.x / T) === c && Math.floor(k.y / T) === r) ||
        L.ladTops.some((k) => Math.floor(k.x / T) === c && Math.floor(k.y / T) === r);
      // hero dipindah (jatuh ke checkpoint): cari ruang dari awal lagi
      if (ctx.lastX !== undefined && Math.abs(cx - ctx.lastX) > 3 * T) { ctx.room = -1; ctx.step = 0; ctx.mem = {}; }
      ctx.lastX = cx;
      const ri = rooms.findIndex((r) => col >= r.c && col < r.c + r.w);
      if (ri !== ctx.room && ri > ctx.room) { ctx.room = ri; ctx.step = 0; ctx.mem = {}; }
      const room = rooms[ctx.room], script = room && col >= room.c && col < room.c + room.w + 2 ? SCRIPT[room.id] : null;
      const st = script && script[ctx.step];
      const next = () => { ctx.step++; ctx.mem = {}; };

      // umum: arah d, lompat bila ada rintangan di depan
      const auto = (d) => {
        let jump = false;
        for (const n of [1, 2]) {
          const c = col + d * n;
          if (p.onGround && tile(c, foot + 1) === 0 && !platAt(c, foot + 1) && tile(c, foot + 2) === 0 && tile(c, foot + 3) === 0) jump = true;
          if (n === 1 && tile(c, foot) === 1) jump = true;
          if (L.spikes.some((q) => Math.floor((q.x + 4) / T) === c && Math.abs(q.y - p.y - p.h + 20) < 24)) jump = true;
        }
        for (const s of L.saws) if ((s.cx - cx) * d > 0 && Math.abs(s.cx - cx) < 70 && Math.abs(s.cy - (p.y + p.h - 16)) < 40) jump = true;
        // kotak yang tidak bisa didorong lagi (menempel dinding): naiki
        const touchBox = p.onGround && g.boxes.some((b) => Math.abs(d > 0 ? b.x - (p.x + p.w) : p.x - (b.x + b.w)) < 3 && b.y < p.y + p.h - 4 && b.y + b.h > p.y + p.h - 8);
        ctx.boxStuck = touchBox && !g.pushing ? (ctx.boxStuck || 0) + 1 : 0;
        if (ctx.boxStuck > 12) jump = true;
        // musuh: injak yang bisa diinjak, tembak yang tidak (banteng, lebah, meriam); lompati peluru meriam
        let skill = false;
        for (const e of g.enemies) {
          if (e.dead || (e.b.x - p.x) * d <= 0) continue;
          const dx = Math.abs(e.b.x - p.x), dy = Math.abs(e.b.y + e.b.h - (p.y + p.h));
          const hard = e.type === 'f' || e.type === 'n' || (e.type === 'r' && e.state !== 'stun');
          if (hard && dx < 220 && dy < 50) skill = true;
          else if (!hard && dx < 70 && dy < 60) jump = true;
          if (hard && dx < 60 && dy < 50 && e.type !== 'f') jump = true;
        }
        for (const b of g.balls) if ((b.x - cx) * Math.sign(-b.vx) > 0 && Math.abs(b.x - cx) < 90 && Math.abs(b.y - (p.y + p.h / 2)) < 40) jump = true;
        const fly = g.enemies.find((e) => !e.dead && e.type === 'f' && Math.abs(e.b.x - p.x) < 60 && Math.abs(e.b.y - p.y) < 60);
        if (fly && p.onGround) return { dir: 0, skill: true, jumpHeld: true };
        // lompat ganda saat turun di atas jurang
        const voidCol = (c) => [1, 2, 3, 4, 5].every((n) => tile(c, foot + n) === 0 && !platAt(c, foot + n)) && !L.movers.some((m) => Math.abs(m.x + m.w / 2 - (c + 0.5) * T) < 48 && m.y > p.y);
        const voidBelow = voidCol(col) && voidCol(col + d) && voidCol(col + 2 * d);
        if (!p.onGround && !g.djumpUsed && p.vy > 60 && voidBelow && !g.climb) return { dir: d, jump: true, jumpHeld: true, skill };
        // platform gerak di depan jurang: tunggu sampai mendekat
        const m = L.movers.find((k) => k.axis === 'x' && k.y0 < p.y + p.h && k.y0 > p.y - 4 * T && Math.abs(k.x0 - cx) < 6 * T);
        if (jump && m && !g.ride && p.onGround && tile(col + d, foot + 1) === 0) {
          const gap = m.x - (p.x + p.w);
          if (!(gap < 24 && gap > -40 && m.dir > 0)) return { dir: 0 };
        }
        // tangga di depan atau di tempat: panjat bila puncaknya di atas
        const onLad = [foot - 1, foot].some((r) => ladderAt(col, r));
        if (onLad && ladderAt(col, foot - 2)) return { dir: 0, up: true };
        if (g.climb) return { dir: 0, up: true };
        return { dir: d, jump: jump && p.onGround, jumpHeld: true, skill };
      };

      if (!st) return auto(1);
      if (st.go !== undefined) {
        const tx = (room.c + st.go) * T;
        if (Math.abs(tx - cx) < 5 && p.onGround) { next(); return { dir: 0 }; }
        if (g.climb) return { dir: Math.sign(tx - cx), jump: true, jumpHeld: true };
        return { dir: Math.sign(tx - cx), jumpHeld: true };
      }
      if (st.spring !== undefined) {
        if (g.boost > 0 || ctx.mem.up) {
          ctx.mem.up = true;
          if (p.onGround && p.vy >= 0 && !g.boost) { next(); return { dir: 0 }; }
          return { dir: 1, jump: p.vy > -60 && !g.djumpUsed, jumpHeld: true };
        }
        const tx = (room.c + st.spring) * T;
        return { dir: Math.sign(tx - cx) || 1, jumpHeld: true };
      }
      if (st.climb) {
        if (g.climb) ctx.mem.climbed = true;
        if (ctx.mem.climbed && !g.climb && p.onGround) { next(); return { dir: 0 }; }
        return { dir: 0, up: true };
      }
      if (st.jump !== undefined) {
        if (!ctx.mem.air) { if (p.onGround) { ctx.mem.air = 1; return { dir: st.jump, jump: true, jumpHeld: true }; } return { dir: 0 }; }
        if (!p.onGround) ctx.mem.air = 2;
        if (ctx.mem.air === 2 && p.onGround) { next(); return { dir: 0 }; }
        return { dir: st.jump, jumpHeld: true };
      }
      if (st.lift) {
        const m = L.movers.filter((k) => k.axis === 'y').sort((a, b) => Math.abs(a.x + a.w / 2 - cx) - Math.abs(b.x + b.w / 2 - cx))[0];
        if (g.ride === m) { ctx.mem.on = true; if (m.y <= m.y0 + 1) { next(); return { dir: 0 }; } return { dir: 0 }; }
        if (ctx.mem.on && !g.ride) { ctx.mem.on = false; }
        if (p.onGround && m.y >= m.y1 - 6 && m.dir < 0 && m.y > p.y + p.h - 2 * T) return { dir: 0, jump: true, jumpHeld: true };
        return { dir: 0, jumpHeld: true };
      }
      if (st.mover) {
        const m = L.movers.filter((k) => k.axis === 'x').sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))[0];
        if (g.ride === m) { ctx.mem.on = true; if (m.x >= m.x1 - 2) { ctx.mem.off = true; } return ctx.mem.off ? { dir: 1, jump: true, jumpHeld: true } : { dir: 0 }; }
        if (ctx.mem.off) { if (p.onGround) { next(); return { dir: 0 }; } return { dir: 1, jumpHeld: true }; }
        if (!p.onGround) return { dir: ctx.mem.boarding ? 1 : 0, jumpHeld: true };
        const gap = m.x - (p.x + p.w);
        if (m.dir > 0 && gap < 40 && gap > -20 && m.x < m.x0 + 24) { ctx.mem.boarding = true; return { dir: 1, jump: true, jumpHeld: true }; }
        ctx.mem.boarding = false;
        return { dir: 0 };
      }
      return auto(1);
    }
    // Tuas di dekat hero: tekan B sekali bila belum menyala (B di dekat tuas menarik tuas, bukan skill).
    function step(g) {
      const inp = move(g), lv = g.nearLever;
      return lv ? Object.assign({}, inp, { skill: !lv.on }) : inp;
    }
    return { step, ctx };
  }
  return { make, SCRIPT };
});
