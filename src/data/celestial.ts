export type CapturedBody = {
  id: number;
  code: string;
  designation: string | null;
  name: string | null;
  type: string;
  distance: number;
  latitude: number;
  longitude: number;
  size: number;
  habitable: boolean | null;
  show_label: boolean;
  show_orbitlines: boolean | null;
  appearance: string | null;
  subtype: { id: number; name: string; type: string } | null;
  shader_data?: {
    sun?: { color1: string; color2: string };
    radius?: number;
  } | null;
};

export function bodyLabel(body: CapturedBody) {
  return body.name || body.designation || body.code;
}

export function sph(distance: number, lat: number, lon: number, scale: number) {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  const r = Math.max(distance, 0.04) * scale;
  return {
    x: r * Math.cos(la) * Math.cos(lo),
    y: r * Math.sin(la),
    z: r * Math.cos(la) * Math.sin(lo),
  };
}
