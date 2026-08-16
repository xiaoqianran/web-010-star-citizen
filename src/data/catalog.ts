import bootup from "@capture/api/bootup.json";
import objectIndex from "@capture/index/celestial-objects.json";
import jumpPointIndex from "@capture/index/jump-points.json";
import objectPositions from "@capture/index/object-positions.json";
import type { CapturedBody } from "./celestial";
import { bodyLabel, systemCodeOf } from "./celestial";
import { AFFILIATIONS, zonesFromSystemRow, type OfficialSystemZones } from "./official";
import {
  buildTunnelGraph,
  tunnelFitsShip,
  walkGraph,
  withEndpointAu,
  type RouteMode as GraphRouteMode,
  type Walk,
} from "./routeGraph";

export type SystemRow = {
  id: number;
  code: string;
  name: string;
  type: string;
  status: string;
  affiliation: string[];
  affiliationName: string;
  position: [number, number, number];
  population: number;
  economy: number;
  danger: number;
  description: string | null;
};

export type ObjectRow = {
  system: string;
  id: number;
  code: string;
  name: string | null;
  designation: string | null;
  type: string;
  appearance: string | null;
  subtype: string | null;
};

export type SearchHit = {
  name: string;
  code: string;
  type: string;
  system?: string;
};

export type RouteSegment = { id?: number; name: string; type: "system" | "jump"; code: string };

export type RouteLeg = {
  name: string | null;
  label: string | null;
  jumps: number | null;
  first_jump: string | null;
  flight_distance: number | null;
  segments: RouteSegment[];
};

export type RouteResult = {
  ok: boolean;
  code: string;
  msg: string;
  empty?: boolean;
  shortest: RouteLeg | null;
  leastjumps: RouteLeg | null;
};

export type RouteMode = GraphRouteMode;

type BootSystem = {
  id: number;
  code: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  position_x: number;
  position_y: number;
  position_z: number;
  affiliation: { code: string; name: string }[];
  aggregated_population: number;
  aggregated_economy: number;
  aggregated_danger: number;
};

type Tunnel = {
  size: "S" | "M" | "L";
  direction: string;
  entry: { designation: string | null; star_system_id: number; code: string };
  exit: { designation: string | null; star_system_id: number; code: string };
};

const boot = bootup as {
  data: { systems: { resultset: BootSystem[] }; tunnels: { resultset: Tunnel[] } };
};

export const systems: SystemRow[] = boot.data.systems.resultset.map((s) => ({
  id: s.id,
  code: s.code,
  name: s.name,
  type: s.type,
  status: s.status,
  affiliation: (s.affiliation || []).map((a) => a.code),
  affiliationName: s.affiliation?.[0]?.name ?? "UEE",
  position: [s.position_x, s.position_y, s.position_z],
  population: s.aggregated_population ?? 0,
  economy: s.aggregated_economy ?? 0,
  danger: s.aggregated_danger ?? 0,
  description: s.description,
}));

const extras: ObjectRow[] = [
  {
    system: "SOL",
    id: 2569,
    code: "SOL.LZS.PORTRETANUS",
    name: "Port Renatus",
    designation: "Port Renatus",
    type: "LZ",
    appearance: null,
    subtype: "Landing Zone",
  },
  {
    system: "NYX",
    id: 2730,
    code: "NYX.LZS.LEVSKI",
    name: "Levski",
    designation: "Levski",
    type: "LZ",
    appearance: null,
    subtype: "Landing Zone",
  },
  {
    system: "STANTON",
    id: 2553,
    code: "STANTON.LZS.LORVILLE",
    name: "Lorville",
    designation: "Lorville",
    type: "LZ",
    appearance: null,
    subtype: "Landing Zone",
  },
  {
    system: "STANTON",
    id: 2716,
    code: "STANTON.LZS.AREA18",
    name: "Area18",
    designation: "Area18",
    type: "LZ",
    appearance: null,
    subtype: "Landing Zone",
  },
  {
    system: "STANTON",
    id: 2554,
    code: "STANTON.LZS.ORISON",
    name: "Orison",
    designation: "Orison",
    type: "LZ",
    appearance: null,
    subtype: "Landing Zone",
  },
];

export const objects = [...(objectIndex as ObjectRow[]), ...extras];

export const systemByCode = new Map(systems.map((s) => [s.code, s]));
export const systemById = new Map(systems.map((s) => [s.id, s]));
export const objectByCode = new Map(objects.map((o) => [o.code, o]));
const systemByName = new Map(systems.map((s) => [s.name.toUpperCase(), s]));
const objectByName = new Map<string, ObjectRow>();
for (const o of objects) {
  if (o.name) objectByName.set(o.name.toUpperCase(), o);
  if (o.designation) objectByName.set(o.designation.toUpperCase(), o);
}
const systemSearch = systems.map((s) => ({ row: s, name: s.name.toLowerCase() }));
const objectSearch = objects.map((o) => ({
  row: o,
  name: (o.name || "").toLowerCase(),
  designation: (o.designation || "").toLowerCase(),
}));

const extraBodies: CapturedBody[] = [
  {
    id: 2569,
    code: "SOL.LZS.PORTRETANUS",
    name: "Port Renatus",
    designation: "Port Renatus",
    type: "LZ",
    distance: 0,
    latitude: 46,
    longitude: 13,
    size: 0,
    habitable: null,
    show_label: true,
    show_orbitlines: false,
    appearance: "DEFAULT",
    parent_id: 2027,
    subtype: { id: 0, name: "Landing Zone", type: "LZ" },
  },
  {
    id: 2730,
    code: "NYX.LZS.LEVSKI",
    name: "Levski",
    designation: "Levski",
    type: "LZ",
    distance: 0,
    latitude: -15,
    longitude: -55,
    size: 0,
    habitable: null,
    show_label: true,
    show_orbitlines: false,
    appearance: "DEFAULT",
    parent_id: 2626,
    subtype: { id: 0, name: "Landing Zone", type: "LZ" },
  },
  {
    id: 2553,
    code: "STANTON.LZS.LORVILLE",
    name: "Lorville",
    designation: "Lorville",
    type: "LZ",
    distance: 0,
    latitude: 0,
    longitude: 0,
    size: 0,
    habitable: null,
    show_label: true,
    show_orbitlines: false,
    appearance: "DEFAULT",
    parent_id: 1693,
    subtype: { id: 0, name: "Landing Zone", type: "LZ" },
  },
  {
    id: 2716,
    code: "STANTON.LZS.AREA18",
    name: "Area18",
    designation: "Area18",
    type: "LZ",
    distance: 0,
    latitude: 34,
    longitude: -29,
    size: 0,
    habitable: null,
    show_label: true,
    show_orbitlines: false,
    appearance: "DEFAULT",
    parent_id: 1694,
    subtype: { id: 0, name: "Landing Zone", type: "LZ" },
  },
  {
    id: 2554,
    code: "STANTON.LZS.ORISON",
    name: "Orison",
    designation: "Orison",
    type: "LZ",
    distance: 0,
    latitude: 0,
    longitude: 0,
    size: 0,
    habitable: null,
    show_label: true,
    show_orbitlines: false,
    appearance: "DEFAULT",
    parent_id: 1695,
    subtype: { id: 0, name: "Landing Zone", type: "LZ" },
  },
];

const systemLoaders = import.meta.glob("../../research/capture/api/star-systems/*.json");
export type SystemPack = {
  info: SystemRow;
  bodies: CapturedBody[];
  zones: OfficialSystemZones;
};

const systemCache = new Map<string, SystemPack>();
const loaderByCode = new Map(
  Object.keys(systemLoaders).map((key) => {
    const file = key.split("/").pop() ?? key;
    return [file.replace(/\.json$/i, "").toUpperCase(), key] as const;
  }),
);

function loaderKey(code: string) {
  return loaderByCode.get(code.toUpperCase());
}

export function peekSystem(code: string) {
  return systemCache.get(code.toUpperCase()) ?? null;
}

export async function loadSystem(code: string) {
  const upper = code.toUpperCase();
  const hit = systemCache.get(upper);
  if (hit) return hit;
  const key = loaderKey(upper) ?? loaderKey(code);
  if (!key) return null;
  try {
    const mod = (await systemLoaders[key]()) as {
      default: {
        data?: {
          resultset?: {
            celestial_objects?: CapturedBody[];
            code?: string;
            frost_line?: number | null;
            habitable_zone_inner?: number | null;
            habitable_zone_outer?: number | null;
            shader_data?: { lightColor?: string | null } | null;
          }[];
        };
      };
    };
    const row = mod.default?.data?.resultset?.[0];
    const info = systemByCode.get(upper) ?? systemByCode.get(row?.code ?? "");
    if (!row || !info) return null;
    const captured = (row.celestial_objects ?? []) as CapturedBody[];
    const have = new Set(captured.map((b) => b.code));
    const injected = extraBodies.filter((b) => systemCodeOf(b.code) === info.code && !have.has(b.code));
    const packed: SystemPack = {
      info,
      bodies: [...captured, ...injected],
      zones: zonesFromSystemRow(row),
    };
    systemCache.set(info.code, packed);
    return packed;
  } catch {
    return null;
  }
}

export { AFFILIATIONS, tunnelFitsShip };

const jumps = jumpPointIndex as Record<string, { distance: number; latitude: number; longitude: number }>;
const objectPos = objectPositions as unknown as Record<string, [number, number, number]>;
const graph = buildTunnelGraph(boot.data.tunnels.resultset, systemById);

export const tunnels = boot.data.tunnels.resultset.map((t) => ({
  size: t.size,
  from: systemById.get(t.entry.star_system_id)?.code ?? "",
  to: systemById.get(t.exit.star_system_id)?.code ?? "",
}));

export function resolveEndpoint(raw: string): string | null {
  const q = raw.trim();
  if (!q) return null;
  const u = q.toUpperCase();
  if (systemByCode.has(u)) return u;
  const byName = systemByName.get(u);
  if (byName) return byName.code;
  // Official routes/find accepts object codes (GOSS.STARS.GOSSA → GOSS) but rejects display names (Goss A, Cassel).
  const byCode = objectByCode.get(u);
  if (byCode) return byCode.system;
  // Disc "设为起点/终点" fills the visible name; official API rejects those, but the local
  // calculator should still resolve Cassel / Goss A so Calculate does not look frozen.
  const byObjName = objectByName.get(u);
  if (byObjName) return byObjName.system;
  return null;
}

export function searchCatalog(query: string, _currentSystem?: string): SearchHit[] {
  const raw = query.trim();
  if (!raw) return [];
  // Official /api/starmap/find rejects shorter than 3 characters.
  if (raw.length < 3) return [];
  const q = raw.toLowerCase();
  // Official systems match name prefix ("Terra"), not code-only or parenthetical
  // includes: "Kayfa" must not return Kai'pua (Kayfa); "ARK" must not return Malkail (Markahil).
  const sysHits = systemSearch
    .filter((s) => s.name === q || s.name.startsWith(q))
    .map((s) => ({ name: s.row.name, code: s.row.code, type: "STAR_SYSTEM" as const, system: s.row.code }));
  // Official find matches name/designation, not object codes (GOSS.STARS.GOSSA and JUMPPOINTS stay empty).
  const objHits = objectSearch
    .filter((o) => (o.name && o.name.includes(q)) || (o.designation && o.designation.includes(q)))
    .map((o) => ({ name: bodyLabel(o.row), code: o.row.code, type: o.row.type, system: o.row.system }));
  const rank = (h: SearchHit) => {
    const name = h.name.toLowerCase();
    const code = h.code.toLowerCase();
    const sys = (h.system || "").toLowerCase();
    if (name === q || code === q) return 0;
    if (h.type === "STAR_SYSTEM") return 1;
    if (sys === q) return 2;
    if (name.startsWith(q) || code.startsWith(q)) return 3;
    return 4;
  };
  return [...objHits, ...sysHits].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).slice(0, 32);
}

function packLeg(from: string, to: string, walk: Walk): RouteLeg {
  const a = systemByCode.get(from)!;
  const b = systemByCode.get(to)!;
  const through = walk.path[1] && walk.path[1] !== to ? systemByCode.get(walk.path[1])?.name : b.name;
  const segments: RouteSegment[] = [{ name: a.name, type: "system", code: from }];
  for (let i = 0; i < walk.edges.length; i++) {
    const edge = walk.edges[i];
    segments.push({ name: edge.name, type: "jump", code: walk.path[i] });
    segments.push({ name: edge.arriveName, type: "jump", code: walk.path[i + 1] });
  }
  segments.push({ name: b.name, type: "system", code: to });
  return {
    name: `${a.name} to ${b.name}`,
    label: `Through ${through}`,
    jumps: walk.edges.length,
    first_jump: walk.edges[0]?.name ?? null,
    flight_distance: walk.cost,
    segments,
  };
}

const emptyLeg = (): RouteLeg => ({
  name: null,
  label: null,
  jumps: null,
  first_jump: null,
  flight_distance: null,
  segments: [],
});

function objectCodeOf(raw: string) {
  const u = raw.trim().toUpperCase();
  return objectByCode.has(u) ? u : null;
}

const routeCache = new Map<string, RouteResult>();

export function findRoute(departure: string, destination: string, ship: "S" | "M" | "L" = "M"): RouteResult {
  const from = resolveEndpoint(departure);
  const to = resolveEndpoint(destination);
  if (!from || !to) {
    return { ok: false, code: "ErrInvalidObject", msg: "Invalid object specified", shortest: null, leastjumps: null };
  }
  const cacheKey = `${from}|${to}|${ship}|${objectCodeOf(departure) ?? ""}|${objectCodeOf(destination) ?? ""}`;
  const cached = routeCache.get(cacheKey);
  if (cached) return cached;
  const store = (result: RouteResult) => {
    if (routeCache.size > 256) {
      const first = routeCache.keys().next().value;
      if (first) routeCache.delete(first);
    }
    routeCache.set(cacheKey, result);
    return result;
  };
  if (from === to) {
    return store({
      ok: true,
      code: "OK",
      msg: "OK",
      empty: true,
      shortest: emptyLeg(),
      leastjumps: emptyLeg(),
    });
  }
  const short = withEndpointAu(
    walkGraph(graph, jumps, from, to, "shortest", ship),
    objectPos,
    jumps,
    departure,
    destination,
  );
  const least = withEndpointAu(
    walkGraph(graph, jumps, from, to, "leastjumps", ship),
    objectPos,
    jumps,
    departure,
    destination,
  );
  if (!short || !least) {
    // Official BANSHEE→YULIN ship_size=L: success=1 code=OK with null legs (not ErrNoRoute).
    return store({ ok: true, code: "OK", msg: "OK", empty: true, shortest: null, leastjumps: null });
  }
  return store({
    ok: true,
    code: "OK",
    msg: "OK",
    shortest: packLeg(from, to, short),
    leastjumps: packLeg(from, to, least),
  });
}

export function pickRoute(result: RouteResult | null, mode: RouteMode): RouteLeg | null {
  if (!result) return null;
  return mode === "leastjumps" ? result.leastjumps : result.shortest;
}

export function routeSystems(result: RouteResult | null, mode: RouteMode = "shortest"): string[] {
  const leg = pickRoute(result, mode);
  if (!leg) return [];
  return [...new Set(leg.segments.filter((s) => s.type === "system").map((s) => s.code))];
}

export { systemCodeOf };
