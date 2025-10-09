import * as d3 from "d3";
import { useAtomValue, useSetAtom } from "jotai";
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
import { initForceGraphDimensionsAtom } from "./force-graph-dimensions";
import {
  forceGraphGetRootNodeDefAtom,
  type ForceGraphNodeDef,
  type ForceGraphNodeDefByType,
} from "./force-graph-nodes-manager";
import {
  activeViewConfigReadOnlyAtom,
  calculatedNodeDefsAtom,
  calculatedNodePositionsAtom,
  createViewActionsAtom,
  setActiveViewAtom,
  transitioningNodesAtom,
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
  // positions: Map<string, { x: number; y: number }>;
  width?: number;
  height?: number;
  nodeDefs: Map<string, ForceGraphNodeDef>;
};

export const ForceGraph = function (
  props: Omit<ForceGraphProps, "positions" | "nodeDefs">,
) {
  const nodeDef = useAtomValue(forceGraphGetRootNodeDefAtom);
  const selectors = useAtomValue(albumDataSelectorsAtom);
  const setActiveView = useSetAtom(setActiveViewAtom);
  const nodeDefs = useAtomValue(calculatedNodeDefsAtom);

  // Set the view configuration - nodes are built automatically
  useEffect(() => {
    if (!nodeDef || nodeDef.context.type !== "artist") return;

    setActiveView({
      key: "albumsForArtist",
      data: {
        artistId: nodeDef.id,
      },
    });
  }, [nodeDef, selectors, setActiveView]);

  if (!nodeDef || !nodeDefs) {
    return null;
  }

  return <ForceGraphContent nodeDefs={nodeDefs} {...props} />;
};

const ForceGraphContent = function ({
  nodeDefs,
  width = 800,
  height = 600,
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<D3SvgRenderer | null>(null);

  const initForceGraphDimensions = useSetAtom(initForceGraphDimensionsAtom);
  const positions = useAtomValue(calculatedNodePositionsAtom);
  const setActiveView = useSetAtom(setActiveViewAtom);
  const activeViewConfig = useAtomValue(activeViewConfigReadOnlyAtom);
  const setTransitionNodes = useSetAtom(transitioningNodesAtom);

  // Create view actions atom with changeView callback
  const viewActionsAtom = useMemo(
    () =>
      createViewActionsAtom(<K extends ViewKey>(key: K, data: ViewData<K>) => {
        setActiveView({ key, data });
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
      .attr("viewBox", "0 0 10 10")
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
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.2);
  }, []);

  const [transform, setTransform] = useState(d3.zoomIdentity.scale(0.5));

  // Initialize dimensions for all nodes
  useEffect(() => {
    initForceGraphDimensions(
      Array.from(nodeDefs.keys()).map((id) => ({ id, loaded: false })),
    );
  }, [nodeDefs, initForceGraphDimensions]);

  // useEffect(() => {
  //   const svg = d3.select((svgRef as RefObject<SVGSVGElement>).current);
  //   svg.call(
  //     d3
  //       .zoom<SVGSVGElement, unknown>()
  //       .scaleExtent([0.2, 4])
  //       .on("zoom", (e) => setTransform(e.transform)),
  //   );
  // }, []);

  return (
    <>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        // style={{ border: "1px solid #333" }}
      >
        {/* <ForceGraphLinks
          links={simLinks}
          transform={transform}
          positions={positions}
        /> */}
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          transform: `scale(${transform.k})`,
        }}
      >
        <AnimatePresence
          mode="popLayout"
          onExitComplete={() => setTransitionNodes(new Map())}
        >
          {Array.from(nodeDefs.entries()).map(([nodeId, n]) => {
            const hasPosition = positions?.has(nodeId) ?? false;
            const graphPos = positions?.get(nodeId);

            const screenPos = graphPos
              ? {
                  left: graphPos.x + transform.x,
                  top: graphPos.y + transform.y,
                }
              : { left: 0, top: 0 };

            if (!hasPosition) {
              return (
                <div key={`shell-${nodeId}`} className="opacity-0">
                  <NodeContent
                    hasPosition={hasPosition}
                    nodeDef={n}
                    viewActions={viewActions}
                  />
                </div>
              );
            }

            return (
              <NodeMotion
                key={nodeId}
                left={screenPos.left}
                top={screenPos.top}
              >
                <NodeContent
                  hasPosition={hasPosition}
                  nodeDef={n}
                  viewActions={viewActions}
                />
              </NodeMotion>
            );
          })}
        </AnimatePresence>
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

function NodeMotion({
  left,
  top,
  children,
}: {
  left: number;
  top: number;
  children: React.ReactNode;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const prev = useRef<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (prev.current) {
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
