import { AppHeader } from "./header/app-header";
import { ViewsRenderer } from "./views/views-renderer";

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
      }}
    >
      <div
        style={{
          height: "100%",
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <AppHeader />
        <ViewsRenderer showDebugGrid />
      </div>
    </div>
  );
}

export default DrawArea;
