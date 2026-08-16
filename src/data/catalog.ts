import bootup from "@capture/api/bootup.json";
import objectIndex from "@capture/index/celestial-objects.json";
import jumpPointIndex from "@capture/index/jump-points.json";
import type { CapturedBody } from "./celestial";
import { bodyLabel, systemCodeOf } from "./celestial";
import { AFFILIATIONS, zonesFromSystemRow, type OfficialSystemZones } from "./official";

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

export type RouteMode = "shortest" | "leastjumps";

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

function loaderKey(code: string) {
  return Object.keys(systemLoaders).find((k) => k.endsWith(`/${code}.json`));
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

export { AFFILIATIONS };

type Edge = {
  to: string;
  size: "S" | "M" | "L";
  name: string;
  jumpCode: string;
  arriveName: string;
  arriveCode: string;
};

type JumpRec = {
  distance: number;
  latitude: number;
  longitude: number;
};

const jumps = jumpPointIndex as Record<string, JumpRec>;

function jpCart(code: string) {
  const j = jumps[code];
  if (!j) return { x: 0, y: 0, z: 0 };
  const la = (j.latitude * Math.PI) / 180;
  const lo = (j.longitude * Math.PI) / 180;
  const d = j.distance;
  return {
    x: d * Math.cos(la) * Math.cos(lo),
    y: d * Math.sin(la),
    z: d * Math.cos(la) * Math.sin(lo),
  };
}

function flightBetween(a?: string | null, b?: string | null) {
  if (!a || !b) return 0;
  const pa = jpCart(a);
  const pb = jpCart(b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z);
}

const graph = new Map<string, Edge[]>();
for (const t of boot.data.tunnels.resultset) {
  const a = systemById.get(t.entry.star_system_id);
  const b = systemById.get(t.exit.star_system_id);
  if (!a || !b) continue;
  const ab = t.entry.designation || `${a.name} - ${b.name}`;
  const ba = t.exit.designation || `${b.name} - ${a.name}`;
  const listA = graph.get(a.code) ?? [];
  listA.push({
    to: b.code,
    size: t.size,
    name: ab,
    jumpCode: t.entry.code,
    arriveName: ba,
    arriveCode: t.exit.code,
  });
  graph.set(a.code, listA);
  const listB = graph.get(b.code) ?? [];
  listB.push({
    to: a.code,
    size: t.size,
    name: ba,
    jumpCode: t.exit.code,
    arriveName: ab,
    arriveCode: t.entry.code,
  });
  graph.set(b.code, listB);
}

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
  const byName = systems.find((s) => s.name.toUpperCase() === u);
  if (byName) return byName.code;
  // Official routes/find accepts object codes (GOSS.STARS.GOSSA → GOSS) but rejects display names (Goss A, Cassel).
  const byCode = objectByCode.get(u) ?? objects.find((o) => o.code.toUpperCase() === u);
  if (byCode) return byCode.system;
  // Disc "设为起点/终点" fills the visible name; official API rejects those, but the local
  // calculator should still resolve Cassel / Goss A so Calculate does not look frozen.
  const byObjName = objects.find(
    (o) => o.name?.toUpperCase() === u || o.designation?.toUpperCase() === u,
  );
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
  const sysHits = systems
    .filter((s) => {
      const name = s.name.toLowerCase();
      return name === q || name.startsWith(q);
    })
    .map((s) => ({ name: s.name, code: s.code, type: "STAR_SYSTEM" as const, system: s.code }));
  // Official find matches name/designation, not object codes (GOSS.STARS.GOSSA and JUMPPOINTS stay empty).
  const objHits = objects
    .filter(
      (o) =>
        (o.name && o.name.toLowerCase().includes(q)) ||
        (o.designation && o.designation.toLowerCase().includes(q)),
    )
    .map((o) => ({ name: bodyLabel(o), code: o.code, type: o.type, system: o.system }));
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

type Walk = { path: string[]; edges: Edge[]; cost: number; hops: number };

function walkGraph(from: string, to: string, mode: RouteMode, ship: "S" | "M" | "L" = "M"): Walk | null {
  type Node = { sys: string; via: string | null; cost: number; hops: number };
  const keyOf = (sys: string, via: string | null) => `${sys}\0${via ?? ""}`;
  const better = (a: { cost: number; hops: number }, b: { cost: number; hops: number }) => {
    if (mode === "leastjumps") return a.hops < b.hops || (a.hops === b.hops && a.cost < b.cost);
    return a.cost < b.cost || (a.cost === b.cost && a.hops < b.hops);
  };
  const best = new Map<string, { cost: number; hops: number }>();
  const prev = new Map<string, { pk: string; edge: Edge }>();
  const q: Node[] = [{ sys: from, via: null, cost: 0, hops: 0 }];
  best.set(keyOf(from, null), { cost: 0, hops: 0 });
  let destKey: string | null = null;
  let destScore = { cost: Number.POSITIVE_INFINITY, hops: Number.POSITIVE_INFINITY };

  while (q.length) {
    let idx = 0;
    for (let i = 1; i < q.length; i++) {
      if (better(q[i], q[idx])) idx = i;
    }
    const cur = q.splice(idx, 1)[0];
    const ck = keyOf(cur.sys, cur.via);
    const known = best.get(ck);
    if (!known || cur.cost !== known.cost || cur.hops !== known.hops) continue;

    if (cur.sys === to && cur.via) {
      if (better(cur, destScore)) {
        destScore = { cost: cur.cost, hops: cur.hops };
        destKey = ck;
      }
      continue;
    }

    for (const edge of graph.get(cur.sys) ?? []) {
      if (!tunnelFitsShip(edge.size, ship)) continue;
      const extra = cur.via ? flightBetween(cur.via, edge.jumpCode) : 0;
      const next = { sys: edge.to, via: edge.arriveCode, cost: cur.cost + extra, hops: cur.hops + 1 };
      const nk = keyOf(next.sys, next.via);
      const held = best.get(nk);
      if (held && !better(next, held)) continue;
      best.set(nk, { cost: next.cost, hops: next.hops });
      prev.set(nk, { pk: ck, edge });
      q.push(next);
    }
  }

  if (!destKey) return null;
  const edges: Edge[] = [];
  const path = [to];
  let cursor = destKey;
  while (prev.has(cursor)) {
    const step = prev.get(cursor)!;
    edges.unshift(step.edge);
    path.unshift(step.pk.split("\0")[0]);
    cursor = step.pk;
  }
  return { path, edges, cost: destScore.cost, hops: destScore.hops };
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

const SHIP_RANK = { S: 1, M: 2, L: 3 } as const;

/** Official form field is `ship_size`. A ship may use a tunnel if tunnel size >= ship size. */
export function tunnelFitsShip(tunnel: "S" | "M" | "L", ship: "S" | "M" | "L" = "M") {
  return SHIP_RANK[tunnel] >= SHIP_RANK[ship];
}

export function findRoute(departure: string, destination: string, ship: "S" | "M" | "L" = "M"): RouteResult {
  const from = resolveEndpoint(departure);
  const to = resolveEndpoint(destination);
  if (!from || !to) {
    return { ok: false, code: "ErrInvalidObject", msg: "Invalid object specified", shortest: null, leastjumps: null };
  }
  if (from === to) {
    return {
      ok: true,
      code: "OK",
      msg: "OK",
      empty: true,
      shortest: emptyLeg(),
      leastjumps: emptyLeg(),
    };
  }
  const short = walkGraph(from, to, "shortest", ship);
  const least = walkGraph(from, to, "leastjumps", ship);
  if (!short || !least) {
    // Official BANSHEE→YULIN ship_size=L: success=1 code=OK with null legs (not ErrNoRoute).
    return { ok: true, code: "OK", msg: "OK", empty: true, shortest: null, leastjumps: null };
  }
  return {
    ok: true,
    code: "OK",
    msg: "OK",
    shortest: packLeg(from, to, short),
    leastjumps: packLeg(from, to, least),
  };
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
