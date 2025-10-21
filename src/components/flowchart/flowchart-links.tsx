import { atom, useAtomValue } from "jotai";
import { animate, frame, motion, useMotionValue } from "motion/react";
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PositionedNode } from "../views/views-config";
import { getTagsFromReasoning, TagCloud, type TagDef } from "./flowchart-tags";

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

export type LinkLineDefWithTags = LinkLineDef & { tags: TagDef };

type LinkEndpoints = {
  drawOrderedLines: {
    lines: LinkLineDef[];
  }[];
};

export const FlowchartLinks = ({
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

const seenSegmentsAtom = atom<Set<string>>(new Set<string>());

const EASE = [0.22, 1, 0.36, 1] as const;

const REVEAL_DURATION = 0.3;
const MOVE_DURATION = 0.6;

function AnimatedLink({ drawOrderedLines }: LinkEndpoints) {
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

  const [activeGroup, setActiveGroup] = useState(0);
  const doneCountsRef = useRef<number[]>(groups.map(() => 0));

  const handleRevealDone = (gIdx: number) => {
    const groupIndex = groups.findIndex((g) => g.gIdx === gIdx);
    if (groupIndex === -1) return;

    if (groups[groupIndex].newCount === 0) {
      setActiveGroup((prev) => Math.max(prev, groups[groupIndex].gIdx + 1));
      return;
    }

    const arr = [...doneCountsRef.current];
    arr[groupIndex] += 1;
    doneCountsRef.current = arr;

    if (arr[groupIndex] >= groups[groupIndex].newCount) {
      let next = groupIndex + 1;
      while (next < groups.length && groups[next].newCount === 0) {
        next += 1;
      }
      setActiveGroup(next < groups.length ? groups[next].gIdx : groups.length);
    }
  };

  return (
    <>
      {items.map(({ gIdx, seg }) => (
        <Fragment key={seg.segmentId}>
          <AnimatedSegment
            key={seg.segmentId}
            seg={seg}
            canReveal={gIdx <= activeGroup}
            onRevealDone={() => handleRevealDone(gIdx)}
            moveDuration={MOVE_DURATION}
            revealDuration={REVEAL_DURATION}
            ease={EASE as [number, number, number, number]}
            gIdx={gIdx}
          />
          {isLinkLineDefWithTags(seg) && <TagCloud lineDef={seg} />}
        </Fragment>
      ))}
    </>
  );
}

function AnimatedSegment({
  seg,
  canReveal,
  onRevealDone,
  moveDuration,
  revealDuration,
  ease,
  gIdx,
}: {
  seg: LinkLineDef;
  canReveal: boolean;
  onRevealDone: () => void;
  moveDuration: number;
  revealDuration: number;
  gIdx: number;
  ease: [number, number, number, number];
}) {
  const x1 = useMotionValue(seg.start.x);
  const y1 = useMotionValue(seg.start.y);
  const x2 = useMotionValue(seg.end.x);
  const y2 = useMotionValue(seg.end.y);

  const appearanceDelay = gIdx === 0 ? 0.6 : 0;

  useLayoutEffect(() => {
    frame.render(() => {
      void Promise.all([
        animate(x1, seg.start.x, { duration: moveDuration, ease }).finished,
        animate(y1, seg.start.y, { duration: moveDuration, ease }).finished,
        animate(x2, seg.end.x, { duration: moveDuration, ease }).finished,
        animate(y2, seg.end.y, { duration: moveDuration, ease }).finished,
      ]);
    });
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
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: canReveal ? 1 : 0, opacity: canReveal ? 1 : 0 }}
      transition={{
        opacity: {
          duration: 0,
          delay: appearanceDelay,
        },
        pathLength: {
          delay: appearanceDelay,
          duration: revealDuration,
          ease,
        },
      }}
      onAnimationComplete={() => {
        if (canReveal) onRevealDone();
      }}
    />
  );
}

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
