import bootup from "@capture/api/bootup.json";
import objectIndex from "@capture/index/celestial-objects.json";
import type { CapturedBody } from "./celestial";
import { bodyLabel, systemCodeOf } from "./celestial";

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

export type RouteResult = {
  ok: boolean;
  code: string;
  msg: string;
  empty?: boolean;
  shortest: {
    name: string | null;
    label: string | null;
    jumps: number | null;
    first_jump: string | null;
    segments: RouteSegment[];
  } | null;
};

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
];

export const objects = [...(objectIndex as ObjectRow[]), ...extras];

export const systemByCode = new Map(systems.map((s) => [s.code, s]));
export const systemById = new Map(systems.map((s) => [s.id, s]));
export const objectByCode = new Map(objects.map((o) => [o.code, o]));

const systemLoaders = import.meta.glob("../../research/capture/api/star-systems/*.json");
const systemCache = new Map<string, { info: SystemRow; bodies: CapturedBody[] }>();

function loaderKey(code: string) {
  return Object.keys(systemLoaders).find((k) => k.endsWith(`/${code}.json`));
}

export async function loadSystem(code: string) {
  const upper = code.toUpperCase();
  const hit = systemCache.get(upper);
  if (hit) return hit;
  const key = loaderKey(upper) ?? loaderKey(code);
  if (!key) return null;
  const mod = (await systemLoaders[key]()) as {
    default: { data?: { resultset?: { celestial_objects?: CapturedBody[]; code?: string }[] } };
  };
  const row = mod.default?.data?.resultset?.[0];
  const info = systemByCode.get(upper) ?? systemByCode.get(row?.code ?? "");
  if (!row || !info) return null;
  const packed = { info, bodies: (row.celestial_objects ?? []) as CapturedBody[] };
  systemCache.set(info.code, packed);
  return packed;
}

export const AFFILIATIONS = [
  { code: "uee", name: "UEE" },
  { code: "BANU", name: "Banu" },
  { code: "VNCL", name: "Vanduul" },
  { code: "XIAN", name: "Xi'an" },
  { code: "DEV", name: "Developing" },
  { code: "UNC", name: "Unclaimed" },
] as const;

type Edge = { to: string; size: "S" | "M" | "L"; name: string; jumpCode: string };

const graph = new Map<string, Edge[]>();
for (const t of boot.data.tunnels.resultset) {
  const a = systemById.get(t.entry.star_system_id);
  const b = systemById.get(t.exit.star_system_id);
  if (!a || !b) continue;
  const ab = t.entry.designation || `${a.name} - ${b.name}`;
  const ba = t.exit.designation || `${b.name} - ${a.name}`;
  const listA = graph.get(a.code) ?? [];
  listA.push({ to: b.code, size: t.size, name: ab, jumpCode: t.entry.code });
  graph.set(a.code, listA);
  const listB = graph.get(b.code) ?? [];
  listB.push({ to: a.code, size: t.size, name: ba, jumpCode: t.exit.code });
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
  return null;
}

export function searchCatalog(query: string, currentSystem?: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    const here = currentSystem ? objects.filter((o) => o.system === currentSystem) : [];
    return here.slice(0, 24).map((o) => ({
      name: bodyLabel(o),
      code: o.code,
      type: o.type,
      system: o.system,
    }));
  }
  const sysHits = systems
    .filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    .map((s) => ({ name: s.name, code: s.code, type: "STAR_SYSTEM" as const, system: s.code }));
  const objHits = objects
    .filter(
      (o) =>
        o.code.toLowerCase().includes(q) ||
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

function bfs(from: string, to: string): { path: string[]; edges: Edge[] } | null {
  if (from === to) return { path: [from], edges: [] };
  const q: string[] = [from];
  const prev = new Map<string, { via: string; edge: Edge }>();
  const seen = new Set([from]);
  while (q.length) {
    const cur = q.shift()!;
    for (const edge of graph.get(cur) ?? []) {
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      prev.set(edge.to, { via: cur, edge });
      if (edge.to === to) {
        const path = [to];
        const edges: Edge[] = [];
        let node = to;
        while (node !== from) {
          const step = prev.get(node)!;
          edges.unshift(step.edge);
          node = step.via;
          path.unshift(node);
        }
        return { path, edges };
      }
      q.push(edge.to);
    }
  }
  return null;
}

export function findRoute(departure: string, destination: string): RouteResult {
  const from = resolveEndpoint(departure);
  const to = resolveEndpoint(destination);
  if (!from || !to) {
    return { ok: false, code: "ErrInvalidObject", msg: "Invalid object specified", shortest: null };
  }
  if (from === to) {
    return {
      ok: true,
      code: "OK",
      msg: "OK",
      empty: true,
      shortest: { name: null, label: null, jumps: null, first_jump: null, segments: [] },
    };
  }
  const found = bfs(from, to);
  if (!found) {
    return { ok: false, code: "ErrNoRoute", msg: "No route", shortest: null };
  }
  const a = systemByCode.get(from)!;
  const b = systemByCode.get(to)!;
  const through = found.path[1] && found.path[1] !== to ? systemByCode.get(found.path[1])?.name : b.name;
  const segments: RouteSegment[] = [{ name: a.name, type: "system", code: from }];
  for (let i = 0; i < found.edges.length; i++) {
    const edge = found.edges[i];
    const prev = found.path[i];
    const next = found.path[i + 1];
    segments.push({ name: edge.name, type: "jump", code: prev });
    const back = (graph.get(next) ?? []).find((e) => e.to === prev);
    segments.push({ name: back?.name || `${systemByCode.get(next)?.name} - ${systemByCode.get(prev)?.name}`, type: "jump", code: next });
  }
  segments.push({ name: b.name, type: "system", code: to });
  return {
    ok: true,
    code: "OK",
    msg: "OK",
    shortest: {
      name: `${a.name} to ${b.name}`,
      label: `Through ${through}`,
      jumps: found.edges.length,
      first_jump: found.edges[0]?.name ?? null,
      segments,
    },
  };
}

export function routeSystems(result: RouteResult | null): string[] {
  if (!result?.shortest) return [];
  return result.shortest.segments.filter((s) => s.type === "system").map((s) => s.code);
}

export { systemCodeOf };
