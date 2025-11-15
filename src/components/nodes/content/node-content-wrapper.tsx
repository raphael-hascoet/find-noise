import { useSetAtom } from "jotai";
import { frame } from "motion";
import { useEffect, useMemo, useRef, type PropsWithChildren } from "react";
import { throttle } from "../../../utils/debounce";
import { registerNodeDimensionsAtom } from "../view-node-dimensions";

export type NodeContentWrapperPropsBase = {
  nodeId: string;
  positioned: boolean;
};

type NodeContentWrapperProps = NodeContentWrapperPropsBase & PropsWithChildren;

export const NodeContentWrapper = ({
  nodeId,
  children,
  positioned,
}: NodeContentWrapperProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const registerNodeDimensions = useSetAtom(registerNodeDimensionsAtom);

  const throttledUpdateNodeDimensions = useMemo(() => {
    return throttle(
      (dim: { width: number; height: number }) =>
        frame.render(() =>
          registerNodeDimensions({
            id: nodeId,
            width: dim.width,
            height: dim.height,
            updateRequested: false,
            fromShell: !positioned,
          }),
        ),
      25,
    );
  }, [registerNodeDimensions, nodeId]);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      let width = entry.contentRect.width;
      let height = entry.contentRect.height;

      const borderSizes = Array.isArray(entry.borderBoxSize)
        ? entry.borderBoxSize[0]
        : entry.borderBoxSize;

      if (borderSizes) {
        width = borderSizes.inlineSize ?? width;
        height = borderSizes.blockSize ?? height;
      }

      console.log({ nodeId, width, height });

      throttledUpdateNodeDimensions({ width, height });
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, [throttledUpdateNodeDimensions]);

  return (
    <div ref={ref} className="max-h-fit max-w-fit">
      {children}
    </div>
  );
};
