"""Tes font Kleintenna Bow: font termuat di HTML dan canvas, tanpa error console, screenshot menu dan gameplay."""
import os, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright, expect

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8101  # bukan 8091: port itu dipakai server asli pengguna


def start_server():
    # Database sementara agar tes tidak menulis pemain/skor ke data asli.
    env = dict(os.environ, PORT=str(PORT), MATHHERO_DATA_DIR=tempfile.mkdtemp())
    proc = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    deadline = time.time() + 10
    while time.time() < deadline:
        if "berjalan" in proc.stdout.readline():
            return proc
    proc.kill()
    raise RuntimeError("server tidak start")


def main():
    server = start_server()
    ok = True
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            ctx = browser.new_context(**p.devices["Pixel 5"])
            page = ctx.new_page()
            errors, failed = [], []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("response", lambda r: failed.append(r.url) if r.status >= 400 else None)
            page.goto(f"http://127.0.0.1:{PORT}/")
            expect(page.locator("#splash h1")).to_have_text("Math Hero")
            page.evaluate("document.fonts.ready")
            loaded = page.evaluate("document.fonts.check(\"16px 'Kleintenna'\")")
            fam = page.evaluate("getComputedStyle(document.querySelector('#splash h1')).fontFamily")
            print("font termuat:", loaded, "| h1 font-family:", fam)
            ok &= bool(loaded) and "Kleintenna" in fam
            page.screenshot(path=os.path.join(ROOT, "tests", "screenshot-font-kleintenna-menu.png"))
            page.locator("#btn-start").tap()
            page.locator("#name-keys .key").nth(0).tap()  # huruf A
            page.locator("#name-ok").tap()
            page.locator(".hero-card").first.tap()
            page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(ROOT, "tests", "screenshot-font-kleintenna-game.png"))
            print("error console:", errors, "| respons gagal:", failed)
            ok &= errors == [] and failed == []
            browser.close()
    finally:
        server.kill()
    print("HASIL:", "LULUS" if ok else "GAGAL")
    sys.exit(0 if ok else 1)


main()
