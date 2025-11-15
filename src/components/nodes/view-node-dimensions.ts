import { atom } from "jotai";
import { updateZoomBoundariesIfIdle } from "../zoom-manager";

export type NodeDimensions = {
  id: string;
  width: number;
  height: number;
  updateRequested?: boolean;
  fromShell: boolean;
};
export const loadedNodeDimensionsAtom = atom(new Map<string, NodeDimensions>());

export const registerNodeDimensionsAtom = atom(
  null,
  (get, set, node: NodeDimensions) => {
    let hasUpdated = false;

    const currentLoadedNodes = get(loadedNodeDimensionsAtom);
    let updatedLoadedNodes = currentLoadedNodes;
    const currentLoadedNode = currentLoadedNodes.get(node.id);

    if (
      (node.height === 0 && node.width === 0) ||
      (node.width === currentLoadedNode?.width &&
        node.height === currentLoadedNode.height) ||
      (node.fromShell &&
        !!currentLoadedNode &&
        !currentLoadedNode.updateRequested)
    ) {
      return;
    }

    if (
      currentLoadedNode?.width !== node.width ||
      currentLoadedNode?.height !== node.height ||
      currentLoadedNode?.updateRequested
    ) {
      updatedLoadedNodes = new Map(get(loadedNodeDimensionsAtom)).set(
        node.id,
        node,
      );
      set(loadedNodeDimensionsAtom, updatedLoadedNodes);
      hasUpdated = true;
    }

    if (hasUpdated) {
      set(updateZoomBoundariesIfIdle);
    }

    if (!hasUpdated) {
      return;
    }
  },
);

export const requestNodeDimensionsUpdateAtom = atom(
  null,
  (get, set, nodeIds: string[]) => {
    const updatedLoadedNodes = new Map(get(loadedNodeDimensionsAtom));

    for (const nodeId of nodeIds) {
      const currentLoadedNode = updatedLoadedNodes.get(nodeId);
      if (!currentLoadedNode) {
        continue;
      }

      if (currentLoadedNode.updateRequested) {
        continue;
      }

      updatedLoadedNodes.set(nodeId, {
        ...currentLoadedNode,
        updateRequested: true,
      });
    }
    set(loadedNodeDimensionsAtom, updatedLoadedNodes);
  },
);
