export type CameraTuple = [number, number, number, number, number];
export type TabId = "search" | "bookmarks" | "routes" | "display" | null;
export type Level = "galaxy" | "system" | "object";

export type MapUrl = {
  location: string;
  system: string;
  camera: CameraTuple;
  tab: TabId;
  view: "3d" | "2d";
};

const DEFAULT_CAM: CameraTuple = [10, 102.98, 0.002, 0, 0];

export function parseCamera(raw: string | null): CameraTuple {
  if (!raw) return [...DEFAULT_CAM];
  const n = raw.split(",").map((x) => Number(x.trim()));
  if (n.length < 3 || n.some((v) => !Number.isFinite(v))) return [...DEFAULT_CAM];
  return [n[0], n[1], n[2], n[3] || 0, n[4] || 0];
}

export function formatCamera(c: CameraTuple) {
  const trim = (v: number, d: number) => {
    const s = v.toFixed(d);
    return s.replace(/\.?0+$/, "") || "0";
  };
  return `${trim(c[0], 2)},${trim(c[1], 2)},${trim(c[2], 6)},${trim(c[3], 8)},${trim(c[4], 8)}`;
}

export function readMapUrl(): MapUrl {
  const q = new URLSearchParams(window.location.search);
  const location = (q.get("location") || "GOSS").toUpperCase();
  const system = (q.get("system") || location.split(".")[0] || "GOSS").toUpperCase();
  const tabRaw = q.get("tab");
  const tab = (["search", "bookmarks", "routes", "display"] as const).includes(tabRaw as "search")
    ? (tabRaw as Exclude<TabId, null>)
    : null;
  const view = q.get("view") === "2d" ? "2d" : "3d";
  return { location, system, camera: parseCamera(q.get("camera")), tab, view };
}

export function sameCamera(a: CameraTuple, b: CameraTuple) {
  return formatCamera(a) === formatCamera(b);
}

export function writeMapUrl(next: MapUrl) {
  const q = new URLSearchParams();
  q.set("location", next.location);
  if (next.system && next.system !== next.location) q.set("system", next.system);
  q.set("camera", formatCamera(next.camera));
  if (next.tab) q.set("tab", next.tab);
  if (next.view === "2d") q.set("view", "2d");
  const url = `${window.location.pathname}?${q.toString()}`;
  try {
    window.history.replaceState(null, "", url);
  } catch {
    /* ignore quota / security errors in embedded previews */
  }
}

/** Official camera=a,b,c,d,e → orbit pose. c is zoom (0.002 system, >0.05 galaxy). */
export function cameraToPose(c: CameraTuple, mode: Level) {
  const dist =
    mode === "galaxy" ? Math.max(10, (c[2] || 0.06) * 280) : Math.max(1.2, (c[2] || 0.002) * 4200);
  const az = (c[1] * Math.PI) / 180;
  const el = ((c[0] - 90) * Math.PI) / 180;
  const target = { x: c[3] * 12000, y: 0, z: c[4] * 12000 };
  return {
    target,
    position: {
      x: target.x + dist * Math.cos(el) * Math.sin(az),
      y: target.y + dist * Math.sin(-el),
      z: target.z + dist * Math.cos(el) * Math.cos(az),
    },
  };
}

export function poseToCamera(
  position: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  mode: Level,
): CameraTuple {
  const dx = position.x - target.x;
  const dy = position.y - target.y;
  const dz = position.z - target.z;
  const dist = Math.hypot(dx, dy, dz) || 1;
  const b = (Math.atan2(dx, dz) * 180) / Math.PI;
  const a = 90 - (Math.asin(Math.min(1, Math.max(-1, dy / dist))) * 180) / Math.PI;
  const c = mode === "galaxy" ? dist / 280 : dist / 4200;
  return [a, b, c, target.x / 12000, target.z / 12000];
}
