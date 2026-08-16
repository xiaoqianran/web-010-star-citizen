const KEYS = {
  sound: "sm_sound_fx",
  skipAck: "skipAcknowledgment",
  skipInfo: "skipInfo",
  bookmarks: "sm_bookmarks",
  avoid: "sm_avoid",
} as const;

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export const store = {
  sound(): boolean {
    return localStorage.getItem(KEYS.sound) !== "0";
  },
  setSound(on: boolean) {
    localStorage.setItem(KEYS.sound, on ? "1" : "0");
  },
  skipAck(): boolean {
    return localStorage.getItem(KEYS.skipAck) === "1";
  },
  setSkipAck(on: boolean) {
    localStorage.setItem(KEYS.skipAck, on ? "1" : "0");
  },
  skipInfo(): boolean {
    return localStorage.getItem(KEYS.skipInfo) === "1";
  },
  setSkipInfo(on: boolean) {
    localStorage.setItem(KEYS.skipInfo, on ? "1" : "0");
  },
  bookmarks(): string[] {
    return readList(KEYS.bookmarks);
  },
  toggleBookmark(code: string) {
    const cur = new Set(readList(KEYS.bookmarks));
    if (cur.has(code)) cur.delete(code);
    else cur.add(code);
    localStorage.setItem(KEYS.bookmarks, JSON.stringify([...cur]));
    return [...cur];
  },
  avoid(): string[] {
    return readList(KEYS.avoid);
  },
  toggleAvoid(code: string) {
    const cur = new Set(readList(KEYS.avoid));
    if (cur.has(code)) cur.delete(code);
    else cur.add(code);
    localStorage.setItem(KEYS.avoid, JSON.stringify([...cur]));
    return [...cur];
  },
};

let audio: AudioContext | null = null;

export function blip(on: boolean) {
  if (!on) return;
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = "sine";
    o.frequency.value = 740;
    g.gain.value = 0.035;
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.07);
    o.stop(audio.currentTime + 0.08);
  } catch {
    /* ignore */
  }
}
