// T4: panel soal pilihan ganda. Tampilan dan interaksi saja; logika soal ada di math.js.
(function () {
  const root = document.getElementById('quiz');
  const promptEl = document.getElementById('quiz-prompt');
  const exprEl = document.getElementById('quiz-expr');
  const canvas = document.getElementById('quiz-visual');
  const ctx = canvas.getContext('2d');
  const choicesEl = document.getElementById('quiz-choices');
  const feedbackEl = document.getElementById('quiz-feedback');
  const explainEl = document.getElementById('quiz-explain');
  const btnClose = document.getElementById('quiz-close');

  const COLORS = ['#ff8fab', '#4b9cff', '#ffb347', '#7bd389', '#b38cff'];
  let current = null;
  let onCorrectCb = null;
  let onWrongCb = null;
  let locked = false;

  // Gambar kelompok benda: tiap kelompok satu baris. Jumlah kecil digambar sebagai bulatan satuan;
  // jumlah besar memakai balok nilai tempat (ribuan, ratusan, puluhan, satuan) agar tetap muat dan jelas.
  function drawRow(count, x, cy, rowH, w, color) {
    if (count <= 20) {
      const r = Math.max(5, Math.min(16, (w / Math.max(count, 1)) / 2 - 3, rowH / 2 - 3));
      ctx.fillStyle = color;
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.arc(x + r + i * (2 * r + 3), cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    const th = Math.floor(count / 1000), h = Math.floor((count % 1000) / 100), t = Math.floor((count % 100) / 10), o = count % 10;
    const u = Math.max(8, Math.min(26, rowH - 6));
    let px = x;
    ctx.fillStyle = color;
    for (let i = 0; i < th; i++) { ctx.fillRect(px, cy - u / 2, u * 1.3, u); px += u * 1.3 + 4; }
    px += th ? 4 : 0;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < h; i++) { ctx.fillRect(px, cy - u / 2 + 2, u * 0.9, u * 0.9); px += u * 0.9 + 3; }
    ctx.globalAlpha = 1;
    px += h ? 4 : 0;
    for (let i = 0; i < t; i++) { ctx.fillRect(px, cy - u / 2, 5, u); px += 8; }
    px += t ? 4 : 0;
    for (let i = 0; i < o; i++) { ctx.beginPath(); ctx.arc(px + 4, cy, 4, 0, Math.PI * 2); ctx.fill(); px += 10; }
  }

  function drawVisual(groups) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const rows = groups.length;
    groups.forEach((count, gi) => drawRow(count, 10, (ch / rows) * (gi + 0.5), ch / rows, cw - 20, COLORS[gi % COLORS.length]));
    if (Math.max(...groups) > 20) {
      ctx.fillStyle = '#4b2e83';
      ctx.font = '12px Kleintenna, sans-serif';
      ctx.fillText('balok besar = ratusan, batang = puluhan, bulat = satuan', 8, ch - 4);
    }
  }

  // T7: animasi pembagian. Benda terbang satu per satu dari atas ke kelompoknya.
  // mode 'deal' (pembagian rata): dibagikan bergiliran ke tiap kelompok.
  // mode 'fill' (susun kelompok): diisi satu kelompok penuh sebelum pindah ke berikutnya.
  let animToken = 0;
  function animateDistribute(groups, mode) {
    const token = ++animToken;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    const rows = groups.length;
    const maxItems = Math.max(...groups);
    const r = Math.max(6, Math.min(16, (cw / maxItems) / 2 - 4, (ch / rows) / 2 - 4));
    const pos = (gi, i) => ({ x: 12 + r + i * (2 * r + 4), y: (ch / rows) * (gi + 0.5) });

    // Urutan penempatan benda.
    const order = [];
    if (mode === 'deal') {
      const maxC = Math.max(...groups);
      for (let c = 0; c < maxC; c++) for (let gi = 0; gi < rows; gi++) if (c < groups[gi]) order.push([gi, c]);
    } else {
      groups.forEach((n, gi) => { for (let c = 0; c < n; c++) order.push([gi, c]); });
    }

    const STEP = 150;   // ms per benda
    const start = performance.now();
    function draw(now) {
      if (token !== animToken) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      // rAF bisa memberi waktu sedikit lebih kecil dari waktu mulai; tahan di nol agar indeks tidak negatif.
      const elapsed = Math.max(0, now - start);
      const placed = Math.min(order.length, Math.floor(elapsed / STEP));
      for (let k = 0; k < placed; k++) {
        const [gi, c] = order[k];
        const p = pos(gi, c);
        ctx.fillStyle = COLORS[gi % COLORS.length];
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Benda yang sedang terbang dari atas (tengah) ke posisinya.
      if (placed < order.length) {
        const t = (elapsed - placed * STEP) / STEP;
        const [gi, c] = order[placed];
        const target = pos(gi, c);
        const fromX = cw / 2, fromY = -r;
        const x = fromX + (target.x - fromX) * t;
        const y = fromY + (target.y - fromY) * t;
        ctx.fillStyle = COLORS[gi % COLORS.length];
        ctx.globalAlpha = 0.6 + 0.4 * t;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (placed < order.length) requestAnimationFrame(draw);
      else drawVisual(groups);  // keadaan akhir tetap jelas
    }
    requestAnimationFrame(draw);
  }

  function setFeedback(text, kind) {
    feedbackEl.textContent = text;
    feedbackEl.className = kind || '';
  }

  function renderChoices() {
    choicesEl.innerHTML = '';
    for (const c of current.choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.textContent = String(c);
      b.dataset.value = String(c);
      b.addEventListener('click', () => pick(c, b));
      choicesEl.appendChild(b);
    }
  }

  function pick(value, btn) {
    if (locked) return;
    if (value === current.answer) {
      locked = true;
      btn.classList.add('correct');
      setFeedback('Hebat! Jawabanmu benar.', 'ok');
      explainEl.classList.add('hidden');
      setTimeout(() => {
        const cb = onCorrectCb;
        close();
        if (cb) cb();
      }, 1200);
    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      setFeedback('Hampir! Lihat penjelasannya, lalu coba lagi.', 'hint');
      explainEl.innerHTML = current.explain.map((s) => `<p>${s}</p>`).join('');
      explainEl.classList.remove('hidden');
      drawVisual(current.visual.groups);
      if (onWrongCb) onWrongCb();
      locked = true;
      setTimeout(() => {
        locked = false;
        choicesEl.querySelectorAll('.choice').forEach((b) => { b.disabled = false; b.classList.remove('wrong'); });
      }, 1500);
    }
  }

  function open(question, cb, onWrong) {
    current = question;
    onWrongCb = onWrong || null;
    onCorrectCb = cb || null;
    locked = false;
    promptEl.textContent = question.prompt;
    exprEl.textContent = question.expr;
    setFeedback('Pilih jawaban yang benar.', '');
    explainEl.classList.add('hidden');
    explainEl.innerHTML = '';
    renderChoices();
    root.classList.remove('hidden');
    root.setAttribute('aria-hidden', 'false');
    // Gambar setelah panel terlihat, agar ukuran canvas sudah terhitung.
    const small = Math.max(...question.visual.groups) <= 20 && question.visual.groups.length <= 9;
    if (small && question.op === 'div') animateDistribute(question.visual.groups, 'deal');
    else if (small && question.op === 'susun') animateDistribute(question.visual.groups, 'fill');
    else drawVisual(question.visual.groups);
  }

  function close() {
    root.classList.add('hidden');
    root.setAttribute('aria-hidden', 'true');
    current = null;
    onCorrectCb = null;
  }

  function isOpen() {
    return !root.classList.contains('hidden');
  }

  btnClose.addEventListener('click', close);
  window.Quiz = { open, close, isOpen, current: () => current };
})();
