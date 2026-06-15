from __future__ import annotations

import csv
import io
import json
import math
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
CACHE_DIR = SCRIPT_DIR / ".cache"
OUT_DIR = (
    SCRIPT_DIR.parent.parent
    / "apps"
    / "web"
    / "games"
    / "subway-game"
    / "public"
    / "data"
)

USER_AGENT = "Mozilla/5.0 (compatible; subway-game-data-pipeline)"

GTFS_URL = "https://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip"

BOROUGHS_URL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1/query"
BOROUGHS_PARAMS = {
    "where": "STATE='36' AND COUNTY IN ('005','047','061','081','085')",
    "outFields": "STATE,COUNTY,NAME,BASENAME",
    "f": "geojson",
}

EXPRESS_VARIANTS = {"FX", "6X", "7X"}

BASENAME_TO_BOROUGH = {
    "Kings": "Brooklyn",
    "New York": "Manhattan",
    "Richmond": "Staten Island",
    "Queens": "Queens",
    "Bronx": "Bronx",
}

VIEWBOX_WIDTH = 1000.0
MIN_STEP = 12.0
ANCHOR_EVERY = 4
ANCHOR_WEIGHT = 0.35
SNAP_WARN_DEGREES = 20.0
DECIMATE_STEP = 10
DP_EPSILON = 2.0


def _download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req) as resp:
        return resp.read()


def fetch_gtfs() -> Path:
    extract_dir = CACHE_DIR / "gtfs_subway"
    if extract_dir.exists():
        return extract_dir
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    print("Downloading MTA GTFS subway feed...")
    data = _download(GTFS_URL)
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        zf.extractall(extract_dir)
    return extract_dir


def fetch_boroughs_geojson() -> dict:
    cache_file = CACHE_DIR / "boroughs.geojson"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    print("Downloading NYC borough boundaries...")
    url = f"{BOROUGHS_URL}?{urllib.parse.urlencode(BOROUGHS_PARAMS)}"
    data = _download(url)
    cache_file.write_bytes(data)
    return json.loads(data)


# --- GTFS parsing ------------------------------------------------------


def load_stations(gtfs_dir: Path) -> tuple[dict[str, dict], dict[str, str]]:
    stations: dict[str, dict] = {}
    parent_of: dict[str, str] = {}
    with open(gtfs_dir / "stops.txt") as f:
        for row in csv.DictReader(f):
            if row["location_type"] == "1":
                stations[row["stop_id"]] = {
                    "name": row["stop_name"],
                    "lat": float(row["stop_lat"]),
                    "lon": float(row["stop_lon"]),
                }
            if row["parent_station"]:
                parent_of[row["stop_id"]] = row["parent_station"]
    return stations, parent_of


def load_routes(gtfs_dir: Path) -> list[dict]:
    routes = []
    with open(gtfs_dir / "routes.txt") as f:
        for row in csv.DictReader(f):
            if row["route_type"] != "1":
                continue
            if row["route_id"] in EXPRESS_VARIANTS:
                continue
            routes.append(
                {
                    "id": row["route_id"],
                    "name": row["route_long_name"],
                    "color": "#" + row["route_color"],
                }
            )
    return routes


def load_trip_to_route(gtfs_dir: Path, route_ids: set[str]) -> dict[str, str]:
    trip_to_route: dict[str, str] = {}
    with open(gtfs_dir / "trips.txt") as f:
        for row in csv.DictReader(f):
            if row["route_id"] in route_ids:
                trip_to_route[row["trip_id"]] = row["route_id"]
    return trip_to_route


def load_trip_stops(
    gtfs_dir: Path, trip_to_route: dict[str, str]
) -> dict[str, list[tuple[int, str]]]:
    trip_stops: dict[str, list[tuple[int, str]]] = {}
    with open(gtfs_dir / "stop_times.txt") as f:
        for row in csv.DictReader(f):
            tid = row["trip_id"]
            if tid in trip_to_route:
                trip_stops.setdefault(tid, []).append(
                    (int(row["stop_sequence"]), row["stop_id"])
                )
    return trip_stops


def dominant_sequence(
    route_id: str,
    trip_to_route: dict[str, str],
    trip_stops: dict[str, list[tuple[int, str]]],
    parent_of: dict[str, str],
) -> list[str]:
    best: list[str] = []
    for tid, route in trip_to_route.items():
        if route != route_id:
            continue
        stops = sorted(trip_stops.get(tid, []))
        seq: list[str] = []
        for _, sid in stops:
            pid = parent_of.get(sid, sid)
            if not seq or seq[-1] != pid:
                seq.append(pid)
        if len(seq) > len(best):
            best = seq
    return best


# --- projection ----------------------------------------------------------


def borough_bbox(geojson: dict) -> tuple[float, float, float, float]:
    lons: list[float] = []
    lats: list[float] = []
    for feat in geojson["features"]:
        geom = feat["geometry"]
        polys = (
            [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        )
        for poly in polys:
            for ring in poly:
                for lon, lat in ring:
                    lons.append(lon)
                    lats.append(lat)
    return min(lons), max(lons), min(lats), max(lats)


class Projection:
    def __init__(self, lon_min: float, lon_max: float, lat_min: float, lat_max: float):
        self.lon_min = lon_min
        self.lon_max = lon_max
        self.lat_max = lat_max
        lat0 = (lat_min + lat_max) / 2
        self.cos_lat0 = math.cos(math.radians(lat0))
        self.scale = VIEWBOX_WIDTH / (lon_max - lon_min)
        self.height = (lat_max - lat_min) * self.scale / self.cos_lat0

    def project(self, lat: float, lon: float) -> tuple[float, float]:
        x = (lon - self.lon_min) * self.scale
        y = (self.lat_max - lat) * self.scale / self.cos_lat0
        return x, y

    @property
    def view_box(self) -> str:
        return f"0 0 {VIEWBOX_WIDTH:.1f} {self.height:.1f}"


# --- schematic layout ------------------------------------------------------


def snap_to_octant(dx: float, dy: float) -> tuple[float, float, float, float]:
    angle = math.degrees(math.atan2(dy, dx))
    snapped = round(angle / 45) * 45
    rad = math.radians(snapped)
    return math.cos(rad), math.sin(rad), angle, float(snapped)


def schematic_layout(
    raw_points: list[tuple[float, float]]
) -> tuple[list[tuple[float, float]], list[float]]:
    schem = [raw_points[0]]
    deviations: list[float] = []
    for i in range(1, len(raw_points)):
        dx = raw_points[i][0] - raw_points[i - 1][0]
        dy = raw_points[i][1] - raw_points[i - 1][1]
        dist = max(math.hypot(dx, dy), MIN_STEP)
        ux, uy, angle, snapped = snap_to_octant(dx, dy)
        deviations.append(abs(angle - snapped))
        nx = schem[i - 1][0] + ux * dist
        ny = schem[i - 1][1] + uy * dist
        if i % ANCHOR_EVERY == 0:
            nx = nx * (1 - ANCHOR_WEIGHT) + raw_points[i][0] * ANCHOR_WEIGHT
            ny = ny * (1 - ANCHOR_WEIGHT) + raw_points[i][1] * ANCHOR_WEIGHT
        schem.append((nx, ny))
    return schem, deviations


# --- borough polygons -------------------------------------------------


def point_in_ring(x: float, y: float, ring: list[tuple[float, float]]) -> bool:
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            x_intersect = x1 + (y - y1) / (y2 - y1) * (x2 - x1)
            if x < x_intersect:
                inside = not inside
    return inside


def perp_dist(
    pt: tuple[float, float], a: tuple[float, float], b: tuple[float, float]
) -> float:
    x, y = pt
    x1, y1 = a
    x2, y2 = b
    if (x1, y1) == (x2, y2):
        return math.hypot(x - x1, y - y1)
    num = abs((x2 - x1) * (y - y1) - (x1 - x) * (y2 - y1))
    den = math.hypot(x2 - x1, y2 - y1)
    return num / den


def douglas_peucker(
    points: list[tuple[float, float]], epsilon: float
) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points
    dmax, index = 0.0, 0
    end = len(points) - 1
    for i in range(1, end):
        d = perp_dist(points[i], points[0], points[end])
        if d > dmax:
            index = i
            dmax = d
    if dmax > epsilon:
        left = douglas_peucker(points[: index + 1], epsilon)
        right = douglas_peucker(points[index:], epsilon)
        return left[:-1] + right
    return [points[0], points[end]]


def simplify_ring(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    decimated = points[::DECIMATE_STEP]
    if decimated[-1] != decimated[0]:
        decimated.append(decimated[0])
    return douglas_peucker(decimated, DP_EPSILON)


def ring_to_path(points: list[tuple[float, float]]) -> str:
    parts = [f"M {points[0][0]:.1f} {points[0][1]:.1f}"]
    for x, y in points[1:]:
        parts.append(f"L {x:.1f} {y:.1f}")
    parts.append("Z")
    return " ".join(parts)


# --- main ----------------------------------------------------------------


def main() -> None:
    gtfs_dir = fetch_gtfs()
    boroughs_geojson = fetch_boroughs_geojson()

    lon_min, lon_max, lat_min, lat_max = borough_bbox(boroughs_geojson)
    proj = Projection(lon_min, lon_max, lat_min, lat_max)

    stations, parent_of = load_stations(gtfs_dir)
    routes = load_routes(gtfs_dir)
    route_ids = {r["id"] for r in routes}

    trip_to_route = load_trip_to_route(gtfs_dir, route_ids)
    trip_stops = load_trip_stops(gtfs_dir, trip_to_route)

    borough_rings: dict[str, list[list[tuple[float, float]]]] = {}
    borough_paths: list[dict] = []
    for feat in boroughs_geojson["features"]:
        name = BASENAME_TO_BOROUGH[feat["properties"]["BASENAME"]]
        geom = feat["geometry"]
        polys = (
            [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        )
        rings: list[list[tuple[float, float]]] = []
        for poly in polys:
            ring = [proj.project(lat, lon) for lon, lat in poly[0]]
            rings.append(ring)
        borough_rings.setdefault(name, []).extend(rings)
        for ring in rings:
            borough_paths.append({"name": name, "path": ring_to_path(simplify_ring(ring))})

    def borough_for(x: float, y: float) -> str:
        for name, rings in borough_rings.items():
            if any(point_in_ring(x, y, ring) for ring in rings):
                return name
        return "Unknown"

    (OUT_DIR / "lines").mkdir(parents=True, exist_ok=True)

    lines_index = []
    for route in routes:
        seq = dominant_sequence(route["id"], trip_to_route, trip_stops, parent_of)
        if not seq:
            print(f"WARNING: no trips found for route {route['id']}, skipping")
            continue

        raw_points = [proj.project(stations[sid]["lat"], stations[sid]["lon"]) for sid in seq]
        schem_points, deviations = schematic_layout(raw_points)

        line_stations = []
        for sid, (rx, ry), (sx, sy) in zip(seq, raw_points, schem_points):
            line_stations.append(
                {
                    "id": sid,
                    "name": stations[sid]["name"],
                    "x": round(sx, 1),
                    "y": round(sy, 1),
                    "borough": borough_for(rx, ry),
                }
            )

        line_data = {
            "id": route["id"],
            "name": route["name"],
            "color": route["color"],
            "stations": line_stations,
        }
        with open(OUT_DIR / "lines" / f"{route['id']}.json", "w") as f:
            json.dump(line_data, f, indent=2)

        lines_index.append(
            {
                "id": route["id"],
                "name": route["name"],
                "color": route["color"],
                "stationCount": len(line_stations),
            }
        )

        big_devs = sum(1 for d in deviations if d > SNAP_WARN_DEGREES)
        flag = f" -- {big_devs} segment(s) deviate >{SNAP_WARN_DEGREES:.0f} deg" if big_devs else ""
        print(f"{route['id']:>3s}  {route['name']:<40s} {len(line_stations):3d} stations{flag}")

    with open(OUT_DIR / "lines.json", "w") as f:
        json.dump(lines_index, f, indent=2)

    with open(OUT_DIR / "boroughs.json", "w") as f:
        json.dump({"viewBox": proj.view_box, "boroughs": borough_paths}, f, indent=2)

    print(f"\nWrote {len(lines_index)} lines to {OUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
