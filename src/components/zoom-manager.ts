import * as d3 from "d3";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useMotionValue, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { debounce } from "../utils/debounce";
import {
  nodePositioningStateAtom,
  type PositionedNode,
} from "./views/views-config";

const ZOOM_PADDING = 100;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 1.2;

const ZOOM_EXTENT_PADDING = 100;
const SCALE_EXTENT_PADDING = 0.1;

type ZoomStatus = {
  status: "idle" | "rezooming-pending" | "resizing-pending";
  rezoomNodes: string[] | null;
};

export const zoomStatusAtom = atom<ZoomStatus>({
  status: "idle",
  rezoomNodes: null,
});

const updateZoomStatusAtom = atom(
  null,
  (get, set, status: ZoomStatus["status"]) => {
    const current = get(zoomStatusAtom);
    set(zoomStatusAtom, { ...current, status });
  },
);

export const useZoomManager = ({
  svgRef,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
}) => {
  const d3ZoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>(null);

  const zoomStatus = useAtomValue(zoomStatusAtom);
  const setZoomStatus = useSetAtom(updateZoomStatusAtom);
  const nodePositioningState = useAtomValue(nodePositioningStateAtom);

  const isUpdatingRef = useRef(false);

  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const tk = useMotionValue(1);

  const overlayTransform = useTransform(
    () => `translate(${tx.get()}px, ${ty.get()}px) scale(${tk.get()})`,
  );

  const minScaleExtentRef = useRef<number>(MIN_ZOOM);

  const zoomFilteredPositionedNodes = useMemo(() => {
    if (nodePositioningState.state === "ready") {
      if (zoomStatus.rezoomNodes && zoomStatus.rezoomNodes.length > 0) {
        const map = new Map<string, PositionedNode>();
        zoomStatus.rezoomNodes.forEach((nodeId) => {
          const node = nodePositioningState.positionedNodes.get(nodeId);
          if (node) {
            map.set(nodeId, node);
          }
        });
        return map;
      }
      return nodePositioningState.positionedNodes;
    }
    return null;
  }, [nodePositioningState, zoomStatus.rezoomNodes]);

  const positionedNodesBounds = useMemo(() => {
    if (nodePositioningState.state === "ready") {
      return getPositionedNodesBounds(nodePositioningState.positionedNodes);
    }
    return null;
  }, [nodePositioningState]);

  const zoomFilteredNodesBounds = useMemo(() => {
    if (zoomFilteredPositionedNodes) {
      return getPositionedNodesBounds(zoomFilteredPositionedNodes);
    }
    return positionedNodesBounds;
  }, [zoomFilteredPositionedNodes, positionedNodesBounds]);

  useEffect(() => {
    const zoomRoot = d3.select((svgRef as RefObject<SVGSVGElement>).current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .on("zoom", (e) => {
        const et = e.transform;
        tx.set(et.x);
        ty.set(et.y);
        tk.set(et.k);
      });

    d3ZoomRef.current = zoom;
    zoomRoot.call(zoom);
  }, []);

  useEffect(() => {
    if (
      zoomStatus.status === "resizing-pending" ||
      zoomStatus.status === "rezooming-pending"
    ) {
      if (isUpdatingRef.current) return;

      if (
        !!d3ZoomRef.current &&
        !!positionedNodesBounds &&
        !!zoomFilteredNodesBounds
      ) {
        const pendingStatus = zoomStatus.status;

        isUpdatingRef.current = true;

        updateMinScaleExtent();

        const zoomScale = zoomStatus.rezoomNodes
          ? getScaleFromBoundsAndSvgSize({
              bounds: zoomFilteredNodesBounds,
              svgSize: {
                width: svgRef.current?.clientWidth || 0,
                height: svgRef.current?.clientHeight || 0,
              },
            })
          : minScaleExtentRef.current;

        const { translateX, translateY } = getZoomTransformFromPositionedNodes({
          bounds: zoomFilteredNodesBounds,
          zoomScale,
        });

        const extentBounds = createExtentBounds({
          scale: minScaleExtentRef.current,
        });
        if (!extentBounds) return;
        updateExtentBounds({ scale: minScaleExtentRef.current, extentBounds });

        if (pendingStatus === "rezooming-pending") {
          const zoomRoot = d3.select(
            (svgRef as RefObject<SVGSVGElement>).current,
          );

          requestAnimationFrame(() => {
            if (!d3ZoomRef.current) return;

            zoomRoot
              .transition()
              .duration(600)
              .ease(d3.easeSinInOut)
              .call(
                d3ZoomRef.current.transform,
                d3.zoomIdentity
                  .translate(translateX, translateY)
                  .scale(zoomScale),
              )
              .on("end", () => {
                setZoomStatus("idle");
                isUpdatingRef.current = false;
              });
          });
        } else {
          setZoomStatus("idle");
          isUpdatingRef.current = false;
        }
      }
    }
  }, [zoomStatus, nodePositioningState]);

  const createExtentBounds = useCallback(
    ({ scale }: { scale: number }) => {
      if (!positionedNodesBounds) {
        return;
      }
      const svgHeight = svgRef.current?.clientHeight || 0;
      const svgWidth = svgRef.current?.clientWidth || 0;

      console.log({ svgHeight, svgWidth });

      return getExtentBoundsFromPositionedNodes({
        bounds: positionedNodesBounds,
        svgSize: {
          height: svgHeight,
          width: svgWidth,
        },
        scale,
      });
    },
    [positionedNodesBounds, d3ZoomRef],
  );

  const updateExtentBounds = useCallback(
    ({
      scale,
      extentBounds,
    }: {
      scale: number;
      extentBounds: ExtentBounds;
    }) => {
      if (!d3ZoomRef.current) {
        return;
      }
      console.log("Update extent bounds:", { scale, extentBounds });
      d3ZoomRef.current
        .scaleExtent([scale - SCALE_EXTENT_PADDING, MAX_ZOOM])
        .translateExtent(extentBounds);
    },
    [d3ZoomRef],
  );

  const updateMinScaleExtent = useCallback(() => {
    if (!positionedNodesBounds) {
      return;
    }
    const svgWidth = svgRef.current?.clientWidth || 0;
    const svgHeight = svgRef.current?.clientHeight || 0;

    minScaleExtentRef.current = getScaleFromBoundsAndSvgSize({
      bounds: positionedNodesBounds,
      svgSize: {
        width: svgWidth,
        height: svgHeight,
      },
    });
  }, [positionedNodesBounds, svgRef, minScaleExtentRef]);

  const debouncedUpdateExtentFromResize = useMemo(
    () =>
      debounce(() => {
        if (!d3ZoomRef.current) return;
        updateMinScaleExtent();
        const extentBounds = createExtentBounds({
          scale: minScaleExtentRef.current,
        });
        if (!extentBounds) return;
        updateExtentBounds({ scale: minScaleExtentRef.current, extentBounds });

        const currentScale = tk.get();

        const svgHeight = svgRef.current?.clientHeight || 0;
        const svgWidth = svgRef.current?.clientWidth || 0;

        const k = Math.max(
          minScaleExtentRef.current,
          Math.min(currentScale, MAX_ZOOM),
        );

        const currentTransform = new d3.ZoomTransform(k, tx.get(), ty.get());

        const clamped = d3ZoomRef.current.constrain()(
          currentTransform,
          [
            [0, 0],
            [svgWidth, svgHeight],
          ],
          extentBounds,
        );

        if (!nearT(currentTransform, clamped)) {
          const zoomRoot = d3.select(
            (svgRef as RefObject<SVGSVGElement>).current,
          );
          zoomRoot
            .transition()
            .duration(300)
            .ease(d3.easeSinInOut)
            .call(d3ZoomRef.current.transform, clamped);
        }
      }, 200),
    [createExtentBounds, updateExtentBounds],
  );

  useEffect(() => {
    const handleResize = () => {
      debouncedUpdateExtentFromResize();
    };

    window?.addEventListener("resize", handleResize);

    return () => {
      window?.removeEventListener("resize", handleResize);
    };
  }, [debouncedUpdateExtentFromResize]);

  const onZoom = (newScale: number) => {
    if (!d3ZoomRef.current) return;

    const zoomRoot = d3.select((svgRef as RefObject<SVGSVGElement>).current);
    zoomRoot
      .transition()
      .duration(200)
      .call(d3ZoomRef.current.scaleBy, newScale);
  };

  return { overlayTransform, onZoom };
};

const getPositionedNodesBounds = (
  positionedNodes: Map<string, PositionedNode>,
) => {
  return Array.from(positionedNodes.values()).reduce(
    (acc, node) => {
      const { width, height } = node.dimensions;
      const { x, y } = node.position;
      acc.left = Math.min(acc.left, x);
      acc.top = Math.min(acc.top, y);
      acc.right = Math.max(acc.right, x + width);
      acc.bottom = Math.max(acc.bottom, y + height);
      return acc;
    },
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
  );
};

const getZoomTransformFromPositionedNodes = ({
  bounds,
  zoomScale,
}: {
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  zoomScale: number;
}) => {
  const translateX = -bounds.left * zoomScale + ZOOM_PADDING;
  const translateY = -bounds.top * zoomScale + ZOOM_PADDING;

  return { translateX, translateY };
};

type ExtentBounds = [[number, number], [number, number]];

const getExtentBoundsFromPositionedNodes = ({
  bounds,
  svgSize,
  scale,
}: {
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  svgSize: { width: number; height: number };
  scale: number;
}): ExtentBounds => {
  const svgWidth = svgSize.width;
  const svgHeight = svgSize.height;

  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;

  const padContentX = ZOOM_PADDING / scale;
  const padContentY = ZOOM_PADDING / scale;

  const contentAreaSizeMaxScale = {
    width: svgWidth / MAX_ZOOM,
    height: svgHeight / MAX_ZOOM,
  };

  const svgSizeRatio = svgWidth / svgHeight;
  const contentSizeRatio =
    (width + padContentX * 2) / (height + padContentY * 2);

  const limitingAxis = svgSizeRatio < contentSizeRatio ? "y" : "x";

  const rightBound = Math.max(
    limitingAxis === "x"
      ? (height + padContentX) * svgSizeRatio
      : bounds.right + padContentX,
    contentAreaSizeMaxScale.width,
  );
  const bottomBound = Math.max(
    limitingAxis === "y"
      ? (width + padContentY) / svgSizeRatio
      : bounds.bottom + padContentY,
    contentAreaSizeMaxScale.height,
  );

  const scaledZoomExtentPadding = ZOOM_EXTENT_PADDING / scale;

  return [
    [
      bounds.left - padContentX - scaledZoomExtentPadding,
      bounds.top - padContentY - scaledZoomExtentPadding,
    ],
    [
      rightBound + scaledZoomExtentPadding,
      bottomBound + scaledZoomExtentPadding,
    ],
  ];
};

const getScaleFromBoundsAndSvgSize = ({
  bounds,
  svgSize,
}: {
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  svgSize: { width: number; height: number };
}) => {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;

  return Math.max(
    Math.min(
      (svgSize.width - 2 * ZOOM_PADDING) / width,
      (svgSize.height - 2 * ZOOM_PADDING) / height,
      MAX_ZOOM,
    ),
    MIN_ZOOM,
  );
};

const nearT = (a: d3.ZoomTransform, b: d3.ZoomTransform, eps = 1e-6) =>
  Math.abs(a.k - b.k) <= eps &&
  Math.abs(a.x - b.x) <= eps &&
  Math.abs(a.y - b.y) <= eps;
