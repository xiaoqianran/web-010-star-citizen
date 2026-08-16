/**
 * Official ARK Starmap 9.536.0 field map.
 * Source of truth: captured POST /api/starmap/* JSON — not community scrapers.
 *
 * Dymerz/RSI-Scraper returns raw JSON (good) but posts routes with `ship_size`
 * (official field is `size`) and never reads `data.config`.
 * koo04/GoScrapeRSI re-types the same endpoints and drops/renames keys:
 * position {x,y,z} vs position_x/y/z, TunnelPoint missing code/designation,
 * subtype as array vs object, affiliation flattened.
 */
import bootup from "@capture/api/bootup.json";

export type OfficialAffiliation = {
  id: number;
  code: string;
  color: string;
  name: string;
};

export type OfficialSpecies = {
  id: number;
  code: string;
  name: string;
};

export type OfficialSystemZones = {
  lightColor: string | null;
  frostLine: number | null;
  habitableInner: number | null;
  habitableOuter: number | null;
};

type OfficialConfig = {
  nearPlane: number;
  farPlane: number;
  starfield: { color1: string; color2: string; count: number; radius: number };
  longRangeScanner: { colorD1: string; colorL1: string; colorC1: string };
  routes: { color: string; colorBorder: string; width: number }[];
};

const boot = bootup as {
  data: {
    config: OfficialConfig;
    affiliations: { resultset: OfficialAffiliation[] };
    species: { resultset: OfficialSpecies[] };
  };
};

export const officialConfig = boot.data.config;
export const officialAffiliations = boot.data.affiliations.resultset;
export const officialSpecies = boot.data.species.resultset;

export const AFFILIATIONS = officialAffiliations.map((a) => ({
  code: a.code,
  name: a.name,
  color: a.color,
}));

export const AFFIL_HEX: Record<string, string> = Object.fromEntries(
  officialAffiliations.map((a) => [a.code, a.color]),
);

export function hexToInt(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return Number.isFinite(n) ? n : 0x7acbff;
}

export const AFFIL_INT: Record<string, number> = Object.fromEntries(
  officialAffiliations.flatMap((a) => {
    const n = hexToInt(a.color);
    return [
      [a.code, n],
      [a.code.toUpperCase(), n],
    ];
  }),
);

export const LRS_HEX = {
  lifeforms: officialConfig.longRangeScanner.colorD1,
  economy: officialConfig.longRangeScanner.colorL1,
  crime: officialConfig.longRangeScanner.colorC1,
} as const;

export const LRS_INT = {
  lifeforms: hexToInt(LRS_HEX.lifeforms),
  economy: hexToInt(LRS_HEX.economy),
  crime: hexToInt(LRS_HEX.crime),
};

export const TUNNEL_COLOR = officialConfig.routes[0]?.color ?? "#3a2018";
export const STARFIELD_COLOR = officialConfig.starfield.color2;

export const emptyZones = (): OfficialSystemZones => ({
  lightColor: null,
  frostLine: null,
  habitableInner: null,
  habitableOuter: null,
});

export function zonesFromSystemRow(row: {
  frost_line?: number | null;
  habitable_zone_inner?: number | null;
  habitable_zone_outer?: number | null;
  shader_data?: { lightColor?: string | null } | null;
}): OfficialSystemZones {
  return {
    lightColor: row.shader_data?.lightColor ?? null,
    frostLine: row.frost_line ?? null,
    habitableInner: row.habitable_zone_inner ?? null,
    habitableOuter: row.habitable_zone_outer ?? null,
  };
}
