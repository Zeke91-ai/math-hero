// T7: audio sintetis dengan Web Audio (tanpa file eksternal, cocok untuk LAN).
// Efek suara dan musik sederhana. Audio baru aktif setelah sentuhan pertama (kebijakan browser).
(function () {
  const KEY = 'mathHero.muted';
  let ctx = null;
  let master = null;
  let muted = false;
  try { muted = window.localStorage.getItem(KEY) === '1'; } catch (e) { muted = false; }
  let musicMode = null;   // 'normal' | 'boss' | null
  let musicTimer = null;
  let step = 0;
  let paused = false;

  // Musik per tema: tangga nada, pola, tempo (ms), dan jenis gelombang. 'boss' lebih tegang dan cepat.
  const MAJOR = [261.63, 329.63, 392.0, 440.0, 523.25];
  const MUSIC = {
    normal: { scale: MAJOR, pat: [0, 2, 4, 2, 1, 3, 4, 2], ms: 260, type: 'triangle', vol: 0.07 },
    siang: { scale: MAJOR, pat: [0, 2, 4, 2, 1, 3, 4, 2], ms: 250, type: 'triangle', vol: 0.07 },
    maghrib: { scale: [293.66, 349.23, 440.0, 493.88, 587.33], pat: [0, 1, 2, 1, 3, 2, 4, 2], ms: 290, type: 'triangle', vol: 0.07 },
    permen: { scale: [392.0, 440.0, 523.25, 587.33, 659.25], pat: [0, 2, 1, 3, 2, 4, 3, 1], ms: 215, type: 'square', vol: 0.04 },
    awan: { scale: [329.63, 392.0, 440.0, 523.25, 659.25], pat: [4, 2, 3, 1, 2, 0, 1, 2], ms: 240, type: 'sine', vol: 0.09 },
    gua: { scale: [196.0, 233.08, 261.63, 311.13, 392.0], pat: [0, 3, 2, 4, 1, 3, 2, 0], ms: 300, type: 'sine', vol: 0.09 },
    mesin: { scale: [220.0, 261.63, 293.66, 329.63, 392.0], pat: [0, 0, 2, 0, 3, 0, 4, 2], ms: 200, type: 'square', vol: 0.04 },
    reruntuhan: { scale: [246.94, 277.18, 329.63, 369.99, 440.0], pat: [0, 2, 4, 3, 1, 3, 2, 0], ms: 270, type: 'triangle', vol: 0.08 },
    istana: { scale: [261.63, 311.13, 392.0, 466.16, 523.25], pat: [0, 2, 4, 3, 2, 4, 3, 1], ms: 220, type: 'sawtooth', vol: 0.03 },
    boss: { scale: [220.0, 233.08, 329.63, 349.23, 440.0], pat: [0, 2, 4, 2, 1, 3, 4, 2], ms: 160, type: 'sawtooth', vol: 0.05 },
  };
  const cfg = (m) => MUSIC[m] || MUSIC.normal;
  const SCALE = [261.63, 329.63, 392.0, 440.0, 523.25];
  const BOSS_SCALE = [220.0, 233.08, 329.63, 349.23, 440.0];
  const PATTERN = [0, 2, 4, 2, 1, 3, 4, 2];

  // Musik di-bus terpisah dan diperkuat: nilai vol per tema di atas dibuat kecil, sehingga tanpa penguat
  // musik tenggelam oleh efek suara. Compressor mencegah suara pecah saat musik dan efek berbunyi bersamaan.
  const MUSIC_BOOST = 2.8;
  const MASTER_VOL = 0.6;
  let musicBus = null;
  let analyser = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOL;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(comp);
    comp.connect(analyser);
    comp.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = MUSIC_BOOST;
    musicBus.connect(master);
    return ctx;
  }

  // Tingkat suara keluaran saat ini (RMS 0..1). Dipakai tes otomatis untuk memastikan musik terdengar.
  function level() {
    if (!analyser) return 0;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }

  // Dipanggil dari sentuhan pertama pemain (tombol Mulai).
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  function tone(freq, start, dur, type, vol, slideTo, dest) {
    const c = ensure();
    if (!c || muted) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime + start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, c.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g);
    g.connect(dest || master);
    o.start(c.currentTime + start);
    o.stop(c.currentTime + start + dur + 0.05);
  }

  // Efek suara singkat. Nama: lompat, ambil, benar, salah, damage, reward, menang, kalah, boss, pilih.
  const EFFECTS = {
    lompat: () => tone(330, 0, 0.18, 'square', 0.15, 660),
    ambil: () => { tone(880, 0, 0.08, 'triangle', 0.2); tone(1320, 0.07, 0.1, 'triangle', 0.2); },
    benar: () => { tone(523, 0, 0.12, 'square', 0.18); tone(659, 0.1, 0.12, 'square', 0.18); tone(784, 0.2, 0.25, 'square', 0.18); },
    salah: () => tone(220, 0, 0.3, 'sawtooth', 0.15, 160),
    damage: () => tone(180, 0, 0.35, 'sawtooth', 0.2, 60),
    reward: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.14, 'triangle', 0.2)); },
    pukul: () => tone(120, 0, 0.2, 'square', 0.25, 50),
    menang: () => { [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.14, 0.2, 'square', 0.2)); },
    kalah: () => { [392, 349, 330, 262].forEach((f, i) => tone(f, i * 0.2, 0.25, 'triangle', 0.2)); },
    stomp: () => { tone(200, 0, 0.12, 'square', 0.2, 90); tone(520, 0.05, 0.1, 'triangle', 0.18); },
    crate: () => { tone(140, 0, 0.1, 'square', 0.22, 60); tone(90, 0.06, 0.16, 'sawtooth', 0.15, 50); },
    pilih: () => { tone(660, 0, 0.1, 'triangle', 0.2); tone(990, 0.08, 0.14, 'triangle', 0.2); },
    // Bunyi lucu saat karakter bergaya (tombol B tanpa sasaran): tiga kicauan naik.
    gaya: () => { [660, 880, 1175].forEach((f, i) => tone(f, i * 0.07, 0.09, 'square', 0.12, f * 1.2)); },
  };

  function play(name) {
    if (muted || paused) return;
    const fx = EFFECTS[name];
    if (fx) fx();
  }

  // Musik: pola sederhana yang diulang. Boss memakai nada lebih rendah dan tempo lebih cepat.
  function musicTick() {
    if (!musicMode || muted || paused) return;
    const c = cfg(musicMode), boss = musicMode === 'boss';
    const note = c.scale[c.pat[step % c.pat.length] % c.scale.length];
    tone(note, 0, boss ? 0.14 : c.ms / 1000 * 0.85, c.type, c.vol, null, musicBus);
    if ((boss || musicMode === 'mesin') && step % 2 === 0) tone(c.scale[0] / 2, 0, 0.18, 'square', 0.06, null, musicBus);
    step++;
  }

  function setMusic(mode) {
    if (mode === musicMode) return;
    musicMode = mode;
    step = 0;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (!mode || paused) return;
    ensure();
    musicTick();
    musicTimer = setInterval(musicTick, cfg(mode).ms);
  }

  // Jeda, game over, atau tamat: musik berhenti; saat dilanjutkan, musik mulai lagi.
  function setPaused(p) {
    paused = p;
    if (p && musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (!p && musicMode && !musicTimer) musicTimer = setInterval(musicTick, cfg(musicMode).ms);
  }

  function setMuted(m) {
    muted = m;
    try { window.localStorage.setItem(KEY, m ? '1' : '0'); } catch (e) { /* abaikan */ }
    ensure();
    if (master) master.gain.value = m ? 0 : MASTER_VOL;
    if (m && musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    else if (!m && musicMode && !musicTimer) musicTimer = setInterval(musicTick, cfg(musicMode).ms);
  }

  function isMuted() { return muted; }

  window.Sfx = { unlock, play, setMusic, setPaused, setMuted, isMuted, level, get musicBus() { return musicBus; } };
})();
