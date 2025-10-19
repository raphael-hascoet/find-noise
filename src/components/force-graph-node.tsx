import { useSetAtom } from "jotai";
import { useLayoutEffect, useRef, type PropsWithChildren } from "react";
import { registerNodeDimensionsAtom } from "./force-graph/force-graph-dimensions";

export type ForceGraphNodeBase = {
  nodeId: string;
  positioned: boolean;
};

type ForceGraphNodeProps = ForceGraphNodeBase & PropsWithChildren;

export const ForceGraphNode = ({ nodeId, children }: ForceGraphNodeProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const registerNodeDimensions = useSetAtom(registerNodeDimensionsAtom);

  useLayoutEffect(() => {
    if (!ref.current) return;

    registerNodeDimensions({
      id: nodeId,
      width: ref.current.offsetWidth,
      height: ref.current.offsetHeight,
    });
  }, [nodeId]);

  return (
    <div
      className="flex w-fit flex-col items-center justify-center gap-2 rounded-lg bg-linear-(--subtle-gray-gradient) p-4 shadow-sm/30"
      ref={ref}
      tabIndex={0}
    >
      {children}
    </div>
  );
};
