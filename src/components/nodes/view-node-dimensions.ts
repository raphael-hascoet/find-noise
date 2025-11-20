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

const dimensionsUpdateBatched = atom<{ key: string; value: NodeDimensions }[]>(
  [],
);

const timeoutId = atom<number | null>();

const batchDimensionUpdates = atom(
  null,
  (get, set, update: { key: string; value: NodeDimensions }) => {
    set(dimensionsUpdateBatched, get(dimensionsUpdateBatched).concat(update));

    if (!get(timeoutId)) {
      set(
        timeoutId,
        setTimeout(() => set(sendBatchedUpdates), 10),
      );
    }
  },
);

const sendBatchedUpdates = atom(null, (get, set) => {
  const updatedLoadedNodes = new Map(get(loadedNodeDimensionsAtom));
  const updates = get(dimensionsUpdateBatched);
  updates.forEach((update) => updatedLoadedNodes.set(update.key, update.value));
  set(loadedNodeDimensionsAtom, updatedLoadedNodes);
  set(dimensionsUpdateBatched, []);
  set(timeoutId, null);
});

export const registerNodeDimensionsAtom = atom(
  null,
  (get, set, node: NodeDimensions) => {
    const storageKey = node.variant ? `${node.id}_${node.variant}` : node.id;

    const currentLoadedNodes = get(loadedNodeDimensionsAtom);
    const currentLoadedNode = currentLoadedNodes.get(storageKey);

    if (
      (node.width === 0 && node.height === 0) ||
      (currentLoadedNode && !currentLoadedNode.updateRequested)
    ) {
      return;
    }

    set(batchDimensionUpdates, { key: storageKey, value: node });

    set(updateZoomBoundariesIfIdle);
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
