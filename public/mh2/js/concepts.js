// Math Hero 2: pembuat soal untuk semua mode. Murni logika (tanpa DOM) agar bisa diuji di Node:
//   node tests/mh2.test.js
// Setiap soal membawa penjelasan langkah (explain) yang menekankan KONSEP, bukan hafalan:
// garis bilangan, kelompok sama banyak, susunan baris, bagi rata, keseimbangan, bagian yang sama besar, nilai uang.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MH2Concepts = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const X = '×', BAGI = ':';
  const rnd = (n) => Math.floor(Math.random() * n);
  const between = (lo, hi) => lo + rnd(hi - lo + 1);
  const pick = (a) => a[rnd(a.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const fmtRp = (n) => 'Rp' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Pengecoh angka dekat jawaban (unik, tidak negatif). spread: selisih yang dipakai.
  function near(answer, count, spread) {
    const ds = spread || (answer >= 30 ? [1, 2, 10, 3] : [1, 2, 3]);
    const set = new Set();
    let guard = 0;
    while (set.size < count && guard++ < 200) {
      const v = answer + (rnd(2) ? 1 : -1) * pick(ds);
      if (v !== answer && v >= 0) set.add(v);
    }
    for (let k = 1; set.size < count; k++) if (!set.has(answer + k)) set.add(answer + k);
    return [...set];
  }
  function choices(answer, total, spread) { return shuffle([answer, ...near(answer, total - 1, spread)]); }

  // Pecahan disederhanakan untuk ditampilkan.
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  function fracLabel(n, d) {
    if (n === 0) return '0';
    if (n % d === 0) return String(n / d);
    return `${n}/${d}`;
  }

  // ============ 1. Lompat Bilangan (garis bilangan) ============
  // Posisi memakai satuan "langkah kecil" (1, atau 1/den untuk pecahan).
  // Hasil: start, target, step (besar lompatan), dir, min/max garis, ask: 'pos' (berhenti di jawaban) atau 'hops'.
  function numline(cfg) {
    const k = cfg.kind;
    let t;
    if (k === 'add') {
      const b = between(cfg.bMin || 1, cfg.bMax || 5), a = between(cfg.aMin || 0, (cfg.max || 10) - b);
      t = { start: a, target: a + b, step: 1, hops: b, dir: 1, label: `${a} + ${b} = ?`,
        say: `Mulai di ${a}. Lompat MAJU ${b} kali.`,
        explain: [`Tambah artinya maju di garis bilangan.`, `Dari ${a}, maju ${b} langkah: ${range(a + 1, a + b).join(', ')}.`, `Jadi ${a} + ${b} = ${a + b}.`] };
    } else if (k === 'sub') {
      const b = between(cfg.bMin || 1, cfg.bMax || 5), a = between(b + (cfg.minResult || 0), cfg.max || 10);
      t = { start: a, target: a - b, step: 1, hops: b, dir: -1, label: `${a} - ${b} = ?`,
        say: `Mulai di ${a}. Lompat MUNDUR ${b} kali.`,
        explain: [`Kurang artinya mundur di garis bilangan.`, `Dari ${a}, mundur ${b} langkah: ${range(a - b, a - 1).reverse().join(', ')}.`, `Jadi ${a} - ${b} = ${a - b}.`] };
    } else if (k === 'missing') {
      const a = between(cfg.aMin || 1, (cfg.max || 10) - 2), c = between(a + 1, Math.min(cfg.max || 10, a + (cfg.bMax || 6)));
      t = { start: a, target: c, step: 1, hops: c - a, dir: 1, ask: 'hops', label: `${a} + ? = ${c}`,
        say: `Mulai di ${a}. Lompat sampai ${c}, lalu hitung lompatanmu!`,
        explain: [`Berapa langkah dari ${a} ke ${c}?`, `Hitung lompatannya: ${range(a + 1, c).map((v, i) => `${v}(${i + 1})`).join(' ')}.`, `Ada ${c - a} lompatan. Jadi ${a} + ${c - a} = ${c}.`] };
    } else if (k === 'skip') {
      const s = cfg.step || between(cfg.sMin || 2, cfg.sMax || 5), n = between(cfg.nMin || 2, cfg.nMax || 5);
      t = { start: 0, target: s * n, step: s, hops: n, dir: 1, label: `${s} ${X} ${n} = ?`,
        say: `Dari 0, lompat ${s}-${s} sebanyak ${n} kali.`,
        explain: [`Perkalian = lompatan yang sama besar, diulang.`, `Lompat ${s} sebanyak ${n} kali: ${range(1, n).map((i) => s * i).join(', ')}.`, `Jadi ${s} ${X} ${n} = ${s * n}.`] };
    } else if (k === 'tens') {
      // Penjumlahan dua angka: lompat puluhan dulu (+10), lalu satuan (+1).
      const b = between(cfg.bMin || 11, cfg.bMax || 35), a = between(cfg.aMin || 10, (cfg.max || 100) - b);
      const bt = Math.floor(b / 10), bo = b % 10;
      t = { start: a, target: a + b, step: 1, big: 10, hops: bt + bo, dir: 1, label: `${a} + ${b} = ?`,
        say: `Mulai di ${a}. Lompat +10 sebanyak ${bt} kali, lalu +1 sebanyak ${bo} kali.`,
        explain: [`${b} = ${bt} puluhan dan ${bo} satuan.`, `Lompat puluhan: ${range(1, bt).map((i) => a + 10 * i).join(', ')}.`,
          bo ? `Lalu satuan: ${range(1, bo).map((i) => a + 10 * bt + i).join(', ')}.` : 'Tidak ada satuan.', `Jadi ${a} + ${b} = ${a + b}.`] };
    } else if (k === 'frac') {
      const d = cfg.den || pick([2, 3, 4, 5, 6, 8]);
      const a = between(0, d - 1), b = between(1, d);
      t = { start: a, target: a + b, step: 1, hops: b, dir: 1, den: d, label: `${fracLabel(a, d)} + ${b}/${d} = ?`,
        say: `Satu lompatan = 1/${d}. Mulai di ${fracLabel(a, d)}, lompat ${b} kali.`,
        explain: [`Jarak 0 ke 1 dibagi ${d} bagian sama besar. Satu bagian = 1/${d}.`, `${a}/${d} + ${b}/${d} = ${a + b}/${d}.`,
          (a + b) % d === 0 ? `${a + b}/${d} sama dengan ${(a + b) / d}.` : `Jadi jawabannya ${fracLabel(a + b, d)}.`] };
    } else throw new Error('numline: jenis tidak dikenal ' + k);
    const lo = Math.min(t.start, t.target), hi = Math.max(t.start, t.target);
    // Garis bilangan sedikit lebih panjang dari yang dibutuhkan agar pemain bisa kelewatan lalu kembali.
    t.min = k === 'tens' ? Math.max(0, Math.floor(lo / 10) * 10 - 10) : k === 'frac' ? 0 : Math.max(0, lo - 3);
    t.max = k === 'tens' ? Math.ceil((hi + 10) / 10) * 10 : k === 'frac' ? Math.max(2 * t.den, Math.ceil((hi + 2) / t.den) * t.den) : hi + 3 + (t.step > 1 ? t.step : 0);
    t.kind = k; t.answer = t.ask === 'hops' ? t.hops : t.target;
    t.fmt = (v) => (t.den ? fracLabel(v, t.den) : String(v));
    return t;
  }

  // ============ 2. Lari Angka (pelari, kumpulkan tepat) ============
  // kind 'sum': kumpulkan bola angka sampai jumlahnya TEPAT target.
  // kind 'multiple': kumpulkan hanya kelipatan k. kind 'equal': kumpulkan ekspresi yang hasilnya = nilai.
  function runnerGoal(cfg) {
    if (cfg.kind === 'sum') {
      const target = between(cfg.tMin || 6, cfg.tMax || 10);
      return { kind: 'sum', target, need: 1, label: `Kumpulkan tepat ${target}`, short: `= ${target}` };
    }
    if (cfg.kind === 'multiple') {
      const k = cfg.k || between(cfg.kMin || 2, cfg.kMax || 5);
      return { kind: 'multiple', k, need: cfg.need || 5, label: `Ambil kelipatan ${k}`, short: `${k}, ${2 * k}, ${3 * k}...` };
    }
    if (cfg.kind === 'equal') {
      const v = pick(cfg.values || [12, 18, 24, 20, 16]);
      return { kind: 'equal', v, need: cfg.need || 4, label: `Ambil yang hasilnya ${v}`, short: `= ${v}` };
    }
    throw new Error('runner: jenis tidak dikenal');
  }
  // Bola berikutnya. sum: sisa = target - terkumpul. Sering memberi bola yang pas atau membantu agar target selalu tercapai.
  function runnerOrb(cfg, goal, have) {
    if (goal.kind === 'sum') {
      const left = goal.target - have, mx = cfg.orbMax || 5;
      let v;
      const r = Math.random();
      if (left > 0 && r < 0.3) v = Math.min(left, mx);
      else if (left > 0 && r < 0.7) v = between(1, Math.max(1, Math.min(left, mx)));
      else v = between(1, mx);
      return { label: String(v), value: v, good: v <= left };
    }
    if (goal.kind === 'multiple') {
      const k = goal.k;
      if (Math.random() < 0.5) { const v = k * between(1, 10); return { label: String(v), value: v, good: true }; }
      let v; do { v = between(1, k * 10); } while (v % k === 0);
      return { label: String(v), value: v, good: false };
    }
    if (goal.kind === 'equal') {
      const v = goal.v;
      if (Math.random() < 0.5) return Object.assign(exprFor(v), { good: true, value: v });
      const w = v + pick([-3, -2, -1, 1, 2, 4]);
      return Object.assign(exprFor(w), { good: false, value: w });
    }
    throw new Error('runner: jenis tidak dikenal');
  }
  // Ekspresi acak yang hasilnya n (penjumlahan, pengurangan, atau perkalian jika bisa).
  function exprFor(n) {
    const opts = [];
    if (n >= 2) { const a = between(1, n - 1); opts.push({ label: `${a}+${n - a}` }); }
    const b = between(1, 9); opts.push({ label: `${n + b}-${b}` });
    const fs = range(2, 9).filter((f) => n % f === 0 && n / f <= 12 && n / f > 1);
    if (fs.length) { const f = pick(fs); opts.push({ label: `${f}${X}${n / f}` }, { label: `${n / f}${X}${f}` }); }
    return pick(opts);
  }
  function runnerExplain(goal, orb, have) {
    if (goal.kind === 'sum') {
      const left = goal.target - have;
      return [`Kamu punya ${have}. Target ${goal.target}.`, `${have} + ${orb.value} = ${have + orb.value}, kelebihan ${have + orb.value - goal.target}.`, `Yang dibutuhkan: ${goal.target} - ${have} = ${left}. Cari bola ${left} atau lebih kecil.`];
    }
    if (goal.kind === 'multiple') {
      const k = goal.k, lo = Math.floor(orb.value / k) * k;
      return [`${orb.value} bukan kelipatan ${k}.`, `Kelipatan ${k}: ${range(1, 6).map((i) => k * i).join(', ')}, ...`, lo ? `${orb.value} ada di antara ${lo} dan ${lo + k}.` : `${orb.value} lebih kecil dari ${k}.`];
    }
    return [`${orb.label} = ${orb.value}, bukan ${goal.v}.`, `Hitung dulu, lalu ambil yang hasilnya ${goal.v}.`];
  }

  // ============ 3. Meteor Angka (penembak) ============
  // Satu "gelombang": aturan + bilangan yang benar dan pengecoh. good(v) menentukan sasaran yang benar.
  function shooterWave(cfg) {
    const k = cfg.kind;
    if (k === 'bond') {
      const n = cfg.n || 10, x = between(1, n - 1);
      return { kind: k, label: `${x} + ? = ${n}`, short: `pasangan ${n}`, goodValues: [n - x], need: 1, pool: range(0, n).filter((v) => v !== n - x),
        explainBad: (v) => [`${x} + ${v} = ${x + v}, bukan ${n}.`, `${n} - ${x} = ${n - x}. Cari ${n - x}!`],
        explainGood: () => `${x} + ${n - x} = ${n}` };
    }
    if (k === 'multiple') {
      const m = cfg.k || between(cfg.kMin || 2, cfg.kMax || 5);
      const good = range(1, 10).map((i) => i * m);
      return { kind: k, label: `Tembak kelipatan ${m}`, short: `${m}, ${2 * m}, ${3 * m}...`, goodValues: good, need: cfg.need || 6,
        pool: range(1, m * 10).filter((v) => v % m !== 0),
        explainBad: (v) => [`${v} bukan kelipatan ${m}.`, `Kelipatan ${m}: ${good.slice(0, 6).join(', ')}, ...`],
        explainGood: (v) => `${m} ${X} ${v / m} = ${v}` };
    }
    if (k === 'even' || k === 'odd') {
      const even = k === 'even';
      return { kind: k, label: even ? 'Tembak bilangan GENAP' : 'Tembak bilangan GANJIL', short: even ? '2, 4, 6...' : '1, 3, 5...',
        goodValues: range(1, cfg.max || 30).filter((v) => (v % 2 === 0) === even), need: cfg.need || 6,
        pool: range(1, cfg.max || 30).filter((v) => (v % 2 === 0) !== even),
        explainBad: (v) => [even ? `${v} ganjil: kalau dibagi 2 berpasangan, sisa 1.` : `${v} genap: bisa dibagi 2 tanpa sisa.`, `Lihat angka satuannya: ${even ? '0, 2, 4, 6, 8 = genap' : '1, 3, 5, 7, 9 = ganjil'}.`],
        explainGood: (v) => (even ? `${v} = ${v / 2} + ${v / 2}` : `${v} = ${(v - 1) / 2} + ${(v + 1) / 2}`) };
    }
    if (k === 'divide') {
      // Ekspresi pembagian yang hasilnya q.
      const q = cfg.q || between(2, 6);
      const goods = range(2, 9).map((d) => ({ label: `${d * q}${BAGI}${d}`, v: q }));
      const bads = [];
      range(2, 9).forEach((d) => { const w = q + pick([-1, 1, 2]); if (w > 0) bads.push({ label: `${d * w}${BAGI}${d}`, v: w }); });
      return { kind: k, label: `Tembak yang hasilnya ${q}`, short: `${BAGI} = ${q}`, goodItems: goods, badItems: bads, need: cfg.need || 5,
        explainBad: (it) => [`${it.label} = ${it.v}, bukan ${q}.`, `Ingat: ${it.label.split(BAGI)[1]} ${X} ${it.v} = ${it.label.split(BAGI)[0]}.`],
        explainGood: (it) => `${it.label} = ${q} karena ${it.label.split(BAGI)[1]} ${X} ${q} = ${it.label.split(BAGI)[0]}` };
    }
    if (k === 'half') {
      // Pecahan senilai 1/2 (atau nilai lain).
      const goods = [[1, 2], [2, 4], [3, 6], [4, 8], [5, 10], [6, 12]].map(([n, d]) => ({ label: `${n}/${d}`, v: 0.5 }));
      const bads = [[1, 3], [1, 4], [2, 3], [3, 4], [2, 5], [3, 8], [5, 6], [1, 5]].map(([n, d]) => ({ label: `${n}/${d}`, v: n / d }));
      return { kind: k, label: 'Tembak yang senilai 1/2', short: 'setengah', goodItems: goods, badItems: bads, need: cfg.need || 5,
        explainBad: (it) => { const [n, d] = it.label.split('/').map(Number); return [`${it.label}: ${n} dari ${d} bagian.`, `Setengah dari ${d} adalah ${d / 2}. ${n} ${n < d / 2 ? 'kurang dari' : 'lebih dari'} ${d / 2}.`]; },
        explainGood: (it) => `${it.label}: ${it.label.split('/')[0]} adalah setengah dari ${it.label.split('/')[1]}` };
    }
    if (k === 'greater') {
      const n = cfg.n || pick([20, 30, 40, 50, 60]);
      return { kind: k, label: `Tembak yang LEBIH dari ${n}`, short: `> ${n}`, goodValues: range(n + 1, n + 30), need: cfg.need || 6, pool: range(Math.max(0, n - 30), n),
        explainBad: (v) => [`${v} ${v === n ? 'sama dengan' : 'kurang dari'} ${n}.`, `Bandingkan puluhannya dulu, lalu satuannya.`],
        explainGood: (v) => `${v} > ${n}` };
    }
    throw new Error('shooter: jenis tidak dikenal ' + k);
  }
  // Satu sasaran baru untuk gelombang: { label, value, good }.
  function shooterTarget(w, goodRate) {
    const good = Math.random() < (goodRate || 0.45);
    if (w.goodItems) { const it = pick(good ? w.goodItems : w.badItems); return { label: it.label, value: it.v, good, item: it }; }
    const v = pick(good ? w.goodValues : w.pool);
    return { label: String(v), value: v, good };
  }

  // ============ 4. Balap Hitung ============
  function race(cfg) {
    const op = cfg.op === 'mix' ? pick(cfg.ops || ['add', 'sub', 'mul', 'div']) : cfg.op;
    let label, answer, explain, opts = null;
    if (op === 'add') {
      const a = between(cfg.aMin || 1, cfg.aMax || 9), b = between(cfg.bMin || 1, cfg.bMax || 9);
      label = `${a} + ${b}`; answer = a + b;
      explain = b >= 10 ? [`${a} + ${b}: tambah puluhan dulu ${a} + ${b - b % 10} = ${a + b - b % 10}, lalu + ${b % 10}.`] : a + b > 10 && a < 10 ? [`Lengkapi 10 dulu: ${a} + ${10 - a} = 10, sisa ${b - (10 - a)}. 10 + ${b - (10 - a)} = ${answer}.`] : [`${a} + ${b} = ${answer}.`];
    } else if (op === 'sub') {
      const b = between(cfg.bMin || 1, cfg.bMax || 9), a = between(b + 1, Math.max(b + 1, cfg.aMax || 18));
      label = `${a} - ${b}`; answer = a - b;
      explain = [`Mundur ${b} dari ${a}, atau cari: ${b} + ? = ${a}. Jawabannya ${answer}.`];
    } else if (op === 'tens') {
      const a = 10 * between(1, 5), b = 10 * between(1, 4);
      label = `${a} + ${b}`; answer = a + b;
      explain = [`${a / 10} puluhan + ${b / 10} puluhan = ${a / 10 + b / 10} puluhan = ${answer}.`];
    } else if (op === 'mul') {
      const a = between(cfg.aMin || 2, cfg.aMax || 5), b = between(cfg.bMin || 2, cfg.bMax || 10);
      label = `${a} ${X} ${b}`; answer = a * b;
      explain = [`${a} ${X} ${b} = ${Array(Math.min(a, 6)).fill(b).join(' + ')}${a > 6 ? ' + ...' : ''} = ${answer}.`];
    } else if (op === 'div') {
      const d = between(cfg.dMin || 2, cfg.dMax || 5), q = between(cfg.qMin || 2, cfg.qMax || 10);
      label = `${d * q} ${BAGI} ${d}`; answer = q;
      explain = [`${d * q} dibagi rata ke ${d} kelompok: tiap kelompok ${q}.`, `Cek: ${d} ${X} ${q} = ${d * q}.`];
    } else if (op === 'compare') {
      const a = between(cfg.aMin || 10, cfg.aMax || 99);
      let b = Math.random() < 0.2 ? a : pick([a + between(1, 9), a - between(1, 9), Number(String(a).split('').reverse().join(''))]);
      if (b < 0) b = a + 3;
      label = `${a} ? ${b}`; answer = a > b ? '>' : a < b ? '<' : '=';
      opts = ['<', '=', '>'];
      explain = [a === b ? `${a} sama dengan ${b}.` : `Bandingkan puluhan: ${Math.floor(a / 10)} dan ${Math.floor(b / 10)}${Math.floor(a / 10) === Math.floor(b / 10) ? `, sama. Lalu satuan: ${a % 10} dan ${b % 10}` : ''}.`, `Jadi ${a} ${answer} ${b}.`];
    } else throw new Error('race: operasi tidak dikenal ' + op);
    const ch = opts || choices(answer, 3, typeof answer === 'number' && answer >= 20 ? [1, 2, 10] : [1, 2, 3]).map(String);
    return { op, label: op === 'compare' ? label : label + ' = ?', answer: String(answer), choices: opts ? shuffle(opts.slice()) : ch, explain };
  }

  // ============ 5. Timbangan Ajaib ============
  // left/right: daftar beban. Beban angka atau '?' (kotak misteri; semua '?' bernilai sama).
  function balance(cfg) {
    const k = cfg.kind;
    let left, right, answer, explain, label;
    if (k === 'simple') {
      const a = between(1, cfg.max ? cfg.max - 1 : 6), b = between(1, (cfg.max || 9) - a);
      left = [a, b]; right = ['?']; answer = a + b;
      label = `${a} + ${b} = ?`;
      explain = [`Timbangan seimbang jika kiri dan kanan sama berat.`, `Kiri: ${a} + ${b} = ${answer}.`, `Jadi kotak kanan harus ${answer}.`];
    } else if (k === 'sum') {
      const mx = cfg.max || 10;
      const total = between(5, mx), a = between(1, total - 1), c = between(1, total - 1);
      left = [a, total - a]; right = [c, '?']; answer = total - c;
      label = `${a} + ${total - a} = ${c} + ?`;
      explain = [`Kiri: ${a} + ${total - a} = ${total}.`, `Kanan sudah ada ${c}. Kurang ${total} - ${c} = ${answer}.`, `${a} + ${total - a} = ${c} + ${answer}. Seimbang!`];
    } else if (k === 'tens') {
      const a = 10 * between(1, 4), b = between(1, 9), c = 10 * between(1, a / 10);
      left = [a, b]; right = [c, '?']; answer = a + b - c;
      label = `${a} + ${b} = ${c} + ?`;
      explain = [`Kiri: ${a} + ${b} = ${a + b}.`, `Kanan: ${c} + ? harus ${a + b}.`, `${a + b} - ${c} = ${answer}.`];
    } else if (k === 'groups') {
      // n kotak misteri sama berat = total. Konsep: perkalian sebagai kelompok sama besar, pembagian sebagai kebalikannya.
      const n = between(cfg.nMin || 2, cfg.nMax || 4), v = between(2, cfg.vMax || 6);
      left = Array(n).fill('?'); right = [n * v]; answer = v;
      label = `${Array(n).fill('?').join(' + ')} = ${n * v}`;
      explain = [`Ada ${n} kotak yang sama berat.`, `${n} ${X} ? = ${n * v}.`, `${n * v} ${BAGI} ${n} = ${v}. Tiap kotak ${v}.`];
    } else if (k === 'twostep') {
      const n = between(2, 3), v = between(2, 6), c = between(1, 9);
      left = [...Array(n).fill('?'), c]; right = [n * v + c]; answer = v;
      label = `${Array(n).fill('?').join(' + ')} + ${c} = ${n * v + c}`;
      explain = [`Ambil ${c} dari kedua sisi: tetap seimbang.`, `Sisa: ${n} kotak = ${n * v + c} - ${c} = ${n * v}.`, `${n * v} ${BAGI} ${n} = ${v}. Tiap kotak ${v}.`];
    } else throw new Error('balance: jenis tidak dikenal ' + k);
    const tray = shuffle([answer, ...near(answer, 4, answer >= 20 ? [1, 2, 10] : [1, 2, 3])]);
    return { kind: k, left, right, answer, tray, label, explain };
  }
  const sideSum = (side, v) => side.reduce((s, x) => s + (x === '?' ? v : x), 0);

  // ============ 6. Kebun Kotak (susunan baris = perkalian) ============
  function garden(cfg) {
    const k = cfg.kind;
    if (k === 'total') {
      const r = between(cfg.rMin || 2, cfg.rMax || 4), c = between(cfg.cMin || 2, cfg.cMax || 5);
      return { kind: k, rows: r, cols: c, total: r * c, answer: r * c, choices: choices(r * c, 3, [1, 2, r, c].filter((x) => x > 0)),
        label: `${r} baris, tiap baris ${c} bibit`, ask: `Berapa semuanya?`,
        explain: [`${r} baris ${X} ${c} bibit.`, `Hitung per baris: ${range(1, r).map((i) => c * i).join(', ')}.`, `${r} ${X} ${c} = ${r * c}.`] };
    }
    if (k === 'rows') {
      const r = between(cfg.rMin || 2, cfg.rMax || 5), c = between(cfg.cMin || 2, cfg.cMax || 6);
      return { kind: k, rows: r, total: r * c, answer: c, label: `Tanam ${r * c} bibit dalam ${r} baris sama panjang`, ask: 'Tiap baris berapa?',
        explain: [`${r * c} dibagi ke ${r} baris sama panjang.`, `${r} ${X} ${c} = ${r * c}.`, `Jadi ${r * c} ${BAGI} ${r} = ${c}.`] };
    }
    if (k === 'factors') {
      const total = pick(cfg.totals || [12, 16, 18, 20, 24]);
      const pairs = range(2, total / 2).filter((r) => total % r === 0 && total / r >= 2 && total / r <= 8 && r <= 6).map((r) => [r, total / r]);
      return { kind: k, total, need: Math.min(cfg.need || 3, pairs.length), pairs, label: `Susun ${total} bibit jadi persegi panjang`, ask: `Temukan ${Math.min(cfg.need || 3, pairs.length)} cara!`,
        explain: [`Cari dua bilangan yang dikali = ${total}.`, pairs.map(([r, c]) => `${r} ${X} ${c}`).join(', ') + '.', `${pairs[0][0]} ${X} ${pairs[0][1]} dan ${pairs[0][1]} ${X} ${pairs[0][0]} hasilnya sama!`] };
    }
    throw new Error('garden: jenis tidak dikenal ' + k);
  }

  // ============ 7. Bagi Rata ============
  function share(cfg) {
    const n = between(cfg.gMin || 2, cfg.gMax || 4), each = between(cfg.eMin || 2, cfg.eMax || 5);
    const rem = cfg.rem ? between(1, n - 1) : 0;
    const total = n * each + rem;
    return { groups: n, each, rem, total, label: rem ? `Bagi ${total} permata ke ${n} slime. Sisanya ke peti!` : `Bagi ${total} permata sama rata ke ${n} slime`,
      expr: rem ? `${total} ${BAGI} ${n} = ${each} sisa ${rem}` : `${total} ${BAGI} ${n} = ${each}`,
      explain: rem
        ? [`Bagikan satu-satu bergiliran: tiap slime dapat ${each}.`, `${n} ${X} ${each} = ${n * each}. Sisa ${total} - ${n * each} = ${rem}.`, `${rem} permata tidak cukup untuk semua slime, jadi masuk peti.`]
        : [`Bagikan satu-satu bergiliran sampai habis.`, `Tiap slime dapat ${each}.`, `Cek: ${n} ${X} ${each} = ${total}.`] };
  }

  // ============ 8. Pasar Koin ============
  const DENOMS = [100, 200, 500, 1000, 2000, 5000, 10000];
  function fewest(amount, denoms) {
    const out = []; let left = amount;
    for (const d of denoms.slice().sort((a, b) => b - a)) while (left >= d) { out.push(d); left -= d; }
    return left === 0 ? out : null;
  }
  function market(cfg) {
    const denoms = DENOMS.filter((d) => d <= (cfg.maxDenom || 1000));
    const ITEMS = [['apel', 'apple'], ['pisang', 'banana'], ['ceri', 'cherry'], ['anggur', 'grape'], ['stroberi', 'strawberry'], ['nanas', 'pineapple'], ['semangka', 'watermelon'], ['permen', 'candy'], ['lolipop', 'lollipop']];
    const it = pick(ITEMS);
    const step = cfg.step || 100;
    if (cfg.kind === 'change') {
      const paid = pick(cfg.paid || [2000, 5000, 10000]);
      const price = step * between(Math.ceil(paid * 0.3 / step), Math.floor(paid * 0.9 / step));
      const change = paid - price;
      return { kind: 'change', item: it[0], icon: it[1], price, paid, target: change, denoms, label: `Harga ${it[0]} ${fmtRp(price)}. Pembeli bayar ${fmtRp(paid)}.`, ask: 'Berikan kembaliannya!',
        best: fewest(change, denoms), explain: [`Kembalian = uang dibayar - harga.`, `${fmtRp(paid)} - ${fmtRp(price)} = ${fmtRp(change)}.`, `Hitung maju dari ${fmtRp(price)} sampai ${fmtRp(paid)} juga bisa!`] };
    }
    const price = step * between(Math.ceil((cfg.min || 300) / step), Math.floor((cfg.max || 1500) / step));
    return { kind: 'pay', item: it[0], icon: it[1], price, target: price, denoms, label: `Harga ${it[0]}: ${fmtRp(price)}`, ask: 'Bayar dengan uang yang pas!',
      best: fewest(price, denoms), explain: [`${fmtRp(price)} = ${placeWords(price)}.`, `Contoh: ${fewest(price, denoms).map(fmtRp).join(' + ')}.`] };
  }
  function placeWords(n) {
    const parts = [];
    const rb = Math.floor(n / 1000), rt = Math.floor((n % 1000) / 100);
    if (rb) parts.push(`${rb} ribuan`);
    if (rt) parts.push(`${rt} ratusan`);
    return parts.join(' dan ') || '0';
  }

  // ============ 9. Pizza Pecahan ============
  function pizza(cfg) {
    if (cfg.kind === 'mix') return pizza(Object.assign({}, cfg, { kind: pick(cfg.kinds || ['make', 'compare', 'equiv']) }));
    const k = cfg.kind;
    if (k === 'make') {
      const d = pick(cfg.dens || [2, 3, 4, 6, 8]), n = between(1, d - 1);
      return { kind: k, num: n, den: d, label: `Buat pizza ${n}/${d}`, ask: `Potong jadi ${d} bagian sama besar, lalu ambil ${n}.`,
        explain: [`Penyebut ${d}: pizza dipotong ${d} bagian SAMA BESAR.`, `Pembilang ${n}: ambil ${n} bagian.`, `${n}/${d} = ${n} dari ${d} bagian.`] };
    }
    if (k === 'compare') {
      let a, b;
      do {
        a = [between(1, 5), pick([2, 3, 4, 5, 6, 8])]; b = [between(1, 5), pick([2, 3, 4, 5, 6, 8])];
      } while (a[0] >= a[1] || b[0] >= b[1] || (a[0] === b[0] && a[1] === b[1]) || a[0] * b[1] === b[0] * a[1] && Math.random() < 0.7);
      const va = a[0] / a[1], vb = b[0] / b[1];
      const answer = va > vb ? 'a' : va < vb ? 'b' : 'sama';
      const big = va >= vb ? a : b, small = va >= vb ? b : a;
      return { kind: k, a, b, answer, label: 'Pizza mana yang lebih BANYAK?',
        explain: answer === 'sama' ? [`${a[0]}/${a[1]} dan ${b[0]}/${b[1]} sama banyak!`, `Lihat: bagian yang diwarnai sama luas.`]
          : a[0] === b[0] ? [`Pembilang sama (${a[0]}). Penyebut lebih kecil = potongan lebih BESAR.`, `Jadi ${big[0]}/${big[1]} lebih banyak dari ${small[0]}/${small[1]}.`]
            : a[1] === b[1] ? [`Penyebut sama (${a[1]}): potongannya sama besar.`, `${big[0]} potong lebih banyak dari ${small[0]} potong.`]
              : [`Bandingkan luas yang diwarnai.`, `${big[0]}/${big[1]} lebih banyak dari ${small[0]}/${small[1]}.`] };
    }
    if (k === 'equiv') {
      const [n, d] = pick(cfg.base || [[1, 2], [1, 3], [1, 4], [2, 3], [3, 4]]);
      const m = pick([2, 3, 4].filter((x) => d * x <= 12));
      return { kind: k, num: n, den: d, den2: d * m, answer: n * m, label: `Tunjukkan ${n}/${d} dengan pizza ${d * m} potong`, ask: `Ambil berapa potong?`,
        explain: [`Tiap 1/${d} pizza = ${m} potong kecil (1/${d * m}).`, `${n}/${d} = ${n} ${X} ${m} potong = ${n * m}/${d * m}.`] };
    }
    throw new Error('pizza: jenis tidak dikenal ' + k);
  }

  return { X, BAGI, rnd, between, pick, shuffle, range, near, choices, fracLabel, gcd, fmtRp, numline, runnerGoal, runnerOrb, runnerExplain, exprFor,
    shooterWave, shooterTarget, race, balance, sideSum, garden, share, market, fewest, DENOMS, pizza };
});
