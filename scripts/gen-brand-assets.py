"""Extract the ArShield mark from the supplied JPEG and build every asset the
web app needs, all with a transparent background.

The source is a flat logo on near-black: a gold wolf/shield line drawing.
There is no photographic detail to preserve, so a luminance threshold with a
soft ramp produces a cleaner edge than a matting model would.

Outputs (all RGBA, transparent):
  src/app/icon.png            512  app icon
  src/app/apple-icon.png      180  iOS home screen
  src/app/favicon.ico         multi-size 16..256
  public/seo/opengraph-image.png   1200x630 share card
  public/seo/twitter-image.png     same art
  public/brand/logo-mark.png  512  plain mark for README / elsewhere
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = Path("/mnt/c/Users/bobby/Downloads/photo_2026-10-14_20-35-24.jpg")

GOLD = (246, 182, 33)
BG = (2, 6, 16)          # site background, used only on the share card
CREAM = (245, 218, 162)
TITLE = "ArShield"
TAGLINE = "Post-quantum envelopes for files, messages and agents."
FOOTER = "arc-shield.xyz"


def load_mark() -> Image.Image:
    """Return the mark as RGBA with a transparent background."""
    im = Image.open(SRC).convert("RGB")

    # Trim the flat border first so the mark fills the frame.
    # Anything meaningfully brighter than the background is the logo.
    gray = im.convert("L")
    bbox = gray.point(lambda p: 255 if p > 40 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)

    # Threshold with a ramp: luminance 40 -> fully transparent, 110 -> opaque.
    # The ramp keeps the antialiased edges of the drawn lines instead of
    # producing a jagged cutout.
    gray = im.convert("L")
    lo, hi = 40.0, 110.0
    alpha = gray.point(
        lambda p: 0 if p <= lo else (255 if p >= hi else int((p - lo) / (hi - lo) * 255))
    )

    out = Image.new("RGBA", im.size)
    # Keep the mark's own colour; only the alpha channel is replaced.
    out.paste(im, (0, 0))
    out.putalpha(alpha)
    return out


def square(mark: Image.Image, size: int, pad_ratio: float = 0.10) -> Image.Image:
    """Centre the mark in a square canvas, transparent, with padding."""
    inner = int(size * (1 - 2 * pad_ratio))
    scale = min(inner / mark.width, inner / mark.height)
    w, h = max(1, int(mark.width * scale)), max(1, int(mark.height * scale))
    resized = mark.resize((w, h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - w) // 2, (size - h) // 2), resized)
    return canvas


def load_font(size: int, bold: bool = False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def make_og(mark: Image.Image, w: int = 1200, h: int = 630) -> Image.Image:
    """Share card: mark on the left, name + tagline on the right."""
    card = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(card)

    # soft gold glow behind the mark
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((70, h // 2 - 190, 470, h // 2 + 190), fill=(209, 164, 19, 42))
    from PIL import ImageFilter
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    card = Image.alpha_composite(card.convert("RGBA"), glow).convert("RGB")
    d = ImageDraw.Draw(card)

    m = square(mark, 300, pad_ratio=0.04)
    card.paste(m, (110, (h - 300) // 2), m)

    d.text((480, 214), TITLE, font=load_font(76, bold=True), fill=GOLD)
    d.text((480, 310), TAGLINE.split(" and ")[0], font=load_font(30), fill=(230, 233, 239))
    d.text((480, 348), "and " + TAGLINE.split(" and ", 1)[1], font=load_font(30), fill=(230, 233, 239))
    d.text((480, 420), FOOTER, font=load_font(24), fill=(120, 130, 148))
    d.text((480, 452), "Built for ARC", font=load_font(24), fill=(120, 130, 148))
    return card


def main() -> None:
    mark = load_mark()
    print(f"mark diekstrak: {mark.size[0]}x{mark.size[1]}, background transparan")

    # Sanity: the corners must be fully transparent.
    corner = mark.getpixel((2, 2))
    assert corner[3] == 0, f"corner not transparent: {corner}"
    print(f"  piksel sudut: {corner}  (alpha 0 = transparan)")

    (ROOT / "src/app").mkdir(parents=True, exist_ok=True)
    (ROOT / "public/seo").mkdir(parents=True, exist_ok=True)
    (ROOT / "public/brand").mkdir(parents=True, exist_ok=True)

    square(mark, 512, 0.08).save(ROOT / "src/app/icon.png")
    print("  src/app/icon.png            512x512")

    square(mark, 180, 0.08).save(ROOT / "src/app/apple-icon.png")
    print("  src/app/apple-icon.png      180x180")

    square(mark, 512, 0.06).save(ROOT / "public/brand/logo-mark.png")
    print("  public/brand/logo-mark.png  512x512")

    ico_sizes = [(s, s) for s in (16, 32, 48, 64, 128, 256)]
    square(mark, 256, 0.06).save(ROOT / "src/app/favicon.ico", sizes=ico_sizes)
    print(f"  src/app/favicon.ico         {len(ico_sizes)} ukuran")

    og = make_og(mark)
    og.save(ROOT / "public/seo/opengraph-image.png")
    og.save(ROOT / "public/seo/twitter-image.png")
    print("  public/seo/opengraph-image.png + twitter-image.png  1200x630")


if __name__ == "__main__":
    main()
