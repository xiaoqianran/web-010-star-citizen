import { useMemo, useState } from "react";
import gossPayload from "@capture/api/star-systems/GOSS.json";
import routeGossTerra from "@capture/api/routes/GOSS-TERRA.json";
import routeGossHelios from "@capture/api/routes/GOSS-HELIOS.json";
import routeGossTyrol from "@capture/api/routes/GOSS-TYROL.json";
import systemsIndex from "@capture/index/systems.json";
import type { CapturedBody } from "@/data/celestial";
import { bodyLabel } from "@/data/celestial";
import { zh } from "@/i18n/zh";
import { StarMapCanvas, type ScreenPt } from "@/scene/StarMapCanvas";
import { ArkMark } from "./Intro";
import { ControlDisc } from "./ControlDisc";

type Tab = "search" | "bookmarks" | "routes" | "display" | null;
type Level = "galaxy" | "system" | "object";

const bodies = gossPayload.data.resultset[0].celestial_objects as CapturedBody[];
const systems = systemsIndex as {
  id: number;
  code: string;
  name: string;
  type: string;
  affiliation: string[];
  position: number[];
}[];

const ROUTES: Record<string, typeof routeGossTerra> = {
  "GOSS-TERRA": routeGossTerra,
  "GOSS-HELIOS": routeGossHelios,
  "GOSS-TYROL": routeGossTyrol,
};

export function Starmap() {
  const [level, setLevel] = useState<Level>("system");
  const [tab, setTab] = useState<Tab>(null);
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [hover, setHover] = useState<CapturedBody | null>(null);
  const [selected, setSelected] = useState<CapturedBody | null>(null);
  const [discPage, setDiscPage] = useState<"information" | "routing" | "bookmark">("information");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("GOSS");
  const [to, setTo] = useState("TERRA");
  const [routeKey, setRouteKey] = useState<string | null>(null);
  const [point, setPoint] = useState<ScreenPt | null>(null);
  const [focusCode, setFocusCode] = useState<string | null>(null);
  const [sound, setSound] = useState(true);

  const focus = selected ? bodyLabel(selected) : "GOSS";
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sysHits = systems
      .filter((s) => !q || s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .map((s) => ({ name: s.name, code: s.code, type: "STAR_SYSTEM" as const }));
    const objHits = bodies
      .filter((b) => !q || bodyLabel(b).toLowerCase().includes(q) || b.code.toLowerCase().includes(q))
      .map((b) => ({ name: bodyLabel(b), code: b.code, type: b.type }));
    return [...objHits, ...sysHits].slice(0, 16);
  }, [query]);

  const route = routeKey ? ROUTES[routeKey]?.data.shortest : null;

  const pickHit = (code: string, type: string) => {
    const body = bodies.find((b) => b.code === code);
    if (body) {
      setSelected(body);
      setLevel("object");
      setDiscPage("information");
      setTab(null);
      return;
    }
    if (type === "STAR_SYSTEM") {
      setSelected(null);
      setLevel("galaxy");
      setFocusCode(code);
      setTab(null);
    }
  };

  return (
    <>
      <StarMapCanvas
        bodies={bodies}
        systems={systems}
        mode={level}
        view={view}
        selected={level === "object" ? selected : null}
        focusCode={focusCode}
        onHover={setHover}
        onSelect={(body) => {
          setSelected(body);
          setLevel("object");
          setDiscPage("information");
        }}
        onProject={setPoint}
      />

      <div className="hud">
        <nav className="levels">
          <button
            onClick={() => {
              setLevel(level === "object" ? "system" : "galaxy");
              setSelected(null);
            }}
            title={zh.hud.goBack}
          >
            &lt; {zh.hud.back}
          </button>
          <button
            className={level === "galaxy" ? "on" : ""}
            onClick={() => {
              setLevel("galaxy");
              setSelected(null);
            }}
          >
            {zh.hud.gal}
          </button>
          <button
            className={level === "system" ? "on" : ""}
            onClick={() => {
              setLevel("system");
              setSelected(null);
            }}
          >
            {zh.hud.sys}
          </button>
          <button className={level === "object" ? "on" : ""} onClick={() => selected && setLevel("object")}>
            {zh.hud.obj}
          </button>
        </nav>

        <div className="focus">
          <i />
          {focus.toUpperCase()}
        </div>
        <div className="utils">
          <button className={sound ? "on" : ""} onClick={() => setSound((s) => !s)} title={zh.hud.sound}>
            {sound ? "♪" : "MUTE"}
          </button>
          <button
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen?.();
            }}
            title={zh.hud.fullscreen}
          >
            ⛶
          </button>
        </div>

        {hover && !selected && point && (
          <div className="hover-tip" style={{ left: point.x + 18, top: point.y - 10 }}>
            {zh.disc.controlDisc} &gt;
          </div>
        )}

        {selected && level === "object" && point && (
          <ControlDisc body={selected} page={discPage} point={point} onPage={setDiscPage} />
        )}

        <footer className="dock">
          <div className="brand-ark">
            <ArkMark />
            <strong>ARK STARMAP</strong>
            <a href="https://robertsspaceindustries.com/">{zh.hud.backToSite}</a>
          </div>
          <div className="tabs">
            {(["search", "bookmarks", "routes", "display"] as const).map((id) => (
              <button key={id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => setTab(tab === id ? null : id)}>
                {zh.hud[id]}
              </button>
            ))}
          </div>
          <div className="tools">
            <span>{zh.hud.sensors}</span>
            <button className={view === "3d" ? "on" : ""} onClick={() => setView("3d")}>
              {zh.hud.view3d}
            </button>
            <button className={view === "2d" ? "on" : ""} onClick={() => setView("2d")}>
              {zh.hud.view2d}
            </button>
            <span>{zh.hud.camera}</span>
          </div>
          <div className="compass">
            <span>STAR CITIZEN</span>
          </div>
        </footer>

        {tab === "search" && (
          <section className="panel">
            <div className="search-box">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={zh.study.filterPlaceholder}
              />
            </div>
            <table>
              <thead>
                <tr>
                  <th>{zh.search.name}</th>
                  <th>{zh.search.type}</th>
                </tr>
              </thead>
              <tbody>
                {hits.map((row) => (
                  <tr key={row.code} onClick={() => pickHit(row.code, row.type)}>
                    <td>{row.name}</td>
                    <td>{zh.types[row.type as keyof typeof zh.types] ?? row.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {tab === "bookmarks" && (
          <section className="panel">
            <table>
              <thead>
                <tr>
                  <th>{zh.search.name}</th>
                  <th>{zh.search.type}</th>
                </tr>
              </thead>
            </table>
            <p className="empty">{zh.bookmarks.empty}</p>
          </section>
        )}

        {tab === "routes" && (
          <section className="panel">
            <div className="fields">
              <input value={from} onChange={(e) => setFrom(e.target.value.toUpperCase())} placeholder={zh.disc.departure} />
              <input value={to} onChange={(e) => setTo(e.target.value.toUpperCase())} placeholder={zh.disc.destination} />
              <button className="cta slim-cta" onClick={() => setRouteKey(`${from}-${to}`)}>
                {zh.hud.calculate} &gt;
              </button>
            </div>
            {route ? (
              <table>
                <thead>
                  <tr>
                    <th>{zh.search.name}</th>
                    <th>{zh.search.type}</th>
                  </tr>
                </thead>
                <tbody>
                  {route.segments.map((seg) => (
                    <tr key={String(seg.id)}>
                      <td>{seg.name}</td>
                      <td>{seg.type === "jump" ? zh.levels.jumpPoint : zh.levels.starSystem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : routeKey ? (
              <p className="empty">{zh.routes.empty}</p>
            ) : null}
          </section>
        )}

        {tab === "display" && (
          <section className="panel">
            <div className="display-grid">
              <div>
                <h3>{zh.disc.affiliation}</h3>
                {["UEE", "Banu", "Vanduul", "Xi'an", "Unclaimed"].map((n) => (
                  <label key={n}>
                    <input type="checkbox" defaultChecked /> {n}
                  </label>
                ))}
              </div>
              <div>
                <h3>{zh.display.jumpTunnels}</h3>
                <label>
                  <input type="checkbox" defaultChecked /> {zh.display.sizeS}
                </label>
                <label>
                  <input type="checkbox" defaultChecked /> {zh.display.sizeM}
                </label>
                <label>
                  <input type="checkbox" defaultChecked /> {zh.display.sizeL}
                </label>
              </div>
              <div>
                <h3>{zh.display.longRangeScanner}</h3>
                <label>
                  <input type="checkbox" /> {zh.display.lifeforms}
                </label>
                <label>
                  <input type="checkbox" /> {zh.display.economy}
                </label>
                <label>
                  <input type="checkbox" /> {zh.display.crime}
                </label>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
