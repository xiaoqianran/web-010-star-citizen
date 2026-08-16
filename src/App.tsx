import { useState } from "react";
import { Intro, TopBar } from "@/components/Intro";
import { Starmap } from "@/components/Starmap";
import { store } from "@/data/storage";
import "@/styles/starmap.css";

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
        <Starmap />
      )}
    </div>
  );
}
