export type SystemIndexRow = {
  id: number;
  code: string;
  name: string;
  type: string;
  status: string;
  affiliation: string[];
  position: [number, number, number];
};

export type ObjectIndexRow = {
  system: string;
  id: number;
  code: string;
  name: string | null;
  designation: string | null;
  type: string;
  appearance: string | null;
  subtype: string | null;
};

export type AffiliationRow = {
  id: number;
  code: string;
  color: string;
  name: string;
};
