import { useAtomValue } from "jotai";
import { useMemo, useRef, type RefObject } from "react";
import { type Link } from "../flowchart/flowchart-links";
import { getPositionedNodesBounds } from "../zoom-manager";
import {
  calculatedLinksAtom,
  type NodePositioningState,
  type PositionedNode,
} from "./views-config";

export const useWindowedNodes = ({
  positioningState,
  viewportChangeTrigger,
  svgRef,
}: {
  positioningState: NodePositioningState;
  viewportChangeTrigger: number;
  svgRef: RefObject<SVGSVGElement | null>;
}) => {
  const previouslyVisibleNodesRef = useRef<Set<string>>(new Set());
  const previousPositionedNodesRef = useRef<Set<string>>(new Set());

  const previouslyVisibleLinksRef = useRef<Set<string>>(new Set());

  const links = useAtomValue(calculatedLinksAtom);

  const visiblePositionedNodes = useMemo(() => {
    return positioningState.state === "ready"
      ? positioningState.positionedNodes
      : positioningState.state === "in-progress"
        ? (positioningState.transitionNodes ?? null)
        : null;
  }, [positioningState]);

  return useMemo(() => {
    if (!visiblePositionedNodes) {
      return {
        windowedNodes: visiblePositionedNodes,
        reappearingNodeIds: new Set<string>(),
        windowedLinks: links,
        reappearingLinkIds: new Set<string>(),
      };
    }

    const viewport = getViewportRelativeToNodes({ svgRef });
    if (!viewport) {
      return {
        windowedNodes: visiblePositionedNodes,
        reappearingNodeIds: new Set<string>(),
        windowedLinks: links,
        reappearingLinkIds: new Set<string>(),
      };
    }

    const filteredNodes = getVisibleNodes({
      allNodes: visiblePositionedNodes,
      viewport,
      bufferSize: 0.23,
    });
    const currentVisibleIds = new Set(filteredNodes.keys());
    const previouslyVisible = previouslyVisibleNodesRef.current;

    const reappearing = new Set<string>();
    for (const nodeId of currentVisibleIds) {
      if (
        !previouslyVisible.has(nodeId) &&
        previousPositionedNodesRef.current.has(nodeId)
      ) {
        reappearing.add(nodeId);
      }
    }

    previouslyVisibleNodesRef.current = new Set(currentVisibleIds);
    if (positioningState.state === "ready") {
      previousPositionedNodesRef.current = new Set(
        visiblePositionedNodes.keys(),
      );
    }

    const filteredLinks = getVisibleLinks({
      allLinks: links,
      visibleNodes: filteredNodes,
      allNodes: visiblePositionedNodes,
      viewport,
      bufferSize: 0,
    });

    const currentVisibleLinkIds = new Set(
      filteredLinks.map((link) => `${link.source}-${link.targets.join("_")}`),
    );
    const previouslyVisibleLinks = previouslyVisibleLinksRef.current;

    const reappearingLinks = new Set<string>();
    for (const linkId of currentVisibleLinkIds) {
      if (!previouslyVisibleLinks.has(linkId)) {
        reappearingLinks.add(linkId);
      }
    }

    previouslyVisibleLinksRef.current = new Set(currentVisibleLinkIds);

    return {
      windowedNodes: filteredNodes,
      reappearingNodeIds: reappearing,
      windowedLinks: filteredLinks,
      reappearingLinkIds: reappearing,
    };
  }, [positioningState, visiblePositionedNodes, viewportChangeTrigger]);
};

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Get the current zoom transform (k, x, y) from the zoom ref.
 */
function getCurrentTransform(
  svgRef: React.RefObject<SVGSVGElement | null>,
): d3.ZoomTransform | null {
  const svgEl = svgRef.current;
  if (!svgEl) return null;
  // d3 stores the latest transform on the element
  // @ts-expect-error __zoom is set by d3-zoom
  const t: d3.ZoomTransform | undefined = svgEl.__zoom;
  return t ?? null;
}

/**
 * Given the current zoom transform and SVG size, returns the visible viewport
 * in content (node) coordinates.
 */
function viewportInContent(
  t: d3.ZoomTransform,
  svgSize: { width: number; height: number },
): Rect {
  const { width, height } = svgSize;

  // Inverse transform: content = (client - translate) / scale
  const x0 = (0 - t.x) / t.k;
  const y0 = (0 - t.y) / t.k;
  const x1 = (width - t.x) / t.k;
  const y1 = (height - t.y) / t.k;

  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
  };
}

/**
 * High-level helper: returns viewport in content space based on your refs.
 */
function getViewportRelativeToNodes(opts: {
  svgRef: React.RefObject<SVGSVGElement | null>;
}): Rect | null {
  const t = getCurrentTransform(opts.svgRef);
  const svgEl = opts.svgRef.current;
  if (!t || !svgEl) return null;
  return viewportInContent(t, {
    width: svgEl.clientWidth || 0,
    height: svgEl.clientHeight || 0,
  });
}

function nodeIntersectsRect(
  node: PositionedNode,
  rect: Rect,
  delta = 0,
): boolean {
  // Node AABB (center-based to corner-based)
  const nx0 = node.position.x - node.dimensions.width / 2;
  const ny0 = node.position.y - node.dimensions.height / 2;
  const nx1 = nx0 + node.dimensions.width;
  const ny1 = ny0 + node.dimensions.height;

  // Expanded rect
  const rx0 = rect.x - delta;
  const ry0 = rect.y - delta;
  const rx1 = rect.x + rect.width + delta;
  const ry1 = rect.y + rect.height + delta;

  // AABB intersection test
  const disjoint =
    nx1 < rx0 || // node entirely left of rect
    nx0 > rx1 || // node entirely right of rect
    ny1 < ry0 || // node entirely above rect
    ny0 > ry1; // node entirely below rect

  return !disjoint;
}

/**
 * Simple function to filter nodes that are visible in the viewport + buffer
 */
function getVisibleNodes({
  allNodes,
  viewport,
  bufferSize = 0.1,
}: {
  allNodes: Map<string, PositionedNode>;
  viewport: Rect;
  bufferSize?: number;
}): Map<string, PositionedNode> {
  const visibleNodes = new Map<string, PositionedNode>();

  for (const [nodeId, node] of allNodes.entries()) {
    if (
      nodeIntersectsRect(
        node,
        viewport,
        bufferSize * Math.max(viewport.width, viewport.height),
      )
    ) {
      visibleNodes.set(nodeId, node);
    }
  }

  return visibleNodes;
}

function boundsIntersectsRect(
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  },
  rect: Rect,
  delta = 0,
): boolean {
  // Expanded rect
  const rx0 = rect.x - delta;
  const ry0 = rect.y - delta;
  const rx1 = rect.x + rect.width + delta;
  const ry1 = rect.y + rect.height + delta;

  // AABB intersection test
  const disjoint =
    bounds.right < rx0 || // bounds entirely left of rect
    bounds.left > rx1 || // bounds entirely right of rect
    bounds.bottom < ry0 || // bounds entirely above rect
    bounds.top > ry1; // bounds entirely below rect

  return !disjoint;
}

/**
 * Filter links that have tags visible in the viewport
 */
function getVisibleLinks({
  allLinks,
  allNodes,
  visibleNodes,
  viewport,
  bufferSize = 0.1,
}: {
  allLinks: Link[];
  allNodes: Map<string, PositionedNode>;
  visibleNodes: Map<string, PositionedNode>;
  viewport: Rect;
  bufferSize?: number;
}): Link[] {
  const visibleLinks: Link[] = [];

  for (const link of allLinks) {
    if ([link.source, ...link.targets].some((id) => visibleNodes.has(id))) {
      visibleLinks.push(link);
      continue;
    }

    const linkNodes = new Map<string, PositionedNode>();

    const sourceNode = allNodes.get(link.source);
    if (sourceNode) {
      linkNodes.set(sourceNode.nodeDef.id, sourceNode);
    }
    link.targets
      .map((targetId) => allNodes.get(targetId))
      .forEach((targetNode) => {
        if (targetNode) {
          linkNodes.set(targetNode.nodeDef.id, targetNode);
        }
      });

    const nodeBounds = getPositionedNodesBounds(allNodes);

    if (
      boundsIntersectsRect(
        nodeBounds,
        viewport,
        bufferSize * Math.max(viewport.width, viewport.height),
      )
    ) {
      visibleLinks.push(link);
    }
  }

  return visibleLinks;
}
