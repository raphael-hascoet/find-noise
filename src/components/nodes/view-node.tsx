import { animate, frame } from "motion";
import { motion, useMotionValue } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import type {
  PositionedNode,
  ViewActionsAtomOutput,
  ViewKey,
} from "../views/views-config";
import { AlbumCardNodeContent } from "./content/album-card-node-content";
import { ArtistCardNodeContent } from "./content/artist-card-node-content";
import { GenreCardNodeContent } from "./content/genre-card-node-content";
import type { ViewNodeDef } from "./view-nodes-manager";

export type ViewNodeProps = {
  node: PositionedNode;
  viewActions: ViewActionsAtomOutput<ViewKey> | null;
};

export const ViewNode = ({ node, viewActions }: ViewNodeProps) => {
  return (
    <NodeMotion
      key={node.nodeDef.id}
      left={node.position.x}
      top={node.position.y}
      nodeId={node.nodeDef.id}
    >
      <ViewNodeContent
        hasPosition={true}
        nodeDef={node.nodeDef}
        viewActions={viewActions}
      />
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
  viewActions: ViewActionsAtomOutput<ViewKey> | null;
};

export const ViewNodeContent = ({
  hasPosition,
  nodeDef,
  viewActions,
}: ViewNodeContentProps) => {
  return nodeDef.context.type === "artist" ? (
    <ArtistCardNodeContent
      context={nodeDef.context}
      nodeId={nodeDef.id}
      positioned={hasPosition}
    />
  ) : nodeDef.context.type === "album" ? (
    <AlbumCardNodeContent
      nodeId={nodeDef.id}
      positioned={hasPosition}
      viewActions={viewActions}
      context={nodeDef.context}
    />
  ) : nodeDef.context.type === "genre" ? (
    <GenreCardNodeContent
      genreName={nodeDef.context.data.name}
      nodeId={nodeDef.id}
      positioned={hasPosition}
    />
  ) : null;
};
