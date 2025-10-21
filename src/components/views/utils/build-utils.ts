import type { Position } from "../../flowchart/flowchart-links";
import type { NodeDimensions } from "../../nodes/view-node-dimensions";

export type GridPositionsNodeInput = {
  id: string;
  dimensions: NodeDimensions;
};

export const buildGridPositions = ({
  nodes,
  maxPerRow,
  baseY = 0,
  baseX = 0,
  xGap = 50,
  yGap = 50,
}: {
  nodes: GridPositionsNodeInput[];
  maxPerRow?: number;
  baseY?: number;
  baseX?: number;
  xGap?: number;
  yGap?: number;
}): { positions: Map<string, Position>; maxY: number; maxX: number } => {
  let nextX = baseX;
  let nextY = baseY;

  const positionMap = new Map<string, Position>();

  let maxHeightOnRow = 0;
  let maxX = 0;

  nodes.forEach(({ id, dimensions }, index) => {
    positionMap.set(id, {
      x: nextX,
      y: nextY,
    });
    if (typeof maxPerRow === "number" && (index + 1) % maxPerRow === 0) {
      nextY += maxHeightOnRow + yGap;
      nextX = 0;
      maxHeightOnRow = dimensions.height;
    } else {
      nextX += dimensions.width + xGap;
      maxHeightOnRow = Math.max(maxHeightOnRow, dimensions.height);
    }
    maxX = Math.max(maxX, nextX);
  });
  return {
    positions: positionMap,
    maxY: nextY + maxHeightOnRow,
    maxX: maxX,
  };
};
