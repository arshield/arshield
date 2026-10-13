"""Generate ArShield brand assets: OG image, twitter card, icons.

Palette matches the site: near-black navy #020610, gold #D1A413,
cream #f5daa2. Run from repo root:
    python3 scripts/gen-brand-assets.py
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BG = (2, 6, 16)
GOLD = (209, 164, 19)
CREAM = (245, 218, 162)
MUTED = (138, 147, 163)

# Find a usable font (DejaVu ships with most Linux distros).
def font(size: int, bold: bool = False):
    cands = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for c in cands:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def draw_shield(d: ImageDraw.ImageDraw, cx: int, cy: int, h: int, color, width: int = 0, arc: bool = True):
    """Draw the ArShield mark: a shield with a bright arc through it."""
    w = int(h * 0.82)
    left, right = cx - w // 2, cx + w // 2
    top, bot = cy - h // 2, cy + h // 2
    pts = [
        (left, top + h * 0.06),
        (cx, top),
        (right, top + h * 0.06),
        (right, top + h * 0.52),
        (cx, bot),
        (left, top + h * 0.52),
    ]
    if width:
        d.polygon(pts, outline=color, width=width)
    else:
        d.polygon(pts, fill=color)
    if arc:
        # An arc slicing the shield: the "ARC" gesture. Drawn in cream so it
        # stays legible against the near-black interior at favicon sizes.
        r = w * 0.72
        bbox = [cx - r, cy - r * 0.55, cx + r, cy + r * 1.15]
        d.arc(bbox, start=205, end=335, fill=CREAM, width=max(4, h // 11))


def radial_glow(img: Image.Image, cx: int, cy: int, radius: int, color, strength=0.16):
    """Soft radial glow, composited additively."""
    overlay = Image.new("RGB", img.size, (0, 0, 0))
    od = ImageDraw.Draw(overlay)
    steps = 48
    for i in range(steps, 0, -1):
        r = int(radius * i / steps)
        a = strength * (1 - i / steps)
        od.ellipse([cx - r, cy - r, cx + r, cy + r],
                   fill=(int(color[0] * a), int(color[1] * a), int(color[2] * a)))
    return Image.blend(img, Image.blend(img, overlay, 0.85), 0.85)


def make_og(width=1200, height=630, out="public/seo/opengraph-image.png"):
    img = Image.new("RGB", (width, height), BG)
    img = radial_glow(img, int(width * 0.5), int(height * 0.42), 520, GOLD, 0.20)
    img = radial_glow(img, int(width * 0.15), int(height * 0.9), 380, (40, 80, 160), 0.18)
    d = ImageDraw.Draw(img)

    # orbit arcs (echo the hero)
    for i, (rx, ry, s, e, a) in enumerate([
        (520, 150, 200, 340, 60),
        (430, 120, 190, 350, 45),
        (600, 175, 195, 345, 35),
    ]):
        d.arc([width // 2 - rx, height // 2 - ry, width // 2 + rx, height // 2 + ry],
              start=s, end=e, fill=(30 + a, 34 + a, 52 + a), width=1)

    # logo + wordmark (top center)
    mark_h = 62
    draw_shield(d, width // 2 - 96, 78, mark_h, GOLD, width=4, arc=True)
    d.text((width // 2 - 54, 52), "ArShield", font=font(40, bold=True), fill=CREAM)

    # headline
    d.text((width // 2, 244), "Security", font=font(84, bold=True), fill=(240, 243, 247), anchor="mm")
    d.text((width // 2, 336), "between agents.", font=font(84, bold=True), fill=GOLD, anchor="mm")

    # subtitle
    d.text((width // 2, 424), "Post-quantum envelopes for files and messages.",
           font=font(27), fill=MUTED, anchor="mm")

    # footer
    d.text((width // 2, 566), "arc-shield.xyz  ·  Built for ARC",
           font=font(21), fill=(91, 100, 116), anchor="mm")

    p = ROOT / out
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p, "PNG", optimize=True)
    print("wrote", p)


def make_icon(size=512, out="src/app/icon.png", pad_ratio=0.14):
    img = Image.new("RGB", (size, size), BG)
    img = radial_glow(img, size // 2, int(size * 0.46), int(size * 0.55), GOLD, 0.22)
    d = ImageDraw.Draw(img)
    draw_shield(d, size // 2, size // 2, int(size * (1 - pad_ratio * 2)), GOLD, width=max(6, size // 26), arc=True)
    p = ROOT / out
    img.save(p, "PNG", optimize=True)
    print("wrote", p)


def make_ico(out="src/app/favicon.ico"):
    base = Image.new("RGB", (256, 256), BG)
    base = radial_glow(base, 128, 118, 140, GOLD, 0.22)
    d = ImageDraw.Draw(base)
    draw_shield(d, 128, 128, 176, GOLD, width=11, arc=True)
    p = ROOT / out
    # Next/Turbopack requires the embedded PNG frames to be RGBA.
    base = base.convert("RGBA")
    base.save(p, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print("wrote", p)


if __name__ == "__main__":
    make_og()
    make_og()  # twitter uses the same art
    # copy to twitter
    import shutil
    shutil.copyfile(ROOT / "public/seo/opengraph-image.png", ROOT / "public/seo/twitter-image.png")
    print("wrote", ROOT / "public/seo/twitter-image.png")
    make_icon(out="src/app/icon.png")
    make_icon(out="src/app/apple-icon.png", size=180)
    make_ico()