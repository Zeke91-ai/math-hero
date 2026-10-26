"""Gabungkan beberapa screenshot menjadi satu gambar kecil: python tests/montage.py keluaran.png a.png b.png ..."""
import sys
from PIL import Image

out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
s = 0.5
ims = [im.resize((int(im.width * s), int(im.height * s)), Image.NEAREST) for im in ims]
cols = min(len(ims), 4)
rows = (len(ims) + cols - 1) // cols
w, h = ims[0].size
sheet = Image.new('RGB', (w * cols + 4 * (cols - 1), h * rows + 4 * (rows - 1)), (30, 30, 30))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (w + 4), (i // cols) * (h + 4)))
sheet.save(out)
print(out, sheet.size)
