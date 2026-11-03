"""Makes small cover copies (cover-sm.jpg, 360 px wide) next to each cover.jpg so list pages load fast.
Usage: python3 scripts/make-thumbs.py   (skips ones that already exist; --all remakes)"""
import os, sys
from PIL import Image
root = os.path.join(os.path.dirname(__file__), '..', 'public', 'images', 'books')
for slug in sorted(os.listdir(root)):
    src, dst = os.path.join(root, slug, 'cover.jpg'), os.path.join(root, slug, 'cover-sm.jpg')
    if not os.path.exists(src) or (os.path.exists(dst) and '--all' not in sys.argv): continue
    im = Image.open(src).convert('RGB'); im.thumbnail((360, 576), Image.LANCZOS)
    im.save(dst, quality=80, optimize=True, progressive=True)
    print(slug, im.size, os.path.getsize(dst) // 1024, 'KB')
