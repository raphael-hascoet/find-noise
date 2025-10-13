import { useAtomValue } from "jotai";
import { memo } from "react";
import { ForceGraphNode, type ForceGraphNodeBase } from "./force-graph-node";
import type { ArtistContext } from "./force-graph/force-graph-nodes-manager";
import { transitioningNodesFamily } from "./force-graph/force-graph-views";

type ArtistCardProps = {
  context: ArtistContext;
} & ForceGraphNodeBase;

export const ArtistCard = memo(function ArtistCard({
  context,
  ...graphNodeProps
}: ArtistCardProps) {
  const transitioningNode = useAtomValue(
    transitioningNodesFamily(graphNodeProps.nodeId),
  );
  const contextWithBackup = context ?? transitioningNode?.nodeDef.context;

  return (
    <ForceGraphNode {...graphNodeProps}>
      <span className="text-center font-sans text-sm text-gray-300">
        {contextWithBackup.data.name}
      </span>
    </ForceGraphNode>
  );
});
