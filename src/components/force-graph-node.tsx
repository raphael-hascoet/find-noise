import { useSetAtom } from "jotai";
import { useLayoutEffect, useRef, type PropsWithChildren } from "react";
import { cn } from "../utils/style";
import { registerForceGraphDimensionsAtom } from "./force-graph/force-graph-dimensions";

export type ForceGraphNodeBase = {
  nodeId: string;
  positioned: boolean;
};

type ForceGraphNodeProps = ForceGraphNodeBase & PropsWithChildren;

export const ForceGraphNode = ({
  nodeId,
  children,
  positioned,
}: ForceGraphNodeProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const registerForceGraphDimensions = useSetAtom(
    registerForceGraphDimensionsAtom,
  );

  useLayoutEffect(() => {
    if (!ref.current) return;

    registerForceGraphDimensions({
      id: nodeId,
      loaded: true,
      width: ref.current.offsetWidth,
      height: ref.current.offsetHeight,
    });
  }, [nodeId]);
  return (
    <div
      className={cn(
        "animate-float-y flex flex-col items-center justify-center gap-2 rounded-lg bg-gray-800 p-4 shadow-sm/30 shadow-gray-500 transition-opacity will-change-transform",
        {
          "opacity-100": positioned,
          "opacity-0": !positioned,
        },
      )}
      ref={ref}
      tabIndex={0}
    >
      {children}
    </div>
  );
};
