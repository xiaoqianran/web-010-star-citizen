import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CameraTuple, Level, TabId } from "@/data/cameraUrl";
import { GALAXY_HOME, readMapUrl, sameCamera, SEARCH_SYSTEM_CAM, SYSTEM_HOME, writeMapUrl } from "@/data/cameraUrl";
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
import { AFFIL_HEX, emptyZones, type OfficialSystemZones } from "@/data/official";
import { blip, store } from "@/data/storage";
import { zh } from "@/i18n/zh";
import { StarMapCanvas, type DisplayState, type ScreenPt } from "@/scene/StarMapCanvas";
import { ArkMark } from "./Intro";
import { ControlDisc } from "./ControlDisc";

const initial = readMapUrl();
const bootQuery = () => new URLSearchParams(window.location.search);
const firstLevel = (): Level => {
  const q = bootQuery();
  if (!q.has("location") && !q.has("system")) return "galaxy";
  return initial.location.includes(".") ? "object" : "system";
};
const firstCamera = (): CameraTuple => {
  const q = bootQuery();
  if (!q.has("camera") && !q.has("location") && !q.has("system")) return [...GALAXY_HOME];
  return initial.camera;
};

const defaultDisplay = (): DisplayState => ({
  affiliations: Object.fromEntries(AFFILIATIONS.map((a) => [a.code, true])),
  tunnels: { S: false, M: false, L: false },
  scanners: { lifeforms: false, economy: false, crime: false },
});

export function Starmap() {
  const [systemCode, setSystemCode] = useState(initial.system || "GOSS");
  const [bodies, setBodies] = useState<CapturedBody[]>([]);
  const [level, setLevel] = useState<Level>(firstLevel);
  const [tab, setTab] = useState<TabId>(initial.tab);
  const [view, setView] = useState<"3d" | "2d">(initial.view);
  const [hover, setHover] = useState<CapturedBody | null>(null);
  const [selected, setSelected] = useState<CapturedBody | null>(null);
  const [discPage, setDiscPage] = useState<"inspect" | "information" | "routing" | "bookmark">("information");
  const [inspectNonce, setInspectNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [from, setFrom] = useState("GOSS");
  const [to, setTo] = useState("TERRA");
  const [ship, setShip] = useState<"S" | "M" | "L">("M");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeMode, setRouteMode] = useState<"shortest" | "leastjumps">("shortest");
  const [seg, setSeg] = useState(0);
  const [highlightCode, setHighlightCode] = useState<string | null>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const jumpingRef = useRef(false);
  const [sound, setSound] = useState(() => store.sound());
  const [camera, setCamera] = useState<CameraTuple>(firstCamera);
  const [display, setDisplay] = useState<DisplayState>(defaultDisplay);
  const [marks, setMarks] = useState<string[]>(() => store.bookmarks());
  const [avoids, setAvoids] = useState<string[]>(() => store.avoid());
  const [jumping, setJumping] = useState(false);
  const [menu, setMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lookNonce, setLookNonce] = useState(0);
  const [markFilter, setMarkFilter] = useState<"all" | "system" | "body">("all");
  const [recent, setRecent] = useState<string[]>(() => store.recent());
  const [zones, setZones] = useState<OfficialSystemZones>(emptyZones);

  const sys = systemByCode.get(systemCode);
  const highlighted = highlightCode ? systemByCode.get(highlightCode) : undefined;
  const focus = selected
    ? bodyLabel(selected)
    : level === "galaxy"
      ? highlighted?.name || zh.levels.galaxy
      : sys?.name || systemCode;

  useEffect(() => {
    let live = true;
    setLoading(true);
    void loadSystem(systemCode)
      .then((pack) => {
        if (!live) return;
        const next = pack?.bodies ?? [];
        setBodies(next);
        setZones(pack?.zones ?? emptyZones());
        const loc = readMapUrl().location;
        const want = next.find((b) => b.code === loc);
        if (want) {
          setSelected(want);
          setLevel("object");
        }
      })
      .catch(() => {
        if (live) {
          setBodies([]);
          setZones(emptyZones());
        }
      })
      .finally(() => {
        if (live) setLoading(false);
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
      selection: level === "galaxy" ? highlightCode : null,
    });
  }, [selected, systemCode, camera, tab, view, level, highlightCode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
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
      if (e.key === " " && tag !== "BUTTON") {
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

  const hits = useMemo(() => (submitted == null ? [] : searchCatalog(submitted)), [submitted]);
  const showResults = submitted != null && submitted.trim().length >= 3;
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
    (code: string, body?: CapturedBody | null, cam?: CameraTuple) => {
      blip(sound);
      const named = systemByCode.get(code)?.name || code;
      setRecent(store.pushRecent(named));
      setSystemCode(code);
      setHighlightCode(null);
      setLevel(body ? "object" : "system");
      setSelected(body ?? null);
      setTab(null);
      if (cam) {
        setCamera([...cam]);
        setLookNonce((n) => n + 1);
      }
    },
    [sound],
  );

  const jumpThrough = useCallback(
    async (fromBody?: CapturedBody | null) => {
      const dest = fromBody ? jumpDestination(fromBody.code) : null;
      if (!dest || jumpingRef.current) return;
      jumpingRef.current = true;
      setJumping(true);
      blip(sound);
      try {
        await new Promise((r) => setTimeout(r, 720));
        setSystemCode(dest);
        setSelected(null);
        setLevel("system");
      } finally {
        jumpingRef.current = false;
        setJumping(false);
      }
    },
    [sound],
  );

  const placeHud = useCallback((pt: ScreenPt | null) => {
    const disc = discRef.current;
    if (disc) {
      if (pt) {
        disc.style.left = `${pt.x}px`;
        disc.style.top = `${pt.y}px`;
        disc.style.visibility = "visible";
      } else {
        disc.style.visibility = "hidden";
      }
    }
    const tip = tipRef.current;
    if (tip) {
      if (pt) {
        tip.style.left = `${pt.x + 18}px`;
        tip.style.top = `${pt.y - 10}px`;
        tip.style.visibility = "visible";
      } else {
        tip.style.visibility = "hidden";
      }
    }
  }, []);

  const onCamera = useCallback((c: CameraTuple) => {
    setCamera((prev) => (sameCamera(prev, c) ? prev : c));
  }, []);

  const pickHit = (code: string, type: string, system?: string) => {
    blip(sound);
    const named =
      type === "STAR_SYSTEM"
        ? systemByCode.get(code)?.name || code
        : bodyLabel(objects.find((o) => o.code === code) ?? { name: code, designation: null, code });
    setRecent(store.pushRecent(named));
    if (type === "STAR_SYSTEM") {
      enterSystem(code, null, SEARCH_SYSTEM_CAM);
      return;
    }
    const home = system || systemCodeOf(code);
    if (home !== systemCode) {
      setSystemCode(home);
      setLevel("object");
      setTab(null);
      void loadSystem(home)
        .then((pack) => {
          const body = pack?.bodies.find((b) => b.code === code) ?? null;
          setSelected(body);
          setBodies(pack?.bodies ?? []);
          setZones(pack?.zones ?? emptyZones());
        })
        .catch(() => {
          setSelected(null);
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

  const applyRoute = (nextShip: "S" | "M" | "L" = ship) => {
    blip(sound);
    const result = findRoute(from, to, nextShip);
    setRoute(result);
    setSeg(0);
    if (result.ok && result.shortest?.segments.length) setLevel("galaxy");
  };

  const calculate = () => applyRoute(ship);

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
        highlightCode={highlightCode}
        currentSystem={systemCode}
        display={display}
        routeSystems={drawnRoute}
        zones={zones}
        camera={camera}
        lookNonce={lookNonce}
        inspectNonce={inspectNonce}
        onHover={setHover}
        onSelect={(body) => {
          blip(sound);
          setSelected(body);
          setLevel("object");
          setDiscPage("information");
        }}
        onSelectSystem={(code) => {
          blip(sound);
          setHighlightCode(code);
        }}
        onBackground={() => {
          setMenu(false);
          setHighlightCode(null);
          if (selected) {
            setSelected(null);
            if (level === "object") setLevel("system");
            return;
          }
          if (level === "system") {
            setLevel("galaxy");
            setCamera([...GALAXY_HOME]);
            setLookNonce((n) => n + 1);
          }
        }}
        onContext={(hit) => {
          if (!hit) return;
          blip(sound);
          if (hit.body) {
            setSelected(hit.body);
            setLevel("object");
            setDiscPage("information");
            return;
          }
          if (hit.system) setHighlightCode(hit.system);
        }}
        onProject={placeHud}
        onCamera={onCamera}
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

      <div className="hud" data-ready={loading ? "0" : "1"}>
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
                setCamera([...GALAXY_HOME]);
                setLookNonce((n) => n + 1);
              }}
            >
              {zh.hud.gal}
            </button>
            <button
              data-level="system"
              className={level === "system" ? "on" : ""}
              onClick={() => {
                if (level === "galaxy") {
                  if (highlightCode) enterSystem(highlightCode, null, SYSTEM_HOME);
                  return;
                }
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

        {hover && !selected && (
          <div className="hover-tip" ref={tipRef}>
            {zh.disc.controlDisc} &gt;
          </div>
        )}

        {selected && level === "object" && (
          <ControlDisc
            ref={discRef}
            body={selected}
            page={discPage}
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
            onOpen={() => {
              setDiscPage("inspect");
              setInspectNonce((n) => n + 1);
            }}
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
                setCamera([...GALAXY_HOME]);
              } else {
                setSelected(null);
                setLevel("system");
                setCamera([...SYSTEM_HOME]);
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
            <a href="#starmap" onClick={(e) => e.preventDefault()}>
              {zh.hud.home}
            </a>
            <a href="#starmap" onClick={(e) => e.preventDefault()}>
              {zh.hud.explore}
            </a>
            <a href="#starmap" onClick={(e) => e.preventDefault()}>
              {zh.hud.starmap}
            </a>
            <p>{sys?.type === "BINARY" ? zh.disc.binary : zh.disc.singleStar}</p>
          </div>
        )}

        {tab === "search" && (
          <section className="panel">
            <div className="search-box">
              <input
                data-search
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value.trim()) setSubmitted(null);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  setSubmitted(query);
                }}
                placeholder={zh.study.filterPlaceholder}
              />
            </div>
            {!query.trim() && recent.length > 0 && (
              <ul className="search-auto sm-search-autocomplete" data-search-auto>
                {recent.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(name);
                        setSubmitted(name);
                      }}
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showResults && (
              <p className="found-count" data-found={hits.length}>
                {hits.length} {zh.search.itemsFound}
              </p>
            )}
            {showResults && hits.length > 0 && (
            <div className="sm-table-container">
            <table>
              <thead>
                <tr>
                  <th className="sm-name">{zh.search.name}</th>
                  <th className="sm-type">{zh.search.type}</th>
                  <th className="sm-bookmark-container">{zh.search.information}</th>
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
            </div>
            )}
            {showResults && !hits.length && <p className="empty">{zh.search.empty}</p>}
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
          <section className="panel sm-routes">
            <div className="fields">
              <label className="field sm-departure-region">
                <span>{zh.disc.departure}</span>
                <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder={zh.disc.departure} />
              </label>
              <label className="field sm-destination-region">
                <span>{zh.disc.destination}</span>
                <input value={to} onChange={(e) => setTo(e.target.value)} placeholder={zh.disc.destination} />
              </label>
              <button className="cta slim-cta sm-go" onClick={calculate}>
                {zh.hud.calculate} &gt;
              </button>
            </div>
            <div className="ship-row sm-route-sizes">
              <span>{zh.routes.shipSize}</span>
              {(["S", "M", "L"] as const).map((sz) => (
                <button
                  key={sz}
                  data-ship={sz}
                  className={`sm-ship-size ${ship === sz ? "on" : ""}`}
                  onClick={() => {
                    setShip(sz);
                    if (route) applyRoute(sz);
                  }}
                >
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
                <p
                  className="route-meta"
                  data-route-shown={routeMode}
                  data-jumps={shown.jumps ?? ""}
                  data-through={shown.label ?? ""}
                >
                  {shown.name}
                  {shown.label ? ` · ${shown.label}` : ""}
                </p>
                <div className="sm-list-region">
                <div className="sm-table-container">
                <table data-route-table className="sm-list">
                  <thead>
                    <tr>
                      <th className="sm-label">{zh.search.name}</th>
                      <th className="sm-jumps">{zh.routes.jumps}</th>
                      <th className="sm-distance">{zh.routes.distance}</th>
                      <th className="sm-selection">{zh.routes.selection}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="on-row">
                      <td className="sm-label">{shown.name}</td>
                      <td className="sm-jumps">{shown.jumps ?? "—"}</td>
                      <td className="sm-distance">
                        {shown.flight_distance != null
                          ? `${Number(shown.flight_distance).toFixed(3)} ${zh.routes.au}`
                          : "—"}
                      </td>
                      <td className="sm-selection">
                        <button type="button" className="row-mark" onClick={() => setLevel("galaxy")}>
                          {zh.routes.viewRoute}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
                </div>
                <p className="route-seg sm-current-segment" data-current-segment={seg}>
                  <button
                    type="button"
                    onClick={() => {
                      const step = shown.segments[seg];
                      if (step?.type === "system") enterSystem(step.code, null, SYSTEM_HOME);
                    }}
                  >
                    {shown.segments[seg]?.name ?? shown.first_jump}
                  </button>
                </p>
                <div className="ship-row">
                  <button type="button" className="sm-prev-segment" onClick={() => setSeg((n) => Math.max(0, n - 1))}>
                    {zh.routes.prevSegment}
                  </button>
                  <button
                    type="button"
                    className="sm-next-segment"
                    onClick={() => setSeg((n) => Math.min((shown.segments.length ?? 1) - 1, n + 1))}
                  >
                    {zh.routes.nextSegment}
                  </button>
                  <button
                    type="button"
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
