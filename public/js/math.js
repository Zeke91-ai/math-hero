// Logika soal matematika untuk 8 level (setara kelas 1 sampai 4 SD): penjumlahan, perkalian, pembagian, dan susun kelompok.
// Murni logika tanpa DOM sehingga bisa diuji di Node. Di browser tersedia sebagai window.MathQuiz.
// Level 1-2 kelas 1, level 3-4 kelas 2, level 5-6 kelas 3, level 7-8 kelas 4.
(function () {
  function rnd(n) { return Math.floor(Math.random() * n); }
  function between(lo, hi) { return lo + rnd(hi - lo + 1); }
  function pick(arr) { return arr[rnd(arr.length)]; }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Pengecoh: angka dekat jawaban (selisih kecil, salah puluhan, salah ratusan), unik, tidak negatif.
  function distractors(answer, count) {
    const deltas = [1, 2, 3, 4];
    if (answer >= 30) deltas.push(10, 10, 20);
    if (answer >= 300) deltas.push(100);
    const set = new Set();
    let guard = 0;
    while (set.size < count && guard++ < 300) {
      const d = answer + (rnd(2) ? 1 : -1) * pick(deltas);
      if (d !== answer && d >= 0) set.add(d);
    }
    let k = 1;
    while (set.size < count) {
      const d = answer + k++;
      if (d !== answer) set.add(d);
    }
    return [...set];
  }

  function makeChoices(answer, total) {
    return shuffle([answer, ...distractors(answer, total - 1)]);
  }

  const THINGS = ['apel', 'kue', 'bintang', 'kelereng', 'stiker', 'bunga', 'permen', 'buku'];
  const ADD = [[1, 5], [3, 12], [10, 40], [20, 50], [100, 400], [100, 500], [500, 2000], [1000, 3000]];
  const MUL = [[[1, 3], [1, 3]], [[2, 5], [2, 5]], [[2, 5], [2, 6]], [[2, 10], [2, 5]],
    [[2, 9], [2, 9]], [[2, 9], [6, 12]], [[2, 9], [11, 30]], [[3, 9], [12, 60]]];
  const DIV = [[[2, 3], [1, 3]], [[2, 5], [2, 5]], [[2, 5], [2, 6]], [[2, 10], [2, 6]],
    [[2, 9], [2, 9]], [[3, 9], [5, 12]], [[2, 9], [11, 30]], [[3, 9], [12, 50]]];
  const SUSUN = [[[2, 3], [2, 3]], [[3, 4], [2, 5]], [[3, 5], [2, 6]], [[4, 6], [2, 7]],
    [[4, 8], [2, 9]], [[5, 10], [3, 9]], [[6, 12], [3, 12]], [[8, 15], [4, 12]]];

  // Penjelasan langkah demi langkah untuk penjumlahan.
  function addSteps(a, b, ans) {
    if (b < 10) return [`Mulai dari ${a}.`, `Tambah ${b} satu per satu.`, `Jadi ${a} + ${b} = ${ans}.`];
    const steps = [`Mulai dari ${a}.`];
    let cur = a;
    const parts = [['ribuan', Math.floor(b / 1000) * 1000], ['ratusan', Math.floor((b % 1000) / 100) * 100],
      ['puluhan', Math.floor((b % 100) / 10) * 10], ['satuan', b % 10]];
    for (const [nama, v] of parts) {
      if (!v) continue;
      steps.push(`Tambah ${nama}: ${cur} + ${v} = ${cur + v}.`);
      cur += v;
    }
    steps.push(`Jadi ${a} + ${b} = ${ans}.`);
    return steps;
  }

  function mulSteps(a, b, ans) {
    if (a <= 5 && b <= 10) {
      return [`Ada ${a} kelompok, masing-masing ${b}.`, `Tambahkan: ${Array(a).fill(b).join(' + ')} = ${ans}.`, `Jadi ${a} x ${b} = ${ans}.`];
    }
    if (b < 10) {
      return [`Tambahkan ${a} sebanyak ${b} kali: ${Array(b).fill(a).join(' + ')} = ${ans}.`, `Jadi ${a} x ${b} = ${ans}.`];
    }
    const bt = Math.floor(b / 10) * 10, bo = b % 10;
    if (!bo) {
      return [`${b} = ${b / 10} puluhan.`, `${a} x ${b / 10} = ${a * (b / 10)}, lalu kali 10 jadi ${ans}.`, `Jadi ${a} x ${b} = ${ans}.`];
    }
    const steps = [`Pecah ${b} menjadi ${bt} + ${bo}.`, `${a} x ${bt} = ${a * bt}.`];
    if (bo) steps.push(`${a} x ${bo} = ${a * bo}.`, `${a * bt} + ${a * bo} = ${ans}.`);
    steps.push(`Jadi ${a} x ${b} = ${ans}.`);
    return steps;
  }

  function divSteps(dividend, d, q) {
    if (q < 10) {
      return [`Bagi ${dividend} ke ${d} kelompok sama banyak.`, `Cari angka yang dikali ${d} hasilnya ${dividend}: ${d} x ${q} = ${dividend}.`, `Jadi ${dividend} ÷ ${d} = ${q}.`];
    }
    const qt = Math.floor(q / 10) * 10, qo = q % 10;
    const steps = [`${d} x ${qt} = ${d * qt}, sisa ${dividend - d * qt}.`];
    if (qo) steps.push(`${d} x ${qo} = ${d * qo}, pas dengan sisanya.`, `${qt} + ${qo} = ${q}.`);
    steps.push(`Jadi ${dividend} ÷ ${d} = ${q}.`);
    return steps;
  }

  function generate(op, level) {
    const lv = Math.max(1, Math.min(8, level || 1));
    const total = lv <= 2 ? 3 : 4;
    const thing = pick(THINGS);
    if (op === 'add') {
      const [lo, hi] = ADD[lv - 1];
      const a = between(lo, hi), b = between(lo, hi);
      const answer = a + b;
      return {
        op, level: lv, total,
        prompt: `Ada ${a} ${thing}. Lalu datang ${b} ${thing} lagi. Berapa ${thing} sekarang?`,
        expr: `${a} + ${b} = ?`,
        answer,
        choices: makeChoices(answer, total),
        visual: { kind: 'groups', groups: [a, b] },
        explain: addSteps(a, b, answer),
      };
    }
    if (op === 'mul') {
      const [ra, rb] = MUL[lv - 1];
      const a = between(ra[0], ra[1]), b = between(rb[0], rb[1]);
      const answer = a * b;
      return {
        op, level: lv, total,
        prompt: `Ada ${a} kelompok. Tiap kelompok berisi ${b} ${thing}. Berapa ${thing} semuanya?`,
        expr: `${a} x ${b} = ?`,
        answer,
        choices: makeChoices(answer, total),
        visual: { kind: 'groups', groups: Array(a).fill(b) },
        explain: mulSteps(a, b, answer),
      };
    }
    if (op === 'div') {
      const [rd, rq] = DIV[lv - 1];
      const d = between(rd[0], rd[1]), q = between(rq[0], rq[1]);
      const dividend = d * q;
      return {
        op, level: lv, total,
        prompt: `Ada ${dividend} ${thing} dibagi rata ke ${d} teman. Tiap teman dapat berapa ${thing}?`,
        expr: `${dividend} ÷ ${d} = ?`,
        answer: q,
        choices: makeChoices(q, total),
        visual: { kind: 'groups', groups: Array(d).fill(q) },
        explain: divSteps(dividend, d, q),
      };
    }
    if (op === 'susun') {
      // Susun benda ke kelompok yang sama besar: total / ukuran kelompok = jumlah kelompok.
      const [rs, rg] = SUSUN[lv - 1];
      const size = between(rs[0], rs[1]), groups = between(rg[0], rg[1]);
      const all = size * groups;
      return {
        op, level: lv, total,
        prompt: `Ada ${all} ${thing}. Susun ${size} ${thing} di setiap kelompok. Ada berapa kelompok?`,
        expr: `${all} ÷ ${size} = ?`,
        answer: groups,
        choices: makeChoices(groups, total),
        visual: { kind: 'groups', groups: Array(groups).fill(size) },
        explain: [`Ambil ${size} ${thing} untuk satu kelompok, lalu ulangi.`,
          `Dapat ${groups} kelompok karena ${groups} x ${size} = ${all}.`,
          `Jadi ${all} ÷ ${size} = ${groups}.`],
      };
    }
    throw new Error('Operasi tidak dikenal: ' + op);
  }

  const api = { generate, distractors, shuffle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.MathQuiz = api;
})();
