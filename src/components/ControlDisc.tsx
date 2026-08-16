import type { CapturedBody } from "@/data/celestial";
import { bodyLabel, jumpDestination, sensorNum } from "@/data/celestial";
import { zh } from "@/i18n/zh";
import type { ScreenPt } from "@/scene/StarMapCanvas";

export function ControlDisc({
  body,
  page,
  point,
  affiliation,
  bookmarked,
  avoided,
  onPage,
  onDeparture,
  onDestination,
  onBookmark,
  onAvoid,
  onJump,
}: {
  body: CapturedBody;
  page: "information" | "routing" | "bookmark";
  point: ScreenPt;
  affiliation: string;
  bookmarked: boolean;
  avoided: boolean;
  onPage: (p: "information" | "routing" | "bookmark") => void;
  onDeparture: () => void;
  onDestination: () => void;
  onBookmark: () => void;
  onAvoid: () => void;
  onJump: () => void;
}) {
  const dest = jumpDestination(body.code);
  const kind =
    body.type === "STAR"
      ? zh.disc.star
      : body.type === "PLANET"
        ? zh.disc.planet
        : body.type === "SATELLITE"
          ? zh.types.SATELLITE
          : body.type === "MANMADE"
            ? zh.types.MANMADE
            : body.type === "BLACKHOLE"
              ? zh.types.BLACKHOLE
              : zh.levels.jumpPoint;
  const sub = body.subtype?.name.replaceAll("-", " - ") || kind;
  return (
    <div className="disc-wrap" style={{ left: point.x, top: point.y }}>
      <svg className="disc-svg" viewBox="0 0 240 240" aria-hidden>
        <circle cx="120" cy="120" r="108" fill="none" stroke="#14e6fa" strokeOpacity="0.25" />
        <circle cx="120" cy="120" r="92" fill="none" stroke="#14e6fa" strokeOpacity="0.45" />
        <circle cx="120" cy="120" r="70" fill="#00101899" stroke="#42cbf8" strokeOpacity="0.7" />
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i / 36) * Math.PI * 2;
          const inner = i % 3 === 0 ? 100 : 104;
          return (
            <line
              key={i}
              x1={120 + Math.cos(a) * inner}
              y1={120 + Math.sin(a) * inner}
              x2={120 + Math.cos(a) * 108}
              y2={120 + Math.sin(a) * 108}
              stroke="#14e6fa"
              strokeOpacity="0.55"
            />
          );
        })}
        <path d="M120 28 L128 48 H112 Z" fill="#ffb534" />
      </svg>
      <div className="disc-meta">
        <div>{kind}</div>
        <div>{sub}</div>
      </div>
      <div className="disc-menu">
        <button data-page="information" className={page === "information" ? "on" : ""} onClick={() => onPage("information")}>
          {zh.disc.information}
        </button>
        <button data-page="routing" className={page === "routing" ? "on" : ""} onClick={() => onPage("routing")}>
          {zh.disc.routing}
        </button>
        <button data-page="bookmark" className={page === "bookmark" ? "on" : ""} onClick={() => onPage("bookmark")}>
          {zh.disc.bookmark}
        </button>
      </div>
      <aside className="info-card">
        <h2>{bodyLabel(body)}</h2>
        {page === "information" && (
          <dl>
            <dt>{zh.disc.type}</dt>
            <dd>{sub}</dd>
            <dt>{zh.disc.habitable}</dt>
            <dd>{body.habitable ? zh.disc.yes : zh.disc.no}</dd>
            <dt>{zh.disc.size}</dt>
            <dd>{body.size || "—"}</dd>
            <dt>{zh.disc.affiliation}</dt>
            <dd>{affiliation}</dd>
            <dt>{zh.disc.population}</dt>
            <dd>{sensorNum(body.sensor_population)}</dd>
            <dt>{zh.disc.economy}</dt>
            <dd>{sensorNum(body.sensor_economy)}</dd>
            <dt>{zh.disc.threat}</dt>
            <dd>{sensorNum(body.sensor_danger)}</dd>
          </dl>
        )}
        {page === "routing" && (
          <div className="disc-actions">
            <button data-action="departure" onClick={onDeparture}>
              {zh.disc.setAs} {zh.disc.departure}
            </button>
            <button data-action="destination" onClick={onDestination}>
              {zh.disc.setAs} {zh.disc.destination}
            </button>
            <button data-action="avoid" className={avoided ? "on" : ""} onClick={onAvoid}>
              {zh.disc.avoid}
            </button>
            {dest && (
              <button data-action="jump" className="jump-cta" onClick={onJump}>
                {zh.disc.jumpThrough} {dest}
              </button>
            )}
          </div>
        )}
        {page === "bookmark" && (
          <div className="disc-actions">
            <button data-action="bookmark" className={bookmarked ? "on" : ""} onClick={onBookmark}>
              {bookmarked ? zh.search.removeBookmark : zh.disc.bookmark}
            </button>
            <p className="empty slim-empty">{zh.bookmarks.localNote}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
