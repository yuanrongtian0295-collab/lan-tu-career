from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "public" / "assets" / "party-v2" / "home" / "interaction-v4"
SPECS = {
    "enter-game-cta-text-v1.png": ((1400, 330), 14),
    "career-direction-icon-v1.png": ((256, 256), 20),
    "mentor-bond-icon-v1.png": ((256, 256), 20),
}


def process(name: str, target_size: tuple[int, int], padding: int) -> None:
    path = ROOT / name
    image = Image.open(path).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError(f"{name} has no visible pixels")

    left, top, right, bottom = bbox
    crop_box = (
        max(0, left - padding),
        max(0, top - padding),
        min(image.width, right + padding),
        min(image.height, bottom + padding),
    )
    output = image.crop(crop_box).resize(target_size, Image.Resampling.LANCZOS)
    output.save(path, optimize=True)

    alpha = output.getchannel("A")
    corners = [alpha.getpixel((0, 0)), alpha.getpixel((target_size[0] - 1, 0)), alpha.getpixel((0, target_size[1] - 1)), alpha.getpixel((target_size[0] - 1, target_size[1] - 1))]
    if any(corners):
        raise RuntimeError(f"{name} has non-transparent canvas corners: {corners}")
    print(f"{name}: {output.size}, alpha bbox={alpha.getbbox()}, corners={corners}")


if __name__ == "__main__":
    for filename, (size, pad) in SPECS.items():
        process(filename, size, pad)
