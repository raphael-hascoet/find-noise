import { useAtomValue } from "jotai";
import { useMemo } from "react";
import type { ForceGraphNode } from "./force-graph";
import {
  forceGraphNodesWithRenderedLinksAtom,
  type RenderedForceGraphNodeLoaded,
} from "./force-graph-manager";

export type ForceGraphLink = {
  source: ForceGraphNode;
  target: ForceGraphNode;
};

type RenderedLink = {
  link: ForceGraphLink;
  sourceNode: RenderedForceGraphNodeLoaded;
  targetNode: RenderedForceGraphNodeLoaded;
};

export const ForceGraphLinks = ({
  links,
  transform,
  positions,
}: {
  links: ForceGraphLink[];
  transform: d3.ZoomTransform;
  positions: Map<
    string,
    {
      x: number;
      y: number;
    }
  >;
}) => {
  const forceGraphNodesWithRenderedLinks = useAtomValue(
    forceGraphNodesWithRenderedLinksAtom,
  );

  const renderedLinks = useMemo(() => {
    return links
      .map((link): RenderedLink | null => {
        const sourceNode = forceGraphNodesWithRenderedLinks.get(link.source.id);
        const targetNode = forceGraphNodesWithRenderedLinks.get(link.target.id);

        if (sourceNode && targetNode) {
          return { link, targetNode, sourceNode };
        }
        return null;
      })
      .filter((link) => link !== null);
  }, [links, forceGraphNodesWithRenderedLinks]);

  if (forceGraphNodesWithRenderedLinks.size === 0) return null;

  // Helper to get position
  const getPos = (n: ForceGraphNode) => {
    return positions.get(n.id) ?? { x: 0, y: 0 };
  };

  // Calculate link endpoints with edge-aware positioning
  const getLinkEndpoints = (renderedLink: RenderedLink) => {
    const source = getPos(renderedLink.link.source);
    const target = getPos(renderedLink.link.target);

    // Calculate angle
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const angle = Math.atan2(dy, dx);

    // Source (album) dimensions
    const sourceWidth = renderedLink.sourceNode.width;
    const sourceHeight = renderedLink.sourceNode.height;
    const sourceHalfW = sourceWidth / 2;
    const sourceHalfH = sourceHeight / 2;

    // Target (artist) dimensions
    const targetWidth = renderedLink.targetNode.width;
    const targetHeight = renderedLink.targetNode.height;
    const targetHalfW = targetWidth / 2;
    const targetHalfH = targetHeight / 2;

    const gap = 20;

    // Calculate source intersection
    const tanAngle = Math.abs(Math.tan(angle));
    let sourceDistance;
    if (tanAngle * sourceHalfW <= sourceHalfH) {
      sourceDistance = Math.abs(sourceHalfW / Math.cos(angle));
    } else {
      sourceDistance = Math.abs(sourceHalfH / Math.sin(angle));
    }

    // Calculate target intersection (reverse angle)
    const reverseAngle = Math.atan2(-dy, -dx);
    const reverseTanAngle = Math.abs(Math.tan(reverseAngle));
    let targetDistance;
    if (reverseTanAngle * targetHalfW <= targetHalfH) {
      targetDistance = Math.abs(targetHalfW / Math.cos(reverseAngle));
    } else {
      targetDistance = Math.abs(targetHalfH / Math.sin(reverseAngle));
    }

    return {
      x1: source.x + Math.cos(angle) * (sourceDistance + gap),
      y1: source.y + Math.sin(angle) * (sourceDistance + gap),
      x2: target.x + Math.cos(reverseAngle) * (targetDistance + gap),
      y2: target.y + Math.sin(reverseAngle) * (targetDistance + gap),
    };
  };

  return (
    <g className="force-graph" transform={transform.toString()}>
      <g className="links">
        {renderedLinks.map((link, i) => {
          const { x1, y1, x2, y2 } = getLinkEndpoints(link);
          return (
            <g key={i} filter="url(#floatShadow)">
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#fff"
                strokeWidth={2}
                markerEnd="url(#link-arrow)"
                style={{ pointerEvents: "none" }}
              />
            </g>
          );
        })}
      </g>
    </g>
  );
};
