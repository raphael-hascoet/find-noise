import { useSetAtom, type WritableAtom } from "jotai";
import { memo } from "react";
import {
  NodeContentWrapper,
  type NodeContentWrapperPropsBase,
} from "./node-content-wrapper";

export type IconButtonContextData = {
  ariaLabel: string;
  icon: React.ReactNode;
  onClick: WritableAtom<void, unknown[], void>;
};

type IconButtonNodeContentProps = NodeContentWrapperPropsBase & {
  context: IconButtonContextData;
};

export const IconButtonNodeContent = memo(function IconButtonNodeContent({
  context,
  ...graphNodeProps
}: IconButtonNodeContentProps) {
  const onClick = useSetAtom(context.onClick);

  return (
    <NodeContentWrapper {...graphNodeProps}>
      <button
        onClick={onClick}
        className="pointer-events-auto cursor-pointer rounded-full bg-slate-700 p-2 text-gray-300/90 shadow-lg/25 shadow-gray-950 transition-colors hover:bg-slate-700/85 active:bg-slate-700/70"
        aria-label={context.ariaLabel}
      >
        {context.icon}
      </button>
    </NodeContentWrapper>
  );
});
