from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "v3-pages"

SHEETS: dict[str, list[str]] = {
    "builder": [
        "rookie-player",
        "studio-panel",
        "cta-orange",
        "style-card",
        "allocation-tray",
        "tape-label",
    ],
    "calendar": [
        "notebook-calendar",
        "record-note",
        "simulate-orange",
        "result-strip",
        "championship-trophy",
        "current-game-doodle",
    ],
    "game": [
        "scoreboard-frame",
        "injury-panel",
        "tactic-card",
        "story-paper",
        "risk-stamp",
        "bottom-toolbar",
    ],
    "phone": [
        "mentor-portrait",
        "relationship-banner",
        "mentor-medallion",
        "chat-panel",
        "social-card",
        "publish-orange",
    ],
    "player": [
        "player-portrait",
        "training-panel",
        "badge-gold",
        "badge-locked",
        "attribute-tray",
        "management-strip",
    ],
    "league": [
        "team-feature",
        "rank-highlight",
        "draft-banner",
        "search-frame",
        "active-tab",
        "draft-ball",
    ],
    "legacy": [
        "veteran-player",
        "season-summary",
        "choice-card",
        "legacy-note",
        "rookie-preview",
        "gold-cta",
    ],
}

CROP_BOXES: dict[str, list[tuple[int, int, int, int]]] = {
    "builder": [(90, 0, 430, 525), (500, 0, 985, 525), (970, 130, 1536, 470), (70, 525, 440, 1024), (445, 600, 1010, 950), (1010, 670, 1510, 920)],
    "calendar": [(35, 65, 555, 535), (590, 70, 970, 510), (965, 150, 1536, 490), (35, 630, 665, 950), (665, 525, 995, 970), (1060, 550, 1520, 920)],
    "game": [(15, 150, 575, 440), (575, 140, 1190, 490), (1180, 60, 1536, 535), (15, 545, 560, 965), (555, 540, 930, 965), (915, 650, 1536, 915)],
    "phone": [(0, 0, 505, 510), (505, 60, 1025, 450), (1025, 0, 1536, 515), (0, 550, 515, 950), (545, 515, 985, 1024), (1015, 590, 1536, 950)],
    "player": [(0, 0, 450, 540), (440, 45, 1075, 490), (1065, 0, 1536, 545), (0, 545, 460, 1024), (440, 510, 855, 1024), (850, 610, 1536, 950)],
    "league": [(15, 130, 570, 500), (555, 190, 1030, 470), (1005, 120, 1536, 500), (15, 590, 590, 865), (565, 555, 1040, 875), (1010, 450, 1536, 1024)],
    "legacy": [(0, 0, 495, 630), (515, 130, 1115, 490), (1130, 0, 1536, 630), (0, 655, 495, 1024), (515, 655, 1115, 1000), (1130, 655, 1536, 980)],
}


def trim_alpha(image: Image.Image, padding: int = 8) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        return image
    left, top, right, bottom = bounds
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def main() -> None:
    for page, names in SHEETS.items():
        page_dir = ASSET_ROOT / page
        sheet_path = page_dir / "sheet-transparent.png"
        if not sheet_path.exists():
            raise FileNotFoundError(sheet_path)
        sheet = Image.open(sheet_path).convert("RGBA")
        for index, name in enumerate(names):
            cell = sheet.crop(CROP_BOXES[page][index])
            trimmed = trim_alpha(cell)
            trimmed.save(page_dir / f"{name}.png", optimize=True)
            print(f"{page}/{name}.png {trimmed.width}x{trimmed.height}")


if __name__ == "__main__":
    main()
