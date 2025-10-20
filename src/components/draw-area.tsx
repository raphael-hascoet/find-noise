import { ForceGraph } from "./force-graph/force-graph";

function DrawArea() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100dvh",
        maxHeight: "100dvh",
        width: "100dvw",
        maxWidth: "100dvw",
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
        <ForceGraph showDebugGrid />
      </div>
    </div>
  );
}

export default DrawArea;
