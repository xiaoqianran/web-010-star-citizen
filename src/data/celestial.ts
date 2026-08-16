export type CapturedBody = {
  id: number;
  code: string;
  designation: string | null;
  name: string | null;
  type: string;
  distance: number | null;
  latitude: number | null;
  longitude: number | null;
  size: number | null;
  habitable: boolean | null;
  show_label: boolean | null;
  show_orbitlines: boolean | null;
  appearance: string | null;
  parent_id: number | null;
  description?: string | null;
  sensor_danger?: string | number | null;
  sensor_economy?: string | number | null;
  sensor_population?: string | number | null;
  affiliation?: { code: string; name: string; color?: string }[];
  age?: number | null;
  axial_tilt?: number | null;
  orbit_period?: number | null;
  fairchanceact?: boolean | null;
  subtype: { id: number; name: string; type: string } | null;
  shader_data?: {
    sun?: { color1: string; color2: string };
    blackhole?: { color1: string; color2: string };
    radius?: number;
  } | null;
};

export type Vec3 = { x: number; y: number; z: number };

export function bodyLabel(body: Pick<CapturedBody, "name" | "designation" | "code">) {
  return body.name || body.designation || body.code;
}

export function sph(distance: number, lat: number, lon: number, scale: number): Vec3 {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  const r = Math.max(distance, 0.04) * scale;
  return {
    x: r * Math.cos(la) * Math.cos(lo),
    y: r * Math.sin(la),
    z: r * Math.cos(la) * Math.sin(lo),
  };
}

export function jumpDestination(code: string): string | null {
  const m = code.match(/\.JUMPPOINTS?\.([A-Z0-9'_-]+)$/i);
  return m ? m[1].toUpperCase() : null;
}

export function systemCodeOf(code: string): string {
  return (code.split(".")[0] || code).toUpperCase();
}

export function systemScale(bodies: CapturedBody[]) {
  const ds = bodies
    .map((b) => Number(b.distance) || 0)
    .filter((d) => d > 0.05 && d < 40);
  const max = Math.max(2.2, ...ds);
  return 7.2 / max;
}

export function placeBodies(bodies: CapturedBody[], scale: number): Map<number, Vec3> {
  const byId = new Map(bodies.map((b) => [b.id, b]));
  const out = new Map<number, Vec3>();

  const place = (body: CapturedBody): Vec3 => {
    const cached = out.get(body.id);
    if (cached) return cached;
    const dist = Number(body.distance) || 0;
    const lat = Number(body.latitude) || 0;
    const lon = Number(body.longitude) || 0;
    const parent = body.parent_id ? byId.get(body.parent_id) : undefined;
    const local = Boolean(parent) && dist < 0.05;
    if (local && parent) {
      const origin = place(parent);
      const orbit = 0.22 + Math.max(dist, 0.0004) * 80 + (Number(body.size) || 0.3) * 0.08;
      const offset = sph(orbit / scale, lat, lon, scale);
      const p = { x: origin.x + offset.x, y: origin.y + offset.y, z: origin.z + offset.z };
      out.set(body.id, p);
      return p;
    }
    const use = dist > 40 ? Math.log10(dist) * 2.4 : dist;
    const p = sph(use || 0.04, lat, lon, scale);
    out.set(body.id, p);
    return p;
  };

  for (const body of bodies) place(body);
  return out;
}

export function sensorNum(v: string | number | null | undefined) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
