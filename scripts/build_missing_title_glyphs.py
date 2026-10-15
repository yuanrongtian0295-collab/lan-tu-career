"""Generate exact missing CJK title stickers and rebuild the existing bitmap font.

This uses the same deterministic per-glyph asset format as the shipped title
stickers. Exact ideograph fidelity is more important here than free-form image
generation, which can silently mutate Chinese strokes.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
GLYPH_ROOT = ROOT / "public" / "assets" / "glyphs"
TITLE_DIR = GLYPH_ROOT / "titles"
FONT_DIR = GLYPH_ROOT / "fonts"
MISSING = "战术选择更衣室灯塔中心"


def glyph_mask(character: str) -> Image.Image:
    canvas = Image.new("L", (320, 320), 0)
    font = ImageFont.truetype(r"C:\Windows\Fonts\msyhbd.ttc", 246, index=0)
    draw = ImageDraw.Draw(canvas)
    bbox = draw.textbbox((0, 0), character, font=font, stroke_width=1)
    x = (320 - (bbox[2] - bbox[0])) // 2 - bbox[0]
    y = 298 - (bbox[3] - bbox[1]) - bbox[1]
    draw.text((x, y), character, font=font, fill=255, stroke_width=1, stroke_fill=255)

    # Roughen only the outside silhouette. Internal counters remain exact.
    rng = random.Random(ord(character))
    rough = Image.new("L", canvas.size, 0)
    rough_draw = ImageDraw.Draw(rough)
    edge = ImageChops.subtract(canvas.filter(ImageFilter.MaxFilter(5)), canvas.filter(ImageFilter.MinFilter(3)))
    for _ in range(115):
        px = rng.randrange(25, 295)
        py = rng.randrange(20, 300)
        if edge.getpixel((px, py)) > 20:
            radius = rng.choice((1, 1, 2, 3))
            rough_draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=rng.randrange(70, 180))
    return ImageChops.subtract(canvas, rough)


def render_character(character: str) -> Path:
    mask = glyph_mask(character)
    result = Image.new("RGBA", (320, 320), (0, 0, 0, 0))
    shadow = mask.filter(ImageFilter.GaussianBlur(1.2))
    result.paste((2, 5, 7, 220), (7, 8), shadow)

    # Small misregistered cyan/lime edges reproduce the existing print-sticker
    # character without reducing centre contrast.
    cyan_edge = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(7)), mask)
    lime_edge = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(3)), mask)
    result.paste((29, 203, 225, 220), (-4, 2), cyan_edge)
    result.paste((188, 219, 66, 185), (4, -2), lime_edge)
    result.paste((246, 242, 229, 255), (0, 0), mask)

    destination = TITLE_DIR / f"u{ord(character):04x}.png"
    destination.parent.mkdir(parents=True, exist_ok=True)
    result.quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(
        destination, optimize=True, compress_level=9
    )
    return destination


def rebuild() -> None:
    from build_glyph_fonts import build_font

    title_images = {int(path.stem[1:], 16): path for path in sorted(TITLE_DIR.glob("u*.png"))}
    title_names = build_font(
        family="Lantu Graffiti Titles",
        postscript_name="LantuGraffitiTitles-Regular",
        glyph_images=title_images,
        fallback_font_path=Path(r"C:\Windows\Fonts\msyhbd.ttc"),
        fallback_font_number=0,
        advance=1000,
        output_stem=FONT_DIR / "lantu-graffiti-titles",
    )

    manifest_path = GLYPH_ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"digits": {}, "titles": {}}
    manifest["titles"] = {
        chr(codepoint): {
            "codepoint": f"U+{codepoint:04X}",
            "glyph": title_names[codepoint],
            "image": f"/assets/glyphs/titles/u{codepoint:04x}.png",
        }
        for codepoint in title_images
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Rebuilt title font with {len(title_images)} exact glyphs")


def main() -> None:
    for character in MISSING:
        render_character(character)
    rebuild()


if __name__ == "__main__":
    main()
