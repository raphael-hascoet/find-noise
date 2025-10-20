import { useSetAtom } from "jotai";
import { useLayoutEffect, useRef, type PropsWithChildren } from "react";
import { registerNodeDimensionsAtom } from "./views/nodes/view-node-dimensions";

export type ViewNodeBase = {
  nodeId: string;
  positioned: boolean;
};

type ViewNodeProps = ViewNodeBase & PropsWithChildren;

export const ViewNode = ({ nodeId, children }: ViewNodeProps) => {
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
