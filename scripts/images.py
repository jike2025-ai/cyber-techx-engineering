"""One-off image pipeline (run manually: python3 scripts/images.py). Outputs go to public/assets/img and content/images.json."""
import json, os
from PIL import Image
A = "/mnt/user-data/attachments/7b61f3b8-9b71-51dc-9241-b1144d8c2088/"
OUT = "public/assets/img/"
os.makedirs(OUT, exist_ok=True)

# --- logo: remove the black background (alpha = brightness), keep artwork untouched
im = Image.open(A + "3aba2605-image.png").convert("RGB")
px = im.load(); w, h = im.size
rgba = Image.new("RGBA", (w, h))
rp = rgba.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]; a = max(r, g, b)
        rp[x, y] = (0, 0, 0, 0) if a < 8 else (min(255, r*255//a), min(255, g*255//a), min(255, b*255//a), a)
bbox = rgba.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
pad = 12
logo = rgba.crop((bbox[0]-pad, bbox[1]-pad, bbox[2]+pad, bbox[3]+pad))
logo.save(OUT + "logo.png", optimize=True)
logo.save(OUT + "logo.webp", quality=92)
# mark only (controller icon, above the wordmark) for favicons
mark_box = (bbox[0]-pad, bbox[1]-pad, bbox[2]+pad, 540)
mark = rgba.crop(mark_box); mb = mark.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
mark = mark.crop(mb); s = max(mark.size) + 40
sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(mark, ((s-mark.width)//2, (s-mark.height)//2))
for n in (32, 192, 512):
    sq.resize((n, n), Image.LANCZOS).save(OUT + f"icon-{n}.png", optimize=True)
apple = Image.new("RGBA", (180, 180), (10, 10, 10, 255)); m = sq.resize((140, 140), Image.LANCZOS); apple.paste(m, (20, 20), m)
apple.convert("RGB").save(OUT + "apple-touch-icon.png")
manifest = {"logo": {"w": logo.width, "h": logo.height}}

# --- photos: key -> (source id, crop box or None, max width)
P = {
 "field-cabinet":     ("14665a3a", None),
 "field-antenna":     ("be00c843", None),
 "field-router":      ("c4a64e58", None),
 "field-monitorwall": ("b22ef78e", None),
 "stock-cctv-install":("13c628c1", None),
 "stock-smart-home":  ("75ee6422", None),
 "stock-drill-camera":("53a790f3", None),
 "product-solar-ptz": ("3d6b26bd", (0, 95, 540, 1010)),
 "gaming-lounge":     ("bb8dbcbe", (0, 70, 860, 960)),
}
for key, (src, box) in P.items():
    im = Image.open(A + src + "-image.jpg").convert("RGB")
    if box: im = im.crop(box)
    manifest[key] = {"w": im.width, "h": im.height, "sizes": []}
    for tw in sorted({480, min(960, im.width)}):
        t = im if im.width <= tw else im.resize((tw, round(im.height*tw/im.width)), Image.LANCZOS)
        fn = f"{key}-{t.width}.webp"; t.save(OUT + fn, quality=80, method=6)
        manifest[key]["sizes"].append(t.width)
json.dump(manifest, open("content/images.json", "w"), indent=1)
print(json.dumps(manifest))
