#!/bin/bash
# usage: place.sh <slug> : cut place.jpg at native size from the book's spread images
set -e; S=$1; cd /home/claude/hires/$S
if [ ! -d spreads ]; then mkdir -p emb && pdfimages -j -png book.pdf emb/i >/dev/null 2>&1; python3 - <<'PY'
from PIL import Image; import glob, os
os.makedirs('spreads', exist_ok=True); n=0
for f in sorted(glob.glob('emb/i-*')):
    im=Image.open(f)
    if im.mode in ('L','1','LA'): continue
    if im.width >= 1500:
        n+=1; im.convert('RGB').save(f'spreads/p{n:02d}.jpg', quality=95)
PY
fi
C=$(python3 -I ../scripts/locate_sift.py spreads place/place.jpg); echo "place $C"
python3 - "$C" <<'PY'
import json, sys; from PIL import Image
page, x, y, w, h, n = json.loads(sys.argv[1]); im = Image.open('spreads/' + page).convert('RGB')
x, y = max(0, x), max(0, y); im = im.crop((x, y, min(im.width, x + w), min(im.height, y + h)))
if im.width > 1800: im = im.resize((1800, round(1800 * im.height / im.width)), Image.LANCZOS)
im.save('out/place.jpg', quality=86, optimize=True, progressive=True); print(im.size)
PY
