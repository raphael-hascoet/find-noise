import { memo } from "react";
import {
  NodeContentWrapper,
  type NodeContentWrapperPropsBase,
} from "./node-content-wrapper";

export type SectionTitleContextData = {
  label: string;
};

type SectionTitleNodeContentProps = NodeContentWrapperPropsBase & {
  context: SectionTitleContextData;
};

export const SectionTitleNodeContent = memo(function SectionTitleNodeContent({
  context,
  ...graphNodeProps
}: SectionTitleNodeContentProps) {
  return (
    <NodeContentWrapper {...graphNodeProps}>
      <div className="rounded-xl border-2 border-gray-800 bg-violet-950 px-3 py-2">
        <span className="text-md text-center font-sans font-bold text-nowrap text-gray-300">
          {context.label}
        </span>
      </div>
    </NodeContentWrapper>
  );
});
