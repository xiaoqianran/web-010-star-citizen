import { lazy, Suspense, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Intro, TopBar } from "@/components/Intro";
import { store } from "@/data/storage";
import { zh } from "@/i18n/zh";
import "@/styles/starmap.css";

const Starmap = lazy(() => import("@/components/Starmap").then((m) => ({ default: m.Starmap })));

type Phase = "boot" | "ack" | "lore" | "map";

function firstPhase(): Phase {
  if (store.skipAck() && store.skipInfo()) return "map";
  if (store.skipAck()) return "lore";
  return "boot";
}

export default function App() {
  const [phase, setPhase] = useState<Phase>(firstPhase);
  const [skipAck, setSkipAck] = useState(() => store.skipAck());
  const [skipInfo, setSkipInfo] = useState(() => store.skipInfo());

  const enter = (fullscreen: boolean) => {
    if (fullscreen) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    setPhase(store.skipAck() ? (store.skipInfo() ? "map" : "lore") : "ack");
  };

  return (
    <div className="ark-root">
      <div className="grid-bg" hidden={phase === "map"} />
      <div className="crest" hidden={phase === "map"} />
      <TopBar />
      {phase !== "map" ? (
        <Intro
          phase={phase}
          onFull={() => enter(true)}
          onWindow={() => enter(false)}
          onAck={() => setPhase(store.skipInfo() ? "map" : "lore")}
          onExplore={() => setPhase("map")}
          skipAck={skipAck}
          skipInfo={skipInfo}
          onSkipAck={(v) => {
            store.setSkipAck(v);
            setSkipAck(v);
          }}
          onSkipInfo={(v) => {
            store.setSkipInfo(v);
            setSkipInfo(v);
          }}
        />
      ) : (
        <ErrorBoundary>
          <Suspense fallback={<p className="load-hint">{zh.search.loading}</p>}>
            <Starmap />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
