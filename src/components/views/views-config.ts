import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import {
  albumDataSelectorsAtom,
  type AlbumSelectors,
} from "../../data/albums-pool-atoms";
import type { SimpleRecommendParams } from "../../data/get-albums-recommendations";
import type { Position } from "../flowchart/flowchart-links";
import {
  loadedNodeDimensionsAtom,
  type NodeDimensions,
} from "../nodes/view-node-dimensions";
import { type ViewNodeDef } from "../nodes/view-nodes-manager";
import { viewBuilders } from "./view-builders";

type ViewKeyToDefinition = {
  albumsForArtist: {
    data: {
      artistId: string;
    };
    actions: {
      transitionToFlowchart: ({ albumId }: { albumId: string }) => void;
    };
  };
  flowchart: {
    data: {
      albumMbid: string;
      nodeTree?: ViewNodeDef;
    };
    actions: {
      transitionToAlbumsForArtist: ({ artistId }: { artistId: string }) => void;
      addRecommendationsToNode?: ({
        albumMbid,
        params,
      }: {
        albumMbid: string;
        params: Omit<SimpleRecommendParams, "seed" | "all">;
      }) => void;
      removeChildrenFromNode?: ({
        parentId,
        childIds,
      }: {
        parentId: string;
        childIds: string[];
      }) => void;
    };
  };
};

export type ViewKey = keyof ViewKeyToDefinition;

export type ViewData<T extends ViewKey> = T extends keyof ViewKeyToDefinition
  ? ViewKeyToDefinition[T]["data"]
  : never;

type ViewActions<T extends ViewKey> = T extends keyof ViewKeyToDefinition
  ? ViewKeyToDefinition[T]["actions"]
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

  buildActions: (params: {
    data: ViewData<Key>;
    selectors: AlbumSelectors;
    changeView: <K extends ViewKey>(key: K, data: ViewData<K>) => void;
  }) => ViewActions<Key>;

  transitionConfig?: {
    duration: number;
    ease?: (t: number) => number;
  };
};

type ViewConfig<TKey extends ViewKey = ViewKey> = {
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

  const builder = viewBuilders[viewConfig.key];

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
const activeViewConfigReadOnlyAtom = atom((get) => get(activeViewConfigAtom));

const calculatedNodeDefsAtom = atom((get) => {
  const viewConfig = get(activeViewConfigAtom);
  const selectors = get(albumDataSelectorsAtom);

  if (!viewConfig || !selectors) return null;

  const builder = viewBuilders[viewConfig.key];
  if (!builder) return null;

  return builder.buildNodes({
    data: viewConfig.data as any,
    selectors,
  }) as Map<string, ViewNodeDef>;
});

export type ViewActionsAtomOutput<K extends ViewKey> = {
  key: K;
  actions: K extends keyof ViewKeyToDefinition
    ? ViewKeyToDefinition[K]["actions"]
    : never;
};

export const isViewActionsForKey = <K extends ViewKey>(
  obj: ViewActionsAtomOutput<ViewKey> | null | undefined,
  key: K,
): obj is ViewActionsAtomOutput<K> => {
  return obj?.key === key;
};

export const createViewActionsAtom = ({
  changeView,
}: {
  changeView: <K extends ViewKey>(key: K, data: ViewData<K>) => void;
}) => {
  return atom((get) => {
    const viewConfig = get(activeViewConfigAtom);
    if (!viewConfig) return null;

    const builder = viewBuilders[viewConfig.key];
    if (!builder) return null;

    return {
      key: viewConfig.key,
      actions: builder.buildActions({
        data: viewConfig.data as any,
        selectors: get(albumDataSelectorsAtom),
        changeView,
      }),
    } as ViewActionsAtomOutput<ViewKey>;
  });
};

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
