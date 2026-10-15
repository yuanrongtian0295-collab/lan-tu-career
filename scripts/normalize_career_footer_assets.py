from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "v3-pages" / "career-party" / "footer-v1"


def remove_green_key(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, source_alpha = pixels[x, y]
            dominance = green - max(red, blue)
            if dominance >= 84:
                alpha = 0
            elif dominance <= 18:
                alpha = source_alpha
            else:
                alpha = round(source_alpha * (84 - dominance) / 66)
            if alpha < source_alpha:
                green = min(green, max(red, blue) + 2)
            pixels[x, y] = red, green, blue, alpha
    return image


def normalize(path: Path, target_width: int, padding: int, remove_key: bool = False) -> None:
    with Image.open(path) as source:
        image = remove_green_key(source) if remove_key else source.convert("RGBA")
        alpha = image.getchannel("A")
        bounds = alpha.getbbox()
        if bounds:
            image = image.crop(bounds)

        if padding:
            padded = Image.new("RGBA", (image.width + padding * 2, image.height + padding * 2))
            padded.alpha_composite(image, (padding, padding))
            image = padded

        target_height = max(1, round(image.height * target_width / image.width))
        image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
        image.save(path, optimize=True)


def main() -> None:
    for name in ("injury-panel.png", "stats-panel.png", "goal-panel.png"):
        normalize(ASSET_ROOT / name, 1200, 8, remove_key=True)

    for path in sorted(ASSET_ROOT.glob("stat-*.png")):
        normalize(path, 320, 18, remove_key=True)
    for path in sorted(ASSET_ROOT.glob("injury-*.png")):
        if path.name != "injury-panel.png":
            normalize(path, 320, 18, remove_key=True)

    normalize(ASSET_ROOT / "goal-label-v2.png", 800, 8, remove_key=True)


if __name__ == "__main__":
    main()
