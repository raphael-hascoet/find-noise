import * as d3 from "d3";
import { useAtomValue, useSetAtom } from "jotai";
import { ZoomIn, ZoomOut } from "lucide-react";
import { animate } from "motion";
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { D3SvgRenderer } from "../../d3/renderer";
import { albumDataSelectorsAtom } from "../../data/albums-pool-atoms";
import { AlbumCard } from "../AlbumCard";
import { ArtistCard } from "../ArtistCard";
import { GenreCardReact } from "../GenreCard";
import { ForceGraphLinks } from "./force-graph-links";
import {
  type ForceGraphNodeDef,
  type ForceGraphNodeDefByType,
} from "./force-graph-nodes-manager";
import {
  calculatedLinksAtom,
  createViewActionsAtom,
  nodePositioningStateAtom,
  setActiveViewAtom,
  transitioningNodesAtom,
  type NodePositioningState,
  type ViewActionsAtomOutput,
  type ViewData,
  type ViewKey,
} from "./force-graph-views";

export type ForceGraphNode = {
  id: string;
  onZoomClick?: () => void;
  context: ForceGraphNodeDefByType;
};

type ForceGraphProps = {
  positioningState: NodePositioningState;
  width?: number;
  height?: number;
  showDebugGrid?: boolean;
};

export const ForceGraph = function (
  props: Omit<ForceGraphProps, "positioningState">,
) {
  const selectors = useAtomValue(albumDataSelectorsAtom);
  const setActiveView = useSetAtom(setActiveViewAtom);
  const positioningState = useAtomValue(nodePositioningStateAtom);

  // Set the view configuration - nodes are built automatically
  useEffect(() => {
    const firstArtist = selectors?.allArtistKeys?.()[0];
    if (!firstArtist) return;
    setActiveView({ key: "albumsForArtist", data: { artistId: firstArtist } });
  }, [selectors, setActiveView]);

  if (positioningState.state === "init") {
    return null;
  }

  return <ForceGraphContent positioningState={positioningState} {...props} />;
};

const ForceGraphContent = function ({
  positioningState,
  width = 800,
  height = 600,
  showDebugGrid = false,
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const d3ZoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>(null);
  const rendererRef = useRef<D3SvgRenderer | null>(null);

  const links = useAtomValue(calculatedLinksAtom);

  // const initForceGraphDimensions = useSetAtom(initForceGraphDimensionsAtom);
  const setActiveView = useSetAtom(setActiveViewAtom);
  const setTransitionNodes = useSetAtom(transitioningNodesAtom);

  // Create view actions atom with changeView callback
  const viewActionsAtom = useMemo(
    () =>
      createViewActionsAtom({
        changeView: <K extends ViewKey>(key: K, data: ViewData<K>) => {
          setActiveView({ key, data });
        },
      }),
    [setActiveView],
  );

  const viewActions = useAtomValue(viewActionsAtom);

  // Initialize renderer for defs (filters, markers, etc.)
  useEffect(() => {
    if (!svgRef.current) return;

    if (!rendererRef.current) {
      rendererRef.current = new D3SvgRenderer(
        svgRef as RefObject<SVGSVGElement>,
      );
    }

    const renderer = rendererRef.current;
    if (!renderer) return;

    // Add arrow marker for links
    renderer.defs
      .append("marker")
      .attr("id", "link-arrow")
      .attr("viewBox", "0 0 11 11")
      .attr("refX", 9)
      .attr("refY", 5)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .selectAll("line")
      .data([
        { x1: 3, y1: 2, x2: 10, y2: 5 },
        { x1: 3, y1: 8, x2: 10, y2: 5 },
      ])
      .join("line")
      .attr("x1", (d) => d.x1)
      .attr("y1", (d) => d.y1)
      .attr("x2", (d) => d.x2)
      .attr("y2", (d) => d.y2)
      .attr("stroke", "#999")
      .attr("stroke-width", 1.2)
      .attr("stroke-linecap", "round");
  }, []);

  // Initial transform: center content with some padding and scale to 0.5
  const [transform, setTransform] = useState(
    d3.zoomIdentity.translate(width * 0.2, height * 0.15).scale(0.5),
  );

  useEffect(() => {
    const zoomRoot = d3.select((svgRef as RefObject<SVGSVGElement>).current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (e) => setTransform(e.transform));

    d3ZoomRef.current = zoom;
    zoomRoot.call(zoom);

    // Initialize D3's internal transform state to match React state
    const initialTransform = d3.zoomIdentity
      .translate(width * 0.2, height * 0.15)
      .scale(0.5);
    zoomRoot.call(zoom.transform, initialTransform);
  }, []);

  console.log({ positioningState });

  const visiblePositionedNodes =
    positioningState.state === "ready"
      ? positioningState.positionedNodes
      : positioningState.state === "in-progress"
        ? (positioningState.transitionNodes ?? null)
        : null;

  return (
    <>
      <svg
        ref={svgRef}
        width={"100%"}
        height={"100%"}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "auto",
        }}
      >
        {showDebugGrid && (
          <DebugGrid width={width} height={height} transform={transform} />
        )}
        {visiblePositionedNodes && (
          <g
            transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
          >
            <ForceGraphLinks
              links={links}
              positionedNodes={visiblePositionedNodes}
            />
          </g>
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          transformOrigin: "0 0",
          padding: "8px",
          top: "0",
          left: "0",
        }}
      >
        <AnimatePresence
          mode="popLayout"
          onExitComplete={() => setTransitionNodes(new Map())}
        >
          {positioningState.state === "in-progress" &&
            Array.from(positioningState.targetNodeDefs).map(([id, nodeDef]) => (
              <div key={`shell-${id}`} className="opacity-0">
                <NodeContent
                  hasPosition={false}
                  nodeDef={nodeDef}
                  viewActions={viewActions}
                />
              </div>
            ))}
          {visiblePositionedNodes &&
            Array.from(visiblePositionedNodes.entries()).map(
              ([nodeId, node]) => {
                return (
                  <NodeMotion
                    key={nodeId}
                    left={node.position.x}
                    top={node.position.y}
                    nodeId={nodeId}
                  >
                    <NodeContent
                      hasPosition={true}
                      nodeDef={node.nodeDef}
                      viewActions={viewActions}
                    />
                  </NodeMotion>
                );
              },
            )}
        </AnimatePresence>
      </div>
      <div className="fixed right-2 bottom-2 flex gap-2 border-gray-800 bg-amber-900 p-2">
        <button
          className="cursor-pointer rounded-full bg-gray-800 p-2 text-gray-400 shadow-lg/25 shadow-gray-950 hover:bg-gray-700"
          onClick={() => {
            const zoomRoot = d3.select(
              (svgRef as RefObject<SVGSVGElement>).current,
            );
            zoomRoot
              .transition()
              .duration(200)
              .call(
                (
                  d3ZoomRef as RefObject<
                    d3.ZoomBehavior<SVGSVGElement, unknown>
                  >
                ).current.scaleBy,
                1.2,
              );
          }}
        >
          <ZoomIn width={16} height={16} />
        </button>
        <button
          className="cursor-pointer rounded-full bg-gray-800 p-2 text-gray-400 shadow-lg/25 shadow-gray-950 hover:bg-gray-700"
          onClick={() => {
            const zoomRoot = d3.select(
              (svgRef as RefObject<SVGSVGElement>).current,
            );
            zoomRoot
              .transition()
              .duration(200)
              .call(
                (
                  d3ZoomRef as RefObject<
                    d3.ZoomBehavior<SVGSVGElement, unknown>
                  >
                ).current.scaleBy,
                1 / 1.2,
              );
          }}
        >
          <ZoomOut width={16} height={16} />
        </button>
      </div>
    </>
  );
};

const NodeContent = ({
  hasPosition,
  nodeDef,
  viewActions,
}: {
  hasPosition: boolean;
  nodeDef: ForceGraphNodeDef;
  viewActions: ViewActionsAtomOutput<ViewKey> | null;
}) => {
  return nodeDef.context.type === "artist" ? (
    <ArtistCard
      context={nodeDef.context}
      nodeId={nodeDef.id}
      positioned={hasPosition}
    />
  ) : nodeDef.context.type === "album" ? (
    <AlbumCard
      nodeId={nodeDef.id}
      positioned={hasPosition}
      viewActions={viewActions}
      context={nodeDef.context}
    />
  ) : nodeDef.context.type === "genre" ? (
    <GenreCardReact
      genreName={nodeDef.context.data.name}
      nodeId={nodeDef.id}
      positioned={hasPosition}
    />
  ) : null;
};

const DebugGrid = ({
  width,
  height,
  transform,
  gridSize = 100,
}: {
  width: number;
  height: number;
  transform: d3.ZoomTransform;
  gridSize?: number;
}) => {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  // Calculate the visible range in graph coordinates (before transform)
  const startX = Math.floor(-transform.x / gridSize) * gridSize;
  const endX = Math.ceil((width - transform.x) / gridSize) * gridSize;
  const startY = Math.floor(-transform.y / gridSize) * gridSize;
  const endY = Math.ceil((height - transform.y) / gridSize) * gridSize;

  // Vertical lines - at every gridSize in graph space
  for (let x = startX; x <= endX; x += gridSize) {
    lines.push({
      x1: x + transform.x,
      y1: startY + transform.y,
      x2: x + transform.x,
      y2: endY + transform.y,
    });
  }

  // Horizontal lines - at every gridSize in graph space
  for (let y = startY; y <= endY; y += gridSize) {
    lines.push({
      x1: startX + transform.x,
      y1: y + transform.y,
      x2: endX + transform.x,
      y2: y + transform.y,
    });
  }

  return (
    <g>
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={1}
        />
      ))}
    </g>
  );
};

function NodeMotion({
  left,
  top,
  children,
  nodeId,
}: {
  left: number;
  top: number;
  children: React.ReactNode;
  nodeId: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const prev = useRef<{ left: number; top: number } | null>(null);

  if (nodeId === "22d4ddbb-0161-4754-a8d0-5e0bd0d45f61") {
    console.log({ left, top, children });
  }
  useLayoutEffect(() => {
    if (prev.current) {
      console.log({ prev: prev.current });
      const dx = prev.current.left - left;
      const dy = prev.current.top - top;
      x.set(dx);
      y.set(dy);
      animate(x, 0, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
      animate(y, 0, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    }
    prev.current = { left, top };
  }, [left, top, x, y]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ opacity: { duration: 0.6, ease: "easeOut" } }}
      style={{
        position: "absolute",
        left,
        top,
        x,
        y,
        transformOrigin: "top left",
        pointerEvents: "auto",
      }}
    >
      {children}
    </motion.div>
  );
}
