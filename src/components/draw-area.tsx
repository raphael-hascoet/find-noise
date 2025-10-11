import { ForceGraph } from "./force-graph/force-graph";

function DrawArea() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        maxHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        position: "relative",
      }}
    >
      <ForceGraph width={1600} height={1200} showDebugGrid />
    </div>
  );
}

export default DrawArea;
