import { useAtomValue, useSetAtom } from "jotai";
import { ZoomIn, ZoomOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { ulid } from "ulid";
import { COLORS } from "../../constants/colors";
import { D3SvgRenderer } from "../../d3/renderer";
import { albumDataSelectorsAtom } from "../../data/albums-pool-atoms";
import type { PropagateEvent } from "../../utils/propagate-events";
import { FlowchartLinks } from "../flowchart/flowchart-links";
import { ViewNode, ViewNodeContent } from "../nodes/view-node";
import { useZoomManager } from "../zoom-manager";
import {
  calculatedLinksAtom,
  nodePositioningStateAtom,
  setActiveViewAtom,
  transitioningNodesAtom,
  type NodePositioningState,
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
    setActiveView({ key: "home", data: { seed: ulid() } });
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
  const rendererRef = useRef<D3SvgRenderer | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const links = useAtomValue(calculatedLinksAtom);

  const setTransitionNodes = useSetAtom(transitioningNodesAtom);

  useEffect(() => {
    if (!svgRef.current) return;

    if (!rendererRef.current) {
      rendererRef.current = new D3SvgRenderer(
        svgRef as RefObject<SVGSVGElement>,
      );
    }
  }, [COLORS]);

  const { overlayTransform, onZoom } = useZoomManager({
    svgRef,
  });

  const visiblePositionedNodes =
    positioningState.state === "ready"
      ? positioningState.positionedNodes
      : positioningState.state === "in-progress"
        ? (positioningState.transitionNodes ?? null)
        : null;

  const propagateEvent = useCallback<PropagateEvent>((event) => {
    svgRef.current?.dispatchEvent(event);
  }, []);

  return (
    <>
      <svg
        ref={svgRef}
        width={"100dvw"}
        height={"100dvh"}
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
            Array.from(positioningState.targetNodeDefs).map(([id, nodeDef]) => {
              // For album nodes, render both variants to pre-calculate dimensions
              if (nodeDef.context?.type === "album") {
                return [
                  <div key={`shell-${id}-compact`} className="opacity-0">
                    <ViewNodeContent
                      hasPosition={false}
                      nodeDef={{
                        ...nodeDef,
                        context: {
                          ...nodeDef.context,
                          data: {
                            ...nodeDef.context.data,
                            variant: "compact",
                          },
                        },
                      }}
                    />
                  </div>,
                  <div key={`shell-${id}-detailed`} className="opacity-0">
                    <ViewNodeContent
                      hasPosition={false}
                      nodeDef={{
                        ...nodeDef,
                        context: {
                          ...nodeDef.context,
                          data: {
                            ...nodeDef.context.data,
                            variant: "detailed",
                          },
                        },
                      }}
                    />
                  </div>,
                ];
              }

              // For non-album nodes, use original behavior
              return (
                <div key={`shell-${id}`} className="opacity-0">
                  <ViewNodeContent hasPosition={false} nodeDef={nodeDef} />
                </div>
              );
            })}
          {visiblePositionedNodes &&
            Array.from(visiblePositionedNodes.entries()).map(
              ([nodeId, node]) => {
                return (
                  <ViewNode
                    key={nodeId}
                    node={node}
                    propagateEvent={propagateEvent}
                  />
                );
              },
            )}
        </AnimatePresence>
      </motion.div>
      <ZoomButtons
        onZoomIn={() => onZoom(1.2)}
        onZoomOut={() => onZoom(1 / 1.2)}
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
    <div className="pointer-events-none fixed right-2 bottom-2 flex gap-2 bg-transparent p-2">
      <button
        className="pointer-events-auto cursor-pointer rounded-full bg-gray-800 p-2 text-gray-400 shadow-lg/25 shadow-gray-950 hover:bg-gray-700"
        onClick={onZoomIn}
      >
        <ZoomIn width={16} height={16} />
      </button>
      <button
        className="pointer-events-auto cursor-pointer rounded-full bg-gray-800 p-2 text-gray-400 shadow-lg/25 shadow-gray-950 hover:bg-gray-700"
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
