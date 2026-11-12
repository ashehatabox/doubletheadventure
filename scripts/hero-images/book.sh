#!/bin/bash
# usage: book.sh <slug>   (expects /home/claude/hires/<slug>/book.pdf)
set -e
S=$1; D=/home/claude/hires/$S; R=/home/claude/doubletheadventure/public/images/heroes/$S
cd $D
[ -f p01.jpg ] || { pdftoppm -r 192 -jpeg -jpegopt quality=92 book.pdf p >/dev/null 2>&1; for f in p-*.jpg; do n=$(echo $f | sed 's/p-0*\([0-9]*\).jpg/\1/'); mv $f p$(printf %02d $n).jpg; done; }
mkdir -p old place out; cp $R/*.jpg old/; mv old/place.jpg place/ 2>/dev/null || true
python3 -I ../scripts/locate.py . old > /dev/null; cp crops.json crops-portraits.json
python3 -c "import json;[print(k,v) for k,v in json.load(open('crops.json')).items()]"
python3 -I ../scripts/recrop.py . out "$(cat crops.json)" > /dev/null
[ -f place/place.jpg ] && ../scripts/place.sh $S
# side-by-side check sheet: old (top) vs new (bottom)
python3 - <<PY
from PIL import Image; import glob, os
fs=sorted(glob.glob('out/*.jpg')); W=320
sheet=Image.new('RGB',(W*len(fs),W*2+10),'white')
for i,f in enumerate(fs):
    n=os.path.basename(f); o=Image.open(('place/' if n=='place.jpg' else 'old/')+n); w=Image.open(f)
    for j,im in enumerate((o,w)): sheet.paste(im.resize((W,round(W*im.height/im.width))).crop((0,0,W,W)),(i*W,j*(W+10)))
sheet.save('sheet.jpg',quality=85)
PY
