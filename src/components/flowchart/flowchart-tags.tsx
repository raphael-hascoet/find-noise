import { animate, frame } from "motion";
import { motion, useMotionValue } from "motion/react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SimpleReason } from "../../data/get-albums-recommendations";
import { seededRandom } from "../../utils/seeded-random";
import type { LinkLineDefWithTags, Position } from "./flowchart-links";

const X_TAG_CENTER_SPACING = 65;
const Y_TAG_CENTER_SPACING = 20;

type TagSidePosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type TagDef = {
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

const DEFAULT_COLOR = "#ccc";

const MAX_TAGS_COUNT = 4;

const EASE = [0.22, 1, 0.36, 1] as const;

const MOVE_DURATION = 0.6;

export const TagCloud = ({ lineDef }: { lineDef: LinkLineDefWithTags }) => {
  const calculatedFontSizesRef = useRef<
    Map<TagSidePosition, { fontSize: number; length: number }>
  >(new Map());

  const [calculatedFontSizesDone, setCalculatedFontSizesDone] =
    useState<Map<TagSidePosition, { fontSize: number; length: number }>>();

  const lineDefMiddlePos = useMemo(
    () => ({
      x: (lineDef.end.x + lineDef.start.x) / 2,
      y: (lineDef.end.y + lineDef.start.y) / 2,
    }),
    [lineDef],
  );

  const shellTagProps: ShellTagProps[] = useMemo(() => {
    return lineDef.tags.map((tag, index) => {
      const sideX: "left" | "right" = index % 2 === 0 ? "left" : "right";
      const sideY: "top" | "bottom" = index < 2 ? "top" : "bottom";

      return {
        centerPos: lineDefMiddlePos,
        tag,
        id: `${sideY}-${sideX}`,
        sides: {
          x: sideX,
          y: sideY,
        },
      };
    });
  }, [lineDef]);

  const onDimensionFound = useCallback(
    (id: TagSidePosition, dimensions: { fontSize: number; length: number }) => {
      if (!!calculatedFontSizesDone) {
        return;
      }

      calculatedFontSizesRef.current.set(id, dimensions);
      if (calculatedFontSizesRef.current.size === shellTagProps.length) {
        setCalculatedFontSizesDone(calculatedFontSizesRef.current);
      }
    },
    [calculatedFontSizesDone],
  );

  const tagProps = useMemo(() => {
    if (!calculatedFontSizesDone) return null;

    return shellTagProps.map(
      ({ id, tag }): FloatingTagProps => ({
        basePos: {
          x:
            id === "top-left" || id === "bottom-left"
              ? lineDefMiddlePos.x -
                (X_TAG_CENTER_SPACING +
                  calculatedFontSizesDone.get(id)!.length / 2)
              : lineDefMiddlePos.x +
                (X_TAG_CENTER_SPACING -
                  calculatedFontSizesDone.get(id)!.length / 2),
          y:
            id === "top-left" || id === "top-right"
              ? lineDefMiddlePos.y -
                Y_TAG_CENTER_SPACING -
                (TAG_MAX_FONT_SIZE -
                  calculatedFontSizesDone.get(id)!.fontSize) /
                  2
              : lineDefMiddlePos.y +
                Y_TAG_CENTER_SPACING +
                (TAG_MAX_FONT_SIZE -
                  calculatedFontSizesDone.get(id)!.fontSize) /
                  2,
        },
        fontSize: calculatedFontSizesDone.get(id)!.fontSize,
        tag: tag,
        id,
      }),
    );
  }, [shellTagProps, calculatedFontSizesDone]);

  if (!tagProps) {
    return (
      <>
        {shellTagProps.map((props) => (
          <ShellTag
            key={`shell-${props.id}}`}
            id={props.id}
            label={props.tag.label}
            onDimensionFound={onDimensionFound}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {tagProps.map((props) => (
        <FloatingTag key={props.id} {...props} />
      ))}
    </>
  );
};

const TAG_MAX_WIDTH = 100;

const TAG_MAX_FONT_SIZE = 14;

type ShellTagProps = {
  centerPos: Position;
  tag: TagDef;
  id: TagSidePosition;
  sides: {
    x: "left" | "right";
    y: "top" | "bottom";
  };
};

const ShellTag = ({
  label,
  id,
  onDimensionFound,
}: {
  id: TagSidePosition;
  label: string;
  onDimensionFound: (
    id: TagSidePosition,
    dimensions: { fontSize: number; length: number },
  ) => void;
}) => {
  const isDimensionFound = useRef(false);

  const textRef = useRef<SVGTextElement>(null);

  useLayoutEffect(() => {
    if (!textRef.current || isDimensionFound.current) return;

    const el = textRef.current;

    let fontSize: number;
    let finalLength: number;

    const computedLength = el.getComputedTextLength();

    if (computedLength <= TAG_MAX_WIDTH) {
      fontSize = TAG_MAX_FONT_SIZE;
      finalLength = computedLength;
    } else {
      const fontWidthRatio = TAG_MAX_FONT_SIZE / computedLength;

      fontSize = Math.floor(fontWidthRatio * TAG_MAX_WIDTH);
      finalLength = fontSize / fontWidthRatio;
    }

    onDimensionFound(id, { fontSize, length: finalLength });
    isDimensionFound.current = true;
  }, [textRef]);

  return (
    <motion.text
      x={0}
      y={0}
      opacity={0}
      ref={textRef}
      fontSize={`${TAG_MAX_FONT_SIZE}`}
    >
      {label}
    </motion.text>
  );
};

type FloatingTagProps = {
  basePos: Position;
  fontSize: number;
  tag: TagDef;
  id: TagSidePosition;
};

const FloatingTag = ({ basePos, tag, fontSize }: FloatingTagProps) => {
  const x = useMotionValue(basePos.x);
  const y = useMotionValue(basePos.y);

  useLayoutEffect(() => {
    frame.render(() => {
      animate(x, basePos.x, { duration: MOVE_DURATION, ease: EASE });
      animate(y, basePos.y, { duration: MOVE_DURATION, ease: EASE });
    });
  }, [basePos.x, basePos.y]);

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ willChange: "transform", x, y }}
      transition={{
        opacity: {
          delay: 1.2,
          duration: 0.6,
        },
      }}
    >
      <text x={0} y={0} fill={tag.color} fontSize={fontSize} cursor="default">
        {tag.label}
      </text>
    </motion.g>
  );
};

export const getTagsFromReasoning = (
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
      };
    })
    .map((value) => ({ value, sort: seededRandom(opts?.rngSeed ?? "seed") }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    .slice(0, MAX_TAGS_COUNT - genreTagsShown.length);

  return [...genreTagsShown, ...descriptorTags];
};
