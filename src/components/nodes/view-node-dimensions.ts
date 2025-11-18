import { atom } from "jotai";
import { updateZoomBoundariesIfIdle } from "../zoom-manager";

export type NodeDimensions = {
  id: string;
  width: number;
  height: number;
  updateRequested?: boolean;
  fromShell: boolean;
  variant?: string;
};
export const loadedNodeDimensionsAtom = atom(new Map<string, NodeDimensions>());

export const registerNodeDimensionsAtom = atom(
  null,
  (get, set, node: NodeDimensions) => {
    let hasUpdated = false;

    // Use variant-aware key for storage
    const storageKey = node.variant ? `${node.id}-${node.variant}` : node.id;

    const currentLoadedNodes = get(loadedNodeDimensionsAtom);
    let updatedLoadedNodes = currentLoadedNodes;
    const currentLoadedNode = currentLoadedNodes.get(storageKey);

    if (
      (node.height === 0 && node.width === 0) ||
      (node.width === currentLoadedNode?.width &&
        node.height === currentLoadedNode.height &&
        !currentLoadedNode.updateRequested) ||
      (node.fromShell &&
        !!currentLoadedNode &&
        !currentLoadedNode.updateRequested) ||
      (!node.fromShell &&
        !!currentLoadedNode &&
        !currentLoadedNode.updateRequested)
    ) {
      return;
    }

    if (!currentLoadedNode || currentLoadedNode?.updateRequested) {
      updatedLoadedNodes = new Map(get(loadedNodeDimensionsAtom)).set(
        storageKey,
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

// Helper function to get dimensions for a specific node and variant
export const getNodeDimensionsAtom = atom(
  (get) => (nodeId: string, variant?: string) => {
    const loadedNodes = get(loadedNodeDimensionsAtom);
    const storageKey = variant ? `${nodeId}-${variant}` : nodeId;
    return loadedNodes.get(storageKey);
  },
);
