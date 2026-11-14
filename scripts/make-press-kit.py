#!/usr/bin/env python3
"""Builds public/press/a2-publishing-press-kit.zip: logos and every book cover on the site, plus a credit note.
Run again after adding covers or logo files: python3 -I scripts/make-press-kit.py"""
import os, zipfile, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
pub = root / 'public'
out = pub / 'press' / 'a2-publishing-press-kit.zip'
out.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in ['logo.png', 'logo-light.png', 'mark.png']:
        f = pub / 'images' / 'brand' / name
        if f.exists():
            z.write(f, 'logos/' + name)
    for d in sorted((pub / 'images' / 'books').iterdir()):
        f = d / 'cover.jpg'
        if f.exists():
            z.write(f, 'covers/' + d.name + '.jpg')
    z.writestr('README.txt', 'A² Publishing, Double the Adventure press kit.\n\nImages are free to use with the credit "© A² Publishing".\nCovers are web size (900 px wide). 300 dpi files, sample spreads and character art: ask ceo@doubleadventure.ca.\nhttps://doubleadventure.ca/partners/press\n')
print(out, os.path.getsize(out))
