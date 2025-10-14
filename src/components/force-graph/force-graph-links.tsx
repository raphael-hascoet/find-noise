import { atom, useAtomValue } from "jotai";
import { animate, motion, useMotionValue } from "motion/react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { SimpleReason } from "../../data/get-albums-recommendations";
import type { PositionedNode } from "./force-graph-views";

type Link = {
  source: string;
  targets: string[];
};

export type Position = {
  x: number;
  y: number;
};

type LinkLineDef = {
  start: Position;
  end: Position;
  isArrow: boolean;
  segmentId: string;
  tags?: TagDef[];
};

const isLinkLineDefWithTags = (def: LinkLineDef): def is LinkLineDefWithTags =>
  !!def.tags;

type LinkLineDefWithTags = LinkLineDef & { tags: TagDef };

type LinkEndpoints = {
  drawOrderedLines: {
    lines: LinkLineDef[];
  }[];
};

export const ForceGraphLinks = ({
  links,
  positionedNodes,
}: {
  links: Link[];
  positionedNodes: Map<string, PositionedNode>;
}) => {
  if (!positionedNodes.size) return null;

  return (
    <>
      {links.map((link) => {
        const sourceNode = positionedNodes.get(link.source);

        if (!sourceNode || !link.targets?.length) {
          return null;
        }

        console.log(link.targets);

        const targets = link.targets
          .map((nodeId) => {
            const targetNode = positionedNodes.get(nodeId);

            if (!targetNode) {
              console.warn("Missing positioned node for target:", nodeId);
              return null;
            }

            return targetNode;
          })
          .filter((link) => !!link);

        if (!targets.length) return null;

        console.log("Rendering link:", link, {
          sourceNode,
          targets,
        });

        const endpoints = calculateLinkEndpoints({
          source: sourceNode,
          targets,
        });

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
        <Fragment key={seg.segmentId}>
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
          {isLinkLineDefWithTags(seg) && <TagCloud lineDef={seg} />}
        </Fragment>
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
      strokeLinecap="round"
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

const X_TAG_LINE_SPACING = 16;
const Y_TAG_LINE_SPACING = 16;
const WIDTH_PER_CHAR_BASE = 4;

const TagCloud = ({ lineDef }: { lineDef: LinkLineDefWithTags }) => {
  const tagProps: FloatingTagProps[] = useMemo(() => {
    const lineDefMiddlePos: Position = {
      x: (lineDef.end.x + lineDef.start.x) / 2,
      y: (lineDef.end.y + lineDef.start.y) / 2,
    };
    return lineDef.tags.map((tag, index) => {
      const sideX: "left" | "right" = index % 2 === 0 ? "left" : "right";
      const sideY: "top" | "bottom" = index < 2 ? "top" : "bottom";

      return {
        basePos: {
          x:
            sideX === "left"
              ? lineDefMiddlePos.x -
                (X_TAG_LINE_SPACING +
                  WIDTH_PER_CHAR_BASE * (tag.size / 8) * tag.label.length)
              : lineDefMiddlePos.x + X_TAG_LINE_SPACING,
          y:
            sideY === "top"
              ? lineDefMiddlePos.y - Y_TAG_LINE_SPACING - tag.size
              : lineDefMiddlePos.y + Y_TAG_LINE_SPACING,
        },
        tag,
        id: `${sideY}-${sideX}`,
      };
    });
  }, [lineDef]);

  return (
    <>
      {tagProps.map((props) => (
        <FloatingTag key={props.id} {...props} />
      ))}
    </>
  );
};

type FloatingTagProps = { basePos: Position; tag: TagDef; id: string };

const FloatingTag = ({ basePos, tag }: FloatingTagProps) => {
  const x = useMotionValue(basePos.x);
  const y = useMotionValue(basePos.y);

  useEffect(() => {
    void Promise.all([
      animate(x, basePos.x, { duration: MOVE_DURATION, ease: EASE }).finished,
      animate(y, basePos.y, { duration: MOVE_DURATION, ease: EASE }).finished,
    ]);
  }, [basePos.x, basePos.y]);

  return (
    <motion.text fill={tag.color} x={x} y={y} fontSize={`${tag.size}px`}>
      {tag.label}
    </motion.text>
  );
};

// Calculate link endpoints with edge-aware positioning (from original component)
const calculateLinkEndpoints = ({
  source,
  targets,
}: {
  source: PositionedNode;
  targets: PositionedNode[];
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
    y: targetMinY - distanceBetweenSourceAndTarget * (5 / 8),
  };

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
    segmentId: `source-${source.nodeDef.id}`,
  };

  const connectionLines: LinkLineDef[] = [
    {
      start: connectionPos,
      end: { x: leftConnectionLineExtremityX, y: connectionPos.y },
      isArrow: false,
      segmentId: `connection-left-${source.nodeDef.id}`,
    },
    {
      start: connectionPos,
      end: { x: rightConnectionLineExtremityX, y: connectionPos.y },
      isArrow: false,
      segmentId: `connection-right-${source.nodeDef.id}`,
    },
  ];

  const connectionToTargetLines = leftToRightTargets.map(
    (target): LinkLineDef => {
      const nodeContext = target.nodeDef.context;

      if (nodeContext.type !== "album") {
        throw new Error(
          `Link target does not have album context: ${target.nodeDef.id}`,
        );
      }

      const recommendation = nodeContext.data.recommendation;

      return {
        start: {
          y: connectionPos.y,
          x: target.position.x + target.dimensions.width / 2,
        },
        end: {
          x: target.position.x + target.dimensions.width / 2,
          y: target.position.y - gap,
        },
        isArrow: true,
        segmentId: `target-${source.nodeDef.id}-${target.nodeDef.id}`,
        tags: recommendation?.reason
          ? getTagsFromReasoning(recommendation.reason, {
              rngSeed: `${source.nodeDef.id}-${target.nodeDef.id}`,
            })
          : undefined,
      };
    },
  );

  return {
    drawOrderedLines: [
      { lines: [sourceToConnectionLine] },
      { lines: connectionLines },
      { lines: connectionToTargetLines },
    ],
  };
};

type TagDef = {
  size: number;
  color: string;
  label: string;
};

const TAG_REASONING_ORDER = {
  genres: {
    primaryToPrimaryGenre: 1,
    primaryToSecondaryGenre: 2,
    secondaryToSecondaryGenre: 3,
  },
} as const;

const TAG_SIZE = {
  genres: {
    primaryToPrimaryGenre: 16,
    primaryToSecondaryGenre: 14,
    secondaryToSecondaryGenre: 12,
  },
  descriptor: 12,
} as const;

const DEFAULT_COLOR = "#ccc";

const MAX_TAGS_COUNT = 4;

const getTagsFromReasoning = (
  reasoning: SimpleReason,
  opts?: { rngSeed?: string },
): TagDef[] => {
  const genreTags: { def: TagDef; order: number }[] = [];

  if (reasoning.genreMatches.primaryPrimary.shared.length) {
    reasoning.genreMatches.primaryPrimary.shared.forEach((genre) =>
      genreTags.push({
        order: TAG_REASONING_ORDER.genres.primaryToPrimaryGenre,
        def: {
          color: DEFAULT_COLOR, // TODO: Apply color fitting genres/descriptors
          label: genre,
          size: TAG_SIZE.genres.primaryToPrimaryGenre,
        },
      }),
    );
  }

  if (reasoning.genreMatches.primarySecondary.shared.length) {
    reasoning.genreMatches.primarySecondary.shared.forEach((genre) =>
      genreTags.push({
        order: TAG_REASONING_ORDER.genres.primaryToSecondaryGenre,
        def: {
          color: DEFAULT_COLOR,
          label: genre,
          size: TAG_SIZE.genres.primaryToSecondaryGenre,
        },
      }),
    );
  }

  if (reasoning.genreMatches.secondaryPrimary.shared.length) {
    reasoning.genreMatches.secondaryPrimary.shared.forEach((genre) =>
      genreTags.push({
        order: TAG_REASONING_ORDER.genres.primaryToSecondaryGenre,
        def: {
          color: DEFAULT_COLOR,
          label: genre,
          size: TAG_SIZE.genres.primaryToSecondaryGenre,
        },
      }),
    );
  }

  if (reasoning.genreMatches.secondarySecondary.shared.length) {
    reasoning.genreMatches.secondarySecondary.shared.forEach((genre) =>
      genreTags.push({
        order: TAG_REASONING_ORDER.genres.secondaryToSecondaryGenre,
        def: {
          color: DEFAULT_COLOR,
          label: genre,
          size: TAG_SIZE.genres.secondaryToSecondaryGenre,
        },
      }),
    );
  }

  const genreTagsSorted = genreTags
    .sort(({ order: order1 }, { order: order2 }) => order1 - order2)
    .map(({ def }) => def);

  const genreTagsSet = new Set<string>();

  const genreTagsWithoutDoubles: TagDef[] = [];

  genreTagsSorted.forEach((tag) => {
    if (!genreTagsSet.has(tag.label)) {
      genreTagsWithoutDoubles.push(tag);
      genreTagsSet.add(tag.label);
    }
  });

  const genreTagsShown = genreTagsWithoutDoubles.slice(0, 2);

  const descriptorTags: TagDef[] = reasoning.descriptorOverlap.shared
    .map((descriptor) => {
      return {
        color: DEFAULT_COLOR,
        label: descriptor,
        size: TAG_SIZE.descriptor,
      };
    })
    .map((value) => ({ value, sort: seededRandom(opts?.rngSeed ?? "seed") }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    .slice(0, MAX_TAGS_COUNT - genreTagsShown.length);

  return [...genreTagsShown, ...descriptorTags];
};

function seededRandom(str: string) {
  console.log({ str });
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return h >>> 0;
}
