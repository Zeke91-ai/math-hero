// T2: kontrol sentuh untuk HP. Hanya tiga kontrol: joystick arah, tombol lompat, tombol aksi (plus pause).
// Modul ini hanya mencatat status input. Gerakan karakter ada di main.js.
(function () {
  const JOY_RADIUS = 46;     // jarak maksimum knob dari pusat joystick (px CSS)
  const DEAD_ZONE = 0.2;     // di bawah ini dianggap diam

  const input = { left: false, right: false, up: false, down: false, jump: false, action: false, pausePressed: false, joy: { x: 0, y: 0 } };
  window.Input = input;

  const ui = document.getElementById('controls');
  const base = document.getElementById('joy-base');
  const knob = document.getElementById('joy-knob');
  const btnJump = document.getElementById('btn-jump');
  const btnAction = document.getElementById('btn-action');
  const btnPause = document.getElementById('btn-pause');

  let joyPointer = null;
  let joyCenter = { x: 0, y: 0 };

  function setJoy(dx, dy) {
    const len = Math.hypot(dx, dy);
    const cl = Math.min(len, JOY_RADIUS);
    const nx = len > 0 ? (dx / len) * cl : 0;
    const ny = len > 0 ? (dy / len) * cl : 0;
    knob.style.transform = `translate(${nx}px, ${ny}px)`;
    const ax = nx / JOY_RADIUS;
    const ay = ny / JOY_RADIUS;
    input.joy.x = Math.abs(ax) < DEAD_ZONE ? 0 : ax;
    input.joy.y = Math.abs(ay) < DEAD_ZONE ? 0 : ay;
    input.left = input.joy.x < -DEAD_ZONE;
    input.right = input.joy.x > DEAD_ZONE;
    input.up = input.joy.y < -DEAD_ZONE;
    input.down = input.joy.y > DEAD_ZONE;
  }

  function resetJoy() {
    joyPointer = null;
    knob.style.transform = 'translate(0px, 0px)';
    input.joy.x = 0; input.joy.y = 0;
    input.left = input.right = input.up = input.down = false;
  }

  base.addEventListener('pointerdown', (e) => {
    joyPointer = e.pointerId;
    base.setPointerCapture(e.pointerId);
    const r = base.getBoundingClientRect();
    joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    setJoy(e.clientX - joyCenter.x, e.clientY - joyCenter.y);
    e.preventDefault();
  });
  base.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyPointer) return;
    setJoy(e.clientX - joyCenter.x, e.clientY - joyCenter.y);
    e.preventDefault();
  });
  const endJoy = (e) => { if (e.pointerId === joyPointer) resetJoy(); };
  base.addEventListener('pointerup', endJoy);
  base.addEventListener('pointercancel', endJoy);
  base.addEventListener('lostpointercapture', endJoy);

  function holdButton(el, key) {
    el.addEventListener('pointerdown', (e) => { input[key] = true; el.classList.add('down'); e.preventDefault(); });
    const up = () => { input[key] = false; el.classList.remove('down'); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }
  holdButton(btnJump, 'jump');
  holdButton(btnAction, 'action');

  btnPause.addEventListener('click', () => { input.pausePressed = true; });

  // Cegah menu konteks, seleksi teks, dan zoom dua jari di area permainan.
  ui.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
})();
