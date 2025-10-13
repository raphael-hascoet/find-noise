import { atom } from "jotai";

export type NodeDimensions = {
  id: string;
  width: number;
  height: number;
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
      !currentLoadedNode ||
      currentLoadedNode.width !== node.width ||
      currentLoadedNode.height !== node.height
    ) {
      updatedLoadedNodes = new Map(get(loadedNodeDimensionsAtom)).set(
        node.id,
        node,
      );
      set(loadedNodeDimensionsAtom, updatedLoadedNodes);
      hasUpdated = true;
    }

    if (!hasUpdated) {
      return;
    }
  },
);
