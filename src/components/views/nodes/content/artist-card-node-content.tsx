import { useAtomValue } from "jotai";
import { memo } from "react";
import { transitioningNodesFamily } from "../../views-config";
import type { ArtistContext } from "../view-nodes-manager";
import {
  NodeContentWrapper,
  type NodeContentWrapperPropsBase,
} from "./node-content-wrapper";

type ArtistCardProps = {
  context: ArtistContext;
} & NodeContentWrapperPropsBase;

export const ArtistCardNodeContent = memo(function ArtistCardNodeContent({
  context,
  ...graphNodeProps
}: ArtistCardProps) {
  const transitioningNode = useAtomValue(
    transitioningNodesFamily(graphNodeProps.nodeId),
  );
  const contextWithBackup = context ?? transitioningNode?.nodeDef.context;

  return (
    <NodeContentWrapper {...graphNodeProps}>
      <span className="text-center font-sans text-sm text-gray-300">
        {contextWithBackup.data.name}
      </span>
    </NodeContentWrapper>
  );
});
