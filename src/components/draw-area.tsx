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
        padding: "16px",
      }}
    >
      <div
        style={{
          height: "100%",
          width: "100%",
          position: "relative",
        }}
      >
        <ForceGraph width={1600} height={1200} showDebugGrid />
      </div>
    </div>
  );
}

export default DrawArea;
