import { zh } from "@/i18n/zh";

type Phase = "boot" | "ack" | "lore";

export function Intro({
  phase,
  onFull,
  onWindow,
  onAck,
  onExplore,
}: {
  phase: Phase;
  onFull: () => void;
  onWindow: () => void;
  onAck: () => void;
  onExplore: () => void;
}) {
  return (
    <div className="intro">
      {phase === "boot" && (
        <>
          <div className="sc-seal">SC</div>
          <p className="welcome">{zh.intro.welcome}</p>
          <ArkMark />
          <div className="ark-title">ARK STARMAP</div>
          <div className="ark-sub">{zh.intro.stellarCartographics}</div>
          <button className="cta" onClick={onFull}>
            {zh.intro.enterFullScreen}
          </button>
          <button className="window-link" onClick={onWindow}>
            {zh.intro.enterWindow} <strong>{zh.intro.enterWindowStrong}</strong>
          </button>
        </>
      )}

      {phase === "ack" && (
        <>
          <blockquote className="quote">
            <p>{zh.intro.quote1}</p>
            <p>{zh.intro.quote2}</p>
            <footer>{zh.intro.quoteBy}</footer>
          </blockquote>
          <p className="ack">{zh.intro.ackBody}</p>
          <label className="check">
            <input type="checkbox" />
            {zh.intro.dontShowNext}
          </label>
          <button className="cta" onClick={onAck}>
            {zh.intro.acknowledge}
          </button>
        </>
      )}

      {phase === "lore" && (
        <>
          <ArkMark />
          <div className="ark-title">ARK</div>
          <div className="lore">
            <p>{zh.intro.lore1}</p>
            <p>{zh.intro.lore2}</p>
          </div>
          <label className="check">
            <input type="checkbox" />
            {zh.intro.dontShowNext}
          </label>
          <button className="cta" onClick={onExplore}>
            {zh.intro.explore}
          </button>
        </>
      )}
    </div>
  );
}

export function ArkMark() {
  return (
    <svg className="ark-mark" viewBox="0 0 100 100" aria-hidden>
      <polygon
        points="50,6 90,28 90,72 50,94 10,72 10,28"
        fill="none"
        stroke="#14e6fa"
        strokeWidth="2"
      />
      <polygon
        points="50,22 72,34 72,66 50,78 28,66 28,34"
        fill="none"
        stroke="#42cbf8"
        strokeWidth="1.4"
      />
      <path d="M50 30 L62 62 H38 Z" fill="#00edff" opacity="0.85" />
    </svg>
  );
}

export function TopBar() {
  return (
    <div className="topbar">
      <div className="slim">
        <span>{zh.hud.rsi}</span>
        <a href="#">{zh.hud.home}</a>
        <a href="#">{zh.hud.explore}</a>
        <a href="#">{zh.hud.starmap}</a>
      </div>
      <div className="brand">
        <span className="burger" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="rsi">RSI</span>
        <span className="slash">/</span>
        <span className="brand-name">{zh.hud.starmap}</span>
      </div>
    </div>
  );
}
