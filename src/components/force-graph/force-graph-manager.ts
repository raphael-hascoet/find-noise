import { atom } from "jotai";

type ForceGraphNodeBase = {
  id: string;
};

type ForceGraphNodeNotLoaded = ForceGraphNodeBase & {
  loaded: false;
};

export type RenderedForceGraphNodeLoaded = ForceGraphNodeBase & {
  loaded: true;
  width: number;
  height: number;
};

export type RenderedForceGraphNode =
  | RenderedForceGraphNodeLoaded
  | ForceGraphNodeNotLoaded;

const forceGraphNodesAtom = atom<Map<string, RenderedForceGraphNode>>(
  new Map(),
);

const forceGraphLoadedNodesAtom = atom<
  Map<string, RenderedForceGraphNodeLoaded>
>(new Map());

export const forceGraphInitNodesAtom = atom(
  null,
  (get, set, nodes: ForceGraphNodeNotLoaded[]) => {
    const currentNodes = get(forceGraphNodesAtom);
    nodes.forEach((node) => {
      if (!currentNodes.has(node.id)) {
        currentNodes.set(node.id, node);
      }
    });
    set(forceGraphNodesAtom, new Map(currentNodes));
  },
);

export const registerForceGraphNodeAtom = atom(
  null,
  (get, set, node: RenderedForceGraphNodeLoaded) => {
    const updatedNodes = new Map(get(forceGraphNodesAtom)).set(node.id, node);

    set(forceGraphNodesAtom, updatedNodes);

    const updatedLoadedNodes = new Map(get(forceGraphLoadedNodesAtom)).set(
      node.id,
      node,
    );
    set(forceGraphLoadedNodesAtom, updatedLoadedNodes);

    if (updatedLoadedNodes.size === updatedNodes.size) {
      set(forceGraphNodesWithRenderedLinksAtom, updatedLoadedNodes);
    }
  },
);

export const forceGraphNodesWithRenderedLinksAtom = atom(
  new Map<string, RenderedForceGraphNodeLoaded>(),
);
