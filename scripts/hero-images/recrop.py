# usage: recrop.py <src_dir> <dest_dir> '<json of {file:[page,x,y,w,h,score]}>'
import json, sys, os
from PIL import Image
src, dest, crops = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
for f, (page, x, y, w, h, score) in crops.items():
    im = Image.open(os.path.join(src, page)).convert('RGB').crop((x, y, x + w, y + h))
    size = (960, 960) if f != 'place.jpg' else (1800, round(1800 * h / w))
    if w < size[0]: size = (w, round(w * h / w)) if f != 'place.jpg' else (w, h)
    im.resize(size, Image.LANCZOS).save(os.path.join(dest, f), quality=84, optimize=True, progressive=True)
    print(f, size, os.path.getsize(os.path.join(dest, f)) // 1024, 'KB')
