import { useCallback, useEffect, useMemo, useState } from "react";
import type { CameraTuple, Level, TabId } from "@/data/cameraUrl";
import { readMapUrl, writeMapUrl } from "@/data/cameraUrl";
import type { CapturedBody } from "@/data/celestial";
import { bodyLabel, jumpDestination, systemCodeOf } from "@/data/celestial";
import {
  AFFILIATIONS,
  findRoute,
  loadSystem,
  objects,
  pickRoute,
  routeSystems,
  searchCatalog,
  systemByCode,
  systems,
  type RouteResult,
} from "@/data/catalog";
import { blip, store } from "@/data/storage";
import { zh } from "@/i18n/zh";
import { StarMapCanvas, type DisplayState, type ScreenPt } from "@/scene/StarMapCanvas";
import { ArkMark } from "./Intro";
import { ControlDisc } from "./ControlDisc";

const AFFIL_HEX: Record<string, string> = {
  uee: "#48bbd4",
  BANU: "#ffce17",
  VNCL: "#bd002d",
  XIAN: "#52c231",
  DEV: "#ca922d",
  UNC: "#f6851f",
};

const initial = readMapUrl();

const defaultDisplay = (): DisplayState => ({
  affiliations: Object.fromEntries(AFFILIATIONS.map((a) => [a.code, true])),
  tunnels: { S: false, M: false, L: false },
  scanners: { lifeforms: false, economy: false, crime: false },
});

export function Starmap() {
  const [systemCode, setSystemCode] = useState(initial.system || "GOSS");
  const [bodies, setBodies] = useState<CapturedBody[]>([]);
  const [level, setLevel] = useState<Level>(initial.location.includes(".") ? "object" : "system");
  const [tab, setTab] = useState<TabId>(initial.tab);
  const [view, setView] = useState<"3d" | "2d">(initial.view);
  const [hover, setHover] = useState<CapturedBody | null>(null);
  const [selected, setSelected] = useState<CapturedBody | null>(null);
  const [discPage, setDiscPage] = useState<"inspect" | "information" | "routing" | "bookmark">("information");
  const [ctx, setCtx] = useState<{ x: number; y: number; body?: CapturedBody; system?: string } | null>(null);
  const [inspectNonce, setInspectNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("GOSS");
  const [to, setTo] = useState("TERRA");
  const [ship, setShip] = useState<"S" | "M" | "L">("M");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeMode, setRouteMode] = useState<"shortest" | "leastjumps">("shortest");
  const [seg, setSeg] = useState(0);
  const [point, setPoint] = useState<ScreenPt | null>(null);
  const [focusCode, setFocusCode] = useState<string | null>(null);
  const [sound, setSound] = useState(() => store.sound());
  const [camera, setCamera] = useState<CameraTuple>(initial.camera);
  const [display, setDisplay] = useState<DisplayState>(defaultDisplay);
  const [marks, setMarks] = useState<string[]>(() => store.bookmarks());
  const [avoids, setAvoids] = useState<string[]>(() => store.avoid());
  const [jumping, setJumping] = useState(false);
  const [menu, setMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lookNonce, setLookNonce] = useState(0);
  const [markFilter, setMarkFilter] = useState<"all" | "system" | "body">("all");
  const [recent, setRecent] = useState<string[]>(() => store.recent());

  const sys = systemByCode.get(systemCode);
  const focus = selected ? bodyLabel(selected) : level === "galaxy" ? zh.levels.galaxy : sys?.name || systemCode;

  useEffect(() => {
    let live = true;
    setLoading(true);
    void loadSystem(systemCode).then((pack) => {
      if (!live) return;
      const next = pack?.bodies ?? [];
      setBodies(next);
      const loc = readMapUrl().location;
      const want = next.find((b) => b.code === loc);
      if (want) {
        setSelected(want);
        setLevel("object");
      }
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [systemCode]);

  useEffect(() => {
    const loc = selected?.code ?? (level === "galaxy" ? systemCode : systemCode);
    writeMapUrl({
      location: loc,
      system: systemCode,
      camera,
      tab,
      view,
    });
  }, [selected, systemCode, camera, tab, view, level]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (e.key === "Escape") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else if (tab) setTab(null);
        else if (selected) {
          setSelected(null);
          setLevel("system");
        } else if (level === "system") setLevel("galaxy");
      }
      if (e.key === "2") setView("2d");
      if (e.key === "3") setView("3d");
      if (e.key.toLowerCase() === "f") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
      }
      if (e.key === " ") {
        e.preventDefault();
        setSelected(null);
        setLevel(level === "galaxy" ? "system" : level);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, selected, level]);

  useEffect(() => {
    setSeg(0);
  }, [routeMode]);

  const hits = useMemo(() => searchCatalog(query, systemCode), [query, systemCode]);
  const markedHits = useMemo(() => {
    const rows: { name: string; code: string; type: string; system: string }[] = [];
    for (const code of marks) {
      const obj = objects.find((o) => o.code === code);
      if (obj) {
        rows.push({ name: bodyLabel(obj), code: obj.code, type: obj.type, system: obj.system });
        continue;
      }
      const sysRow = systems.find((s) => s.code === code);
      if (sysRow) rows.push({ name: sysRow.name, code: sysRow.code, type: "STAR_SYSTEM", system: sysRow.code });
    }
    if (markFilter === "system") return rows.filter((r) => r.type === "STAR_SYSTEM");
    if (markFilter === "body") return rows.filter((r) => r.type !== "STAR_SYSTEM");
    return rows;
  }, [marks, markFilter]);

  const enterSystem = useCallback(
    (code: string, body?: CapturedBody | null) => {
      blip(sound);
      const named = systemByCode.get(code)?.name || code;
      setRecent(store.pushRecent(named));
      setSystemCode(code);
      setFocusCode(null);
      setLevel(body ? "object" : "system");
      setSelected(body ?? null);
      setTab(null);
    },
    [sound],
  );

  const jumpThrough = useCallback(
    async (fromBody?: CapturedBody | null) => {
      const dest = fromBody ? jumpDestination(fromBody.code) : null;
      if (!dest) return;
      setJumping(true);
      blip(sound);
      await new Promise((r) => setTimeout(r, 720));
      setSystemCode(dest);
      setSelected(null);
      setLevel("system");
      setJumping(false);
    },
    [sound],
  );

  const pickHit = (code: string, type: string, system?: string) => {
    blip(sound);
    const named =
      type === "STAR_SYSTEM"
        ? systemByCode.get(code)?.name || code
        : bodyLabel(objects.find((o) => o.code === code) ?? { name: code, designation: null, code });
    setRecent(store.pushRecent(named));
    if (type === "STAR_SYSTEM") {
      enterSystem(code);
      return;
    }
    const home = system || systemCodeOf(code);
    if (home !== systemCode) {
      setSystemCode(home);
      setLevel("object");
      setTab(null);
      void loadSystem(home).then((pack) => {
        const body = pack?.bodies.find((b) => b.code === code) ?? null;
        setSelected(body);
        setBodies(pack?.bodies ?? []);
      });
      return;
    }
    const body = bodies.find((b) => b.code === code);
    if (body) {
      setSelected(body);
      setLevel("object");
      setDiscPage("information");
      setTab(null);
    }
  };

  const calculate = () => {
    blip(sound);
    const result = findRoute(from, to);
    setRoute(result);
    setSeg(0);
    if (result.ok && result.shortest?.segments.length) setLevel("galaxy");
  };

  const shown = pickRoute(route, routeMode);
  const drawnRoute = routeSystems(route, routeMode);

  return (
    <>
      <StarMapCanvas
        bodies={bodies}
        systems={systems}
        mode={level}
        view={view}
        selected={level === "object" ? selected : null}
        focusCode={focusCode}
        currentSystem={systemCode}
        display={display}
        routeSystems={drawnRoute}
        camera={camera}
        lookNonce={lookNonce}
        inspectNonce={inspectNonce}
        onHover={setHover}
        onSelect={(body) => {
          blip(sound);
          setCtx(null);
          setSelected(body);
          setLevel("object");
          setDiscPage("information");
        }}
        onSelectSystem={(code) => enterSystem(code)}
        onContext={(hit, x, y) => {
          blip(sound);
          if (!hit) {
            setCtx(null);
            return;
          }
          setCtx({ x, y, body: hit.body, system: hit.system });
        }}
        onProject={setPoint}
        onCamera={setCamera}
      />

      {jumping && <div className="jump-veil" />}
      {loading && <div className="load-hint">{zh.search.loading}</div>}
      {level === "galaxy" && (display.scanners.lifeforms || display.scanners.economy || display.scanners.crime) && (
        <div className="scan-tag">
          {display.scanners.crime
            ? `// ${zh.disc.threat}`
            : display.scanners.economy
              ? `// ${zh.disc.economy}`
              : zh.display.populationTag}
        </div>
      )}

      <div className="hud">
        <nav className="levels">
          <button
            onClick={() => {
              if (level === "object") {
                setLevel("system");
                setSelected(null);
              } else setLevel("galaxy");
            }}
            title={zh.hud.goBack}
          >
            &lt; {zh.hud.back}
          </button>
            <button
              data-level="galaxy"
              className={level === "galaxy" ? "on" : ""}
              onClick={() => {
                setLevel("galaxy");
                setSelected(null);
                setCamera([10, 0, 0.4, 0, 0]);
              }}
            >
              {zh.hud.gal}
            </button>
            <button
              data-level="system"
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
          <button
            className={sound ? "on" : ""}
            onClick={() => {
              setSound((s) => {
                store.setSound(!s);
                return !s;
              });
            }}
            title={zh.hud.sound}
          >
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

        {hover && !selected && !ctx && point && (
          <div className="hover-tip" style={{ left: point.x + 18, top: point.y - 10 }}>
            {zh.disc.controlDisc} &gt;
          </div>
        )}

        {ctx && (
          <div className="ctx-menu" data-ctx="menu" style={{ left: ctx.x, top: ctx.y }}>
            <button
              type="button"
              data-action="inspect"
              onClick={() => {
                if (ctx.body) {
                  setSelected(ctx.body);
                  setLevel("object");
                  setDiscPage("inspect");
                  setInspectNonce((n) => n + 1);
                } else if (ctx.system) {
                  setSelected(null);
                  setFocusCode(ctx.system);
                }
                setCtx(null);
              }}
            >
              {zh.disc.inspect}
            </button>
            <button
              type="button"
              data-page="information"
              onClick={() => {
                if (ctx.body) {
                  setSelected(ctx.body);
                  setLevel("object");
                  setDiscPage("information");
                } else if (ctx.system) enterSystem(ctx.system);
                setCtx(null);
              }}
            >
              {zh.disc.information}
            </button>
            <button
              type="button"
              data-page="routing"
              onClick={() => {
                if (ctx.body) {
                  setSelected(ctx.body);
                  setLevel("object");
                  setDiscPage("routing");
                } else if (ctx.system) {
                  setFrom(systemByCode.get(ctx.system)?.name || ctx.system);
                  setTab("routes");
                }
                setCtx(null);
              }}
            >
              {zh.disc.routing}
            </button>
            <button
              type="button"
              data-page="bookmark"
              onClick={() => {
                const code = ctx.body?.code || ctx.system;
                if (code) setMarks(store.toggleBookmark(code));
                if (ctx.body) {
                  setSelected(ctx.body);
                  setLevel("object");
                  setDiscPage("bookmark");
                }
                setCtx(null);
              }}
            >
              {zh.disc.bookmark}
            </button>
          </div>
        )}

        {selected && level === "object" && point && (
          <ControlDisc
            body={selected}
            page={discPage}
            point={point}
            affiliation={selected.affiliation?.[0]?.name || sys?.affiliationName || "UEE"}
            bookmarked={marks.includes(selected.code)}
            avoided={avoids.includes(selected.code)}
            onPage={(p) => {
              setDiscPage(p);
              if (p === "inspect") setInspectNonce((n) => n + 1);
            }}
            onDeparture={() => {
              setFrom(bodyLabel(selected));
              setTab("routes");
              setDiscPage("routing");
            }}
            onDestination={() => {
              setTo(bodyLabel(selected));
              setTab("routes");
            }}
            onBookmark={() => setMarks(store.toggleBookmark(selected.code))}
            onAvoid={() => setAvoids(store.toggleAvoid(selected.code))}
            onJump={() => void jumpThrough(selected)}
          />
        )}

        <footer className="dock">
          <div className="brand-ark">
            <ArkMark />
            <strong>ARK STARMAP</strong>
            <a href="https://robertsspaceindustries.com/">{zh.hud.backToSite}</a>
          </div>
          <div className="tabs">
            {(["search", "bookmarks", "routes", "display"] as const).map((id) => (
              <button
                key={id}
                data-tab={id}
                className={`tab ${tab === id ? "on" : ""}`}
                onClick={() => setTab(tab === id ? null : id)}
              >
                {zh.hud[id]}
              </button>
            ))}
          </div>
          <div className="tools">
            <span>{zh.hud.sensors}</span>
            <button data-view="3d" className={view === "3d" ? "on" : ""} onClick={() => setView("3d")}>
              {zh.hud.view3d}
            </button>
            <button data-view="2d" className={view === "2d" ? "on" : ""} onClick={() => setView("2d")}>
              {zh.hud.view2d}
            </button>
            <span>{zh.hud.camera}</span>
          </div>
          <button
            type="button"
            className="compass"
            data-action="compass"
            title={zh.hud.camera}
            onClick={() => {
              if (level === "galaxy") {
                setCamera([10, 0, 0.4, 0, 0]);
              } else {
                setSelected(null);
                setLevel("system");
                setCamera([10, 102.98, 0.002, 0, 0]);
              }
              setLookNonce((n) => n + 1);
            }}
          >
            <span>STAR CITIZEN</span>
          </button>
        </footer>

        <button className="burger-hit" onClick={() => setMenu((m) => !m)} aria-label="menu" />
        {menu && (
          <div className="flyout">
            <a href="#">{zh.hud.home}</a>
            <a href="#">{zh.hud.explore}</a>
            <a href="#">{zh.hud.starmap}</a>
            <p>{sys?.type === "BINARY" ? zh.disc.binary : zh.disc.singleStar}</p>
          </div>
        )}

        {tab === "search" && (
          <section className="panel">
            <div className="search-box">
              <input
                data-search
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={zh.study.filterPlaceholder}
                autoFocus
              />
            </div>
            {!query.trim() && recent.length > 0 && (
              <ul className="search-auto" data-search-auto>
                {recent.map((name) => (
                  <li key={name}>
                    <button type="button" onClick={() => setQuery(name)}>
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query.trim().length >= 3 && (
              <p className="found-count" data-found={hits.length}>
                {hits.length} {zh.search.itemsFound}
              </p>
            )}
            <table>
              <thead>
                <tr>
                  <th>{zh.search.name}</th>
                  <th>{zh.search.type}</th>
                  <th>{zh.search.information}</th>
                </tr>
              </thead>
              <tbody>
                {hits.map((row) => (
                  <tr key={row.code} onClick={() => pickHit(row.code, row.type, row.system)}>
                    <td>
                      {row.type === "STAR_SYSTEM"
                        ? row.name
                        : `${row.name} ${zh.search.in} ${systemByCode.get(row.system ?? "")?.name || row.system || ""}`}
                    </td>
                    <td>{zh.types[row.type as keyof typeof zh.types] ?? row.type}</td>
                    <td>
                      <button
                        type="button"
                        className="row-mark"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMarks(store.toggleBookmark(row.code));
                        }}
                      >
                        {marks.includes(row.code) ? zh.search.removeBookmark : zh.search.bookmarkAction}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {query.trim().length >= 3 && !hits.length && <p className="empty">{zh.search.empty}</p>}
          </section>
        )}

        {tab === "bookmarks" && (
          <section className="panel">
            <div className="ship-row">
              <span>{zh.hud.filters}</span>
              <button className={markFilter === "system" ? "on" : ""} onClick={() => setMarkFilter(markFilter === "system" ? "all" : "system")}>
                {zh.bookmarks.starSystem}
              </button>
              <button className={markFilter === "body" ? "on" : ""} onClick={() => setMarkFilter(markFilter === "body" ? "all" : "body")}>
                {zh.bookmarks.celestialBody}
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>{zh.search.name}</th>
                  <th>{zh.search.type}</th>
                  <th>{zh.search.information}</th>
                </tr>
              </thead>
              <tbody>
                {markedHits.map((row) => (
                  <tr key={row.code} onClick={() => pickHit(row.code, row.type, row.system)}>
                    <td>{row.name}</td>
                    <td>{zh.types[row.type as keyof typeof zh.types] ?? row.type}</td>
                    <td>
                      <button
                        type="button"
                        className="row-mark"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMarks(store.toggleBookmark(row.code));
                        }}
                      >
                        {zh.search.removeBookmark}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!markedHits.length && (
              <p className="empty">{marks.length && markFilter !== "all" ? zh.bookmarks.emptyFiltered : zh.bookmarks.empty}</p>
            )}
          </section>
        )}

        {tab === "routes" && (
          <section className="panel">
            <div className="fields">
              <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder={zh.disc.departure} />
              <input value={to} onChange={(e) => setTo(e.target.value)} placeholder={zh.disc.destination} />
              <button className="cta slim-cta" onClick={calculate}>
                {zh.hud.calculate} &gt;
              </button>
            </div>
            <div className="ship-row">
              <span>{zh.routes.shipSize}</span>
              {(["S", "M", "L"] as const).map((sz) => (
                <button key={sz} className={ship === sz ? "on" : ""} onClick={() => setShip(sz)}>
                  {sz === "S" ? zh.display.sizeS : sz === "M" ? zh.display.sizeM : zh.display.sizeL}
                </button>
              ))}
              <button
                data-route-mode="shortest"
                className={routeMode === "shortest" ? "on" : ""}
                onClick={() => setRouteMode("shortest")}
              >
                {zh.routes.shortest}
              </button>
              <button
                data-route-mode="leastjumps"
                className={routeMode === "leastjumps" ? "on" : ""}
                onClick={() => setRouteMode("leastjumps")}
              >
                {zh.routes.leastJumps}
              </button>
            </div>
            {shown && !route?.empty ? (
              <>
                <p className="route-meta" data-route-shown={routeMode} data-jumps={shown.jumps ?? ""}>
                  {shown.name} · {shown.label} · {shown.jumps} {zh.levels.jumpPoint}
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>{zh.search.name}</th>
                      <th>{zh.search.type}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.segments.map((s, i) => (
                      <tr
                        key={`${s.code}-${i}`}
                        className={i === seg ? "on-row" : ""}
                        onClick={() => {
                          setSeg(i);
                          if (s.type === "system") enterSystem(s.code);
                        }}
                      >
                        <td>{s.name}</td>
                        <td>{s.type === "jump" ? zh.levels.jumpPoint : zh.levels.starSystem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="ship-row">
                  <button onClick={() => setSeg((n) => Math.max(0, n - 1))}>{zh.routes.prevSegment}</button>
                  <button
                    onClick={() => setSeg((n) => Math.min((shown.segments.length ?? 1) - 1, n + 1))}
                  >
                    {zh.routes.nextSegment}
                  </button>
                  <button onClick={() => setLevel("galaxy")}>{zh.routes.viewRoute}</button>
                  <button
                    onClick={() => {
                      setRoute(null);
                      setLevel("system");
                    }}
                  >
                    {zh.routes.exitRoute}
                  </button>
                </div>
              </>
            ) : route ? (
              <p className="empty">{route.ok ? zh.routes.empty : route.msg}</p>
            ) : null}
          </section>
        )}

        {tab === "display" && (
          <section className="display-bar" data-display={level === "galaxy" ? "galaxy" : "system"}>
            {level === "galaxy" && (
            <div className="display-group">
              <div className="display-icons">
                {AFFILIATIONS.map((n) => (
                  <label key={n.code} className="display-dot" title={n.name}>
                    <input
                      data-affil={n.code}
                      type="checkbox"
                      checked={display.affiliations[n.code] !== false}
                      onChange={(e) =>
                        setDisplay((d) => ({
                          ...d,
                          affiliations: { ...d.affiliations, [n.code]: e.target.checked },
                        }))
                      }
                    />
                    <i style={{ background: AFFIL_HEX[n.code] }} />
                    <span>{n.name}</span>
                  </label>
                ))}
              </div>
              <em>{zh.display.factions}</em>
            </div>
            )}
            {level === "galaxy" && (
            <div className="display-group">
              <div className="display-icons">
                {(["S", "M", "L"] as const).map((sz) => (
                  <label key={sz} className={`display-ring ${sz.toLowerCase()}`}>
                    <input
                      data-tunnel={sz}
                      type="checkbox"
                      checked={display.tunnels[sz]}
                      onChange={(e) =>
                        setDisplay((d) => ({ ...d, tunnels: { ...d.tunnels, [sz]: e.target.checked } }))
                      }
                    />
                    <i />
                    <span>{sz === "S" ? zh.display.sizeS : sz === "M" ? zh.display.sizeM : zh.display.sizeL}</span>
                  </label>
                ))}
              </div>
              <em>{zh.display.jumpTunnels}</em>
            </div>
            )}
            <div className="display-group">
              <div className="display-icons">
                {(
                  [
                    ["lifeforms", zh.display.lifeforms],
                    ["economy", zh.display.economy],
                    ["crime", zh.display.crime],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className={`display-scan ${key}`}>
                    <input
                      data-scan={key}
                      type="checkbox"
                      checked={display.scanners[key]}
                      onChange={() =>
                        setDisplay((d) => {
                          const on = !d.scanners[key];
                          return {
                            ...d,
                            scanners: { lifeforms: false, economy: false, crime: false, [key]: on },
                          };
                        })
                      }
                    />
                    <i />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <em>{zh.display.sensors}</em>
            </div>
            <div className="display-group">
              <div className="display-icons">
                <button data-view="3d" className={view === "3d" ? "on" : ""} onClick={() => setView("3d")}>
                  {zh.hud.view3d}
                </button>
                <button data-view="2d" className={view === "2d" ? "on" : ""} onClick={() => setView("2d")}>
                  {zh.hud.view2d}
                </button>
              </div>
              <em>{zh.hud.camera}</em>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
