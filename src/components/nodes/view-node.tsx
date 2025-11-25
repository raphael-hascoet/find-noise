import { useAtomValue } from "jotai";
import { animate, frame } from "motion";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  useD3ZoomPropagationProps,
  type PropagateEvent,
} from "../../utils/propagate-events";
import {
  transitioningNodesFamily,
  type PositionedNode,
} from "../views/views-config";
import { AlbumCardNodeContent } from "./content/album-card-node-content";
import { AppTitleNodeContent } from "./content/app-title-content";
import { ArtistCardNodeContent } from "./content/artist-card-node-content";
import { IconButtonNodeContent } from "./content/icon-button-node-content";
import { SectionTitleNodeContent } from "./content/section-title-node-content";
import type { ViewNodeDef } from "./view-nodes-manager";

export type ViewNodeProps = {
  node: PositionedNode;
  propagateEvent: PropagateEvent;
};

export const ViewNode = ({ node, propagateEvent }: ViewNodeProps) => {
  return (
    <NodeMotion
      key={node.nodeDef.id}
      left={node.position.x}
      top={node.position.y}
      width={node.dimensions.width}
      height={node.dimensions.height}
      nodeId={node.nodeDef.id}
      propagateEvent={propagateEvent}
    >
      <ViewNodeContent hasPosition={true} nodeDef={node.nodeDef} />
    </NodeMotion>
  );
};

function NodeMotion({
  left,
  top,
  children,
  width,
  height,
  propagateEvent,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  children: React.ReactNode;
  nodeId: string;
  propagateEvent: PropagateEvent;
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const heightMotion = useMotionValue(height);
  const widthMotion = useMotionValue(width);

  const anchoredTop = top - height / 2;

  const transform = useTransform(
    [x, y],
    ([xVal, yVal]) => `translateX(-50%) translate(${xVal}px, ${yVal}px)`,
  );

  const prev = useRef<{ left: number; top: number; height: number }>({
    left,
    top: anchoredTop,
    height,
  });

  const propagationProps = useD3ZoomPropagationProps({
    ref: nodeRef,
    propagateEvent,
  });

  useLayoutEffect(() => {
    if (left !== prev.current.left || anchoredTop !== prev.current.top) {
      const dx = prev.current.left - left + x.get();
      const dy = prev.current.top - anchoredTop + y.get();
      x.set(dx);
      y.set(dy);
      frame.render(() => {
        animate(x, 0, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
        animate(y, 0, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
      });
      prev.current = { left, top: anchoredTop, height };
    }
  }, [left, anchoredTop, x, y, height]);

  useEffect(() => {
    frame.render(() => {
      animate(heightMotion, height, {
        ease: [0.22, 1, 0.36, 1],
        duration: 0.6,
      });
    });
  }, [height, heightMotion]);

  useEffect(() => {
    frame.render(() => {
      animate(widthMotion, width, { ease: [0.22, 1, 0.36, 1], duration: 0.6 });
    });
  }, [width, widthMotion]);

  return (
    <motion.div
      ref={nodeRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      transition={{
        opacity: { duration: 0.6, ease: "easeOut" },
      }}
      style={{
        position: "absolute",
        left: left,
        top: anchoredTop,
        width: widthMotion,
        height: heightMotion,
        transform,
        transformOrigin: "center",
        pointerEvents: "all",
        cursor: "default",
      }}
      {...propagationProps}
    >
      {children}
    </motion.div>
  );
}

export type ViewNodeContentProps = {
  hasPosition: boolean;
  nodeDef: ViewNodeDef;
  updateTriggeredAt?: string;
};

export const ViewNodeContent = ({
  hasPosition,
  nodeDef,
  updateTriggeredAt,
}: ViewNodeContentProps) => {
  const transitioningNode = useAtomValue(transitioningNodesFamily(nodeDef.id));
  const contextWithBackup =
    nodeDef.context ?? transitioningNode?.nodeDef.context;

  switch (contextWithBackup.type) {
    case "artist":
      return (
        <ArtistCardNodeContent
          context={contextWithBackup}
          nodeId={nodeDef.id}
          positioned={hasPosition}
          updateTriggeredAt={updateTriggeredAt}
        />
      );
    case "album":
      return (
        <AlbumCardNodeContent
          nodeId={nodeDef.id}
          positioned={hasPosition}
          updateTriggeredAt={updateTriggeredAt}
          context={contextWithBackup}
          hasChildren={
            !!nodeDef?.children?.length && nodeDef.children.length > 0
          }
        />
      );
    case "section-title":
      return (
        <SectionTitleNodeContent
          context={contextWithBackup.data}
          nodeId={nodeDef.id}
          positioned={hasPosition}
          updateTriggeredAt={updateTriggeredAt}
        />
      );

    case "icon-button":
      return (
        <IconButtonNodeContent
          context={contextWithBackup.data}
          nodeId={nodeDef.id}
          positioned={hasPosition}
          updateTriggeredAt={updateTriggeredAt}
        />
      );

    case "app-title":
      return (
        <AppTitleNodeContent
          nodeId={nodeDef.id}
          positioned={hasPosition}
          updateTriggeredAt={updateTriggeredAt}
        />
      );

    default:
      console.warn("Unknown node type, ignoring:", nodeDef.context);
      return null;
  }
};
