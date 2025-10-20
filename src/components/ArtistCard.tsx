import { useAtomValue } from "jotai";
import { memo } from "react";
import { ViewNode, type ViewNodeBase } from "./view-node";
import type { ArtistContext } from "./views/nodes/view-nodes-manager";
import { transitioningNodesFamily } from "./views/views-config";

type ArtistCardProps = {
  context: ArtistContext;
} & ViewNodeBase;

export const ArtistCard = memo(function ArtistCard({
  context,
  ...graphNodeProps
}: ArtistCardProps) {
  const transitioningNode = useAtomValue(
    transitioningNodesFamily(graphNodeProps.nodeId),
  );
  const contextWithBackup = context ?? transitioningNode?.nodeDef.context;

  return (
    <ViewNode {...graphNodeProps}>
      <span className="text-center font-sans text-sm text-gray-300">
        {contextWithBackup.data.name}
      </span>
    </ViewNode>
  );
});
