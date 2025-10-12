import { atom, useAtomValue } from "jotai";
import { animate, motion, useMotionValue } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { forceGraphAllDimensionsLoadedAtom } from "./force-graph-dimensions";

type Link = {
  source: string;
  targets: string[];
};

export type Position = {
  x: number;
  y: number;
};

type LinkExtremity = {
  nodeId: string;
  position: Position;
  dimensions: {
    width: number;
    height: number;
  };
};

type LinkLineDef = {
  start: Position;
  end: Position;
  isArrow: boolean;
  segmentId: string;
};

type LinkEndpoints = {
  drawOrderedLines: {
    lines: LinkLineDef[];
  }[];
};

export const ForceGraphLinks = ({
  links,
  positions,
}: {
  links: Link[];
  positions: Map<string, { x: number; y: number }> | null;
}) => {
  const dimensions = useAtomValue(forceGraphAllDimensionsLoadedAtom);

  if (!positions || dimensions.size === 0) return null;

  return (
    <>
      {links.map((link) => {
        const sourcePos = positions.get(link.source);

        const sourceDim = dimensions.get(link.source);

        if (!sourcePos || !sourceDim || !link.targets?.length) {
          return null;
        }

        console.log(link.targets);

        const source: LinkExtremity = {
          nodeId: link.source,
          position: {
            x: sourcePos.x,
            y: sourcePos.y,
          },
          dimensions: {
            width: sourceDim.width,
            height: sourceDim.height,
          },
        };

        const targets = link.targets
          .map((nodeId): LinkExtremity | null => {
            const pos = positions.get(nodeId);
            if (!pos) {
              console.warn("Missing position for target:", nodeId);
              return null;
            }

            const dim = dimensions.get(nodeId);
            if (!dim) {
              console.warn("Missing dimensions for target:", nodeId);
              return null;
            }

            return {
              nodeId,
              position: {
                x: pos.x,
                y: pos.y,
              },
              dimensions: {
                height: dim.height,
                width: dim.width,
              },
            };
          })
          .filter((link) => !!link);

        if (!targets.length) return null;

        console.log("Rendering link:", link, {
          source,
          targets,
        });

        const endpoints = calculateLinkEndpoints({
          source,
          targets,
        });

        console.log({ endpoints });
        return (
          <AnimatedLink
            key={`${link.source}-${link.targets.join("_")}`}
            {...endpoints}
          />
        );
      })}
    </>
  );
};

// Identifies the current graph instance; bump this to reset registries
export const graphIdAtom = atom<string>("default-graph");

// Registry of segments that have completed initial reveal for the current graph
export const seenSegmentsAtom = atom<Set<string>>(new Set<string>());

// Optional: per-expand diff (filled by your tree logic when expanding a node)
export type SegmentDiff = {
  added: Set<string>;
  updated: Set<string>;
  removed: Set<string>;
};
export const lastExpandDiffAtom = atom<SegmentDiff | null>(null);

const EASE = [0.22, 1, 0.36, 1] as const;

// Editable timings
const REVEAL_DURATION = 0.5; // seconds for the stroke reveal per line
const MOVE_DURATION = 0.28; // seconds for endpoint tween when layout changes

export function AnimatedLink({ drawOrderedLines }: LinkEndpoints) {
  // Flatten with group membership and lengths
  const items = useMemo(
    () =>
      drawOrderedLines.flatMap((g, gIdx) =>
        g.lines.map((seg, lineIdx) => ({
          gIdx,
          lineIdx,
          seg,
        })),
      ),
    [drawOrderedLines],
  );

  const seenSet = useAtomValue(seenSegmentsAtom);

  // Group items by group index
  const groups = useMemo(() => {
    const map = new Map<number, typeof items>();
    for (const it of items) {
      if (!map.has(it.gIdx)) map.set(it.gIdx, []);
      map.get(it.gIdx)!.push(it);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([gIdx, arr]) => ({
        gIdx,
        items: arr,
        newCount: arr.filter((i) => !seenSet.has(i.seg.segmentId)).length,
      }));
  }, [items, seenSet]);

  // Sequencer state
  const [activeGroup, setActiveGroup] = useState(0);
  const doneCountsRef = useRef<number[]>(groups.map((g) => 0));
  //   const seqCancelRef = useRef(false);

  //   // Reset sequencing when input changes
  //   useEffect(() => {
  //     seqCancelRef.current = false;
  //     setActiveGroup(0);
  //     doneCountsRef.current = groups.map(() => 0);

  //     // If the first groups have zero "new" items, skip them immediately
  //     let g = 0;
  //     while (g < groups.length && groups[g].newCount === 0) {
  //       g += 1;
  //     }
  //     setActiveGroup(g);

  //     return () => {
  //       seqCancelRef.current = true;
  //     };
  //   }, [groups]);

  //   // Called by children when their reveal finishes
  const handleRevealDone = (gIdx: number) => {
    console.log("reveal done", { gIdx });
    // if (seqCancelRef.current) return;
    const groupIndex = groups.findIndex((g) => g.gIdx === gIdx);
    if (groupIndex === -1) return;

    // If this group has no new segments, it's already been skipped
    if (groups[groupIndex].newCount === 0) {
      // Ensure we stay ahead
      setActiveGroup((prev) => Math.max(prev, groups[groupIndex].gIdx + 1));
      return;
    }

    const arr = [...doneCountsRef.current];
    arr[groupIndex] += 1;
    doneCountsRef.current = arr;

    if (arr[groupIndex] >= groups[groupIndex].newCount) {
      // Move to next group that has new segments (skip empty ones)
      let next = groupIndex + 1;
      while (next < groups.length && groups[next].newCount === 0) {
        next += 1;
      }
      setActiveGroup(next < groups.length ? groups[next].gIdx : groups.length);
    }
  };

  return (
    <>
      {items.map(({ gIdx, lineIdx, seg }) => (
        <AnimatedSegment
          key={seg.segmentId}
          seg={seg}
          //   len={len}
          canReveal={gIdx <= activeGroup}
          isNew={!seenSet.has(seg.segmentId)}
          onRevealDone={() => handleRevealDone(gIdx)}
          moveDuration={MOVE_DURATION}
          revealDuration={REVEAL_DURATION}
          ease={EASE as [number, number, number, number]}
        />
      ))}
    </>
  );
}

function AnimatedSegment({
  seg,
  //   len,
  canReveal,
  isNew,
  onRevealDone,
  moveDuration,
  revealDuration,
  ease,
}: {
  seg: LinkLineDef;
  //   len: number;
  canReveal: boolean;
  isNew: boolean;
  onRevealDone: () => void;
  moveDuration: number;
  revealDuration: number;
  ease: [number, number, number, number];
}) {
  //   const [seenSet, setSeenSet] = useAtom(seenSegmentsAtom);

  console.log({ seg, canReveal });

  // Mark as seen the first time we actually start its reveal
  //   useEffect(() => {
  //     if (!(isNew && canReveal)) return;
  //     console.log("Segment seen", { seg });
  //     setSeenSet((prev) => {
  //       if (prev.has(seg.segmentId)) return prev;
  //       const next = new Set(prev);
  //       next.add(seg.segmentId);
  //       return next;
  //     });
  //   }, [isNew, canReveal, seg.segmentId, setSeenSet]);

  // Motion values for smooth endpoint updates
  const x1 = useMotionValue(seg.start.x);
  const y1 = useMotionValue(seg.start.y);
  const x2 = useMotionValue(seg.end.x);
  const y2 = useMotionValue(seg.end.y);

  // Tween endpoints whenever coordinates change
  useEffect(() => {
    void Promise.all([
      animate(x1, seg.start.x, { duration: moveDuration, ease }).finished,
      animate(y1, seg.start.y, { duration: moveDuration, ease }).finished,
      animate(x2, seg.end.x, { duration: moveDuration, ease }).finished,
      animate(y2, seg.end.y, { duration: moveDuration, ease }).finished,
    ]);
  }, [
    seg.start.x,
    seg.start.y,
    seg.end.x,
    seg.end.y,
    moveDuration,
    ease,
    x1,
    y1,
    x2,
    y2,
  ]);

  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="#999"
      strokeWidth={4}
      markerEnd={seg.isArrow ? "url(#link-arrow)" : undefined}
      style={{ pointerEvents: "none" }}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: canReveal ? 1 : 0 }}
      transition={{
        duration: revealDuration,
        ease,
      }}
      onUpdate={() => {
        // no-op; Framer drives the dash animation
      }}
      onAnimationComplete={(def) => {
        console.log("Animation complete", { seg, def, canReveal });
        // Only notify when a real reveal just happened
        if (canReveal) onRevealDone();
      }}
    />
  );
}

// Calculate link endpoints with edge-aware positioning (from original component)
const calculateLinkEndpoints = ({
  source,
  targets,
}: {
  source: LinkExtremity;
  targets: LinkExtremity[];
}): LinkEndpoints => {
  const leftToRightTargets = targets.sort(
    (t1, t2) => t1.position.x - t2.position.x,
  );

  // Source dimensions
  const sourceWidth = source.dimensions.width;
  const sourceHeight = source.dimensions.height;
  const sourceHalfW = sourceWidth / 2;

  const gap = 40;

  const sourceBottomY = source.position.y + sourceHeight;

  const rootPos = {
    x: source.position.x + sourceHalfW,
    y: sourceBottomY + gap,
  };

  const targetMinY = Math.min(...targets.map((t) => t.position.y));

  const distanceBetweenSourceAndTarget = targetMinY - sourceBottomY;

  const connectionPos = {
    x: source.position.x + sourceHalfW,
    y: targetMinY - distanceBetweenSourceAndTarget / 2,
  };

  console.log(leftToRightTargets);

  const leftConnectionLineExtremityX =
    leftToRightTargets[0].position.x +
    leftToRightTargets[0].dimensions.width / 2;

  const rightConnectionLineExtremityX =
    leftToRightTargets[leftToRightTargets.length - 1].position.x +
    leftToRightTargets[leftToRightTargets.length - 1].dimensions.width / 2;

  const sourceToConnectionLine: LinkLineDef = {
    start: rootPos,
    end: connectionPos,
    isArrow: false,
    segmentId: `source-${source.nodeId}`,
  };

  const connectionLines: LinkLineDef[] = [
    {
      start: connectionPos,
      end: { x: leftConnectionLineExtremityX, y: connectionPos.y },
      isArrow: false,
      segmentId: `connection-left-${source.nodeId}`,
    },
    {
      start: connectionPos,
      end: { x: rightConnectionLineExtremityX, y: connectionPos.y },
      isArrow: false,
      segmentId: `connection-right-${source.nodeId}`,
    },
  ];

  const connectionToTargetLines = leftToRightTargets.map(
    (target): LinkLineDef => ({
      start: {
        y: connectionPos.y,
        x: target.position.x + target.dimensions.width / 2,
      },
      end: {
        x: target.position.x + target.dimensions.width / 2,
        y: target.position.y - gap,
      },
      isArrow: true,
      segmentId: `target-${source.nodeId}-${target.nodeId}`,
    }),
  );

  return {
    drawOrderedLines: [
      { lines: [sourceToConnectionLine] },
      { lines: connectionLines },
      { lines: connectionToTargetLines },
    ],
  };
};
