// Ambient background: slow-drifting colour fields, a fading grid and film grain.
// Pure CSS animation on composited layers, so it costs nothing on the main thread.
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <div
        className="blob"
        style={{ width: "48vw", height: "48vw", left: "-12vw", top: "-22vw", background: "#3b2fd1", animation: "drift-a 26s ease-in-out infinite" }}
      />
      <div
        className="blob"
        style={{ width: "36vw", height: "36vw", right: "-10vw", top: "-14vw", background: "#7a2f8f", opacity: 0.35, animation: "drift-b 32s ease-in-out infinite" }}
      />
      <div
        className="blob"
        style={{ width: "30vw", height: "30vw", left: "35vw", top: "-20vw", background: "#1b6f7a", opacity: 0.22, animation: "drift-c 38s ease-in-out infinite" }}
      />
      <div className="grid" />
      <div className="noise" />
    </div>
  );
}
