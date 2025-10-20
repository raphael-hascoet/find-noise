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
        className="cursor-pointer rounded-full bg-gray-600 p-2 text-gray-300 shadow-lg/25 shadow-gray-950 hover:bg-gray-500"
        aria-label={context.ariaLabel}
      >
        {context.icon}
      </button>
    </NodeContentWrapper>
  );
});
