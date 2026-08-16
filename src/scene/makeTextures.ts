import * as THREE from "three";
import { AFFIL_INT, LRS_HEX } from "@/data/official";

/** Official LRS overlay is a square grid (seen as `// POPULATION`), not a soft glow. */
export function gridSprite(color = "#9be80d", size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, size, size);
  const cells = 6;
  const step = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const dx = (x + 0.5) / cells - 0.5;
      const dy = (y + 0.5) / cells - 0.5;
      const fall = Math.max(0, 1 - Math.hypot(dx, dy) * 2.1);
      if (fall <= 0) continue;
      g.fillStyle = hexAlpha(color, 0.08 + fall * 0.42);
      g.fillRect(x * step + 1, y * step + 1, step - 2, step - 2);
      g.strokeStyle = hexAlpha(color, 0.2 + fall * 0.55);
      g.strokeRect(x * step + 0.5, y * step + 0.5, step - 1, step - 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

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

export const AFFIL: Record<string, number> = AFFIL_INT;
export const LRS = LRS_HEX;

export const PLANET: Record<string, number> = {
  PLANET_GREEN: 0x2fd6a8,
  PLANET_BLUE: 0x3a7ec8,
  PLANET_BROWN: 0xb8895a,
  PLANET_GAS: 0xd4b46a,
  DEFAULT: 0x6a8aaa,
  CUSTOM: 0x8ab4c8,
  WARNING_RED: 0xff4444,
};
