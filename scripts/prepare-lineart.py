"""Turns exported coloring pages into web line art for the Play area.
Usage: python3 scripts/prepare-lineart.py <slug> <src.png> [<src.png> ...]
Writes public/images/play/<slug>/p01.png, p02.png ... in the order given (p01 is the hub thumbnail).
Keep at most 5 pages per book (KDP Select)."""
import sys, os
from PIL import Image, ImageOps

slug, files = sys.argv[1], sys.argv[2:7]
out = os.path.join(os.path.dirname(__file__), '..', 'public', 'images', 'play', slug)
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.endswith('.png'): os.remove(os.path.join(out, f))
for i, src in enumerate(files, 1):
    im = ImageOps.grayscale(Image.open(src).convert('RGB'))
    im.thumbnail((1000, 1100), Image.LANCZOS)
    # Paper grain and light grey to pure white, keep the soft edges of the lines.
    im = im.point(lambda v: 255 if v > 225 else int(v * 255 / 225))
    im.save(os.path.join(out, 'p%02d.png' % i), optimize=True)
    print(slug, i, im.size)
