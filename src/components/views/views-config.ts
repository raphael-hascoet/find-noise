import type { Atom } from "jotai";
import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import {
  albumDataSelectorsAtom,
  type AlbumSelectors,
} from "../../data/albums-pool-atoms";
import type { Position } from "../flowchart/flowchart-links";
import {
  loadedNodeDimensionsAtom,
  type NodeDimensions,
} from "../nodes/view-node-dimensions";
import { type ViewNodeDef } from "../nodes/view-nodes-manager";
import { viewBuilders } from "./view-builders";

export type ViewKeyToDefinition = {
  home: {
    data: {
      seed: string;
    };
  };
  albumsForArtist: {
    data: {
      artistId: string;
    };
  };
  flowchart: {
    data: {
      albumMbid: string;
      nodeTree?: ViewNodeDef;
    };
  };
  search: {
    data: {
      query: string;
    };
  };
};

export type ViewKey = keyof ViewKeyToDefinition;

export type ViewData<T extends ViewKey> = T extends keyof ViewKeyToDefinition
  ? ViewKeyToDefinition[T]["data"]
  : never;

export type ViewBuilder<Key extends ViewKey> = {
  buildNodes: (params: {
    data: ViewData<Key>;
    selectors: AlbumSelectors;
  }) => Map<string, ViewNodeDef>;

  buildNodePositions: (params: {
    data: ViewData<Key>;
    selectors: AlbumSelectors;
    nodeDefsWithDimensions: Map<string, NodeDefWithDimensions>;
  }) => Map<string, Position>;

  transitionConfig?: {
    duration: number;
    ease?: (t: number) => number;
  };
};

export type ViewConfig<TKey extends ViewKey = ViewKey> = {
  key: TKey;
  data: ViewData<TKey>;
};

export type NodeDefWithDimensions = {
  nodeDef: ViewNodeDef;
  dimensions: NodeDimensions;
};

export type PositionedNode = NodeDefWithDimensions & {
  position: Position;
};

export type NodePositioningState =
  | { state: "init" }
  | {
      state: "in-progress";
      transitionNodes?: Map<string, PositionedNode>;
      targetNodeDefs: Map<string, ViewNodeDef>;
    }
  | {
      state: "ready";
      positionedNodes: Map<string, PositionedNode>;
    };

export const nodePositioningStateAtom = atom((get): NodePositioningState => {
  const nodeDefs = get(calculatedNodeDefsAtom);

  if (!nodeDefs?.size) return { state: "init" };

  const dimensions = get(loadedNodeDimensionsAtom);

  let areAllNodeDefsDimensionsLoaded = true;
  const nodeDefsWithDimensions = new Map<string, NodeDefWithDimensions>();

  for (const [id, nodeDef] of nodeDefs) {
    const nodeDimensions = dimensions.get(id);
    if (!nodeDimensions) {
      areAllNodeDefsDimensionsLoaded = false;
      break;
    }
    nodeDefsWithDimensions.set(id, { dimensions: nodeDimensions, nodeDef });
  }

  if (!areAllNodeDefsDimensionsLoaded) {
    const transitionNodes = get(transitioningNodesAtom);

    return {
      state: "in-progress",
      transitionNodes,
      targetNodeDefs: nodeDefs,
    };
  }

  const viewConfig = get(activeViewConfigAtom);

  if (!viewConfig) throw new Error("No view config found on active view");
  const selectors = get(albumDataSelectorsAtom);

  const builder = get(viewBuilders[viewConfig.key] as Atom<ViewBuilder<any>>);

  const positions = builder.buildNodePositions({
    data: viewConfig.data as any,
    selectors,
    nodeDefsWithDimensions,
  });

  const positionedNodes = new Map<string, PositionedNode>();

  for (const [id, nodeDefWithDimension] of nodeDefsWithDimensions) {
    const position = positions.get(id);

    if (!position) throw new Error(`No position generated for node def ${id}`);

    positionedNodes.set(id, { ...nodeDefWithDimension, position });
  }

  return {
    state: "ready",
    positionedNodes,
  };
});

const activeViewConfigAtom = atom<ViewConfig | null>(null);
export const activeViewConfigReadOnlyAtom = atom((get) =>
  get(activeViewConfigAtom),
);

const calculatedNodeDefsAtom = atom((get) => {
  const viewConfig = get(activeViewConfigAtom);
  const selectors = get(albumDataSelectorsAtom);

  if (!viewConfig || !selectors) return null;

  const builder = get(viewBuilders[viewConfig.key] as Atom<ViewBuilder<any>>);
  if (!builder) return null;

  return builder.buildNodes({
    data: viewConfig.data as any,
    selectors,
  }) as Map<string, ViewNodeDef>;
});

export const setActiveViewAtom = atom(null, (get, set, config: ViewConfig) => {
  const currentPositioningState = get(nodePositioningStateAtom);
  if (currentPositioningState.state === "in-progress") {
    console.warn("New active view while positioning is in progress");
  }
  if (currentPositioningState.state === "ready") {
    set(transitioningNodesAtom, currentPositioningState.positionedNodes);
  }
  set(activeViewConfigAtom, config);
});

export const transitioningNodesAtom = atom<Map<string, PositionedNode>>();

export const transitioningNodesFamily = atomFamily((id: string) => {
  return atom((get) => {
    const transitioningNodes = get(transitioningNodesAtom);
    return transitioningNodes?.get(id);
  });
});

export const calculatedLinksAtom = atom((get) => {
  const nodeDefs = get(calculatedNodeDefsAtom);
  const viewConfig = get(activeViewConfigReadOnlyAtom);

  if (viewConfig?.key !== "flowchart") return [];

  const links: Array<{ source: string; targets: string[] }> = [];

  nodeDefs?.forEach((node) => {
    if (node.children && node.children.length > 0) {
      links.push({
        source: node.id,
        targets: node.children.map((child) => child.id),
      });
    }
  });

  return links;
});
