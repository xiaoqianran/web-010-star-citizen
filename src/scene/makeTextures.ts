import * as THREE from "three";

export function glowSprite(color: string, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, color);
  grd.addColorStop(0.25, color + "cc");
  grd.addColorStop(0.55, color + "44");
  grd.addColorStop(1, "#00000000");
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function nebulaTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, size, size);
  const blobs = [
    ["#c45a18", 0.22, 360, 180, 210],
    ["#7a2a0c", 0.16, 200, 300, 180],
    ["#1a6a6a", 0.1, 120, 140, 160],
    ["#d4892a", 0.12, 400, 80, 140],
  ] as const;
  for (const [color, a, x, y, r] of blobs) {
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, hexAlpha(color, a));
    grd.addColorStop(1, hexAlpha(color, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function hexAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

export const AFFIL: Record<string, number> = {
  uee: 0x48bbd4,
  BANU: 0xffce17,
  VNCL: 0xbd002d,
  XIAN: 0x52c231,
  DEV: 0xca922d,
  UNC: 0xf6851f,
};
