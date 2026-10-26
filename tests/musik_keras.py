"""Tes volume musik: mengukur RMS keluaran audio (analyser) untuk musik level dan musik bos.
Membandingkan penguat musik 1.0 (setara kondisi lama) dengan penguat yang dipakai sekarang."""
import os, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8096
hasil = []


def cek(nama, ok, info=''):
    hasil.append(ok)
    print(('LULUS ' if ok else 'GAGAL ') + nama + (' | ' + str(info) if info != '' else ''))


def start_server(db):
    env = dict(os.environ, PORT=str(PORT), MATHHERO_DATA_DIR=db)
    proc = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    deadline = time.time() + 10
    while time.time() < deadline:
        if "berjalan" in proc.stdout.readline():
            return proc
    proc.kill()
    raise RuntimeError("server tidak start")


MEASURE = """async (ms) => {
  const out = []; const t0 = performance.now();
  while (performance.now() - t0 < ms) { out.push(window.Sfx.level()); await new Promise(r => setTimeout(r, 25)); }
  const mean = out.reduce((a, b) => a + b, 0) / out.length;
  return { mean, peak: Math.max(...out) };
}"""


def main():
    server = start_server(tempfile.mkdtemp())
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
            page = browser.new_context(**p.devices["Pixel 5"]).new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"http://127.0.0.1:{PORT}/")
            page.wait_for_function("document.body.classList.contains('loaded')", timeout=15000)
            page.evaluate("window.__mathHero.startGame(0, 0, 1)")
            page.wait_for_timeout(1500)
            page.evaluate("window.Sfx.setMusic('siang')")
            cek('jalur musik terpisah ada', page.evaluate("window.Sfx.musicBus !== null"))
            boost = page.evaluate("window.Sfx.musicBus.gain.value")
            page.evaluate("window.Sfx.musicBus.gain.value = 1")
            page.wait_for_timeout(300)
            lama = page.evaluate(MEASURE, 2500)
            page.evaluate(f"window.Sfx.musicBus.gain.value = {boost}")
            page.wait_for_timeout(300)
            baru = page.evaluate(MEASURE, 2500)
            print('RMS musik level 1: penguat 1.0 ->', round(lama['mean'], 4), '| penguat', boost, '->', round(baru['mean'], 4))
            cek('musik level 1 jauh lebih keras dari sebelumnya (>= 2x)', baru['mean'] >= lama['mean'] * 2 and baru['mean'] > 0.01, f"{lama['mean']:.4f} -> {baru['mean']:.4f}")
            page.evaluate("window.Sfx.setMusic('boss')")
            page.wait_for_timeout(500)
            boss = page.evaluate(MEASURE, 2500)
            cek('musik bos terdengar jelas', boss['mean'] > 0.01, round(boss['mean'], 4))
            cek('tidak pecah (puncak < 0.95)', max(baru['peak'], boss['peak']) < 0.95, f"{max(baru['peak'], boss['peak']):.3f}")
            page.evaluate("window.Sfx.setMuted(true)")
            page.wait_for_timeout(600)
            sunyi = page.evaluate(MEASURE, 800)
            cek('tombol senyap mematikan musik', sunyi['mean'] < 0.002, round(sunyi['mean'], 5))
            page.evaluate("window.Sfx.setMuted(false)")
            cek('tanpa error JavaScript', errors == [], errors)
            browser.close()
    finally:
        server.kill()
    print('HASIL:', 'LULUS' if all(hasil) else 'GAGAL', f'({sum(hasil)}/{len(hasil)})')
    sys.exit(0 if all(hasil) else 1)


main()
