import { useAtomValue } from "jotai";
import { animate, frame } from "motion";
import { motion, useMotionValue } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import {
  transitioningNodesFamily,
  type PositionedNode,
} from "../views/views-config";
import { AlbumCardNodeContent } from "./content/album-card-node-content";
import { ArtistCardNodeContent } from "./content/artist-card-node-content";
import { IconButtonNodeContent } from "./content/icon-button-node-content";
import { SectionTitleNodeContent } from "./content/section-title-node-content";
import type { ViewNodeDef } from "./view-nodes-manager";

export type ViewNodeProps = {
  node: PositionedNode;
};

export const ViewNode = ({ node }: ViewNodeProps) => {
  return (
    <NodeMotion
      key={node.nodeDef.id}
      left={node.position.x}
      top={node.position.y}
      nodeId={node.nodeDef.id}
    >
      <ViewNodeContent hasPosition={true} nodeDef={node.nodeDef} />
    </NodeMotion>
  );
};

function NodeMotion({
  left,
  top,
  children,
}: {
  left: number;
  top: number;
  children: React.ReactNode;
  nodeId: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const prev = useRef<{ left: number; top: number }>({ left, top });

  useLayoutEffect(() => {
    if (left !== prev.current.left || top !== prev.current.top) {
      const dx = prev.current.left - left + x.get();
      const dy = prev.current.top - top + y.get();
      x.set(dx);
      y.set(dy);
      frame.render(() => {
        animate(x, 0, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
        animate(y, 0, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
      });
      prev.current = { left, top };
    }
  }, [left, top, x, y]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        opacity: { duration: 0.6, ease: "easeOut" },
      }}
      style={{
        position: "absolute",
        left,
        top,
        x: x,
        y: y,
        transformOrigin: "top left",
        pointerEvents: "auto",
      }}
    >
      {children}
    </motion.div>
  );
}

export type ViewNodeContentProps = {
  hasPosition: boolean;
  nodeDef: ViewNodeDef;
};

export const ViewNodeContent = ({
  hasPosition,
  nodeDef,
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
        />
      );
    case "album":
      return (
        <AlbumCardNodeContent
          nodeId={nodeDef.id}
          positioned={hasPosition}
          context={contextWithBackup}
        />
      );
    case "section-title":
      return (
        <SectionTitleNodeContent
          context={contextWithBackup.data}
          nodeId={nodeDef.id}
          positioned={hasPosition}
        />
      );

    case "icon-button":
      return (
        <IconButtonNodeContent
          context={contextWithBackup.data}
          nodeId={nodeDef.id}
          positioned={hasPosition}
        />
      );

    default:
      console.warn("Unknown node type, ignoring:", nodeDef.context);
      return null;
  }
};
