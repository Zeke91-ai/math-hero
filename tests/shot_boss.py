"""Cuplikan bos beraksi: python tests/shot_boss.py  -> tests/shots/boss_<level>_<n>.png
Pemain kebal dan diam di arena; diambil saat peringatan (tele) dan serangan (atk)."""
import os, subprocess, sys, time
from playwright.sync_api import sync_playwright
import _tanpa_skor  # noqa: F401  (mematikan papan skor online selama tes)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8094
BOSS = {2: (126, 0), 4: (6, 48), 6: (134, 4), 8: (146, 0)}


def start_server():
    env = dict(os.environ, PORT=str(PORT), MATHHERO_DATA_DIR=__import__('tempfile').mkdtemp())  # DB sementara, bukan data asli
    proc = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    deadline = time.time() + 10
    while time.time() < deadline:
        if "berjalan" in proc.stdout.readline():
            return proc
    proc.kill()
    raise RuntimeError("server tidak start")


def main():
    server = start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_context(**p.devices["Pixel 5"]).new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.goto(f"http://127.0.0.1:{PORT}/mh1/")
            page.wait_for_function("window.__mathHero && window.__mathHero.ready && document.body.classList.contains('loaded')", timeout=15000)
            for lv, (c, k) in BOSS.items():
                page.evaluate(f"window.__mathHero.startGame({lv - 1}, 0, 1)")
                page.wait_for_timeout(300)
                page.evaluate(f"""() => {{ const h = window.__mathHero, W = h.world, P = h.player;
                  P.x = {c} * 32; P.y = (W.L.R - {k}) * 32 - P.h - 2; P.inv = 999; P.vx = 0; P.vy = 0; }}""")
                shots = [(3.9, 'tele'), (5.0, 'atk'), (5.9, 'atk2')]
                t0 = time.time()
                for t, tag in shots:
                    page.wait_for_timeout(max(0, int((t - (time.time() - t0)) * 1000)))
                    page.evaluate("() => { const P = window.__mathHero.player; P.inv = 999; P.hurt = 0; }")
                    st = page.evaluate("(() => { const B = window.__mathHero.world.boss; return B.state + ' x=' + Math.round(B.b.x) + ' dash=' + B.dashing; })()")
                    out = os.path.join(ROOT, "tests", "shots", f"boss_{lv}_{tag}.png")
                    page.screenshot(path=out)
                    print(lv, tag, st)
            print("error:", errors)
            browser.close()
    finally:
        server.kill()


main()
