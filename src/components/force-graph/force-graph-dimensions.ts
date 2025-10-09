import { atom } from "jotai";

type ForceGraphDimensionsBase = {
  id: string;
};

type ForceGraphDimensionsPending = ForceGraphDimensionsBase & {
  loaded: false;
};

export type ForceGraphDimensionsLoaded = ForceGraphDimensionsBase & {
  loaded: true;
  width: number;
  height: number;
};

export type ForceGraphDimensions =
  | ForceGraphDimensionsLoaded
  | ForceGraphDimensionsPending;

const forceGraphDimensionsAtom = atom<Map<string, ForceGraphDimensions>>(
  new Map(),
);

const forceGraphDimensionsLoadedAtom = atom<
  Map<string, ForceGraphDimensionsLoaded>
>(new Map());

export const initForceGraphDimensionsAtom = atom(
  null,
  (get, set, nodes: ForceGraphDimensionsPending[]) => {
    const currentNodes = get(forceGraphDimensionsAtom);
    nodes.forEach((node) => {
      if (!currentNodes.has(node.id)) {
        currentNodes.set(node.id, node);
      }
    });
    set(forceGraphDimensionsAtom, new Map(currentNodes));
  },
);

export const registerForceGraphDimensionsAtom = atom(
  null,
  (get, set, node: ForceGraphDimensionsLoaded) => {
    let hasUpdated = false;

    console.log("Registering force graph dimensions:", node);

    const currentNodes = get(forceGraphDimensionsAtom);
    let updatedNodes = currentNodes;
    const currentNode = currentNodes.get(node.id);
    if (
      !currentNode?.loaded ||
      currentNode.width !== node.width ||
      currentNode.height !== node.height
    ) {
      updatedNodes = new Map(get(forceGraphDimensionsAtom)).set(node.id, node);
      set(forceGraphDimensionsAtom, updatedNodes);
      hasUpdated = true;
    }

    const currentLoadedNodes = get(forceGraphDimensionsLoadedAtom);
    let updatedLoadedNodes = currentLoadedNodes;
    const currentLoadedNode = currentLoadedNodes.get(node.id);
    if (
      !currentLoadedNode ||
      currentLoadedNode.width !== node.width ||
      currentLoadedNode.height !== node.height
    ) {
      updatedLoadedNodes = new Map(get(forceGraphDimensionsLoadedAtom)).set(
        node.id,
        node,
      );
      set(forceGraphDimensionsLoadedAtom, updatedLoadedNodes);
      hasUpdated = true;
    }

    if (!hasUpdated) {
      return;
    }

    const nodeIds = Array.from(updatedNodes.keys());
    const updatedLoadedNodeIds = Array.from(updatedLoadedNodes.keys());

    if (nodeIds.every((key) => updatedLoadedNodeIds.includes(key))) {
      set(forceGraphAllDimensionsLoadedAtom, updatedLoadedNodes);
    }
  },
);

export const forceGraphAllDimensionsLoadedAtom = atom(
  new Map<string, ForceGraphDimensionsLoaded>(),
);

export const nodeDimensionsLoadedAtom = (nodeId: string) =>
  atom((get) => get(forceGraphAllDimensionsLoadedAtom).get(nodeId));
