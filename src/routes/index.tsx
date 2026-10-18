import { createFileRoute } from "@tanstack/react-router";
import { BrightboundGame } from "@/components/BrightboundGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brightbound — A Pixel Adventure" },
      { name: "description", content: "A small hero. A great big world. Play Brightbound, a pixel-art platformer across 10 worlds, right in your browser." },
      { property: "og:title", content: "Brightbound — A Pixel Adventure" },
      { property: "og:description", content: "A little courage goes a long way. Run, jump and shoot through 10 pixel worlds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CONTROLS: [string, string][] = [["← →", "Move"], ["SPACE", "Jump"], ["SHIFT", "Run"], ["J", "Shoot"], ["ESC", "Pause"]];

function Index() {
  return (
    <div className="landing">
      <header className="landing-header">
        <span className="logo"><span className="logo-star">✦</span> BRIGHTBOUND <span className="logo-sep">|</span> <small>A PIXEL ADVENTURE</small></span>
        <span className="header-note">10 WORLDS · 1 SMALL HERO</span>
      </header>

      <section className="landing-intro">
        <p className="eyebrow">THE WORLD IS WAITING</p>
        <h1>A little courage goes a long way.</h1>
      </section>

      <main>
        <BrightboundGame />
      </main>

      <ul className="controls">
        {CONTROLS.map(([k, v]) => (
          <li key={k}><kbd>{k}</kbd> {v}</li>
        ))}
      </ul>

      <footer className="landing-footer">A small hero. A great big world.</footer>
    </div>
  );
}
