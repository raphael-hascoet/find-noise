import { memo } from "react";
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
  return (
    <NodeContentWrapper {...graphNodeProps}>
      <div
        className={`flex items-center justify-center rounded-xl border-2 border-gray-800 bg-violet-950 px-3 py-2`}
      >
        <span className="text-center font-sans text-sm font-bold text-gray-300">
          {context.data.name}
        </span>
      </div>
    </NodeContentWrapper>
  );
});
