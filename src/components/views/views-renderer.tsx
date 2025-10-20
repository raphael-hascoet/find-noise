import * as d3 from "d3";
import { useAtomValue, useSetAtom } from "jotai";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { D3SvgRenderer } from "../../d3/renderer";
import { albumDataSelectorsAtom } from "../../data/albums-pool-atoms";
import { FlowchartLinks } from "../flowchart/flowchart-links";
import { ViewNode, ViewNodeContent } from "../nodes/view-node";
import {
  calculatedLinksAtom,
  createViewActionsAtom,
  nodePositioningStateAtom,
  setActiveViewAtom,
  transitioningNodesAtom,
  type NodePositioningState,
  type ViewData,
  type ViewKey,
} from "./views-config";

type ViewsRendererProps = {
  positioningState: NodePositioningState;
  showDebugGrid?: boolean;
};

export const ViewsRenderer = function (
  props: Omit<ViewsRendererProps, "positioningState">,
) {
  const selectors = useAtomValue(albumDataSelectorsAtom);
  const setActiveView = useSetAtom(setActiveViewAtom);
  const positioningState = useAtomValue(nodePositioningStateAtom);

  useEffect(() => {
    const firstArtist = selectors?.allArtistKeys?.()[0];
    if (!firstArtist) return;
    setActiveView({ key: "albumsForArtist", data: { artistId: firstArtist } });
  }, [selectors, setActiveView]);

  if (positioningState.state === "init") {
    return null;
  }

  return (
    <ViewsRendererContent positioningState={positioningState} {...props} />
  );
};

const ViewsRendererContent = function ({
  positioningState,
  showDebugGrid = false,
}: ViewsRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const d3ZoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>(null);
  const rendererRef = useRef<D3SvgRenderer | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const links = useAtomValue(calculatedLinksAtom);

  const setActiveView = useSetAtom(setActiveViewAtom);
  const setTransitionNodes = useSetAtom(transitioningNodesAtom);

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

  useEffect(() => {
    if (!svgRef.current) return;

    if (!rendererRef.current) {
      rendererRef.current = new D3SvgRenderer(
        svgRef as RefObject<SVGSVGElement>,
      );
    }
  }, []);

  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const tk = useMotionValue(1);

  const overlayTransform = useTransform(
    () => `translate(${tx.get()}px, ${ty.get()}px) scale(${tk.get()})`,
  );

  useEffect(() => {
    const zoomRoot = d3.select((svgRef as RefObject<SVGSVGElement>).current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (e) => {
        const t = e.transform;
        tx.set(t.x);
        ty.set(t.y);
        tk.set(t.k);
      });

    d3ZoomRef.current = zoom;
    zoomRoot.call(zoom);

    const initialTransform = d3.zoomIdentity
      .translate(800 * 0.2, 600 * 0.15)
      .scale(0.5);
    zoomRoot.call(zoom.transform, initialTransform);
  }, []);

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
          <motion.g
            style={{
              transform: overlayTransform,
              transformBox: "unset",
              originX: 0,
              originY: 0,
            }}
          >
            <DebugGrid width={2000} height={2000} />
          </motion.g>
        )}
        {visiblePositionedNodes && (
          <motion.g
            style={{
              transform: overlayTransform,
              transformBox: "unset",
              originX: 0,
              originY: 0,
            }}
          >
            <FlowchartLinks
              links={links}
              positionedNodes={visiblePositionedNodes}
            />
          </motion.g>
        )}
      </svg>
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          transformOrigin: "0 0",
          padding: "8px",
          top: "0",
          left: "0",
          transform: overlayTransform,
        }}
        ref={overlayRef}
      >
        <AnimatePresence
          mode="popLayout"
          onExitComplete={() => setTransitionNodes(new Map())}
        >
          {positioningState.state === "in-progress" &&
            Array.from(positioningState.targetNodeDefs).map(([id, nodeDef]) => (
              <div key={`shell-${id}`} className="opacity-0">
                <ViewNodeContent
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
                  <ViewNode
                    key={nodeId}
                    node={node}
                    viewActions={viewActions}
                  />
                );
              },
            )}
        </AnimatePresence>
      </motion.div>
      <ZoomButtons
        onZoomIn={() => {
          const zoomRoot = d3.select(
            (svgRef as RefObject<SVGSVGElement>).current,
          );
          zoomRoot
            .transition()
            .duration(200)
            .call(
              (d3ZoomRef as RefObject<d3.ZoomBehavior<SVGSVGElement, unknown>>)
                .current.scaleBy,
              1.2,
            );
        }}
        onZoomOut={() => {
          const zoomRoot = d3.select(
            (svgRef as RefObject<SVGSVGElement>).current,
          );
          zoomRoot
            .transition()
            .duration(200)
            .call(
              (d3ZoomRef as RefObject<d3.ZoomBehavior<SVGSVGElement, unknown>>)
                .current.scaleBy,
              1 / 1.2,
            );
        }}
      />
    </>
  );
};

const ZoomButtons = ({
  onZoomIn,
  onZoomOut,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
}) => {
  return (
    <div className="fixed right-2 bottom-2 flex gap-2 border-gray-800 bg-amber-900 p-2">
      <button
        className="cursor-pointer rounded-full bg-gray-800 p-2 text-gray-400 shadow-lg/25 shadow-gray-950 hover:bg-gray-700"
        onClick={onZoomIn}
      >
        <ZoomIn width={16} height={16} />
      </button>
      <button
        className="cursor-pointer rounded-full bg-gray-800 p-2 text-gray-400 shadow-lg/25 shadow-gray-950 hover:bg-gray-700"
        onClick={onZoomOut}
      >
        <ZoomOut width={16} height={16} />
      </button>
    </div>
  );
};

const DebugGrid = ({
  width,
  height,
  gridSize = 100,
}: {
  width: number;
  height: number;
  gridSize?: number;
}) => {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  // Calculate the visible range in graph coordinates (before transform)
  const startX = 0;
  const endX = width * gridSize;
  const startY = 0;
  const endY = height * gridSize;

  // Vertical lines - at every gridSize in graph space
  for (let x = startX; x <= endX; x += gridSize) {
    lines.push({
      x1: x,
      y1: startY,
      x2: x,
      y2: endY,
    });
  }

  // Horizontal lines - at every gridSize in graph space
  for (let y = startY; y <= endY; y += gridSize) {
    lines.push({
      x1: startX,
      y1: y,
      x2: endX,
      y2: y,
    });
  }

  return (
    <>
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
    </>
  );
};
