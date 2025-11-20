import clsx from "clsx";
import { useSetAtom } from "jotai";
import { frame } from "motion";
import { useLayoutEffect, useRef, type PropsWithChildren } from "react";
import { registerNodeDimensionsAtom } from "../view-node-dimensions";

export type NodeContentWrapperPropsBase = {
  nodeId: string;
  positioned: boolean;
  variant?: string;
  // Useful to retrigger dimensions registering if a shell is still rendered when a new update is requested
  updateTriggeredAt?: string;
};

type NodeContentWrapperProps = NodeContentWrapperPropsBase & PropsWithChildren;

export const NodeContentWrapper = ({
  nodeId,
  children,
  positioned,
  updateTriggeredAt,
  variant,
}: NodeContentWrapperProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const registerNodeDimensions = useSetAtom(registerNodeDimensionsAtom);

  useLayoutEffect(() => {
    if (positioned || !ref.current) return;

    const el = ref.current;
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    frame.render(() =>
      registerNodeDimensions({
        id: nodeId,
        width: width,
        height: height,
        updateRequested: false,
        fromShell: true,
        variant,
      }),
    );
  }, [registerNodeDimensions, nodeId, variant, positioned, updateTriggeredAt]);

  return (
    <div
      ref={ref}
      className={`${clsx({ "max-h-fit": !positioned, "max-w-fit": !positioned, "flex-1": !positioned, absolute: positioned, "inset-0": positioned })}`}
    >
      {children}
    </div>
  );
};
