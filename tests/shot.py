"""Alat cek visual: python tests/shot.py <level> <xTile,...> [keluaran]
Menjalankan server, membuka game di emulasi HP, memulai level, memindahkan pemain ke kolom tertentu,
lalu menyimpan screenshot ke tests/shots/. Mencetak error console jika ada."""
import os, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8092


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
    level = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    spots = [tuple(int(v) for v in x.split(":")) for x in (sys.argv[2] if len(sys.argv) > 2 else "3").split(",")]
    os.makedirs(os.path.join(ROOT, "tests", "shots"), exist_ok=True)
    server = start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            ctx = browser.new_context(**p.devices["Pixel 5"])
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append("PAGEERROR " + str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.goto(f"http://127.0.0.1:{PORT}/")
            page.wait_for_function("window.__mathHero && window.__mathHero.ready && document.body.classList.contains('loaded')", timeout=15000)
            page.evaluate(f"window.__mathHero.startGame({level - 1}, 0, 1)")
            page.wait_for_timeout(300)
            for sp in spots:
                # c bisa 'x' kolom, dipakai juga untuk tinggi lewat format kolom:tinggi
                page.evaluate(f"""() => {{
                  const h = window.__mathHero, W = h.world, P = h.player;
                  P.x = {sp[0]} * 32; P.y = (W.L.R - {sp[1] if len(sp) > 1 else 3}) * 32 - P.h - 2; P.vx = 0; P.vy = 0; P.inv = 0;
                  W.cam.x = P.x - 150; W.cam.y = P.y - 300; 
                }}""")
                page.wait_for_timeout(900)
                out = os.path.join(ROOT, "tests", "shots", f"l{level}_c{sp[0]}_k{sp[1] if len(sp) > 1 else 3}.png")
                page.screenshot(path=out)
                print("simpan", out)
            print("error:", errors)
            browser.close()
    finally:
        server.kill()


main()
