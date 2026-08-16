/** Shared jump-graph walk. Used by the live catalog and verify-routes so the two copies cannot drift. */

export type ShipSize = "S" | "M" | "L";
export type RouteMode = "shortest" | "leastjumps";

export type GraphEdge = {
  to: string;
  size: ShipSize;
  name: string;
  jumpCode: string;
  arriveName: string;
  arriveCode: string;
};

export type Walk = {
  path: string[];
  edges: GraphEdge[];
  cost: number;
  hops: number;
};

export type JumpRec = {
  distance: number;
  latitude: number;
  longitude: number;
};

export const SHIP_RANK = { S: 1, M: 2, L: 3 } as const;

/** Official form field is `ship_size`. A ship may use a tunnel if tunnel size >= ship size. */
export function tunnelFitsShip(tunnel: ShipSize, ship: ShipSize = "M") {
  return SHIP_RANK[tunnel] >= SHIP_RANK[ship];
}

export function sphCart(distance: number, latitude: number, longitude: number) {
  const la = (latitude * Math.PI) / 180;
  const lo = (longitude * Math.PI) / 180;
  return {
    x: distance * Math.cos(la) * Math.cos(lo),
    y: distance * Math.sin(la),
    z: distance * Math.cos(la) * Math.sin(lo),
  };
}

export function jumpCart(jumps: Record<string, JumpRec>, code: string) {
  const j = jumps[code];
  if (!j) return { x: 0, y: 0, z: 0 };
  return sphCart(j.distance, j.latitude, j.longitude);
}

export function objectCart(
  objectPos: Record<string, [number, number, number]>,
  jumps: Record<string, JumpRec>,
  code: string,
) {
  const trip = objectPos[code];
  if (trip) return sphCart(trip[0], trip[1], trip[2]);
  const j = jumps[code];
  if (j) return sphCart(j.distance, j.latitude, j.longitude);
  return null;
}

export function flightBetween(jumps: Record<string, JumpRec>, a?: string | null, b?: string | null) {
  if (!a || !b) return 0;
  const pa = jumpCart(jumps, a);
  const pb = jumpCart(jumps, b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z);
}

export function objectToJump(
  objectPos: Record<string, [number, number, number]>,
  jumps: Record<string, JumpRec>,
  objectCode: string | null | undefined,
  jumpCode?: string | null,
) {
  if (!objectCode || !jumpCode || !objectCode.includes(".")) return 0;
  const a = objectCart(objectPos, jumps, objectCode);
  if (!a) return 0;
  const b = jumpCart(jumps, jumpCode);
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function withEndpointAu(
  walk: Walk | null,
  objectPos: Record<string, [number, number, number]>,
  jumps: Record<string, JumpRec>,
  departure: string,
  destination: string,
): Walk | null {
  if (!walk) return walk;
  const extra =
    objectToJump(objectPos, jumps, departure.trim().toUpperCase(), walk.edges[0]?.jumpCode) +
    objectToJump(
      objectPos,
      jumps,
      destination.trim().toUpperCase(),
      walk.edges[walk.edges.length - 1]?.arriveCode,
    );
  return extra ? { ...walk, cost: walk.cost + extra } : walk;
}

export function buildTunnelGraph(
  tunnels: {
    size: ShipSize;
    entry: { designation: string | null; star_system_id: number; code: string };
    exit: { designation: string | null; star_system_id: number; code: string };
  }[],
  systemById: Map<number, { code: string; name: string }>,
): Map<string, GraphEdge[]> {
  const graph = new Map<string, GraphEdge[]>();
  for (const t of tunnels) {
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
  return graph;
}

export function walkGraph(
  graph: Map<string, GraphEdge[]>,
  jumps: Record<string, JumpRec>,
  from: string,
  to: string,
  mode: RouteMode,
  ship?: ShipSize,
): Walk | null {
  type Node = { sys: string; via: string | null; cost: number; hops: number };
  const keyOf = (sys: string, via: string | null) => `${sys}\0${via ?? ""}`;
  const better = (a: { cost: number; hops: number }, b: { cost: number; hops: number }) => {
    if (mode === "leastjumps") return a.hops < b.hops || (a.hops === b.hops && a.cost < b.cost);
    return a.cost < b.cost || (a.cost === b.cost && a.hops < b.hops);
  };
  const best = new Map<string, { cost: number; hops: number }>();
  const prev = new Map<string, { pk: string; edge: GraphEdge }>();
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
      if (ship && !tunnelFitsShip(edge.size, ship)) continue;
      const extra = cur.via ? flightBetween(jumps, cur.via, edge.jumpCode) : 0;
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
  const edges: GraphEdge[] = [];
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
