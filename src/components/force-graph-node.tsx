import { useSetAtom } from "jotai";
import { useLayoutEffect, useRef, type PropsWithChildren } from "react";
import { registerForceGraphNodeAtom } from "./force-graph/force-graph-manager";

export type ForceGraphNodeBase = {
  nodeId: string;
};

type ForceGraphNodeProps = ForceGraphNodeBase & PropsWithChildren;

export const ForceGraphNode = ({ nodeId, children }: ForceGraphNodeProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const registerForceGraphNode = useSetAtom(registerForceGraphNodeAtom);

  useLayoutEffect(() => {
    if (!ref.current) return;

    registerForceGraphNode({
      id: nodeId,
      loaded: true,
      width: ref.current.offsetWidth,
      height: ref.current.offsetHeight,
    });
  }, [nodeId, registerForceGraphNode]);
  return (
    <div
      className="animate-float-y flex w-28 flex-col items-center justify-center gap-2 rounded-lg bg-gray-800 p-4 shadow-sm/30 shadow-gray-500 will-change-transform"
      ref={ref}
      tabIndex={0}
    >
      {children}
    </div>
  );
};
