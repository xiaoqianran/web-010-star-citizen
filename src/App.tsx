import { useState } from "react";
import { Intro, TopBar } from "@/components/Intro";
import { Starmap } from "@/components/Starmap";
import "@/styles/starmap.css";

type Phase = "boot" | "ack" | "lore" | "map";

export default function App() {
  const [phase, setPhase] = useState<Phase>("boot");

  const enter = async (fullscreen: boolean) => {
    if (fullscreen) {
      await document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    setPhase("ack");
  };

  return (
    <div className="ark-root">
      <div className="grid-bg" hidden={phase === "map"} />
      <div className="crest" hidden={phase === "map"} />
      <TopBar />
      {phase !== "map" ? (
        <Intro
          phase={phase}
          onFull={() => void enter(true)}
          onWindow={() => void enter(false)}
          onAck={() => setPhase("lore")}
          onExplore={() => setPhase("map")}
        />
      ) : (
        <Starmap />
      )}
    </div>
  );
}
