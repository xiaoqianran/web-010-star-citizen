import type { CapturedBody } from "@/data/celestial";
import { bodyLabel } from "@/data/celestial";
import { zh } from "@/i18n/zh";
import type { ScreenPt } from "@/scene/StarMapCanvas";

export function ControlDisc({
  body,
  page,
  point,
  onPage,
}: {
  body: CapturedBody;
  page: "information" | "routing" | "bookmark";
  point: ScreenPt;
  onPage: (p: "information" | "routing" | "bookmark") => void;
}) {
  const kind = body.type === "STAR" ? zh.disc.star : body.type === "PLANET" ? zh.disc.planet : zh.levels.jumpPoint;
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
        <button className={page === "information" ? "on" : ""} onClick={() => onPage("information")}>
          {zh.disc.information}
        </button>
        <button className={page === "routing" ? "on" : ""} onClick={() => onPage("routing")}>
          {zh.disc.routing}
        </button>
        <button className={page === "bookmark" ? "on" : ""} onClick={() => onPage("bookmark")}>
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
            <dd>UEE</dd>
          </dl>
        )}
        {page === "routing" && (
          <dl>
            <dt>{zh.disc.setAs}</dt>
            <dd>{zh.disc.departure}</dd>
            <dt>{zh.disc.setAs}</dt>
            <dd>{zh.disc.destination}</dd>
            <dt>{zh.disc.avoid}</dt>
            <dd>—</dd>
          </dl>
        )}
        {page === "bookmark" && <p className="empty">{zh.bookmarks.empty}</p>}
      </aside>
    </div>
  );
}
