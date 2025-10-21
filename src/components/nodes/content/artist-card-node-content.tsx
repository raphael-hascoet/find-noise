import { memo } from "react";
import type { ArtistContext } from "../view-nodes-manager";
import { NodeCard } from "./node-card";
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
  return (
    <NodeContentWrapper {...graphNodeProps}>
      <NodeCard>
        <span className="text-center font-sans text-sm text-gray-300">
          {context.data.name}
        </span>
      </NodeCard>
    </NodeContentWrapper>
  );
});
