"""Normalize generated title glyph stickers and package them as an OT-SVG web font.

The input images must already have an alpha channel.  Each final glyph remains an
individual PNG in public/assets/glyphs and is also embedded in a color font so
normal HTML text keeps its semantics, wrapping, and accessibility.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables.sbixGlyph import Glyph as SbixGlyph
from fontTools.ttLib.tables.sbixStrike import Strike as SbixStrike


UPEM = 1000
ASCENT = 850
DESCENT = -150


def alpha_bbox(image: Image.Image, threshold: int = 20) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value >= threshold else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("Glyph image contains no visible pixels")
    return bbox


def normalize_png(
    source: Path,
    destination: Path,
    *,
    canvas: tuple[int, int],
    max_ink: tuple[int, int],
    baseline: int,
) -> None:
    image = Image.open(source).convert("RGBA")
    left, top, right, bottom = alpha_bbox(image)
    pad = max(3, round(max(image.size) * 0.006))
    crop_box = (
        max(0, left - pad),
        max(0, top - pad),
        min(image.width, right + pad),
        min(image.height, bottom + pad),
    )
    glyph = image.crop(crop_box)
    scale = min(max_ink[0] / glyph.width, max_ink[1] / glyph.height)
    size = (max(1, round(glyph.width * scale)), max(1, round(glyph.height * scale)))
    glyph = glyph.resize(size, Image.Resampling.LANCZOS)

    result = Image.new("RGBA", canvas, (0, 0, 0, 0))
    x = (canvas[0] - glyph.width) // 2
    y = baseline - glyph.height
    result.alpha_composite(glyph, (x, y))
    destination.parent.mkdir(parents=True, exist_ok=True)
    # The generated paint uses a deliberately tight palette. Keeping 128 RGBA
    # entries preserves the antialiased ink edge while making the embedded font
    # practical on a mobile connection.
    optimized = result.quantize(
        colors=128,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE,
    )
    optimized.save(destination, optimize=True, compress_level=9)


def make_notdef() -> object:
    pen = TTGlyphPen(None)
    pen.moveTo((80, -80))
    pen.lineTo((920, -80))
    pen.lineTo((920, 800))
    pen.lineTo((80, 800))
    pen.closePath()
    pen.moveTo((170, 10))
    pen.lineTo((170, 710))
    pen.lineTo((830, 710))
    pen.lineTo((830, 10))
    pen.closePath()
    return pen.glyph()


def fallback_outline(source_font: TTFont, codepoint: int, advance: int) -> object:
    cmap = source_font.getBestCmap()
    glyph_name = cmap.get(codepoint)
    if glyph_name is None:
        raise ValueError(f"Fallback font has no U+{codepoint:04X}")

    glyph_set = source_font.getGlyphSet()
    bounds_pen = BoundsPen(glyph_set)
    glyph_set[glyph_name].draw(bounds_pen)
    if bounds_pen.bounds is None:
        return TTGlyphPen(None).glyph()

    x_min, y_min, x_max, y_max = bounds_pen.bounds
    target_left, target_right = 55, advance - 55
    target_bottom, target_top = -80, 805
    scale = min(
        (target_right - target_left) / max(1, x_max - x_min),
        (target_top - target_bottom) / max(1, y_max - y_min),
    )
    x_offset = (advance - (x_max - x_min) * scale) / 2 - x_min * scale
    y_offset = target_bottom - y_min * scale

    recording = DecomposingRecordingPen(glyph_set)
    glyph_set[glyph_name].draw(recording)
    pen = TTGlyphPen(None)
    recording.replay(TransformPen(pen, (scale, 0, 0, scale, x_offset, y_offset)))
    return pen.glyph()


def build_font(
    *,
    family: str,
    postscript_name: str,
    glyph_images: dict[int, Path],
    fallback_font_path: Path,
    fallback_font_number: int | None,
    advance: int,
    output_stem: Path,
) -> dict[int, str]:
    glyph_names = {codepoint: f"u{codepoint:04X}" for codepoint in glyph_images}
    glyph_order = [".notdef", *glyph_names.values()]

    kwargs = {"fontNumber": fallback_font_number} if fallback_font_number is not None else {}
    fallback_font = TTFont(fallback_font_path, **kwargs)
    glyphs = {".notdef": make_notdef()}
    for codepoint, name in glyph_names.items():
        glyphs[name] = fallback_outline(fallback_font, codepoint, advance)

    builder = FontBuilder(UPEM, isTTF=True)
    builder.setupGlyphOrder(glyph_order)
    builder.setupCharacterMap(glyph_names)
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics({name: (advance, 0) for name in glyph_order})
    builder.setupHorizontalHeader(ascent=ASCENT, descent=DESCENT, lineGap=0)
    builder.setupOS2(
        sTypoAscender=ASCENT,
        sTypoDescender=DESCENT,
        sTypoLineGap=0,
        usWinAscent=ASCENT,
        usWinDescent=abs(DESCENT),
        sxHeight=520,
        sCapHeight=800,
    )
    builder.setupNameTable(
        {
            "familyName": family,
            "styleName": "Regular",
            "uniqueFontIdentifier": f"Lantu:{postscript_name}:1.0",
            "fullName": family,
            "psName": postscript_name,
            "version": "Version 1.0",
        }
    )
    builder.setupPost(keepGlyphNames=True)
    builder.setupMaxp()

    font = builder.font
    # A 320 PPEM sbix strike maps the normalized PNG canvas directly to the
    # 1000-unit title em. It is rendered as a real color bitmap glyph, while
    # the generated outline above remains a readable fallback.
    sbix_table = newTable("sbix")
    sbix_table.version = 1
    sbix_table.flags = 1
    strike = SbixStrike(ppem=320, resolution=96)
    for codepoint, image_path in glyph_images.items():
        name = glyph_names[codepoint]
        strike.glyphs[name] = SbixGlyph(
            glyphName=name,
            originOffsetX=0,
            originOffsetY=-20,
            graphicType="png ",
            imageData=image_path.read_bytes(),
        )
    sbix_table.strikes = {320: strike}
    font["sbix"] = sbix_table

    output_stem.parent.mkdir(parents=True, exist_ok=True)
    ttf_path = output_stem.with_suffix(".ttf")
    woff2_path = output_stem.with_suffix(".woff2")
    font.save(ttf_path)
    web_font = TTFont(ttf_path)
    web_font.flavor = "woff2"
    web_font.save(woff2_path)
    return glyph_names


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--titles-alpha", type=Path, required=True)
    parser.add_argument("--public-root", type=Path, required=True)
    args = parser.parse_args()

    glyph_root = args.public_root / "assets" / "glyphs"
    title_dir = glyph_root / "titles"
    font_dir = glyph_root / "fonts"

    title_images: dict[int, Path] = {}
    for source in sorted(args.titles_alpha.glob("u*.png")):
        codepoint = int(source.stem[1:], 16)
        destination = title_dir / source.name
        normalize_png(
            source,
            destination,
            canvas=(320, 320),
            max_ink=(286, 276),
            baseline=298,
        )
        title_images[codepoint] = destination

    title_names = build_font(
        family="Lantu Graffiti Titles",
        postscript_name="LantuGraffitiTitles-Regular",
        glyph_images=title_images,
        fallback_font_path=Path(r"C:\Windows\Fonts\msyhbd.ttc"),
        fallback_font_number=0,
        advance=1000,
        output_stem=font_dir / "lantu-graffiti-titles",
    )

    manifest = {
        "digits": {},
        "titles": {
            chr(codepoint): {
                "codepoint": f"U+{codepoint:04X}",
                "glyph": title_names[codepoint],
                "image": f"/assets/glyphs/titles/u{codepoint:04x}.png",
            }
            for codepoint in title_images
        },
    }
    (glyph_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        f"Built {len(title_images)} title stickers"
    )


if __name__ == "__main__":
    main()
