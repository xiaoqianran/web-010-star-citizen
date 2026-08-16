import { useMemo, useState } from "react";
import gossPayload from "@capture/api/star-systems/GOSS.json";
import systemsIndex from "@capture/index/systems.json";
import type { CapturedBody } from "@/data/celestial";
import { bodyLabel } from "@/data/celestial";
import { zh } from "@/i18n/zh";
import { StarMapCanvas } from "@/scene/StarMapCanvas";
import { ArkMark } from "./Intro";

type Tab = "search" | "bookmarks" | "routes" | "display" | null;
type Level = "galaxy" | "system" | "object";

const bodies = gossPayload.data.resultset[0].celestial_objects as CapturedBody[];
const systems = systemsIndex as {
  code: string;
  name: string;
  type: string;
  affiliation: string[];
  position: number[];
}[];

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

  const focus = selected ? bodyLabel(selected) : "GOSS";
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sysHits = systems
      .filter((s) => !q || s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .map((s) => ({ name: s.name, code: s.code, type: "STAR_SYSTEM" }));
    const objHits = bodies
      .filter((b) => !q || bodyLabel(b).toLowerCase().includes(q) || b.code.toLowerCase().includes(q))
      .map((b) => ({ name: bodyLabel(b), code: b.code, type: b.type }));
    return [...sysHits, ...objHits].slice(0, 18);
  }, [query]);

  return (
    <>
      <StarMapCanvas
        bodies={bodies}
        systems={systems}
        mode={level}
        selected={level === "object" ? selected : null}
        onHover={setHover}
        onSelect={(body) => {
          setSelected(body);
          setLevel("object");
          setDiscPage("information");
        }}
      />

      <div className="hud">
        <nav className="levels">
          <button
            onClick={() => {
              setLevel("system");
              setSelected(null);
            }}
            title={zh.hud.goBack}
          >
            &lt; {zh.hud.back}
          </button>
          <button className={level === "galaxy" ? "on" : ""} onClick={() => setLevel("galaxy")}>
            {zh.hud.gal}
          </button>
          <button className={level === "system" ? "on" : ""} onClick={() => setLevel("system")}>
            {zh.hud.sys}
          </button>
          <button className={level === "object" ? "on" : ""} onClick={() => selected && setLevel("object")}>
            {zh.hud.obj}
          </button>
        </nav>

        <div className="focus">{focus.toUpperCase()}</div>
        <div className="utils">
          <span>{zh.hud.sound}</span>
          <span>{zh.hud.fullscreen}</span>
        </div>

        {hover && !selected && (
          <div className="hover-tip" style={{ left: "48%", top: "46%" }}>
            {zh.disc.controlDisc} &gt;
          </div>
        )}

        {selected && level === "object" && (
          <>
            <div className="disc">
              <div className="disc-ring" />
              <div className="disc-meta">
                <div>{selected.type === "STAR" ? zh.disc.star : zh.disc.planet}</div>
                <div>{selected.subtype?.name.replaceAll("-", " - ") || zh.disc.unknown}</div>
              </div>
              <div className="disc-menu">
                <button
                  className={discPage === "information" ? "on" : ""}
                  onClick={() => setDiscPage("information")}
                >
                  {zh.disc.information}
                </button>
                <button className={discPage === "routing" ? "on" : ""} onClick={() => setDiscPage("routing")}>
                  {zh.disc.routing}
                </button>
                <button className={discPage === "bookmark" ? "on" : ""} onClick={() => setDiscPage("bookmark")}>
                  {zh.disc.bookmark}
                </button>
              </div>
            </div>
            <aside className="info-card">
              <h2>{bodyLabel(selected)}</h2>
              {discPage === "information" && (
                <dl>
                  <dt>{zh.disc.type}</dt>
                  <dd>{selected.subtype?.name || zh.types[selected.type as keyof typeof zh.types]}</dd>
                  <dt>{zh.disc.habitable}</dt>
                  <dd>{selected.habitable ? zh.disc.yes : zh.disc.no}</dd>
                  <dt>{zh.disc.size}</dt>
                  <dd>{selected.size || "—"}</dd>
                </dl>
              )}
              {discPage === "routing" && (
                <dl>
                  <dt>{zh.disc.setAs}</dt>
                  <dd>{zh.disc.departure}</dd>
                  <dt>{zh.disc.setAs}</dt>
                  <dd>{zh.disc.destination}</dd>
                </dl>
              )}
              {discPage === "bookmark" && <p className="empty">{zh.bookmarks.empty}</p>}
            </aside>
          </>
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
          <div className="compass">STAR CITIZEN</div>
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
                  <tr key={row.code}>
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
              <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder={zh.disc.departure} />
              <input value={to} onChange={(e) => setTo(e.target.value)} placeholder={zh.disc.destination} />
              <button className="cta">{zh.hud.calculate} &gt;</button>
            </div>
          </section>
        )}

        {tab === "display" && (
          <section className="panel">
            <div className="display-grid">
              <div>
                <h3>{zh.disc.affiliation}</h3>
                <label>
                  <input type="checkbox" defaultChecked /> UEE
                </label>
                <label>
                  <input type="checkbox" defaultChecked /> Banu
                </label>
                <label>
                  <input type="checkbox" defaultChecked /> Vanduul
                </label>
                <label>
                  <input type="checkbox" defaultChecked /> Xi'an
                </label>
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
