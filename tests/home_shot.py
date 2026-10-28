"""Screenshot halaman awal (menu utama): python tests/home_shot.py <awalan>
Menyimpan tests/shots/<awalan>_potret.png dan <awalan>_lanskap.png (emulasi Pixel 5). DB sementara."""
import os, subprocess, sys, time, tempfile
from playwright.sync_api import sync_playwright
import _tanpa_skor  # noqa: F401  (mematikan papan skor online selama tes)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8103


def start_server():
    env = dict(os.environ, PORT=str(PORT), MATHHERO_DATA_DIR=tempfile.mkdtemp())
    proc = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    deadline = time.time() + 10
    while time.time() < deadline:
        if "berjalan" in proc.stdout.readline():
            return proc
    proc.kill()
    raise RuntimeError("server tidak start")


def main():
    prefix = sys.argv[1] if len(sys.argv) > 1 else "home"
    os.makedirs(os.path.join(ROOT, "tests", "shots"), exist_ok=True)
    server = start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for name, vp in (("potret", (393, 727)), ("lanskap", (727, 393))):
                ctx = browser.new_context(**dict(p.devices["Pixel 5"], viewport={"width": vp[0], "height": vp[1]}))
                page = ctx.new_page()
                errors = []
                page.on("pageerror", lambda e: errors.append("PAGEERROR " + str(e)))
                page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
                page.goto(f"http://127.0.0.1:{PORT}/mh1/")
                page.wait_for_function("window.__mathHero && window.__mathHero.ready && document.body.classList.contains('loaded')", timeout=15000)
                page.wait_for_timeout(800)
                out = os.path.join(ROOT, "tests", "shots", f"{prefix}_{name}.png")
                page.screenshot(path=out)
                print("simpan", out, "error:", errors)
                ctx.close()
            browser.close()
    finally:
        server.kill()


main()
