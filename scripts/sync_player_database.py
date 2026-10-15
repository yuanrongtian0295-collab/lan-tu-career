#!/usr/bin/env python3
"""Build the offline NBA player database used by the career simulation.

The game never calls third-party services at runtime. This script downloads
versioned public snapshots, normalizes identities to NBA PERSON_ID whenever
possible, derives the game's 28 independent attributes, and writes compact
JSON shards under public/data/nba.
"""

from __future__ import annotations

import ast
import bisect
import csv
import hashlib
import io
import json
import math
import os
import re
import shutil
import tempfile
import unicodedata
import urllib.request
import zipfile
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "data" / "nba"
BUNDLE_OUTPUT = ROOT / "src" / "data" / "generated" / "currentPlayers.json"
CACHE = Path(tempfile.gettempdir()) / "lantu-nba-data-cache"
DATA_VERSION = "nba-2025-26-v1"
RATING_SEASON = 2026

NBA_INDEX_URL = "https://raw.githubusercontent.com/swar/nba_api/master/src/nba_api/stats/library/data.py"
CROSSWALK_URL = "https://raw.githubusercontent.com/djblechn-su/nba-player-team-ids/master/NBA_Player_IDs.csv"
RAPTOR_URL = "https://raw.githubusercontent.com/fivethirtyeight/nba-player-advanced-metrics/master/nba-data-historical.csv"
TRADITIONAL_URL = "https://www.kaggle.com/api/v1/datasets/download/szymonjwiak/nba-traditional"
CAREER_URL = "https://www.kaggle.com/api/v1/datasets/download/flynn28/v2-nba-player-database"

ATTRIBUTE_KEYS = [
    "closeShot", "layup", "drivingDunk", "standingDunk", "postControl",
    "midRange", "threePoint", "freeThrow", "shotStability",
    "passAccuracy", "vision", "ballHandle", "speedWithBall",
    "interiorDefense", "perimeterDefense", "steal", "block", "helpDefense",
    "offensiveRebound", "defensiveRebound", "speed", "acceleration", "strength",
    "vertical", "stamina", "durability", "clutch", "leadership",
]

TEAM_ABBR_TO_ID = {
    "ATL": "1610612737", "BOS": "1610612738", "BKN": "1610612751", "BRK": "1610612751",
    "CHA": "1610612766", "CHH": "1610612766", "CHI": "1610612741", "CLE": "1610612739",
    "DAL": "1610612742", "DEN": "1610612743", "DET": "1610612765", "GSW": "1610612744",
    "HOU": "1610612745", "IND": "1610612754", "LAC": "1610612746", "LAL": "1610612747",
    "MEM": "1610612763", "VAN": "1610612763", "MIA": "1610612748", "MIL": "1610612749",
    "MIN": "1610612750", "NOP": "1610612740", "NOH": "1610612740", "NOK": "1610612740",
    "NYK": "1610612752", "OKC": "1610612760", "SEA": "1610612760", "ORL": "1610612753",
    "PHI": "1610612755", "PHX": "1610612756", "PHO": "1610612756", "POR": "1610612757",
    "SAC": "1610612758", "KCK": "1610612758", "SAS": "1610612759", "TOR": "1610612761",
    "UTA": "1610612762", "NOJ": "1610612762", "WAS": "1610612764", "WSB": "1610612764",
}


def fetch(url: str, filename: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    destination = CACHE / filename
    if destination.exists() and destination.stat().st_size > 100:
        return destination
    request = urllib.request.Request(url, headers={"User-Agent": "LanTuCareerDataBuilder/1.0"})
    temporary = destination.with_suffix(destination.suffix + ".part")
    with urllib.request.urlopen(request, timeout=180) as response, temporary.open("wb") as output:
        shutil.copyfileobj(response, output)
    temporary.replace(destination)
    return destination


def text_from(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def number(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    text = str(value).strip().replace("%", "")
    if not text or text.upper() in {"NULL", "NAN", "NONE"}:
        return default
    try:
        return float(text)
    except ValueError:
        return default


def integer(value: Any, default: int = 0) -> int:
    return int(round(number(value, default)))


def ratio(value: Any, default: float = 0.0) -> float:
    parsed = number(value, default)
    return parsed / 100 if parsed > 1 else parsed


def clamp(value: float, minimum: int = 25, maximum: int = 99) -> int:
    return max(minimum, min(maximum, int(round(value))))


def normalized_name(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value)
    ascii_name = "".join(character for character in decomposed if not unicodedata.combining(character))
    ascii_name = ascii_name.lower().replace("ё", "e")
    ascii_name = re.sub(r"\b(jr|sr|ii|iii|iv)\b", "", ascii_name)
    return re.sub(r"[^a-z0-9]", "", ascii_name)


def stable_id(name: str) -> str:
    return "archive-" + hashlib.sha1(normalized_name(name).encode("utf-8")).hexdigest()[:12]


def read_csv_url(
    url: str,
    filename: str,
    *,
    encoding: str = "utf-8-sig",
) -> Iterable[dict[str, str]]:
    with fetch(url, filename).open("r", encoding=encoding, newline="") as source:
        yield from csv.DictReader(source)


def extract_zip_member(zip_path: Path, member_name: str, destination: Path) -> Path:
    if destination.exists() and destination.stat().st_size > 100:
        return destination
    with zipfile.ZipFile(zip_path) as archive:
        # Use an exact basename match.  ``team_traditional.csv`` also ends with
        # ``traditional.csv`` and silently produces team rows without player ids.
        member = next(name for name in archive.namelist() if Path(name).name == member_name)
        with archive.open(member) as source, destination.open("wb") as output:
            shutil.copyfileobj(source, output)
    return destination


def load_nba_index() -> dict[int, dict[str, Any]]:
    source = text_from(fetch(NBA_INDEX_URL, "nba_api_data.py"))
    start = source.index("players = [") + len("players = ")
    end = source.index("\n]\n", start) + 2
    rows = ast.literal_eval(source[start:end])
    return {
        int(row[0]): {"nbaId": int(row[0]), "name": row[3], "active": bool(row[4])}
        for row in rows
    }


def load_crosswalk() -> tuple[dict[str, int], dict[str, int]]:
    by_bbref: dict[str, int] = {}
    by_name: dict[str, int] = {}
    # This community-maintained crosswalk is exported as Windows-1252.  Reading
    # it as UTF-8 corrupts accented player names and can abort a full sync.
    for row in read_csv_url(
        CROSSWALK_URL,
        "nba-player-crosswalk.csv",
        encoding="cp1252",
    ):
        nba_id = integer(row.get("NBAID"))
        if not nba_id:
            continue
        if row.get("BBRefID"):
            by_bbref[row["BBRefID"].strip()] = nba_id
        for key in ("BBRefName", "NBAName", "ESPNName"):
            if row.get(key):
                by_name[normalized_name(row[key])] = nba_id
    return by_bbref, by_name


def parse_positions(raw_value: str, stats: dict[str, float] | None = None, height: int = 0) -> list[str]:
    text = raw_value.upper().replace("POINT GUARD", "PG").replace("SHOOTING GUARD", "SG")
    text = text.replace("SMALL FORWARD", "SF").replace("POWER FORWARD", "PF").replace("CENTER", "C")
    positions = re.findall(r"PG|SG|SF|PF|C", text)
    if not positions:
        has_guard = "GUARD" in text or text.strip() == "G"
        has_forward = "FORWARD" in text or text.strip() == "F"
        has_center = "CENTER" in raw_value.upper() or text.strip() == "C"
        ast = (stats or {}).get("ast36", 0)
        reb = (stats or {}).get("reb36", 0)
        block = (stats or {}).get("blk36", 0)
        if has_center:
            positions = ["PF", "SF"] if has_forward and height and height <= 81 and reb < 10 and block < 1.7 else ["C", "PF"]
        elif has_forward and has_guard:
            if height >= 81 or reb >= 8.5 or block >= 1.4:
                positions = ["PF", "SF"]
            elif ast >= 6.2:
                positions = ["PG", "SG"]
            else:
                positions = ["SF", "SG"]
        elif reb >= 10 or block >= 1.7:
            positions = ["C", "PF"]
        elif has_guard and ast >= 5.5:
            positions = ["PG", "SG"]
        elif has_guard:
            positions = ["SG", "PG"]
        elif has_forward and reb >= 7:
            positions = ["PF", "SF"]
        elif has_forward:
            positions = ["SF", "PF"]
        elif ast >= 6:
            positions = ["PG", "SG"]
        elif reb >= 9:
            positions = ["C", "PF"]
        else:
            positions = ["SF", "SG"]
    unique: list[str] = []
    for position in positions:
        if position not in unique:
            unique.append(position)
    return unique[:2]


def load_career_database(by_name: dict[str, int]) -> tuple[dict[int | str, dict[str, Any]], dict[str, int | str]]:
    zip_path = fetch(CAREER_URL, "nba-player-careers.zip")
    csv_path = extract_zip_member(zip_path, "NBA_PLAYERS.csv", CACHE / "NBA_PLAYERS.csv")
    careers: dict[int | str, dict[str, Any]] = {}
    career_name_to_id: dict[str, int | str] = {}
    with csv_path.open("r", encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            name = row["Name"].strip()
            player_id: int | str = by_name.get(normalized_name(name), stable_id(name))
            height = integer(row.get("Height"))
            positions = parse_positions(row.get("Position", ""), height=height)
            career = {
                "name": name,
                "debut": integer(row.get("Debut")),
                "final": integer(row.get("Final")),
                "positions": positions,
                "height": height,
                "rawPosition": row.get("Position", ""),
                "weight": integer(row.get("Weight")),
                "birthDate": row.get("Birthday", ""),
                "hallOfFame": str(row.get("HOF", "")).lower() == "true",
                "active": str(row.get("Active", "")).lower() == "true",
                "games": integer(row.get("G")),
                "ppg": number(row.get("PTS")),
                "rpg": number(row.get("TRB")),
                "apg": number(row.get("AST")),
                "fgPct": ratio(row.get("FG%")),
                "threePct": ratio(row.get("FG3%")),
                "ftPct": ratio(row.get("FT%")),
                "per": number(row.get("PER"), 12),
                "winShares": number(row.get("WS")),
            }
            careers[player_id] = career
            career_name_to_id[normalized_name(name)] = player_id
    return careers, career_name_to_id


def fresh_aggregate(player_id: int, name: str, season: int) -> dict[str, Any]:
    return {
        "playerId": player_id,
        "name": name,
        "season": season,
        "games": 0,
        "minutes": 0.0,
        "pts": 0.0,
        "fgm": 0.0,
        "fga": 0.0,
        "threeM": 0.0,
        "threeA": 0.0,
        "ftm": 0.0,
        "fta": 0.0,
        "oreb": 0.0,
        "dreb": 0.0,
        "reb": 0.0,
        "ast": 0.0,
        "stl": 0.0,
        "blk": 0.0,
        "tov": 0.0,
        "plusMinus": 0.0,
        "teamMinutes": defaultdict(float),
        "lastTeam": None,
        "lastDate": "",
        "source": "traditional-boxscores",
        "confidence": 0.92,
    }


def aggregate_traditional() -> dict[tuple[int, int], dict[str, Any]]:
    zip_path = fetch(TRADITIONAL_URL, "nba-traditional-1997-2026.zip")
    csv_path = extract_zip_member(zip_path, "traditional.csv", CACHE / "traditional.csv")
    aggregates: dict[tuple[int, int], dict[str, Any]] = {}
    with csv_path.open("r", encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            if row.get("type") != "regular":
                continue
            player_id = integer(row.get("playerid"))
            season = integer(row.get("season"))
            minutes = number(row.get("MIN"))
            if not player_id or not season or minutes <= 0:
                continue
            key = (player_id, season)
            aggregate = aggregates.setdefault(key, fresh_aggregate(player_id, row.get("player", "Unknown"), season))
            aggregate["games"] += 1
            aggregate["minutes"] += minutes
            for target, source_key in (
                ("pts", "PTS"), ("fgm", "FGM"), ("fga", "FGA"), ("threeM", "3PM"), ("threeA", "3PA"),
                ("ftm", "FTM"), ("fta", "FTA"), ("oreb", "OREB"), ("dreb", "DREB"), ("reb", "REB"),
                ("ast", "AST"), ("stl", "STL"), ("blk", "BLK"), ("tov", "TOV"), ("plusMinus", "+/-"),
            ):
                aggregate[target] += number(row.get(source_key))
            team = row.get("team", "")
            aggregate["teamMinutes"][team] += minutes
            game_date = row.get("date", "")
            if game_date >= aggregate["lastDate"]:
                aggregate["lastDate"] = game_date
                aggregate["lastTeam"] = team
    return aggregates


def safe_per36(total: float, minutes: float) -> float:
    return total * 36 / minutes if minutes > 0 else 0


def finalize_traditional(aggregate: dict[str, Any], career: dict[str, Any] | None) -> dict[str, Any]:
    minutes = aggregate["minutes"]
    fga = aggregate["fga"]
    fta = aggregate["fta"]
    two_attempts = max(0, fga - aggregate["threeA"])
    two_made = max(0, aggregate["fgm"] - aggregate["threeM"])
    season = aggregate["season"]
    debut = (career or {}).get("debut", season)
    estimated_age = max(19, min(43, 20 + season - debut))
    stats = {
        "p36": safe_per36(aggregate["pts"], minutes),
        "ast36": safe_per36(aggregate["ast"], minutes),
        "reb36": safe_per36(aggregate["reb"], minutes),
        "oreb36": safe_per36(aggregate["oreb"], minutes),
        "dreb36": safe_per36(aggregate["dreb"], minutes),
        "stl36": safe_per36(aggregate["stl"], minutes),
        "blk36": safe_per36(aggregate["blk"], minutes),
        "tov36": safe_per36(aggregate["tov"], minutes),
        "usage": safe_per36(fga + 0.44 * fta + aggregate["tov"], minutes),
        "ts": aggregate["pts"] / (2 * (fga + 0.44 * fta)) if fga + fta else 0.45,
        "twoPct": two_made / two_attempts if two_attempts else 0.45,
        "threePct": aggregate["threeM"] / aggregate["threeA"] if aggregate["threeA"] else 0.25,
        "threeRate": aggregate["threeA"] / fga if fga else 0,
        "ftPct": aggregate["ftm"] / fta if fta else 0.68,
        "ftRate": fta / fga if fga else 0,
        "plusMinus36": safe_per36(aggregate["plusMinus"], minutes),
        "offImpact": safe_per36(aggregate["pts"] + aggregate["ast"] * 1.5 - aggregate["tov"] * 1.4, minutes),
        "defImpact": safe_per36(aggregate["stl"] * 2 + aggregate["blk"] * 1.7 + aggregate["dreb"] * 0.25, minutes),
    }
    positions = parse_positions((career or {}).get("rawPosition", ""), stats, (career or {}).get("height", 0)) if career else parse_positions("", stats)
    return {
        **aggregate,
        "teamId": TEAM_ABBR_TO_ID.get(aggregate["lastTeam"] or ""),
        "positions": positions,
        "age": estimated_age,
        "statsModel": stats,
        "teamMinutes": dict(aggregate["teamMinutes"]),
    }


def load_raptor_cards(by_bbref: dict[str, int], careers: dict[int | str, dict[str, Any]]) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for row in read_csv_url(RAPTOR_URL, "nba-raptor-1977-2020.csv"):
        season = integer(row.get("year_id"))
        if not season or season >= 1997 or row.get("type") != "RS":
            continue
        bbref_id = row.get("player_id", "")
        player_id: int | str = by_bbref.get(bbref_id, "bbref-" + bbref_id)
        minutes = number(row.get("Min"))
        games = integer(row.get("G"))
        if minutes <= 0 or games <= 0:
            continue
        career = careers.get(player_id, {})
        name = row.get("name_common", "Unknown")
        stats = {
            "p36": number(row.get("P/36"), max(5, number(row.get("USG%")) * 0.7)),
            "ast36": number(row.get("A/36"), number(row.get("AST%")) * 0.15),
            "reb36": number(row.get("R/36"), number(row.get("TRB%")) * 0.45),
            "oreb36": number(row.get("ORB%")) * 0.13,
            "dreb36": number(row.get("DRB%")) * 0.28,
            "stl36": number(row.get("STL%")) * 0.55,
            "blk36": number(row.get("BLK%")) * 0.45,
            "tov36": number(row.get("TO/36"), number(row.get("TOV%")) * 0.15),
            "usage": number(row.get("USG%")) * 0.75,
            "ts": ratio(row.get("TS%"), 0.5),
            "twoPct": ratio(row.get("2P%"), 0.46),
            "threePct": ratio(row.get("3P%"), 0.28),
            "threeRate": ratio(row.get("3PAr"), 0.12),
            "ftPct": ratio(row.get("FT%"), 0.7),
            "ftRate": ratio(row.get("FTAr"), 0.2),
            "plusMinus36": number(row.get("Raptor+/-")),
            "offImpact": number(row.get("Raptor O")),
            "defImpact": number(row.get("Raptor D")),
        }
        positions = parse_positions(row.get("pos", ""), stats) or career.get("positions", ["SF"])
        cards.append({
            "playerId": player_id,
            "name": name,
            "season": season,
            "games": games,
            "minutes": minutes,
            "teamId": TEAM_ABBR_TO_ID.get(row.get("team_id", "")),
            "positions": positions,
            "age": integer(row.get("age"), max(19, 20 + season - career.get("debut", season))),
            "statsModel": stats,
            "source": "historical-advanced",
            "confidence": 0.78,
        })
    return cards


def career_cards(careers: dict[int | str, dict[str, Any]]) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for player_id, career in careers.items():
        games = career["games"]
        if games <= 0:
            continue
        position = career["positions"][0] if career["positions"] else "SF"
        assumed_minutes = 31 if career["ppg"] >= 10 else 23
        stats = {
            "p36": career["ppg"] * 36 / assumed_minutes,
            "ast36": career["apg"] * 36 / assumed_minutes,
            "reb36": career["rpg"] * 36 / assumed_minutes,
            "oreb36": career["rpg"] * (0.35 if position in {"PF", "C"} else 0.18) * 36 / assumed_minutes,
            "dreb36": career["rpg"] * (0.65 if position in {"PF", "C"} else 0.82) * 36 / assumed_minutes,
            "stl36": 0.7 if position in {"PG", "SG", "SF"} else 0.45,
            "blk36": 1.1 if position == "C" else 0.55 if position == "PF" else 0.25,
            "tov36": max(1.1, 2.8 - career["apg"] * 0.12),
            "usage": max(10, career["ppg"] * 0.9 + career["apg"] * 0.5),
            "ts": max(0.4, career["fgPct"] + 0.045),
            "twoPct": max(0.4, career["fgPct"]),
            "threePct": career["threePct"] or 0.2,
            "threeRate": 0.02 if career["debut"] < 1980 else 0.15,
            "ftPct": career["ftPct"] or 0.65,
            "ftRate": 0.25,
            "plusMinus36": (career["per"] - 15) * 0.3,
            "offImpact": (career["per"] - 15) * 0.35,
            "defImpact": (career["per"] - 15) * 0.12 + career["rpg"] * 0.05,
        }
        cards.append({
            "playerId": player_id,
            "name": career["name"],
            "season": "career",
            "games": games,
            "minutes": games * assumed_minutes,
            "teamId": None,
            "positions": career["positions"] or parse_positions(position, stats),
            "age": 27,
            "statsModel": stats,
            "source": "career-summary",
            "confidence": 0.58 if career["debut"] < 1977 else 0.66,
        })
    return cards


def metric_values(card: dict[str, Any]) -> dict[str, float]:
    stats = card["statsModel"]
    primary = card["positions"][0]
    big = 1 if primary in {"PF", "C"} else 0
    guard = 1 if primary in {"PG", "SG"} else 0
    return {
        "inside": stats["twoPct"] * 12 + stats["p36"] * 0.12 + stats["ftRate"] * 2,
        "finishing": stats["twoPct"] * 10 + stats["ftRate"] * 3 + stats["p36"] * 0.1,
        "shooting": stats["threePct"] * 7 + stats["threeRate"] * 3 + stats["ts"] * 2,
        "freeThrow": stats["ftPct"],
        "stability": stats["ts"] * 7 + math.log1p(card["minutes"]) * 0.2,
        "passing": stats["ast36"] - stats["tov36"] * 0.55,
        "vision": stats["ast36"],
        "handle": stats["usage"] * 0.18 + stats["ast36"] * 0.45 - stats["tov36"] * 0.5,
        "interior": stats["blk36"] * 1.6 + stats["dreb36"] * 0.18 + stats["defImpact"] * 0.3 + big,
        "perimeter": stats["stl36"] * 1.5 + stats["defImpact"] * 0.4 + guard * 0.35,
        "steal": stats["stl36"],
        "block": stats["blk36"],
        "help": stats["defImpact"] + stats["stl36"] * 0.5 + stats["blk36"] * 0.5,
        "oreb": stats["oreb36"],
        "dreb": stats["dreb36"],
        "rebound": stats["reb36"],
        "athletic": stats["p36"] * 0.15 + stats["stl36"] + stats["blk36"] + stats["ftRate"] * 2,
        "strength": stats["reb36"] * 0.35 + big,
        "stamina": card["minutes"] / max(1, card["games"]),
        "durability": card["games"],
        "impact": stats["offImpact"] + stats["defImpact"] + stats["plusMinus36"] * 0.15,
        "production": stats["p36"] + stats["ast36"] * 1.4 + stats["reb36"] * 0.6 + stats["stl36"] * 1.8 + stats["blk36"] * 1.8,
        "offImpact": stats["offImpact"],
        "defImpact": stats["defImpact"],
    }


def percentile_tables(cards: list[dict[str, Any]]) -> dict[str, dict[str, list[float]]]:
    tables: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for card in cards:
        group = str(card["season"])
        if card["minutes"] < 80:
            continue
        for metric, value in metric_values(card).items():
            tables[group][metric].append(value)
    for metrics in tables.values():
        for values in metrics.values():
            values.sort()
    return tables


def percentile(tables: dict[str, dict[str, list[float]]], group: str, metric: str, value: float) -> float:
    values = tables.get(group, {}).get(metric, [])
    if not values:
        return 0.5
    return bisect.bisect_right(values, value) / len(values)


def badge_level(value: float) -> int:
    return 4 if value >= 96 else 3 if value >= 91 else 2 if value >= 86 else 1 if value >= 80 else 0


def calculate_overall(attributes: dict[str, int], position: str, impact_rating: int, production_rating: int) -> int:
    if position == "PG":
        keys = ["ballHandle", "passAccuracy", "vision", "speedWithBall", "threePoint", "perimeterDefense"]
    elif position == "C":
        keys = ["interiorDefense", "block", "defensiveRebound", "closeShot", "strength", "postControl"]
    elif position == "PF":
        keys = ["layup", "drivingDunk", "postControl", "interiorDefense", "defensiveRebound", "strength", "helpDefense"]
    else:
        keys = ["layup", "threePoint", "midRange", "perimeterDefense", "speed", "helpDefense"]
    skill = sum(attributes[key] for key in keys) / len(keys)
    star_boost = 2 if production_rating >= 95 else 1 if production_rating >= 90 else 0
    return clamp(skill * 0.45 + impact_rating * 0.25 + production_rating * 0.3 + star_boost, 45, 99)


def archetype_for(attributes: dict[str, int], positions: list[str]) -> str:
    groups = {
        "finishing": sum(attributes[key] for key in ("closeShot", "layup", "drivingDunk", "standingDunk", "postControl")) / 5,
        "shooting": sum(attributes[key] for key in ("midRange", "threePoint", "freeThrow", "shotStability")) / 4,
        "playmaking": sum(attributes[key] for key in ("passAccuracy", "vision", "ballHandle", "speedWithBall")) / 4,
        "defense": sum(attributes[key] for key in ("interiorDefense", "perimeterDefense", "steal", "block", "helpDefense")) / 5,
    }
    primary = positions[0]
    strongest = max(groups, key=groups.get)
    if primary == "C":
        return "playmakingBig" if groups["playmaking"] >= 80 else "stretchBig" if groups["shooting"] >= 80 else "rimProtector" if groups["defense"] >= groups["finishing"] else "postScorer"
    if strongest == "playmaking":
        return "floorGeneral"
    if strongest == "shooting":
        return "sharpshooter" if primary in {"PG", "SG"} else "wingScorer"
    if strongest == "defense":
        return "twoWayGuard" if primary in {"PG", "SG"} else "twoWayWing"
    return "athleticWing" if attributes["vertical"] >= 82 else "allAround"


def enrich_card(card: dict[str, Any], tables: dict[str, dict[str, list[float]]]) -> dict[str, Any]:
    metrics = metric_values(card)
    group = str(card["season"])
    reliability = 0.3 + 0.7 * min(1, card["minutes"] / 1200)

    def rating(metric: str, modifier: float = 0) -> int:
        raw = 50 + percentile(tables, group, metric, metrics[metric]) * 47
        return clamp(70 + (raw - 70) * reliability + modifier)

    primary = card["positions"][0]
    big = primary in {"PF", "C"}
    guard = primary in {"PG", "SG"}
    inside = rating("inside")
    finishing = rating("finishing")
    shooting = rating("shooting")
    passing = rating("passing")
    athletic = rating("athletic")
    rebound = rating("rebound")
    impact = rating("impact")
    production = rating("production")
    attributes = {
        "closeShot": inside,
        "layup": finishing,
        "drivingDunk": clamp(finishing * 0.72 + athletic * 0.28 + (-5 if primary == "PG" else 2)),
        "standingDunk": clamp(finishing * 0.58 + rebound * 0.3 + (9 if big else -14)),
        "postControl": clamp(inside * 0.58 + rebound * 0.25 + (8 if big else -7)),
        "midRange": clamp(shooting * 0.7 + inside * 0.3),
        "threePoint": shooting,
        "freeThrow": rating("freeThrow"),
        "shotStability": rating("stability"),
        "passAccuracy": passing,
        "vision": rating("vision"),
        "ballHandle": rating("handle", 3 if guard else -5 if big else 0),
        "speedWithBall": clamp(rating("handle") * 0.62 + athletic * 0.38 + (4 if guard else -5 if big else 0)),
        "interiorDefense": rating("interior", 4 if big else -4),
        "perimeterDefense": rating("perimeter", 3 if guard else -4 if primary == "C" else 0),
        "steal": rating("steal"),
        "block": rating("block", 5 if big else -5),
        "helpDefense": rating("help"),
        "offensiveRebound": rating("oreb", 4 if big else -3),
        "defensiveRebound": rating("dreb", 4 if big else -2),
        "speed": clamp(athletic + (5 if guard else -5 if primary == "C" else 0)),
        "acceleration": clamp(athletic + (6 if guard else -6 if primary == "C" else 0)),
        "strength": clamp(rating("strength") + (6 if big else -2 if guard else 1)),
        "vertical": clamp(athletic * 0.72 + rating("block") * 0.28),
        "stamina": rating("stamina"),
        "durability": rating("durability"),
        "clutch": clamp(impact * 0.58 + rating("stability") * 0.42),
        "leadership": clamp(impact * 0.55 + min(92, 58 + max(0, card["age"] - 22) * 1.4) * 0.45),
    }
    overall = calculate_overall(attributes, primary, impact, production)
    signature = sorted(ATTRIBUTE_KEYS, key=lambda key: attributes[key], reverse=True)[:3]
    badge_inputs = {
        "iron-finish": (attributes["layup"] + attributes["drivingDunk"]) / 2,
        "air-adjust": (attributes["layup"] + attributes["vertical"]) / 2,
        "deep-threat": attributes["threePoint"],
        "pressure-shot": (attributes["shotStability"] + attributes["clutch"]) / 2,
        "first-step": (attributes["acceleration"] + attributes["ballHandle"]) / 2,
        "surgeon-pass": (attributes["passAccuracy"] + attributes["vision"]) / 2,
        "chain-lock": attributes["perimeterDefense"],
        "help-instinct": (attributes["helpDefense"] + attributes["interiorDefense"]) / 2,
        "clutch": attributes["clutch"],
        "locker-glue": attributes["leadership"],
    }
    badges = {badge_id: badge_level(value) for badge_id, value in badge_inputs.items() if badge_level(value) > 0}
    age = card["age"]
    potential = clamp(overall + (8 if age <= 21 else 5 if age <= 24 else 2 if age <= 27 else 0), overall, 99)
    stats = card["statsModel"]
    games = max(1, card["games"])
    mpg = card["minutes"] / games
    return {
        "id": f"nba-{card['playerId']}" if isinstance(card["playerId"], int) else str(card["playerId"]),
        "nbaId": card["playerId"] if isinstance(card["playerId"], int) else None,
        "name": card["name"],
        "season": str(card["season"]),
        "teamId": card.get("teamId"),
        "positions": card["positions"],
        "age": age,
        "archetype": archetype_for(attributes, card["positions"]),
        "overall": overall,
        "potential": potential,
        "attributes": attributes,
        "signature": signature,
        "badges": badges,
        "stats": {
            "games": card["games"],
            "minutes": round(card["minutes"]),
            "mpg": round(mpg, 1),
            "ppg": round(stats["p36"] * mpg / 36, 1),
            "rpg": round(stats["reb36"] * mpg / 36, 1),
            "apg": round(stats["ast36"] * mpg / 36, 1),
            "spg": round(stats["stl36"] * mpg / 36, 1),
            "bpg": round(stats["blk36"] * mpg / 36, 1),
            "tsPct": round(stats["ts"] * 100, 1),
        },
        "dataConfidence": card["confidence"],
        "source": card["source"],
    }


def write_json(path: Path, payload: Any, pretty: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as output:
        json.dump(payload, output, ensure_ascii=False, indent=2 if pretty else None, separators=None if pretty else (",", ":"))
    os.replace(temporary, path)


def main() -> None:
    print("Loading player identities and source snapshots...")
    nba_index = load_nba_index()
    by_bbref, by_name = load_crosswalk()
    careers, career_name_to_id = load_career_database(by_name)
    by_name.update({key: value for key, value in career_name_to_id.items() if isinstance(value, int)})

    print("Aggregating regular-season box scores (1996-97 through 2025-26)...")
    aggregates = aggregate_traditional()
    traditional_cards: list[dict[str, Any]] = []
    for aggregate in aggregates.values():
        player_id = aggregate["playerId"]
        career = careers.get(player_id)
        traditional_cards.append(finalize_traditional(aggregate, career))

    print("Building historical season cards and career fallbacks...")
    historical_cards = load_raptor_cards(by_bbref, careers)
    fallbacks = career_cards(careers)
    all_cards = historical_cards + traditional_cards + fallbacks
    tables = percentile_tables(all_cards)
    enriched = [enrich_card(card, tables) for card in all_cards]

    identity_by_id: dict[str, dict[str, Any]] = {}
    for nba_id, player in nba_index.items():
        career = careers.get(nba_id, {})
        identity_by_id[f"nba-{nba_id}"] = {
            "id": f"nba-{nba_id}", "nbaId": nba_id, "name": player["name"], "active": player["active"],
            "debut": career.get("debut"), "final": career.get("final"), "positions": career.get("positions", ["SF"]),
            "height": career.get("height"), "weight": career.get("weight"), "birthDate": career.get("birthDate"),
            "hallOfFame": career.get("hallOfFame", False),
        }
    for player_id, career in careers.items():
        identifier = f"nba-{player_id}" if isinstance(player_id, int) else str(player_id)
        identity_by_id.setdefault(identifier, {
            "id": identifier, "nbaId": player_id if isinstance(player_id, int) else None, "name": career["name"],
            "active": career["active"], "debut": career["debut"], "final": career["final"],
            "positions": career["positions"], "height": career["height"], "weight": career["weight"],
            "birthDate": career["birthDate"], "hallOfFame": career["hallOfFame"],
        })

    cards_by_id: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for card in enriched:
        cards_by_id[card["id"]].append(card)

    player_index: list[dict[str, Any]] = []
    for identifier, identity in identity_by_id.items():
        cards = cards_by_id.get(identifier, [])
        peak = max(cards, key=lambda card: (card["overall"], card["stats"]["minutes"]), default=None)
        latest = max((card for card in cards if card["season"].isdigit()), key=lambda card: int(card["season"]), default=peak)
        player_index.append({
            **identity,
            "peakOverall": peak["overall"] if peak else 60,
            "peakSeason": peak["season"] if peak else "archive",
            "latestOverall": latest["overall"] if latest else 60,
            "latestSeason": latest["season"] if latest else "archive",
            "teamId": latest.get("teamId") if latest else None,
            "dataConfidence": peak["dataConfidence"] if peak else 0.1,
        })

    current_candidates: dict[str, dict[str, Any]] = {}
    for identifier, cards in cards_by_id.items():
        season_cards = [card for card in cards if card["season"].isdigit()]
        if not season_cards:
            continue
        latest = max(season_cards, key=lambda card: int(card["season"]))
        identity = identity_by_id.get(identifier)
        if latest["season"] == str(RATING_SEASON) or (identity and identity["active"]):
            current_candidates[identifier] = {
                **latest,
                "name": identity["name"] if identity else latest["name"],
                "active": bool(identity and identity["active"]),
            }

    current_players = sorted(current_candidates.values(), key=lambda player: (-player["overall"], player["name"]))
    history_shards: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for card in enriched:
        if card["season"] == "career":
            history_shards["career"].append(card)
        elif card["season"].isdigit():
            decade = f"{int(card['season']) // 10 * 10}s"
            history_shards[decade].append(card)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    current_payload = {"version": DATA_VERSION, "players": current_players}
    write_json(OUTPUT / "current-players.json", current_payload)
    # The active roster is bundled for deterministic, synchronous save creation.
    # Historical shards remain public and are loaded lazily by archive screens.
    write_json(BUNDLE_OUTPUT, current_payload)
    write_json(OUTPUT / "player-index.json", {"version": DATA_VERSION, "players": sorted(player_index, key=lambda player: player["name"])})
    for shard, cards in history_shards.items():
        write_json(OUTPUT / f"history-{shard}.json", {"version": DATA_VERSION, "cards": cards})
    metadata = {
        "version": DATA_VERSION,
        "generatedAt": date.today().isoformat(),
        "ratingSeason": "2025-26",
        "rosterBasis": "players active in the 2025-26 box-score snapshot plus the active NBA index",
        "counts": {
            "identities": len(player_index),
            "currentPlayers": len(current_players),
            "seasonCards": len(enriched),
            "teamsWithCurrentPlayers": len({player["teamId"] for player in current_players if player["teamId"]}),
        },
        "shards": {name: len(cards) for name, cards in sorted(history_shards.items())},
        "sources": [NBA_INDEX_URL, CROSSWALK_URL, RAPTOR_URL, TRADITIONAL_URL, CAREER_URL],
    }
    write_json(OUTPUT / "metadata.json", metadata, pretty=True)
    print(json.dumps(metadata["counts"], ensure_ascii=False))


if __name__ == "__main__":
    main()
