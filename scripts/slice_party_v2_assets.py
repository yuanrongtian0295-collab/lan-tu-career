from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "party-v2"

# Coordinates are captured from the approved, text-free chroma-key sheets.  Keeping
# this list explicit makes the build deterministic and prevents a future generator
# variation from silently assigning the wrong skin to a component.
SHEETS: dict[str, list[tuple[str, tuple[int, int, int, int], str]]] = {
    "home": [
        ("resources-panel", (528, 192, 860, 420), "fixed-aspect"),
        ("title-brush", (48, 244, 464, 360), "decorative"),
        ("metric-panel", (52, 524, 352, 824), "nine-slice"),
        ("info-panel", (412, 568, 908, 808), "nine-slice"),
        ("injury-panel", (24, 980, 448, 1160), "nine-slice"),
        ("match-panel", (484, 980, 912, 1160), "nine-slice"),
        ("feed-panel", (476, 1292, 916, 1540), "nine-slice"),
        ("cta-button", (28, 1324, 448, 1488), "fixed-aspect"),
    ],
    "game": [
        ("scoreboard", (44, 92, 888, 336), "fixed-aspect"),
        ("player-strip", (44, 368, 888, 528), "nine-slice"),
        ("tabs", (44, 560, 484, 640), "fixed-aspect"),
        ("tactic-card", (540, 564, 888, 892), "nine-slice"),
        ("timeline", (44, 676, 484, 1264), "nine-slice"),
        ("tactic-selected", (536, 924, 892, 1268), "nine-slice"),
        ("controls", (44, 1304, 888, 1472), "nine-slice"),
        ("result-panel", (44, 1488, 888, 1624), "nine-slice"),
    ],
    "phone": [
        ("tabs", (892, 76, 1648, 176), "fixed-aspect"),
        ("title-ribbon", (76, 96, 776, 172), "decorative"),
        ("contacts-panel", (60, 240, 816, 408), "nine-slice"),
        ("contact-row", (888, 260, 1648, 396), "nine-slice"),
        ("relationship-panel", (60, 460, 812, 652), "nine-slice"),
        ("outgoing-bubble", (896, 476, 1652, 608), "nine-slice"),
        ("publish-button", (884, 708, 1652, 828), "fixed-aspect"),
        ("incoming-bubble", (64, 712, 812, 832), "nine-slice"),
    ],
    "player": [
        ("identity-panel", (76, 32, 992, 296), "nine-slice"),
        ("overall-shield", (1124, 32, 1416, 304), "fixed-aspect"),
        ("attribute-panel", (988, 324, 1700, 480), "nine-slice"),
        ("tabs", (72, 348, 940, 456), "fixed-aspect"),
        ("icon-tile", (276, 488, 492, 672), "fixed-aspect"),
        ("badge-panel", (748, 504, 1668, 676), "nine-slice"),
        ("management-panel", (72, 700, 824, 848), "nine-slice"),
        ("cta-button", (852, 712, 1692, 848), "fixed-aspect"),
    ],
    "league": [
        ("record-panel", (8, 100, 560, 352), "fixed-aspect"),
        ("tabs", (544, 292, 1012, 352), "fixed-aspect"),
        ("standings-panel", (12, 448, 504, 792), "nine-slice"),
        ("ranking-row", (520, 572, 1012, 660), "nine-slice"),
        ("award-panel", (512, 876, 1008, 1088), "nine-slice"),
        ("leaders-panel", (12, 880, 492, 1084), "nine-slice"),
        ("bracket-panel", (12, 1160, 564, 1416), "fixed-aspect"),
        ("cta-button", (588, 1252, 984, 1356), "fixed-aspect"),
    ],
    "offseason": [
        ("season-record", (44, 52, 976, 316), "fixed-aspect"),
        ("ceremony-header", (44, 360, 980, 564), "fixed-aspect"),
        ("winner-card", (44, 596, 596, 944), "fixed-aspect"),
        ("locked-card", (632, 596, 980, 948), "fixed-aspect"),
        ("planning-panel", (44, 976, 600, 1324), "nine-slice"),
        ("focus-card", (632, 980, 980, 1328), "nine-slice"),
        ("contract-panel", (44, 1352, 452, 1488), "nine-slice"),
        ("cta-button", (480, 1364, 980, 1488), "fixed-aspect"),
    ],
    "retired": [
        ("career-ribbon", (88, 28, 1052, 168), "decorative"),
        ("choice-selected", (1088, 28, 1504, 400), "nine-slice"),
        ("summary-panel", (88, 188, 1048, 400), "nine-slice"),
        ("timeline-panel", (88, 428, 1048, 552), "fixed-aspect"),
        ("choice-default", (1088, 428, 1504, 796), "nine-slice"),
        ("outcome-panel", (88, 580, 1048, 784), "nine-slice"),
        ("cta-button", (88, 804, 1044, 932), "fixed-aspect"),
        ("restart-button", (1092, 840, 1504, 920), "fixed-aspect"),
    ],
    "builder": [
        ("numeric-stepper", (644, 196, 948, 276), "fixed-aspect"),
        ("step-track", (32, 200, 572, 264), "fixed-aspect"),
        ("body-panel", (40, 304, 564, 848), "nine-slice"),
        ("position-tile", (656, 404, 932, 528), "nine-slice"),
        ("allocation-panel", (584, 648, 992, 932), "nine-slice"),
        ("draw-panel", (24, 936, 548, 1172), "nine-slice"),
        ("template-panel", (576, 988, 992, 1244), "nine-slice"),
        ("badge-strip", (28, 1208, 544, 1364), "nine-slice"),
        ("cta-button", (572, 1280, 992, 1360), "fixed-aspect"),
    ],
}

# Corrective skins come from a second generated sheet but remain part of the
# same typed registry, so page code never bypasses PartySurface.
EXTRA_ASSETS: dict[str, list[tuple[str, str]]] = {
    "home": [
        ("info-panel-dark", "nine-slice"),
        ("match-panel-dark", "nine-slice"),
    ],
}


def trim_alpha(image: Image.Image, padding: int = 5) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("asset crop contains no opaque pixels")
    left, top, right, bottom = bounds
    return image.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(image.width, right + padding),
        min(image.height, bottom + padding),
    ))


def safe_area(mode: str) -> dict[str, float]:
    if mode == "decorative":
        return {"top": .18, "right": .12, "bottom": .18, "left": .12}
    if mode == "fixed-aspect":
        return {"top": .12, "right": .08, "bottom": .12, "left": .08}
    return {"top": .10, "right": .08, "bottom": .10, "left": .08}


def main() -> None:
    manifest: dict[str, dict[str, object]] = {}
    for page, specs in SHEETS.items():
        page_dir = ASSET_ROOT / page
        sheet_path = page_dir / "sheet-transparent.png"
        if not sheet_path.exists():
            raise FileNotFoundError(sheet_path)
        sheet = Image.open(sheet_path).convert("RGBA")
        manifest[page] = {}
        for name, box, mode in specs:
            cropped = trim_alpha(sheet.crop(box))
            output = page_dir / f"{name}.png"
            cropped.save(output, optimize=True)
            manifest[page][name] = {
                "src": f"/assets/party-v2/{page}/{name}.png",
                "sourceSize": {"width": cropped.width, "height": cropped.height},
                "mode": mode,
                "safeArea": safe_area(mode),
                "slice": 24 if mode == "nine-slice" else None,
            }
            print(f"{page}/{name}.png {cropped.width}x{cropped.height} {mode}")
        for name, mode in EXTRA_ASSETS.get(page, []):
            output = page_dir / f"{name}.png"
            if not output.exists():
                raise FileNotFoundError(output)
            with Image.open(output) as extra:
                width, height = extra.size
            manifest[page][name] = {
                "src": f"/assets/party-v2/{page}/{name}.png",
                "sourceSize": {"width": width, "height": height},
                "mode": mode,
                "safeArea": safe_area(mode),
                "slice": 24 if mode == "nine-slice" else None,
            }
            print(f"{page}/{name}.png {width}x{height} {mode}")
    (ASSET_ROOT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    generated = ROOT / "src" / "theme" / "partySkins.generated.ts"
    generated.parent.mkdir(parents=True, exist_ok=True)
    generated.write_text(
        "// Generated by scripts/slice_party_v2_assets.py. Do not edit by hand.\n"
        f"export const PARTY_SKINS = {json.dumps(manifest, ensure_ascii=False, indent=2)} as const\n\n"
        "export type PartySkinPage = keyof typeof PARTY_SKINS\n"
        "export type PartySkinName<P extends PartySkinPage> = keyof typeof PARTY_SKINS[P]\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
